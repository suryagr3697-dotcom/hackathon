import { create } from 'zustand';

export type AppRole = 'admin' | 'reviewer' | 'viewer';

export const ROLE_PERMISSIONS_MAP: Record<AppRole, string[]> = {
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

export function normalizeAppRole(rawRole?: string): AppRole {
  const lower = (rawRole || '').toLowerCase().trim();
  if (lower === 'admin' || lower.includes('admin') || lower.includes('architect')) return 'admin';
  if (lower === 'viewer' || lower.includes('viewer') || lower.includes('auditor')) return 'viewer';
  return 'reviewer';
}

export function getRoleDisplayLabel(role: AppRole): string {
  switch (role) {
    case 'admin':
      return 'Organization Admin';
    case 'reviewer':
      return 'Senior Analyst (Reviewer)';
    case 'viewer':
      return 'Compliance Auditor (Viewer)';
  }
}

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  roleLabel: string;
  permissions: string[];
  orgId: string;
  orgName: string;
  token: string;
  isAuthenticated: boolean;
}

const STORAGE_KEY = 'aether_idp_auth_session_v2';

const UNAUTHENTICATED_SESSION: UserSession = {
  id: '',
  email: '',
  fullName: 'Guest',
  role: 'viewer',
  roleLabel: 'Unauthenticated',
  permissions: [],
  orgId: '11111111-1111-1111-1111-111111111111',
  orgName: 'Apex Global Enterprises',
  token: '',
  isAuthenticated: false,
};

function loadInitialSession(): UserSession {
  try {
    localStorage.removeItem('aether_idp_supabase_session');
    localStorage.removeItem('aether_idp_auth_session_v2');
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
  return UNAUTHENTICATED_SESSION;
}

interface AppState {
  session: UserSession;
  strictnessMode: 'fast' | 'deep';
  selectedTemplate: string;
  selectedDepartment: string;
  confidenceThreshold: number;
  authModalOpen: boolean;
  setSession: (session: Partial<UserSession> & { email: string; token: string }) => void;
  logoutSession: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: AppRole[]) => boolean;
  setStrictnessMode: (mode: 'fast' | 'deep') => void;
  setSelectedTemplate: (template: string) => void;
  setSelectedDepartment: (dept: string) => void;
  setConfidenceThreshold: (threshold: number) => void;
  setAuthModalOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  session: loadInitialSession(),
  strictnessMode: 'fast',
  selectedTemplate: 'Auto-Detect Schema',
  selectedDepartment: 'Finance',
  confidenceThreshold: 0.85,
  authModalOpen: false,
  setSession: (incoming) => {
    const normalizedRole = normalizeAppRole(incoming.role);
    const updated: UserSession = {
      id: incoming.id || '00000000-0000-0000-0000-000000000001',
      email: incoming.email,
      fullName: incoming.fullName || incoming.email.split('@')[0],
      role: normalizedRole,
      roleLabel: incoming.roleLabel || getRoleDisplayLabel(normalizedRole),
      permissions:
        Array.isArray(incoming.permissions) && incoming.permissions.length > 0
          ? incoming.permissions
          : ROLE_PERMISSIONS_MAP[normalizedRole],
      orgId: incoming.orgId || '11111111-1111-1111-1111-111111111111',
      orgName: incoming.orgName || 'Apex Global Enterprises',
      token: incoming.token,
      isAuthenticated: true,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    set({ session: updated });
  },
  logoutSession: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    set({ session: UNAUTHENTICATED_SESSION });
  },
  hasPermission: (permission: string) => {
    const { session } = get();
    if (!session.isAuthenticated) return false;
    return session.permissions.includes(permission);
  },
  hasRole: (roles: AppRole[]) => {
    const { session } = get();
    if (!session.isAuthenticated) return false;
    return roles.includes(session.role);
  },
  setStrictnessMode: (strictnessMode) => set({ strictnessMode }),
  setSelectedTemplate: (selectedTemplate) => set({ selectedTemplate }),
  setSelectedDepartment: (selectedDepartment) => set({ selectedDepartment }),
  setConfidenceThreshold: (confidenceThreshold) => set({ confidenceThreshold }),
  setAuthModalOpen: (authModalOpen) => set({ authModalOpen }),
}));
