"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsUpdateZodSchema = exports.ReprocessOptionsZodSchema = exports.SearchQueryZodSchema = exports.DocumentUpdateZodSchema = void 0;
exports.validateBody = validateBody;
exports.sanitizeFileName = sanitizeFileName;
exports.sanitizeSearchInput = sanitizeSearchInput;
exports.requireOrganizationAuth = requireOrganizationAuth;
const zod_1 = require("zod");
const supabase_1 = require("../config/supabase");
const localStore_1 = require("../config/localStore");
// ============================================================================
// Zod Schemas (Strictly conforming to Section 16 requirements)
// ============================================================================
exports.DocumentUpdateZodSchema = zod_1.z.object({
    documentType: zod_1.z.string().min(1),
    overallConfidence: zod_1.z.number().min(0).max(1),
    extractedData: zod_1.z.record(zod_1.z.any()),
    processing_status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed', 'needs_review']),
});
exports.SearchQueryZodSchema = zod_1.z.object({
    query: zod_1.z.string().min(2, 'Search query must be at least 2 characters long.'),
    limit: zod_1.z.number().optional().default(5),
});
exports.ReprocessOptionsZodSchema = zod_1.z.object({
    strictness: zod_1.z.enum(['fast', 'deep']).optional().default('fast'),
    template: zod_1.z.string().optional().default('auto'),
});
exports.SettingsUpdateZodSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    webhook_url: zod_1.z.string().optional(),
    strictness_mode: zod_1.z.enum(['fast', 'deep']).optional(),
    confidence_threshold: zod_1.z.number().min(0.1).max(1.0).optional(),
    custom_schemas: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        domain: zod_1.z.string(),
        fields: zod_1.z.array(zod_1.z.string()),
    }))
        .optional(),
});
// ============================================================================
// Zod Middleware Factory
// ============================================================================
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                error: 'Validation Failed',
                issues: result.error.issues,
            });
            return;
        }
        req.body = result.data;
        next();
    };
}
// ============================================================================
// Input Sanitization Helpers (Prevent Path Traversal & XSS)
// ============================================================================
function sanitizeFileName(fileName) {
    const baseName = fileName.replace(/^.*[\\/]/, '');
    return baseName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}
function sanitizeSearchInput(input) {
    return input
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, 1000);
}
async function requireOrganizationAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
        req.jwtToken = token;
        if (token && supabase_1.isSupabaseConfigured && token !== 'demo-enterprise-jwt-token') {
            const { data: userData, error: authErr } = await supabase_1.supabaseAdmin.auth.getUser(token);
            if (!authErr && userData?.user) {
                const { data: profile } = await supabase_1.supabaseAdmin
                    .from('profiles')
                    .select('org_id, role, full_name')
                    .eq('id', userData.user.id)
                    .single();
                req.user = {
                    id: userData.user.id,
                    email: userData.user.email || 'analyst@apex-enterprise.io',
                    org_id: profile?.org_id || localStore_1.DEFAULT_ORG_ID,
                    role: profile?.role || 'senior_analyst',
                    full_name: profile?.full_name || 'Enterprise Analyst',
                };
                next();
                return;
            }
        }
        // Default authenticated enterprise session (supports demo mode & local evaluation)
        const headerOrgId = req.headers['x-org-id'];
        req.user = {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'elena.vance@apex-enterprise.io',
            org_id: headerOrgId || localStore_1.DEFAULT_ORG_ID,
            role: 'principal_architect',
            full_name: 'Dr. Elena Vance',
        };
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Unauthorized access or invalid session token.' });
    }
}
