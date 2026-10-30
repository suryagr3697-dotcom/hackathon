import { create } from 'zustand';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  orgId: string;
  orgName: string;
  token: string;
  isAuthenticated?: boolean;
}

const STORAGE_KEY = 'aether_idp_supabase_session';

const DEFAULT_SESSION: UserSession = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'elena.vance@apex-enterprise.io',
  fullName: 'Dr. Elena Vance',
  role: 'Principal AI Architect',
  orgId: '11111111-1111-1111-1111-111111111111',
  orgName: 'Apex Global Enterprises',
  token: 'demo-enterprise-jwt-token',
  isAuthenticated: true,
};

function loadInitialSession(): UserSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_SESSION;
}

interface AppState {
  session: UserSession;
  strictnessMode: 'fast' | 'deep';
  selectedTemplate: string;
  selectedDepartment: string;
  confidenceThreshold: number;
  authModalOpen: boolean;
  setSession: (session: UserSession) => void;
  logoutSession: () => void;
  setStrictnessMode: (mode: 'fast' | 'deep') => void;
  setSelectedTemplate: (template: string) => void;
  setSelectedDepartment: (dept: string) => void;
  setConfidenceThreshold: (threshold: number) => void;
  setAuthModalOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  session: loadInitialSession(),
  strictnessMode: 'fast',
  selectedTemplate: 'Auto-Detect Schema',
  selectedDepartment: 'Finance',
  confidenceThreshold: 0.85,
  authModalOpen: false,
  setSession: (session) => {
    const updated = { ...session, isAuthenticated: true };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    set({ session: updated });
  },
  logoutSession: () => {
    const loggedOut: UserSession = {
      id: '',
      email: 'Guest (Signed Out)',
      fullName: 'Signed Out',
      role: 'Unauthenticated',
      orgId: '11111111-1111-1111-1111-111111111111',
      orgName: 'Apex Global Enterprises',
      token: '',
      isAuthenticated: false,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedOut));
    } catch {
      // ignore
    }
    set({ session: loggedOut });
  },
  setStrictnessMode: (strictnessMode) => set({ strictnessMode }),
  setSelectedTemplate: (selectedTemplate) => set({ selectedTemplate }),
  setSelectedDepartment: (selectedDepartment) => set({ selectedDepartment }),
  setConfidenceThreshold: (confidenceThreshold) => set({ confidenceThreshold }),
  setAuthModalOpen: (authModalOpen) => set({ authModalOpen }),
}));
