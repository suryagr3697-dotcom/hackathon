"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.logoutUser = logoutUser;
const crypto_1 = __importDefault(require("crypto"));
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_1 = require("../config/supabase");
const localStore_1 = require("../config/localStore");
/**
 * POST /api/auth/register
 * Registers a real user in Supabase Auth (with auto-confirmed email),
 * creates/links their Organization in `organizations`, and creates their Profile in `profiles`.
 */
async function registerUser(req, res) {
    try {
        const { email, password, fullName, orgName } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required.' });
            return;
        }
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanName = String(fullName || cleanEmail.split('@')[0]).trim();
        const cleanOrgName = String(orgName || 'Apex Global Enterprises').trim();
        if (supabase_1.isSupabaseConfigured) {
            // 1. Ensure organization exists or create new one if custom org name provided
            let targetOrgId = localStore_1.DEFAULT_ORG_ID;
            if (cleanOrgName.toLowerCase() !== 'apex global enterprises') {
                const { data: existingOrg } = await supabase_1.supabaseAdmin
                    .from('organizations')
                    .select('id')
                    .eq('name', cleanOrgName)
                    .maybeSingle();
                if (existingOrg?.id) {
                    targetOrgId = existingOrg.id;
                }
                else {
                    const { data: createdOrg } = await supabase_1.supabaseAdmin
                        .from('organizations')
                        .insert({ name: cleanOrgName })
                        .select('id')
                        .single();
                    if (createdOrg?.id) {
                        targetOrgId = createdOrg.id;
                    }
                }
            }
            // 2. Create user in Supabase Auth using a stateless Admin client (so we do not mutate supabaseAdmin's service_role header)
            const statelessAuthClient = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', { auth: { autoRefreshToken: false, persistSession: false } });
            const { data: createdAuth, error: createErr } = await statelessAuthClient.auth.admin.createUser({
                email: cleanEmail,
                password: String(password),
                email_confirm: true,
                user_metadata: {
                    full_name: cleanName,
                    org_id: targetOrgId,
                    role: 'senior_analyst',
                },
            });
            if (createErr && !createErr.message.toLowerCase().includes('already')) {
                res.status(400).json({ error: createErr.message });
                return;
            }
            // 3. Sign in with password on the isolated client to obtain live Supabase JWT session
            const { data: signInData, error: signInErr } = await statelessAuthClient.auth.signInWithPassword({
                email: cleanEmail,
                password: String(password),
            });
            if (signInErr || !signInData.user) {
                res.status(400).json({ error: signInErr?.message || 'Registration succeeded, please sign in.' });
                return;
            }
            const userId = signInData.user.id || createdAuth?.user?.id;
            // 4. Upsert into `profiles` table explicitly to guarantee persistence
            await supabase_1.supabaseAdmin.from('profiles').upsert({
                id: userId,
                org_id: targetOrgId,
                full_name: cleanName,
                role: 'senior_analyst',
            }, { onConflict: 'id' });
            // 5. Log registration event in `audit_logs`
            await supabase_1.supabaseAdmin.from('audit_logs').insert({
                org_id: targetOrgId,
                user_id: userId,
                action: 'USER_ACCOUNT_REGISTERED',
                details: {
                    email: cleanEmail,
                    fullName: cleanName,
                    orgName: cleanOrgName,
                },
            });
            res.status(201).json({
                message: 'Account registered and verified in Supabase Auth!',
                session: {
                    id: userId,
                    email: cleanEmail,
                    fullName: cleanName,
                    role: 'Senior Analyst',
                    orgId: targetOrgId,
                    orgName: cleanOrgName,
                    token: signInData.session?.access_token || 'supabase-jwt-token',
                },
            });
            return;
        }
        // Fallback if offline
        res.status(201).json({
            message: 'Account registered in local store',
            session: {
                id: crypto_1.default.randomUUID(),
                email: cleanEmail,
                fullName: cleanName,
                role: 'Senior Analyst',
                orgId: localStore_1.DEFAULT_ORG_ID,
                orgName: cleanOrgName,
                token: 'demo-enterprise-jwt-token',
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}
/**
 * POST /api/auth/login
 * Authenticates an existing user against Supabase Auth and retrieves their `profiles` & `organizations` record.
 */
async function loginUser(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required.' });
            return;
        }
        const cleanEmail = String(email).trim().toLowerCase();
        if (supabase_1.isSupabaseConfigured) {
            const statelessAuthClient = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', { auth: { autoRefreshToken: false, persistSession: false } });
            const { data, error } = await statelessAuthClient.auth.signInWithPassword({
                email: cleanEmail,
                password: String(password),
            });
            if (error || !data.user) {
                res.status(401).json({ error: error?.message || 'Invalid login credentials.' });
                return;
            }
            const { data: profile } = await supabase_1.supabaseAdmin
                .from('profiles')
                .select('org_id, full_name, role')
                .eq('id', data.user.id)
                .maybeSingle();
            const orgId = profile?.org_id || localStore_1.DEFAULT_ORG_ID;
            const { data: orgData } = await supabase_1.supabaseAdmin
                .from('organizations')
                .select('name')
                .eq('id', orgId)
                .maybeSingle();
            await supabase_1.supabaseAdmin.from('audit_logs').insert({
                org_id: orgId,
                user_id: data.user.id,
                action: 'USER_SESSION_LOGIN',
                details: { email: cleanEmail },
            });
            res.json({
                message: 'Authenticated successfully via Supabase Auth!',
                session: {
                    id: data.user.id,
                    email: cleanEmail,
                    fullName: profile?.full_name || data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
                    role: profile?.role || 'Senior Analyst',
                    orgId,
                    orgName: orgData?.name || 'Apex Global Enterprises',
                    token: data.session?.access_token || 'supabase-jwt-token',
                },
            });
            return;
        }
        res.json({
            message: 'Logged in',
            session: {
                id: '00000000-0000-0000-0000-000000000001',
                email: cleanEmail,
                fullName: cleanEmail.split('@')[0],
                role: 'Senior Analyst',
                orgId: localStore_1.DEFAULT_ORG_ID,
                orgName: localStore_1.localStore.organization.name,
                token: 'demo-enterprise-jwt-token',
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}
/**
 * POST /api/auth/logout
 * Terminates user session and records logout event in `audit_logs`.
 */
async function logoutUser(req, res) {
    try {
        if (supabase_1.isSupabaseConfigured && req.user) {
            await supabase_1.supabaseAdmin.from('audit_logs').insert({
                org_id: req.user.org_id || localStore_1.DEFAULT_ORG_ID,
                user_id: req.user.id !== '00000000-0000-0000-0000-000000000001' ? req.user.id : null,
                action: 'USER_SESSION_LOGOUT',
                details: { email: req.user.email },
            });
        }
        res.json({ message: 'Session terminated successfully.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}
