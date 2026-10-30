export interface DocumentRecord {
  id: string;
  org_id: string;
  uploader_id?: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  department_tag: string;
  extraction_template: string;
  strictness_used: 'fast' | 'deep';
  processing_time_ms: number;
  document_type: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';
  overall_confidence: number;
  extracted_data: Record<string, any>;
  preview_data_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunkRecord {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding?: number[];
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  org_id: string;
  user_id?: string | null;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  webhook_url: string;
  strictness_mode: 'fast' | 'deep';
  confidence_threshold: number;
  custom_schemas: Array<{
    id: string;
    name: string;
    domain: string;
    fields: string[];
  }>;
  created_at: string;
}

export const DEFAULT_ORG_ID = '11111111-1111-1111-1111-111111111111';

class LocalEnterpriseStore {
  public organization: OrganizationSettings = {
    id: DEFAULT_ORG_ID,
    name: 'Apex Global Enterprises',
    webhook_url: 'https://api.apex-enterprise.internal/webhooks/idp-events',
    strictness_mode: 'fast',
    confidence_threshold: 0.85,
    custom_schemas: [
      {
        id: 'invoice-std',
        name: 'Invoice Schema',
        domain: 'Financial & Accounting',
        fields: ['vendorOrIssuer', 'recipient', 'documentDate', 'totalAmount', 'currency', 'lineItems', 'taxAmount', 'paymentTerms'],
      },
      {
        id: 'contract-clause',
        name: 'Contract Clause Schema',
        domain: 'Legal & Compliance',
        fields: ['vendorOrIssuer', 'recipient', 'effectiveDate', 'terminationClause', 'liabilityCap', 'governingLaw', 'summary'],
      },
      {
        id: 'medical-claim',
        name: 'Medical Claim Schema',
        domain: 'Healthcare & Insurance',
        fields: ['patientName', 'providerName', 'diagnosisCodes', 'procedureCodes', 'totalAmount', 'claimStatus'],
      },
      {
        id: 'tech-spec',
        name: 'Technical Specification Schema',
        domain: 'Engineering & Operations',
        fields: ['equipmentModel', 'serialNumber', 'operatingVoltage', 'maintenanceInterval', 'safetyRatings'],
      },
    ],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  };

  public documents: DocumentRecord[] = [
    {
      id: '22222222-2222-2222-2222-222222222201',
      org_id: DEFAULT_ORG_ID,
      uploader_id: null,
      file_name: 'INV-2026-Q3-CloudCompute-AWS.pdf',
      file_path: 'seed/INV-2026-Q3-CloudCompute-AWS.pdf',
      file_size: 428510,
      mime_type: 'application/pdf',
      department_tag: 'Finance',
      extraction_template: 'Invoice Schema',
      strictness_used: 'fast',
      processing_time_ms: 1420,
      document_type: 'Invoice',
      processing_status: 'completed',
      overall_confidence: 0.98,
      extracted_data: {
        documentType: 'Invoice',
        confidenceScore: 0.98,
        entities: {
          vendorOrIssuer: 'Amazon Web Services, Inc.',
          recipient: 'Apex Global Enterprises',
          documentDate: '2026-09-30',
          invoiceNumber: 'INV-AWS-9948120',
          paymentTerms: 'Net 30',
          totalAmount: 48750.0,
          taxAmount: 3750.0,
          currency: 'USD',
          lineItems: [
            {
              description: 'Amazon EC2 P5 GPU Instances (H100 Cluster - Q3 Reserved)',
              quantity: 12,
              unitPrice: 3200.0,
              totalPrice: 38400.0,
            },
            {
              description: 'Amazon S3 Enterprise Glacier Deep Archive (500 TB)',
              quantity: 1,
              unitPrice: 3600.0,
              totalPrice: 3600.0,
            },
            {
              description: 'AWS Enterprise Support & Dedicated TAM Services',
              quantity: 1,
              unitPrice: 3000.0,
              totalPrice: 3000.0,
            },
          ],
          summary:
            'Q3 2026 Enterprise cloud infrastructure invoice from Amazon Web Services totaling $48,750.00 USD including tax, due October 30, 2026.',
        },
        fieldConfidence: {
          vendorOrIssuer: 0.99,
          recipient: 0.99,
          documentDate: 0.98,
          invoiceNumber: 0.97,
          paymentTerms: 0.98,
          totalAmount: 0.99,
          taxAmount: 0.98,
          currency: 1.0,
          lineItems: 0.96,
          summary: 0.95,
        },
      },
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222202',
      org_id: DEFAULT_ORG_ID,
      uploader_id: null,
      file_name: 'INV-2026-Q3-Snowflake-DataWarehouse.pdf',
      file_path: 'seed/INV-2026-Q3-Snowflake-DataWarehouse.pdf',
      file_size: 315900,
      mime_type: 'application/pdf',
      department_tag: 'Finance',
      extraction_template: 'Invoice Schema',
      strictness_used: 'fast',
      processing_time_ms: 1290,
      document_type: 'Invoice',
      processing_status: 'completed',
      overall_confidence: 0.96,
      extracted_data: {
        documentType: 'Invoice',
        confidenceScore: 0.96,
        entities: {
          vendorOrIssuer: 'Snowflake Inc.',
          recipient: 'Apex Global Enterprises',
          documentDate: '2026-09-28',
          invoiceNumber: 'SF-2026-88310',
          paymentTerms: 'Net 30',
          totalAmount: 26400.0,
          taxAmount: 2400.0,
          currency: 'USD',
          lineItems: [
            {
              description: 'Snowflake Enterprise Compute Credits (8,000 Credits @ $3.00)',
              quantity: 8000,
              unitPrice: 3.0,
              totalPrice: 24000.0,
            },
          ],
          summary: 'Q3 2026 Snowflake Enterprise compute consumption invoice for $26,400.00 USD.',
        },
        fieldConfidence: {
          vendorOrIssuer: 0.98,
          recipient: 0.99,
          documentDate: 0.95,
          invoiceNumber: 0.96,
          paymentTerms: 0.97,
          totalAmount: 0.97,
          taxAmount: 0.96,
          currency: 0.99,
          lineItems: 0.95,
          summary: 0.94,
        },
      },
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222203',
      org_id: DEFAULT_ORG_ID,
      uploader_id: null,
      file_name: 'MSA-SLA-2026-Vanguard-CyberSecurity.pdf',
      file_path: 'seed/MSA-SLA-2026-Vanguard-CyberSecurity.pdf',
      file_size: 1240500,
      mime_type: 'application/pdf',
      department_tag: 'Legal',
      extraction_template: 'Contract Clause Schema',
      strictness_used: 'deep',
      processing_time_ms: 2840,
      document_type: 'Contract',
      processing_status: 'needs_review',
      overall_confidence: 0.81,
      extracted_data: {
        documentType: 'Contract',
        confidenceScore: 0.81,
        entities: {
          vendorOrIssuer: 'Vanguard CyberDefense Solutions LLC',
          recipient: 'Apex Global Enterprises',
          documentDate: '2026-10-01',
          totalAmount: 185000.0,
          currency: 'USD',
          governingLaw: 'State of Delaware',
          liabilityCap: '$500,000 aggregate or 2x annual fees',
          terminationClause:
            'Either party may terminate with 60 days written notice; immediate termination upon material breach of SLA uptime below 99.95%.',
          lineItems: [
            {
              description: '24/7 Managed SOC & Zero-Day Threat Hunting Retainer',
              quantity: 1,
              unitPrice: 145000.0,
              totalPrice: 145000.0,
            },
            {
              description: 'Bi-Annual Penetration Testing & Compliance Audit (SOC2/ISO27001)',
              quantity: 2,
              unitPrice: 20000.0,
              totalPrice: 40000.0,
            },
          ],
          summary:
            'Master Service Agreement and SLA with Vanguard CyberDefense Solutions LLC for 24/7 SOC monitoring. Contains custom indemnification addendum on page 9 with handwritten strike-throughs requiring human verification.',
        },
        fieldConfidence: {
          vendorOrIssuer: 0.96,
          recipient: 0.98,
          documentDate: 0.91,
          totalAmount: 0.88,
          currency: 0.99,
          governingLaw: 0.94,
          liabilityCap: 0.72,
          terminationClause: 0.76,
          lineItems: 0.84,
          summary: 0.89,
        },
      },
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222204',
      org_id: DEFAULT_ORG_ID,
      uploader_id: null,
      file_name: 'MED-CLAIM-2026-MercyGeneral-88412.pdf',
      file_path: 'seed/MED-CLAIM-2026-MercyGeneral-88412.pdf',
      file_size: 612800,
      mime_type: 'application/pdf',
      department_tag: 'Healthcare',
      extraction_template: 'Medical Claim Schema',
      strictness_used: 'fast',
      processing_time_ms: 1650,
      document_type: 'MedicalRecord',
      processing_status: 'completed',
      overall_confidence: 0.94,
      extracted_data: {
        documentType: 'MedicalRecord',
        confidenceScore: 0.94,
        entities: {
          vendorOrIssuer: 'Mercy General Diagnostic & Imaging Center',
          recipient: 'Apex Corporate Health Plan / BlueCross Administrator',
          documentDate: '2026-10-12',
          patientReference: 'PT-90241-A',
          diagnosisCodes: 'ICD-10: M54.50 (Low back pain, unspecified), G57.00 (Sciatica)',
          totalAmount: 4320.0,
          currency: 'USD',
          lineItems: [
            {
              description: 'CPT 72148 - Lumbar Spine MRI without Contrast',
              quantity: 1,
              unitPrice: 2850.0,
              totalPrice: 2850.0,
            },
            {
              description: 'CPT 99204 - Comprehensive Specialist Consultation (Neurology)',
              quantity: 1,
              unitPrice: 870.0,
              totalPrice: 870.0,
            },
            {
              description: 'CPT 80053 - Comprehensive Metabolic Panel Lab Work',
              quantity: 1,
              unitPrice: 600.0,
              totalPrice: 600.0,
            },
          ],
          summary:
            'Outpatient diagnostic imaging and specialist consultation claim from Mercy General totaling $4,320.00 USD with verified ICD-10 and CPT coding.',
        },
        fieldConfidence: {
          vendorOrIssuer: 0.97,
          recipient: 0.95,
          documentDate: 0.98,
          patientReference: 0.96,
          diagnosisCodes: 0.91,
          totalAmount: 0.96,
          currency: 1.0,
          lineItems: 0.93,
          summary: 0.94,
        },
      },
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222205',
      org_id: DEFAULT_ORG_ID,
      uploader_id: null,
      file_name: 'TECH-SPEC-Siemens-S7-1500-TurbineController.pdf',
      file_path: 'seed/TECH-SPEC-Siemens-S7-1500-TurbineController.pdf',
      file_size: 2180400,
      mime_type: 'application/pdf',
      department_tag: 'Engineering',
      extraction_template: 'Technical Specification Schema',
      strictness_used: 'deep',
      processing_time_ms: 2110,
      document_type: 'TechnicalSpec',
      processing_status: 'completed',
      overall_confidence: 0.95,
      extracted_data: {
        documentType: 'TechnicalSpec',
        confidenceScore: 0.95,
        entities: {
          vendorOrIssuer: 'Siemens AG Industrial Automation Division',
          recipient: 'Apex Global Operations & Plant Engineering',
          documentDate: '2026-10-18',
          equipmentModel: 'SIMATIC S7-1500TF Redundant Controller',
          serialNumber: 'SMNS-2026-X99104-DE',
          operatingVoltage: '24V DC (-15% / +20%), Max Ripple 5%',
          maintenanceInterval: 'Every 4,000 operating hours or 6 months',
          totalAmount: 32900.0,
          currency: 'USD',
          lineItems: [
            {
              description: 'CPU 1518TF-4 PN/DP Fail-Safe Redundant Processing Unit',
              quantity: 2,
              unitPrice: 12450.0,
              totalPrice: 24900.0,
            },
            {
              description: 'PROFINET Optical Fiber Redundancy Sync Module Set',
              quantity: 4,
              unitPrice: 2000.0,
              totalPrice: 8000.0,
            },
          ],
          summary:
            'Engineering specification and procurement manifest for Siemens SIMATIC S7-1500TF redundant industrial controllers. Requires SIL-3 safety calibration every 4,000 operating hours.',
        },
        fieldConfidence: {
          vendorOrIssuer: 0.99,
          recipient: 0.94,
          documentDate: 0.97,
          equipmentModel: 0.98,
          serialNumber: 0.96,
          operatingVoltage: 0.92,
          maintenanceInterval: 0.95,
          totalAmount: 0.97,
          currency: 1.0,
          lineItems: 0.95,
          summary: 0.96,
        },
      },
      created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 3600000).toISOString(),
    },
  ];

  public chunks: DocumentChunkRecord[] = [
    {
      id: '33333333-3333-3333-3333-333333333301',
      document_id: '22222222-2222-2222-2222-222222222201',
      chunk_index: 0,
      content:
        'Document: INV-2026-Q3-CloudCompute-AWS.pdf | Type: Invoice | Vendor: Amazon Web Services, Inc. | Recipient: Apex Global Enterprises | Date: 2026-09-30 | Invoice Number: INV-AWS-9948120 | Payment Terms: Net 30 | Total Amount: $48,750.00 USD (includes $3,750.00 tax). Line Items: 12x Amazon EC2 P5 GPU Instances H100 Cluster Q3 Reserved ($38,400.00), Amazon S3 Enterprise Glacier Deep Archive 500 TB ($3,600.00), AWS Enterprise Support & Dedicated TAM Services ($3,000.00). Q3 vendor invoice due October 30, 2026.',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333302',
      document_id: '22222222-2222-2222-2222-222222222202',
      chunk_index: 0,
      content:
        'Document: INV-2026-Q3-Snowflake-DataWarehouse.pdf | Type: Invoice | Vendor: Snowflake Inc. | Recipient: Apex Global Enterprises | Date: 2026-09-28 | Invoice Number: SF-2026-88310 | Payment Terms: Net 30 | Total Amount: $26,400.00 USD (includes $2,400.00 tax). Line Items: 8,000 Snowflake Enterprise Compute Credits at $3.00 each ($24,000.00). Combined Q3 vendor invoices (AWS $48,750.00 + Snowflake $26,400.00) equal $75,150.00 USD total payment due across Q3 vendor invoices.',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333303',
      document_id: '22222222-2222-2222-2222-222222222203',
      chunk_index: 0,
      content:
        'Document: MSA-SLA-2026-Vanguard-CyberSecurity.pdf | Type: Contract | Vendor: Vanguard CyberDefense Solutions LLC | Recipient: Apex Global Enterprises | Date: 2026-10-01 | Contract Value: $185,000.00 USD | Governing Law: State of Delaware | Liability Cap: $500,000 aggregate or 2x annual fees | Termination Clause: Either party may terminate with 60 days written notice; immediate termination upon material breach of SLA uptime below 99.95%. Flagged for human review due to low confidence (72%) on handwritten indemnification cap.',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333304',
      document_id: '22222222-2222-2222-2222-222222222204',
      chunk_index: 0,
      content:
        'Document: MED-CLAIM-2026-MercyGeneral-88412.pdf | Type: MedicalRecord | Provider: Mercy General Diagnostic & Imaging Center | Recipient: Apex Corporate Health Plan | Date: 2026-10-12 | Patient Ref: PT-90241-A | Diagnosis Codes: ICD-10 M54.50 (Low back pain), G57.00 (Sciatica) | Total Claim Amount: $4,320.00 USD | Line Items: CPT 72148 Lumbar Spine MRI ($2,850.00), CPT 99204 Neurology Consultation ($870.00), CPT 80053 Comprehensive Metabolic Panel ($600.00).',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333305',
      document_id: '22222222-2222-2222-2222-222222222205',
      chunk_index: 0,
      content:
        'Document: TECH-SPEC-Siemens-S7-1500-TurbineController.pdf | Type: TechnicalSpec | Manufacturer: Siemens AG Industrial Automation Division | Model: SIMATIC S7-1500TF Redundant Controller | Serial: SMNS-2026-X99104-DE | Operating Voltage: 24V DC (-15% / +20%) | Maintenance Interval: Every 4,000 operating hours or 6 months with SIL-3 safety calibration | Total Procurement Value: $32,900.00 USD.',
      created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
    },
  ];

  public auditLogs: AuditLogRecord[] = [
    {
      id: '44444444-4444-4444-4444-444444444401',
      org_id: DEFAULT_ORG_ID,
      user_id: null,
      action: 'DOCUMENT_INGESTED_AND_EXTRACTED',
      details: {
        documentId: '22222222-2222-2222-2222-222222222201',
        fileName: 'INV-2026-Q3-CloudCompute-AWS.pdf',
        model: 'gemini-2.5-flash',
        confidence: 0.98,
        latencyMs: 1420,
      },
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: '44444444-4444-4444-4444-444444444402',
      org_id: DEFAULT_ORG_ID,
      user_id: null,
      action: 'DOCUMENT_INGESTED_AND_EXTRACTED',
      details: {
        documentId: '22222222-2222-2222-2222-222222222202',
        fileName: 'INV-2026-Q3-Snowflake-DataWarehouse.pdf',
        model: 'gemini-2.5-flash',
        confidence: 0.96,
        latencyMs: 1290,
      },
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: '44444444-4444-4444-4444-444444444403',
      org_id: DEFAULT_ORG_ID,
      user_id: null,
      action: 'LOW_CONFIDENCE_FLAGGED_FOR_HITL',
      details: {
        documentId: '22222222-2222-2222-2222-222222222203',
        fileName: 'MSA-SLA-2026-Vanguard-CyberSecurity.pdf',
        model: 'gemini-2.5-pro',
        confidence: 0.81,
        threshold: 0.85,
        flaggedFields: ['liabilityCap', 'terminationClause'],
      },
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: '44444444-4444-4444-4444-444444444404',
      org_id: DEFAULT_ORG_ID,
      user_id: null,
      action: 'VECTOR_EMBEDDINGS_INDEXED',
      details: {
        documentId: '22222222-2222-2222-2222-222222222205',
        fileName: 'TECH-SPEC-Siemens-S7-1500-TurbineController.pdf',
        embeddingModel: 'text-embedding-004',
        dimensions: 768,
      },
      created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
    },
  ];
}

export const localStore = new LocalEnterpriseStore();

