"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.isSupabaseConfigured = void 0;
exports.createAuthenticatedSupabaseClient = createAuthenticatedSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';
exports.isSupabaseConfigured = Boolean(process.env.SUPABASE_URL &&
    !process.env.SUPABASE_URL.includes('your-supabase-project.supabase.co') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('your-supabase-service-role-key'));
/**
 * Service Role Supabase Client for backend administrative operations,
 * background pipelines, storage ingestion, and migration execution.
 */
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
/**
 * Creates a request-scoped Supabase client enforcing Row Level Security (RLS)
 * for the authenticated user's JWT token.
 */
function createAuthenticatedSupabaseClient(jwtToken) {
    if (!jwtToken) {
        return exports.supabaseAdmin;
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${jwtToken}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
