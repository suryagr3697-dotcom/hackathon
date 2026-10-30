import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z, ZodSchema } from 'zod';
import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase';
import { DEFAULT_ORG_ID } from '../config/localStore';

// ============================================================================
// Role-Based Access Control (RBAC) Definitions & Permission Matrix
// ============================================================================
export type AppRole = 'admin' | 'reviewer' | 'viewer';

export type AppPermission =
  | 'read:documents'
  | 'upload:documents'
  | 'review:hitl'
  | 'reprocess:documents'
  | 'summarize:mcp'
  | 'read:analytics'
  | 'manage:settings'
  | 'dispatch:webhooks'
  | 'manage:users';

export const ROLE_PERMISSIONS: Record<AppRole, AppPermission[]> = {
  admin: [
    'read:documents',
    'upload:documents',
    'review:hitl',
    'reprocess:documents',
    'summarize:mcp',
    'read:analytics',
    'manage:settings',
    'dispatch:webhooks',
    'manage:users',
  ],
  reviewer: [
    'read:documents',
    'upload:documents',
    'review:hitl',
    'reprocess:documents',
    'summarize:mcp',
    'read:analytics',
  ],
  viewer: [
    'read:documents',
    'summarize:mcp',
    'read:analytics',
  ],
};

export function normalizeRole(rawRole?: string | null): AppRole {
  const lower = (rawRole || '').toLowerCase().trim();
  if (
    lower === 'admin' ||
    lower.includes('admin') ||
    lower.includes('architect') ||
    lower.includes('owner')
  ) {
    return 'admin';
  }
  if (
    lower === 'viewer' ||
    lower.includes('viewer') ||
    lower.includes('auditor') ||
    lower.includes('read')
  ) {
    return 'viewer';
  }
  return 'reviewer';
}

export function getRoleDisplayName(role: AppRole): string {
  switch (role) {
    case 'admin':
      return 'Organization Admin';
    case 'reviewer':
      return 'Senior Analyst (Reviewer)';
    case 'viewer':
      return 'Compliance Auditor (Viewer)';
  }
}

const TOKEN_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'aether-idp-enterprise-hmac-secret-2026';

export interface SignedTokenPayload {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  orgId: string;
  orgName: string;
  exp: number;
}

export function createSignedAppToken(payload: Omit<SignedTokenPayload, 'exp'>): string {
  const fullPayload: SignedTokenPayload = {
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encoded)
    .digest('base64url');
  return `aether_jwt.${encoded}.${signature}`;
}

export function verifySignedAppToken(token: string): SignedTokenPayload | null {
  try {
    if (!token.startsWith('aether_jwt.')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [, encoded, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(encoded)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SignedTokenPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================================
// Zod Schemas (Strictly conforming to Section 16 requirements)
// ============================================================================
export const DocumentUpdateZodSchema = z.object({
  documentType: z.string().min(1),
  overallConfidence: z.number().min(0).max(1),
  extractedData: z.record(z.any()),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed', 'needs_review']),
});

export const SearchQueryZodSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters long.'),
  limit: z.number().optional().default(5),
  documentId: z.string().optional(),
});

export const ReprocessOptionsZodSchema = z.object({
  strictness: z.enum(['fast', 'deep']).optional().default('fast'),
  template: z.string().optional().default('auto'),
});

export const SettingsUpdateZodSchema = z.object({
  name: z.string().min(2).optional(),
  webhook_url: z.string().optional(),
  strictness_mode: z.enum(['fast', 'deep']).optional(),
  confidence_threshold: z.number().min(0.1).max(1.0).optional(),
  custom_schemas: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        domain: z.string(),
        fields: z.array(z.string()),
      })
    )
    .optional(),
});

// ============================================================================
// Zod Middleware Factory
// ============================================================================
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
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
export function sanitizeFileName(fileName: string): string {
  const baseName = fileName.replace(/^.*[\\/]/, '');
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export function sanitizeSearchInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 1000);
}

// ============================================================================
// Authenticated Request Context & RBAC Authorization Middleware
// ============================================================================
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    org_id: string;
    role: AppRole;
    role_label: string;
    permissions: AppPermission[];
    full_name: string;
  };
  jwtToken?: string;
}

export async function requireOrganizationAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const headerRole = req.headers['x-user-role'] as string | undefined;
    const headerOrgId = req.headers['x-org-id'] as string | undefined;
    req.jwtToken = token;

    // 1. Check signed application JWT (`aether_jwt....`)
    if (token && token.startsWith('aether_jwt.')) {
      const verified = verifySignedAppToken(token);
      if (verified) {
        const effectiveRole = headerRole ? normalizeRole(headerRole) : normalizeRole(verified.role);
        req.user = {
          id: verified.id,
          email: verified.email,
          org_id: verified.orgId || headerOrgId || DEFAULT_ORG_ID,
          role: effectiveRole,
          role_label: getRoleDisplayName(effectiveRole),
          permissions: ROLE_PERMISSIONS[effectiveRole],
          full_name: verified.fullName,
        };
        next();
        return;
      }
    }

    // 2. Check live Supabase Auth JWT
    if (token && isSupabaseConfigured && token !== 'demo-enterprise-jwt-token') {
      const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (!authErr && userData?.user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('org_id, role, full_name')
          .eq('id', userData.user.id)
          .maybeSingle();

        const resolvedRole = headerRole
          ? normalizeRole(headerRole)
          : normalizeRole(profile?.role || userData.user.user_metadata?.role || 'reviewer');

        req.user = {
          id: userData.user.id,
          email: userData.user.email || 'analyst@apex-enterprise.io',
          org_id: profile?.org_id || headerOrgId || DEFAULT_ORG_ID,
          role: resolvedRole,
          role_label: getRoleDisplayName(resolvedRole),
          permissions: ROLE_PERMISSIONS[resolvedRole],
          full_name:
            profile?.full_name ||
            userData.user.user_metadata?.full_name ||
            'Enterprise Analyst',
        };
        next();
        return;
      }
    }

    // 3. Support explicit demo session token or fallback with role awareness
    const resolvedDemoRole = headerRole ? normalizeRole(headerRole) : 'admin';
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'elena.vance@apex-enterprise.io',
      org_id: headerOrgId || DEFAULT_ORG_ID,
      role: resolvedDemoRole,
      role_label: getRoleDisplayName(resolvedDemoRole),
      permissions: ROLE_PERMISSIONS[resolvedDemoRole],
      full_name: 'Dr. Elena Vance',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized access or invalid session token.' });
  }
}

/**
 * RBAC Role Guard Middleware: Ensures the authenticated user holds one of the allowed roles.
 */
export function requireRole(allowedRoles: AppRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role || 'viewer';
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: `Authorization Denied (403 Forbidden): Your current role "${getRoleDisplayName(
          userRole
        )}" (${userRole}) is not authorized to perform this action. Required role: ${allowedRoles.join(
          ' or '
        )}.`,
        code: 'RBAC_FORBIDDEN',
        currentRole: userRole,
        requiredRoles: allowedRoles,
      });
      return;
    }
    next();
  };
}

/**
 * RBAC Permission Guard Middleware: Ensures the authenticated user has a specific permission.
 */
export function requirePermission(permission: AppPermission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role || 'viewer';
    const userPermissions = req.user?.permissions || ROLE_PERMISSIONS[userRole];
    if (!userPermissions.includes(permission)) {
      res.status(403).json({
        error: `Authorization Denied (403 Forbidden): Missing required permission "${permission}" for role "${getRoleDisplayName(
          userRole
        )}".`,
        code: 'RBAC_PERMISSION_DENIED',
        currentRole: userRole,
        requiredPermission: permission,
      });
      return;
    }
    next();
  };
}
