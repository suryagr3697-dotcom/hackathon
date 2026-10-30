import { Response } from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase';
import { DEFAULT_ORG_ID, localStore } from '../config/localStore';
import {
  AuthenticatedRequest,
  AppRole,
  normalizeRole,
  getRoleDisplayName,
  ROLE_PERMISSIONS,
  createSignedAppToken,
} from '../middleware/authAndValidation';

/**
 * POST /api/auth/register
 * Registers a user in Supabase Auth, creates/links their Organization in `organizations`,
 * and provisions their RBAC Role (`admin`, `reviewer`, or `viewer`) in `profiles`.
 */
export async function registerUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email, password, fullName, orgName, role } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(fullName || cleanEmail.split('@')[0]).trim();
    const cleanOrgName = String(orgName || 'Apex Global Enterprises').trim();
    const assignedRole: AppRole = normalizeRole(role || 'reviewer');

    if (isSupabaseConfigured) {
      let targetOrgId = DEFAULT_ORG_ID;
      if (cleanOrgName.toLowerCase() !== 'apex global enterprises') {
        const { data: existingOrg } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('name', cleanOrgName)
          .maybeSingle();

        if (existingOrg?.id) {
          targetOrgId = existingOrg.id;
        } else {
          const { data: createdOrg } = await supabaseAdmin
            .from('organizations')
            .insert({ name: cleanOrgName })
            .select('id')
            .single();
          if (createdOrg?.id) {
            targetOrgId = createdOrg.id;
          }
        }
      }

      const statelessAuthClient = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: createdAuth, error: createErr } = await statelessAuthClient.auth.admin.createUser({
        email: cleanEmail,
        password: String(password),
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          org_id: targetOrgId,
          role: assignedRole,
        },
      });

      if (createErr && !createErr.message.toLowerCase().includes('already')) {
        res.status(400).json({ error: createErr.message });
        return;
      }

      const { data: signInData, error: signInErr } = await statelessAuthClient.auth.signInWithPassword({
        email: cleanEmail,
        password: String(password),
      });

      if (signInErr || !signInData.user) {
        res.status(400).json({ error: signInErr?.message || 'Registration succeeded, please sign in.' });
        return;
      }

      const userId = signInData.user.id || createdAuth?.user?.id || crypto.randomUUID();

      await supabaseAdmin.from('profiles').upsert(
        {
          id: userId,
          org_id: targetOrgId,
          full_name: cleanName,
          role: assignedRole,
        },
        { onConflict: 'id' }
      );

      await supabaseAdmin.from('audit_logs').insert({
        org_id: targetOrgId,
        user_id: userId,
        action: 'USER_ACCOUNT_REGISTERED',
        details: {
          email: cleanEmail,
          fullName: cleanName,
          orgName: cleanOrgName,
          role: assignedRole,
          permissions: ROLE_PERMISSIONS[assignedRole],
        },
      });

      const appToken = createSignedAppToken({
        id: userId,
        email: cleanEmail,
        fullName: cleanName,
        role: assignedRole,
        orgId: targetOrgId,
        orgName: cleanOrgName,
      });

      res.status(201).json({
        message: `Account registered as ${getRoleDisplayName(assignedRole)}!`,
        session: {
          id: userId,
          email: cleanEmail,
          fullName: cleanName,
          role: assignedRole,
          roleLabel: getRoleDisplayName(assignedRole),
          permissions: ROLE_PERMISSIONS[assignedRole],
          orgId: targetOrgId,
          orgName: cleanOrgName,
          token: signInData.session?.access_token || appToken,
          isAuthenticated: true,
        },
      });
      return;
    }

    const fallbackId = crypto.randomUUID();
    const fallbackToken = createSignedAppToken({
      id: fallbackId,
      email: cleanEmail,
      fullName: cleanName,
      role: assignedRole,
      orgId: DEFAULT_ORG_ID,
      orgName: cleanOrgName,
    });

    res.status(201).json({
      message: `Account registered as ${getRoleDisplayName(assignedRole)}`,
      session: {
        id: fallbackId,
        email: cleanEmail,
        fullName: cleanName,
        role: assignedRole,
        roleLabel: getRoleDisplayName(assignedRole),
        permissions: ROLE_PERMISSIONS[assignedRole],
        orgId: DEFAULT_ORG_ID,
        orgName: cleanOrgName,
        token: fallbackToken,
        isAuthenticated: true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

/**
 * POST /api/auth/login
 * Authenticates an existing user or quick-role demo account and returns their RBAC session + permissions.
 */
export async function loginUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email, password, quickRole, role } = req.body;

    // Support instant RBAC Role Demo Login (Admin / Reviewer / Viewer)
    if (quickRole) {
      const targetRole: AppRole = normalizeRole(quickRole);
      const demoProfiles: Record<AppRole, { id: string; email: string; fullName: string }> = {
        admin: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@apex-enterprise.io',
          fullName: 'Dr. Elena Vance (Admin)',
        },
        reviewer: {
          id: '00000000-0000-0000-0000-000000000002',
          email: 'reviewer@apex-enterprise.io',
          fullName: 'Marcus Chen (Reviewer)',
        },
        viewer: {
          id: '00000000-0000-0000-0000-000000000003',
          email: 'auditor@apex-enterprise.io',
          fullName: 'Sarah Jenkins (Viewer)',
        },
      };

      const chosen = demoProfiles[targetRole];
      const token = createSignedAppToken({
        id: chosen.id,
        email: chosen.email,
        fullName: chosen.fullName,
        role: targetRole,
        orgId: DEFAULT_ORG_ID,
        orgName: 'Apex Global Enterprises',
      });

      if (isSupabaseConfigured) {
        await supabaseAdmin.from('audit_logs').insert({
          org_id: DEFAULT_ORG_ID,
          user_id: null,
          action: 'USER_RBAC_SESSION_LOGIN',
          details: {
            email: chosen.email,
            role: targetRole,
            roleLabel: getRoleDisplayName(targetRole),
          },
        });
      }

      res.json({
        message: `Signed in as ${getRoleDisplayName(targetRole)}`,
        session: {
          id: chosen.id,
          email: chosen.email,
          fullName: chosen.fullName,
          role: targetRole,
          roleLabel: getRoleDisplayName(targetRole),
          permissions: ROLE_PERMISSIONS[targetRole],
          orgId: DEFAULT_ORG_ID,
          orgName: 'Apex Global Enterprises',
          token,
          isAuthenticated: true,
        },
      });
      return;
    }

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (isSupabaseConfigured) {
      const statelessAuthClient = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data, error } = await statelessAuthClient.auth.signInWithPassword({
        email: cleanEmail,
        password: String(password),
      });

      if (error || !data.user) {
        res.status(401).json({ error: error?.message || 'Invalid login credentials.' });
        return;
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('org_id, full_name, role')
        .eq('id', data.user.id)
        .maybeSingle();

      const orgId = profile?.org_id || DEFAULT_ORG_ID;
      const resolvedRole: AppRole = normalizeRole(
        role || profile?.role || data.user.user_metadata?.role || 'reviewer'
      );

      if (role && role !== profile?.role) {
        await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              org_id: orgId,
              full_name:
                profile?.full_name || data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
              role: resolvedRole,
            },
            { onConflict: 'id' }
          );
      }

      const { data: orgData } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle();

      await supabaseAdmin.from('audit_logs').insert({
        org_id: orgId,
        user_id: data.user.id,
        action: 'USER_SESSION_LOGIN',
        details: {
          email: cleanEmail,
          role: resolvedRole,
          permissions: ROLE_PERMISSIONS[resolvedRole],
        },
      });

      const fullName =
        profile?.full_name || data.user.user_metadata?.full_name || cleanEmail.split('@')[0];
      const orgName = orgData?.name || 'Apex Global Enterprises';

      const appToken = createSignedAppToken({
        id: data.user.id,
        email: cleanEmail,
        fullName,
        role: resolvedRole,
        orgId,
        orgName,
      });

      res.json({
        message: `Authenticated as ${getRoleDisplayName(resolvedRole)}!`,
        session: {
          id: data.user.id,
          email: cleanEmail,
          fullName,
          role: resolvedRole,
          roleLabel: getRoleDisplayName(resolvedRole),
          permissions: ROLE_PERMISSIONS[resolvedRole],
          orgId,
          orgName,
          token: data.session?.access_token || appToken,
          isAuthenticated: true,
        },
      });
      return;
    }

    const fallbackRole: AppRole = cleanEmail.includes('admin')
      ? 'admin'
      : cleanEmail.includes('view') || cleanEmail.includes('audit')
        ? 'viewer'
        : 'reviewer';

    const fallbackToken = createSignedAppToken({
      id: '00000000-0000-0000-0000-000000000001',
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0],
      role: fallbackRole,
      orgId: DEFAULT_ORG_ID,
      orgName: localStore.organization.name,
    });

    res.json({
      message: `Signed in as ${getRoleDisplayName(fallbackRole)}`,
      session: {
        id: '00000000-0000-0000-0000-000000000001',
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0],
        role: fallbackRole,
        roleLabel: getRoleDisplayName(fallbackRole),
        permissions: ROLE_PERMISSIONS[fallbackRole],
        orgId: DEFAULT_ORG_ID,
        orgName: localStore.organization.name,
        token: fallbackToken,
        isAuthenticated: true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

/**
 * GET /api/auth/me
 * Returns current authenticated user profile, active RBAC role, and granted permissions.
 */
export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.full_name,
      role: req.user.role,
      roleLabel: req.user.role_label,
      permissions: req.user.permissions,
      orgId: req.user.org_id,
    },
  });
}

/**
 * PUT /api/auth/role
 * Updates the current user's RBAC role (`admin`, `reviewer`, `viewer`) in Supabase `profiles`
 * and returns a newly signed session token reflecting the updated permissions.
 */
export async function updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const newRole: AppRole = normalizeRole(req.body?.role);
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const email = req.user?.email || 'analyst@apex-enterprise.io';
    const fullName = req.user?.full_name || 'Enterprise User';
    const orgId = req.user?.org_id || DEFAULT_ORG_ID;

    if (isSupabaseConfigured && !userId.startsWith('00000000-0000-0000-0000-00000000000')) {
      await supabaseAdmin
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      await supabaseAdmin.from('audit_logs').insert({
        org_id: orgId,
        user_id: userId,
        action: 'RBAC_ROLE_UPDATED',
        details: {
          email,
          newRole,
          roleLabel: getRoleDisplayName(newRole),
          permissions: ROLE_PERMISSIONS[newRole],
        },
      });
    }

    const updatedToken = createSignedAppToken({
      id: userId,
      email,
      fullName,
      role: newRole,
      orgId,
      orgName: 'Apex Global Enterprises',
    });

    res.json({
      message: `Authorization role updated to ${getRoleDisplayName(newRole)} (${newRole.toUpperCase()})`,
      session: {
        id: userId,
        email,
        fullName,
        role: newRole,
        roleLabel: getRoleDisplayName(newRole),
        permissions: ROLE_PERMISSIONS[newRole],
        orgId,
        orgName: 'Apex Global Enterprises',
        token: updatedToken,
        isAuthenticated: true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

/**
 * POST /api/auth/logout
 * Terminates user session and records logout event in `audit_logs`.
 */
export async function logoutUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (isSupabaseConfigured && req.user) {
      await supabaseAdmin.from('audit_logs').insert({
        org_id: req.user.org_id || DEFAULT_ORG_ID,
        user_id: !req.user.id.startsWith('00000000-0000-0000-0000-00000000000') ? req.user.id : null,
        action: 'USER_SESSION_LOGOUT',
        details: { email: req.user.email, role: req.user.role },
      });
    }
    res.json({ message: 'Session terminated successfully.' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
