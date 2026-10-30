-- ============================================================================
-- Intelligent Document Processing (IDP) Enterprise Solution
-- Migration: 001_initial_schema.sql
-- Target: Supabase Cloud PostgreSQL (pgvector enabled)
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- 1. Organizations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(1024),
    strictness_mode VARCHAR(50) DEFAULT 'fast', -- 'fast' (gemini-2.5-flash) or 'deep' (gemini-2.5-pro)
    confidence_threshold NUMERIC(5,2) DEFAULT 0.85,
    custom_schemas JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. Profiles Table (Linked to Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'analyst',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. Documents Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    file_name VARCHAR(512) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    department_tag VARCHAR(100) DEFAULT 'General',
    extraction_template VARCHAR(100) DEFAULT 'auto',
    strictness_used VARCHAR(50) DEFAULT 'fast',
    processing_time_ms INT DEFAULT 0,
    document_type VARCHAR(100) DEFAULT 'unclassified',
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, needs_review
    overall_confidence NUMERIC(5,2) DEFAULT 0.00,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. Document Chunks & Embeddings for RAG
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768), -- Gemini text-embedding-004 dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. Audit Logs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- Row Level Security (RLS) / Data Isolation Rules
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's org_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT org_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations Policy
DROP POLICY IF EXISTS "Users can view and update their organization" ON organizations;
CREATE POLICY "Users can view and update their organization" ON organizations
    FOR ALL USING (id = get_user_org_id());

-- Profiles Policy
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT USING (org_id = get_user_org_id() OR id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Documents Policy
DROP POLICY IF EXISTS "Users can manage documents in their organization" ON documents;
CREATE POLICY "Users can manage documents in their organization" ON documents
    FOR ALL USING (org_id = get_user_org_id());

-- Document Chunks Policy
DROP POLICY IF EXISTS "Users can access document chunks in their organization" ON document_chunks;
CREATE POLICY "Users can access document chunks in their organization" ON document_chunks
    FOR ALL USING (
        document_id IN (SELECT id FROM documents WHERE org_id = get_user_org_id())
    );

-- Audit Logs Policy
DROP POLICY IF EXISTS "Users can view audit logs in their organization" ON audit_logs;
CREATE POLICY "Users can view audit logs in their organization" ON audit_logs
    FOR SELECT USING (org_id = get_user_org_id());

DROP POLICY IF EXISTS "Users can insert audit logs in their organization" ON audit_logs;
CREATE POLICY "Users can insert audit logs in their organization" ON audit_logs
    FOR INSERT WITH CHECK (org_id = get_user_org_id());

-- ============================================================================
-- Vector Similarity Search RPC Function (pgvector RAG)
-- ============================================================================
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding VECTOR(768),
    match_threshold FLOAT,
    match_count INT,
    p_org_id UUID
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    file_name VARCHAR,
    document_type VARCHAR,
    chunk_index INT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id AS chunk_id,
        dc.document_id,
        d.file_name,
        d.document_type,
        dc.chunk_index,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE d.org_id = p_org_id
      AND dc.embedding IS NOT NULL
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- Automatic Auth Trigger: Provision Default Org & Profile on Sign Up
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_org_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Ensure the default enterprise organization exists
    INSERT INTO public.organizations (id, name)
    VALUES (default_org_id, 'Apex Global Enterprises')
    ON CONFLICT (id) DO NOTHING;

    -- Create linked profile
    INSERT INTO public.profiles (id, org_id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE((NEW.raw_user_meta_data->>'org_id')::UUID, default_org_id),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Enterprise Analyst'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'senior_analyst')
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Supabase Storage Bucket Configuration
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Seed Data: Enterprise Organization, Documents, Chunks, and Audit Logs
-- ============================================================================
INSERT INTO organizations (id, name, webhook_url, strictness_mode, confidence_threshold, custom_schemas)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Apex Global Enterprises',
    'https://api.apex-enterprise.internal/webhooks/idp-events',
    'fast',
    0.85,
    '[
      {"id": "invoice-std", "name": "Invoice Schema", "domain": "Financial & Accounting", "fields": ["vendorOrIssuer", "recipient", "documentDate", "totalAmount", "currency", "lineItems", "taxAmount", "paymentTerms"]},
      {"id": "contract-clause", "name": "Contract Clause Schema", "domain": "Legal & Compliance", "fields": ["vendorOrIssuer", "recipient", "effectiveDate", "terminationClause", "liabilityCap", "governingLaw", "summary"]},
      {"id": "medical-claim", "name": "Medical Claim Schema", "domain": "Healthcare & Insurance", "fields": ["patientName", "providerName", "diagnosisCodes", "procedureCodes", "totalAmount", "claimStatus"]},
      {"id": "tech-spec", "name": "Technical Specification Schema", "domain": "Engineering & Operations", "fields": ["equipmentModel", "serialNumber", "operatingVoltage", "maintenanceInterval", "safetyRatings"]}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Seed Documents across all target domains (Invoices, Contracts, Medical Records, Technical Manuals)
INSERT INTO documents (
    id, org_id, file_name, file_path, file_size, mime_type, department_tag,
    extraction_template, strictness_used, processing_time_ms, document_type,
    processing_status, overall_confidence, extracted_data, created_at
)
VALUES
(
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111111',
    'INV-2026-Q3-CloudCompute-AWS.pdf',
    'seed/INV-2026-Q3-CloudCompute-AWS.pdf',
    428510,
    'application/pdf',
    'Finance',
    'Invoice Schema',
    'fast',
    1420,
    'Invoice',
    'completed',
    0.98,
    '{
      "documentType": "Invoice",
      "confidenceScore": 0.98,
      "entities": {
        "vendorOrIssuer": "Amazon Web Services, Inc.",
        "recipient": "Apex Global Enterprises",
        "documentDate": "2026-09-30",
        "invoiceNumber": "INV-AWS-9948120",
        "paymentTerms": "Net 30",
        "totalAmount": 48750.00,
        "taxAmount": 3750.00,
        "currency": "USD",
        "lineItems": [
          {"description": "Amazon EC2 P5 GPU Instances (H100 Cluster - Q3 Reserved)", "quantity": 12, "unitPrice": 3200.00, "totalPrice": 38400.00},
          {"description": "Amazon S3 Enterprise Glacier Deep Archive (500 TB)", "quantity": 1, "unitPrice": 3600.00, "totalPrice": 3600.00},
          {"description": "AWS Enterprise Support & Dedicated TAM Services", "quantity": 1, "unitPrice": 3000.00, "totalPrice": 3000.00}
        ],
        "summary": "Q3 2026 Enterprise cloud infrastructure invoice from Amazon Web Services totaling $48,750.00 USD including tax, due October 30, 2026."
      },
      "fieldConfidence": {
        "vendorOrIssuer": 0.99,
        "recipient": 0.99,
        "documentDate": 0.98,
        "invoiceNumber": 0.97,
        "totalAmount": 0.99,
        "currency": 1.00,
        "lineItems": 0.96,
        "summary": 0.95
      }
    }'::jsonb,
    NOW() - INTERVAL '4 days'
),
(
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111111',
    'INV-2026-Q3-Snowflake-DataWarehouse.pdf',
    'seed/INV-2026-Q3-Snowflake-DataWarehouse.pdf',
    315900,
    'application/pdf',
    'Finance',
    'Invoice Schema',
    'fast',
    1290,
    'Invoice',
    'completed',
    0.96,
    '{
      "documentType": "Invoice",
      "confidenceScore": 0.96,
      "entities": {
        "vendorOrIssuer": "Snowflake Inc.",
        "recipient": "Apex Global Enterprises",
        "documentDate": "2026-09-28",
        "invoiceNumber": "SF-2026-88310",
        "paymentTerms": "Net 30",
        "totalAmount": 26400.00,
        "taxAmount": 2400.00,
        "currency": "USD",
        "lineItems": [
          {"description": "Snowflake Enterprise Compute Credits (8,000 Credits @ $3.00)", "quantity": 8000, "unitPrice": 3.00, "totalPrice": 24000.00}
        ],
        "summary": "Q3 2026 Snowflake Enterprise compute consumption invoice for $26,400.00 USD."
      },
      "fieldConfidence": {
        "vendorOrIssuer": 0.98,
        "recipient": 0.99,
        "documentDate": 0.95,
        "invoiceNumber": 0.96,
        "totalAmount": 0.97,
        "currency": 0.99,
        "lineItems": 0.95,
        "summary": 0.94
      }
    }'::jsonb,
    NOW() - INTERVAL '3 days'
),
(
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111111',
    'MSA-SLA-2026-Vanguard-CyberSecurity.pdf',
    'seed/MSA-SLA-2026-Vanguard-CyberSecurity.pdf',
    1240500,
    'application/pdf',
    'Legal',
    'Contract Clause Schema',
    'deep',
    2840,
    'Contract',
    'needs_review',
    0.81,
    '{
      "documentType": "Contract",
      "confidenceScore": 0.81,
      "entities": {
        "vendorOrIssuer": "Vanguard CyberDefense Solutions LLC",
        "recipient": "Apex Global Enterprises",
        "documentDate": "2026-10-01",
        "totalAmount": 185000.00,
        "currency": "USD",
        "governingLaw": "State of Delaware",
        "liabilityCap": "$500,000 aggregate or 2x annual fees",
        "terminationClause": "Either party may terminate with 60 days written notice; immediate termination upon material breach of SLA uptime below 99.95%.",
        "lineItems": [
          {"description": "24/7 Managed SOC & Zero-Day Threat Hunting Retainer", "quantity": 1, "unitPrice": 145000.00, "totalPrice": 145000.00},
          {"description": "Bi-Annual Penetration Testing & Compliance Audit (SOC2/ISO27001)", "quantity": 2, "unitPrice": 20000.00, "totalPrice": 40000.00}
        ],
        "summary": "Master Service Agreement and SLA with Vanguard CyberDefense Solutions LLC for 24/7 SOC monitoring. Contains custom indemnification addendum on page 9 with handwritten strike-throughs requiring human verification."
      },
      "fieldConfidence": {
        "vendorOrIssuer": 0.96,
        "recipient": 0.98,
        "documentDate": 0.91,
        "totalAmount": 0.88,
        "currency": 0.99,
        "governingLaw": 0.94,
        "liabilityCap": 0.72,
        "terminationClause": 0.76,
        "lineItems": 0.84,
        "summary": 0.89
      }
    }'::jsonb,
    NOW() - INTERVAL '2 days'
),
(
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111111',
    'MED-CLAIM-2026-MercyGeneral-88412.pdf',
    'seed/MED-CLAIM-2026-MercyGeneral-88412.pdf',
    612800,
    'application/pdf',
    'Healthcare',
    'Medical Claim Schema',
    'fast',
    1650,
    'MedicalRecord',
    'completed',
    0.94,
    '{
      "documentType": "MedicalRecord",
      "confidenceScore": 0.94,
      "entities": {
        "vendorOrIssuer": "Mercy General Diagnostic & Imaging Center",
        "recipient": "Apex Corporate Health Plan / BlueCross Administrator",
        "documentDate": "2026-10-12",
        "patientReference": "PT-90241-A",
        "diagnosisCodes": "ICD-10: M54.50 (Low back pain, unspecified), G57.00 (Sciatica)",
        "totalAmount": 4320.00,
        "currency": "USD",
        "lineItems": [
          {"description": "CPT 72148 - Lumbar Spine MRI without Contrast", "quantity": 1, "unitPrice": 2850.00, "totalPrice": 2850.00},
          {"description": "CPT 99204 - Comprehensive Specialist Consultation (Neurology)", "quantity": 1, "unitPrice": 870.00, "totalPrice": 870.00},
          {"description": "CPT 80053 - Comprehensive Metabolic Panel Lab Work", "quantity": 1, "unitPrice": 600.00, "totalPrice": 600.00}
        ],
        "summary": "Outpatient diagnostic imaging and specialist consultation claim from Mercy General totaling $4,320.00 USD with verified ICD-10 and CPT coding."
      },
      "fieldConfidence": {
        "vendorOrIssuer": 0.97,
        "recipient": 0.95,
        "documentDate": 0.98,
        "patientReference": 0.96,
        "diagnosisCodes": 0.91,
        "totalAmount": 0.96,
        "currency": 1.00,
        "lineItems": 0.93,
        "summary": 0.94
      }
    }'::jsonb,
    NOW() - INTERVAL '1 day'
),
(
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111111',
    'TECH-SPEC-Siemens-S7-1500-TurbineController.pdf',
    'seed/TECH-SPEC-Siemens-S7-1500-TurbineController.pdf',
    2180400,
    'application/pdf',
    'Engineering',
    'Technical Specification Schema',
    'deep',
    2110,
    'TechnicalSpec',
    'completed',
    0.95,
    '{
      "documentType": "TechnicalSpec",
      "confidenceScore": 0.95,
      "entities": {
        "vendorOrIssuer": "Siemens AG Industrial Automation Division",
        "recipient": "Apex Global Operations & Plant Engineering",
        "documentDate": "2026-10-18",
        "equipmentModel": "SIMATIC S7-1500TF Redundant Controller",
        "serialNumber": "SMNS-2026-X99104-DE",
        "operatingVoltage": "24V DC (-15% / +20%), Max Ripple 5%",
        "maintenanceInterval": "Every 4,000 operating hours or 6 months",
        "totalAmount": 32900.00,
        "currency": "USD",
        "lineItems": [
          {"description": "CPU 1518TF-4 PN/DP Fail-Safe Redundant Processing Unit", "quantity": 2, "unitPrice": 12450.00, "totalPrice": 24900.00},
          {"description": "PROFINET Optical Fiber Redundancy Sync Module Set", "quantity": 4, "unitPrice": 2000.00, "totalPrice": 8000.00}
        ],
        "summary": "Engineering specification and procurement manifest for Siemens SIMATIC S7-1500TF redundant industrial controllers. Requires SIL-3 safety calibration every 4,000 operating hours."
      },
      "fieldConfidence": {
        "vendorOrIssuer": 0.99,
        "recipient": 0.94,
        "documentDate": 0.97,
        "equipmentModel": 0.98,
        "serialNumber": 0.96,
        "operatingVoltage": 0.92,
        "maintenanceInterval": 0.95,
        "totalAmount": 0.97,
        "currency": 1.00,
        "lineItems": 0.95,
        "summary": 0.96
      }
    }'::jsonb,
    NOW() - INTERVAL '10 hours'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Document Chunks for RAG Search
INSERT INTO document_chunks (id, document_id, chunk_index, content)
VALUES
(
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222201',
    0,
    'Document: INV-2026-Q3-CloudCompute-AWS.pdf | Type: Invoice | Vendor: Amazon Web Services, Inc. | Recipient: Apex Global Enterprises | Date: 2026-09-30 | Invoice Number: INV-AWS-9948120 | Payment Terms: Net 30 | Total Amount: $48,750.00 USD (includes $3,750.00 tax). Line Items: 12x Amazon EC2 P5 GPU Instances H100 Cluster Q3 Reserved ($38,400.00), Amazon S3 Enterprise Glacier Deep Archive 500 TB ($3,600.00), AWS Enterprise Support & Dedicated TAM Services ($3,000.00). Q3 vendor invoice due October 30, 2026.'
),
(
    '33333333-3333-3333-3333-333333333302',
    '22222222-2222-2222-2222-222222222202',
    0,
    'Document: INV-2026-Q3-Snowflake-DataWarehouse.pdf | Type: Invoice | Vendor: Snowflake Inc. | Recipient: Apex Global Enterprises | Date: 2026-09-28 | Invoice Number: SF-2026-88310 | Payment Terms: Net 30 | Total Amount: $26,400.00 USD (includes $2,400.00 tax). Line Items: 8,000 Snowflake Enterprise Compute Credits at $3.00 each ($24,000.00). Combined Q3 vendor invoices (AWS $48,750.00 + Snowflake $26,400.00) equal $75,150.00 USD total payment due across Q3 vendor invoices.'
),
(
    '33333333-3333-3333-3333-333333333303',
    '22222222-2222-2222-2222-222222222203',
    0,
    'Document: MSA-SLA-2026-Vanguard-CyberSecurity.pdf | Type: Contract | Vendor: Vanguard CyberDefense Solutions LLC | Recipient: Apex Global Enterprises | Date: 2026-10-01 | Contract Value: $185,000.00 USD | Governing Law: State of Delaware | Liability Cap: $500,000 aggregate or 2x annual fees | Termination Clause: Either party may terminate with 60 days written notice; immediate termination upon material breach of SLA uptime below 99.95%. Flagged for human review due to low confidence (72%) on handwritten indemnification cap.'
),
(
    '33333333-3333-3333-3333-333333333304',
    '22222222-2222-2222-2222-222222222204',
    0,
    'Document: MED-CLAIM-2026-MercyGeneral-88412.pdf | Type: MedicalRecord | Provider: Mercy General Diagnostic & Imaging Center | Recipient: Apex Corporate Health Plan | Date: 2026-10-12 | Patient Ref: PT-90241-A | Diagnosis Codes: ICD-10 M54.50 (Low back pain), G57.00 (Sciatica) | Total Claim Amount: $4,320.00 USD | Line Items: CPT 72148 Lumbar Spine MRI ($2,850.00), CPT 99204 Neurology Consultation ($870.00), CPT 80053 Comprehensive Metabolic Panel ($600.00).'
),
(
    '33333333-3333-3333-3333-333333333305',
    '22222222-2222-2222-2222-222222222205',
    0,
    'Document: TECH-SPEC-Siemens-S7-1500-TurbineController.pdf | Type: TechnicalSpec | Manufacturer: Siemens AG Industrial Automation Division | Model: SIMATIC S7-1500TF Redundant Controller | Serial: SMNS-2026-X99104-DE | Operating Voltage: 24V DC (-15% / +20%) | Maintenance Interval: Every 4,000 operating hours or 6 months with SIL-3 safety calibration | Total Procurement Value: $32,900.00 USD.'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Audit Logs
INSERT INTO audit_logs (id, org_id, action, details, created_at)
VALUES
(
    '44444444-4444-4444-4444-444444444401',
    '11111111-1111-1111-1111-111111111111',
    'DOCUMENT_INGESTED_AND_EXTRACTED',
    '{"documentId": "22222222-2222-2222-2222-222222222201", "fileName": "INV-2026-Q3-CloudCompute-AWS.pdf", "model": "gemini-2.5-flash", "confidence": 0.98, "latencyMs": 1420}'::jsonb,
    NOW() - INTERVAL '4 days'
),
(
    '44444444-4444-4444-4444-444444444402',
    '11111111-1111-1111-1111-111111111111',
    'DOCUMENT_INGESTED_AND_EXTRACTED',
    '{"documentId": "22222222-2222-2222-2222-222222222202", "fileName": "INV-2026-Q3-Snowflake-DataWarehouse.pdf", "model": "gemini-2.5-flash", "confidence": 0.96, "latencyMs": 1290}'::jsonb,
    NOW() - INTERVAL '3 days'
),
(
    '44444444-4444-4444-4444-444444444403',
    '11111111-1111-1111-1111-111111111111',
    'LOW_CONFIDENCE_FLAGGED_FOR_HITL',
    '{"documentId": "22222222-2222-2222-2222-222222222203", "fileName": "MSA-SLA-2026-Vanguard-CyberSecurity.pdf", "model": "gemini-2.5-pro", "confidence": 0.81, "threshold": 0.85, "flaggedFields": ["liabilityCap", "terminationClause"]}'::jsonb,
    NOW() - INTERVAL '2 days'
),
(
    '44444444-4444-4444-4444-444444444404',
    '11111111-1111-1111-1111-111111111111',
    'VECTOR_EMBEDDINGS_INDEXED',
    '{"documentId": "22222222-2222-2222-2222-222222222205", "fileName": "TECH-SPEC-Siemens-S7-1500-TurbineController.pdf", "embeddingModel": "text-embedding-004", "dimensions": 768}'::jsonb,
    NOW() - INTERVAL '10 hours'
)
ON CONFLICT (id) DO NOTHING;

