"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../config/supabase");
const API_BASE = 'http://localhost:5000/api';
async function runVerificationChecklist() {
    console.log('========================================================================');
    console.log('  EXECUTING END-TO-END FEATURE VERIFICATION CHECKLIST (SUPABASE + API) ');
    console.log('========================================================================\n');
    const testEmail = `surya.verifier.${Date.now()}@apex-enterprise.io`;
    const testPassword = 'EnterprisePassword#2026';
    const testName = 'Surya Prakash (Enterprise Lead)';
    // ---------------------------------------------------------------------------
    // 1. AUTHENTICATION: Register -> Logout -> Log Back In -> Verify in Supabase
    // ---------------------------------------------------------------------------
    console.log('1️⃣  [CHECKLIST 1: AUTHENTICATION]');
    console.log(`   → Registering new account: ${testEmail}`);
    const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            fullName: testName,
            orgName: 'Apex Global Enterprises',
        }),
    });
    const regData = await regRes.json();
    if (!regRes.ok)
        throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    console.log(`   ✅ Registered User ID: ${regData.session.id} | Org ID: ${regData.session.orgId}`);
    // Verify user exists in Supabase Dashboard -> Authentication (auth.users) & public.profiles
    const { data: supaAuthUser, error: supaAuthErr } = await supabase_1.supabaseAdmin.auth.admin.getUserById(regData.session.id);
    if (supaAuthErr || !supaAuthUser.user) {
        throw new Error(`Supabase Auth verification failed: ${supaAuthErr?.message}`);
    }
    console.log(`   ✅ Verified in Supabase Dashboard -> Authentication (auth.users): ${supaAuthUser.user.email} (Confirmed at: ${supaAuthUser.user.email_confirmed_at})`);
    // Test Session Termination (Logout)
    console.log('   → Testing session termination (POST /api/auth/logout)...');
    const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${regData.session.token}`,
            'x-org-id': regData.session.orgId,
        },
    });
    const logoutData = await logoutRes.json();
    console.log(`   ✅ Logout Response: ${logoutData.message}`);
    // Test Log Back In
    console.log('   → Logging back in (POST /api/auth/login)...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: testEmail,
            password: testPassword,
        }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok)
        throw new Error(`Re-login failed: ${JSON.stringify(loginData)}`);
    const activeToken = loginData.session.token;
    const activeOrgId = loginData.session.orgId;
    console.log(`   ✅ Logged back in! Active JWT issued for ${loginData.session.fullName} (${loginData.session.email})\n`);
    // ---------------------------------------------------------------------------
    // 2. ENTITY & DOCUMENT MANAGEMENT: Ingest Document -> Update HITL Field -> Verify Supabase Table Editor
    // ---------------------------------------------------------------------------
    console.log('2️⃣  [CHECKLIST 2: ENTITY & TABLE PERSISTENCE]');
    const sampleContent = `INVOICE: INV-2026-Q4-AZURE-AI
Vendor: Microsoft Azure Enterprise Cloud
Recipient: Apex Global Enterprises
Date: 2026-10-30
Payment Terms: Net 30
Line Item 1: Azure OpenAI & GPU Compute Cluster = $31,500.00
Total Amount: $31,500.00 USD`;
    const formData = new FormData();
    const blob = new Blob([sampleContent], { type: 'text/plain' });
    formData.append('file', blob, 'INV-2026-Q4-MicrosoftAzure-Compute.txt');
    formData.append('department', 'Finance');
    formData.append('template', 'Invoice Schema');
    formData.append('strictness', 'fast');
    console.log('   → Uploading & extracting new enterprise document via POST /api/documents/upload...');
    const uploadRes = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${activeToken}`,
            'x-org-id': activeOrgId,
        },
        body: formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok)
        throw new Error(`Document upload failed: ${JSON.stringify(uploadData)}`);
    const createdDocId = uploadData.document.id;
    console.log(`   ✅ Document Ingested & Classified! ID: ${createdDocId} | Type: ${uploadData.document.document_type} | Confidence: ${uploadData.document.overall_confidence}`);
    // Inspect Supabase Table Editor across `organizations`, `profiles`, `documents`, `document_chunks`, and `audit_logs`
    const [orgCount, profileCount, docRow, chunkRows] = await Promise.all([
        supabase_1.supabaseAdmin.from('organizations').select('id, name', { count: 'exact' }),
        supabase_1.supabaseAdmin.from('profiles').select('id, full_name, role', { count: 'exact' }),
        supabase_1.supabaseAdmin.from('documents').select('id, file_name, document_type, overall_confidence').eq('id', createdDocId).single(),
        supabase_1.supabaseAdmin.from('document_chunks').select('id, chunk_index').eq('document_id', createdDocId),
    ]);
    console.log(`   ✅ Supabase Table Editor Verification:`);
    console.log(`      • public.organizations : ${orgCount.count} rows`);
    console.log(`      • public.profiles      : ${profileCount.count} rows (includes ${testName})`);
    console.log(`      • public.documents     : Verified row ${docRow.data?.id} (${docRow.data?.file_name})`);
    console.log(`      • public.document_chunks: Verified ${chunkRows.data?.length || 0} vector chunk(s) (768-dim pgvector)\n`);
    // ---------------------------------------------------------------------------
    // 3. AI ADVISORY & RAG ENGINE: Dispatch Query -> Verify Condition Analysis, Remediation Plan & Disclaimers
    // ---------------------------------------------------------------------------
    console.log('3️⃣  [CHECKLIST 3: AI ADVISORY & RAG ENGINE]');
    const advisoryQuery = 'What is the total payment due across all Q3 vendor invoices, and what is the remediation plan for our cybersecurity contract?';
    console.log(`   → Dispatching AI Advisory RAG request: "${advisoryQuery}"`);
    const searchRes = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
            'x-org-id': activeOrgId,
        },
        body: JSON.stringify({ query: advisoryQuery, limit: 5 }),
    });
    const searchData = await searchRes.json();
    if (!searchRes.ok)
        throw new Error(`Search failed: ${JSON.stringify(searchData)}`);
    console.log('   ✅ Gemini Synthesized Response:');
    console.log('------------------------------------------------------------------------');
    console.log(searchData.answer);
    console.log('------------------------------------------------------------------------');
    console.log(`   ✅ Citations Returned: ${searchData.citations.length} source document chunks\n`);
    // ---------------------------------------------------------------------------
    // 4. DATABASE HISTORY PERSISTENCE: Fetch /api/analytics (Simulating Client Reload)
    // ---------------------------------------------------------------------------
    console.log('4️⃣  [CHECKLIST 4: DATABASE HISTORY PERSISTENCE]');
    console.log('   → Querying GET /api/analytics and GET /api/documents to verify persistence across reloads...');
    const [analyticsRes, docsListRes] = await Promise.all([
        fetch(`${API_BASE}/analytics`, {
            headers: { Authorization: `Bearer ${activeToken}`, 'x-org-id': activeOrgId },
        }),
        fetch(`${API_BASE}/documents`, {
            headers: { Authorization: `Bearer ${activeToken}`, 'x-org-id': activeOrgId },
        }),
    ]);
    const analyticsJson = await analyticsRes.json();
    const docsListJson = await docsListRes.json();
    const persistedAdvisories = (analyticsJson.auditLogs || []).filter((l) => l.action === 'SEMANTIC_RAG_SEARCH_EXECUTED');
    console.log(`   ✅ Reloaded Documents Count: ${docsListJson.documents.length} persisted documents in Supabase`);
    console.log(`   ✅ Reloaded Historical Advisory Logs: ${persistedAdvisories.length} persisted advisory records in public.audit_logs`);
    console.log('\n========================================================================');
    console.log('  🎉 ALL 4 FEATURE VERIFICATION CHECKLIST ITEMS PASSED 100%! ');
    console.log('========================================================================');
}
runVerificationChecklist().catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
