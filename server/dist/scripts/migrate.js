"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const supabase_js_1 = require("@supabase/supabase-js");
const pg_1 = require("pg");
// Load environment variables from root .env or server/.env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const MIGRATION_FILE_PATH = path_1.default.resolve(__dirname, '../../../supabase/migrations/001_initial_schema.sql');
const DEFAULT_ORG = {
    id: '11111111-1111-1111-1111-111111111111',
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
};
const SEED_DOCUMENTS = [
    {
        id: '22222222-2222-2222-2222-222222222201',
        org_id: '11111111-1111-1111-1111-111111111111',
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
                summary: 'Q3 2026 Enterprise cloud infrastructure invoice from Amazon Web Services totaling $48,750.00 USD including tax, due October 30, 2026.',
            },
            fieldConfidence: {
                vendorOrIssuer: 0.99,
                recipient: 0.99,
                documentDate: 0.98,
                invoiceNumber: 0.97,
                totalAmount: 0.99,
                currency: 1.0,
                lineItems: 0.96,
                summary: 0.95,
            },
        },
    },
    {
        id: '22222222-2222-2222-2222-222222222202',
        org_id: '11111111-1111-1111-1111-111111111111',
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
                totalAmount: 0.97,
                currency: 0.99,
                lineItems: 0.95,
                summary: 0.94,
            },
        },
    },
    {
        id: '22222222-2222-2222-2222-222222222203',
        org_id: '11111111-1111-1111-1111-111111111111',
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
                terminationClause: 'Either party may terminate with 60 days written notice; immediate termination upon material breach of SLA uptime below 99.95%.',
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
                summary: 'Master Service Agreement and SLA with Vanguard CyberDefense Solutions LLC for 24/7 SOC monitoring. Contains custom indemnification addendum on page 9 with handwritten strike-throughs requiring human verification.',
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
    },
];
async function applyMigrationViaPostgres(sqlContent, connectionString) {
    // Build candidate connection strings: original + regional Supabase Supavisor IPv4 poolers if direct IPv6 host is unreachable
    const candidates = [connectionString];
    const directMatch = connectionString.match(/^postgresql:\/\/postgres:([^@]+)@db\.([a-z0-9]+)\.supabase\.co:5432\/postgres/i);
    if (directMatch) {
        const [, password, projectRef] = directMatch;
        const regions = [
            'ap-south-1',
            'us-east-1',
            'us-west-1',
            'us-east-2',
            'eu-central-1',
            'eu-west-1',
            'eu-west-2',
            'ap-southeast-1',
            'ap-northeast-1',
        ];
        for (const region of regions) {
            candidates.push(`postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres`);
            candidates.push(`postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres`);
        }
    }
    for (const candidateUrl of candidates) {
        const maskedUrl = candidateUrl.replace(/:([^:@]+)@/, ':****@');
        const client = new pg_1.Client({
            connectionString: candidateUrl,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 6000,
        });
        try {
            await client.connect();
            console.log(`[Migration Runner] Connected via ${maskedUrl}. Executing 001_initial_schema.sql...`);
            await client.query(sqlContent);
            console.log('[Migration Runner] SQL schema, RLS policies, functions, and seed data applied successfully via PostgreSQL!');
            return true;
        }
        catch (err) {
            const msg = err.message || '';
            if (!msg.includes('ENOTFOUND') &&
                !msg.includes('Tenant or user not found') &&
                !msg.includes('timeout')) {
                console.warn(`[Migration Runner] Attempt (${maskedUrl}) notice:`, msg);
            }
        }
        finally {
            await client.end().catch(() => { });
        }
    }
    return false;
}
async function applyMigrationViaSupabaseServiceRole(sqlContent, supabaseUrl, serviceRoleKey) {
    console.log('[Migration Runner] Initializing Supabase Admin Client with Service Role Key...');
    const supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    // 1. Attempt RPC SQL execution if `exec_sql` or `pgmeta` helper exists on the Supabase instance
    const { error: rpcError } = await supabaseAdmin.rpc('exec_sql', { sql_query: sqlContent });
    if (!rpcError) {
        console.log('[Migration Runner] Full SQL migration executed via Supabase Service Role RPC (exec_sql).');
    }
    else {
        console.log('[Migration Runner] Note: RPC `exec_sql` not pre-installed on remote instance (' +
            rpcError.message +
            '). Proceeding with Service Role storage & table verification/seeding...');
    }
    // 2. Ensure `documents` storage bucket exists using Service Role Key
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const hasDocBucket = buckets?.some((b) => b.name === 'documents');
    if (!hasDocBucket) {
        const { error: bucketErr } = await supabaseAdmin.storage.createBucket('documents', {
            public: true,
            fileSizeLimit: 52428800, // 50MB
        });
        if (bucketErr) {
            console.warn('[Migration Runner] Storage bucket notice:', bucketErr.message);
        }
        else {
            console.log('[Migration Runner] Created `documents` storage bucket in Supabase Storage.');
        }
    }
    else {
        console.log('[Migration Runner] Verified `documents` storage bucket exists.');
    }
    // 3. Upsert seed data via Service Role Key (bypasses RLS)
    const { error: orgErr } = await supabaseAdmin
        .from('organizations')
        .upsert(DEFAULT_ORG, { onConflict: 'id' });
    if (orgErr) {
        console.warn('[Migration Runner] Could not upsert into `organizations` table (' +
            orgErr.message +
            '). Please run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor or set DATABASE_URL in .env.');
        return;
    }
    console.log('[Migration Runner] Seeded default enterprise organization via Service Role Key.');
    const { error: docsErr } = await supabaseAdmin
        .from('documents')
        .upsert(SEED_DOCUMENTS, { onConflict: 'id' });
    if (docsErr) {
        console.warn('[Migration Runner] Documents seed warning:', docsErr.message);
    }
    else {
        console.log(`[Migration Runner] Seeded ${SEED_DOCUMENTS.length} enterprise documents via Service Role Key.`);
    }
}
async function runMigrations() {
    console.log('====================================================================');
    console.log(' Intelligent Document Processing (IDP) - Supabase Migration Runner');
    console.log('====================================================================');
    if (!fs_1.default.existsSync(MIGRATION_FILE_PATH)) {
        throw new Error(`Migration file not found at: ${MIGRATION_FILE_PATH}`);
    }
    const sqlContent = fs_1.default.readFileSync(MIGRATION_FILE_PATH, 'utf-8');
    console.log(`[Migration Runner] Loaded migration file (${sqlContent.length} bytes): ${MIGRATION_FILE_PATH}`);
    const isPlaceholderUrl = !SUPABASE_URL || SUPABASE_URL.includes('your-supabase-project.supabase.co');
    const isPlaceholderKey = !SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.includes('your-supabase-service-role-key');
    const isPlaceholderDb = !DATABASE_URL || DATABASE_URL.includes('your-supabase-project.supabase.co');
    let appliedFullSql = false;
    if (!isPlaceholderDb && DATABASE_URL) {
        appliedFullSql = await applyMigrationViaPostgres(sqlContent, DATABASE_URL);
    }
    if (!isPlaceholderUrl && !isPlaceholderKey && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        await applyMigrationViaSupabaseServiceRole(sqlContent, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }
    else if (!appliedFullSql) {
        console.log('[Migration Runner] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are currently set to template values in .env.');
        console.log('[Migration Runner] Once you add your live Supabase Cloud credentials to `.env`, run `npm run migrate` to apply the schema and seed data directly to your Supabase Cloud project.');
    }
    console.log('====================================================================');
}
if (require.main === module) {
    runMigrations()
        .then(() => {
        process.exit(0);
    })
        .catch((err) => {
        console.error('[Migration Runner] Fatal Error:', err);
        process.exit(1);
    });
}
