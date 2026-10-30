import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileStack,
  SearchCode,
  BarChart3,
  Settings,
  Sparkles,
  Database,
  CheckCircle2,
  Home,
} from 'lucide-react';
import { useDocumentsQuery } from '../hooks/useIdpApi';

export const Sidebar: React.FC = () => {
  const { data } = useDocumentsQuery();
  const docs = data?.documents || [];
  const reviewCount = docs.filter((d) => d.processing_status === 'needs_review').length;

  const navItems = [
    { to: '/', label: 'Platform Overview', icon: Home, exact: true },
    { to: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    {
      to: '/documents',
      label: 'Document Hub',
      icon: FileStack,
      badge: reviewCount > 0 ? `${reviewCount} Review` : undefined,
    },
    { to: '/search', label: 'Semantic RAG Search', icon: SearchCode },
    { to: '/analytics', label: 'Accuracy & Audit Logs', icon: BarChart3 },
    { to: '/settings', label: 'Schemas & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800/80 bg-slate-950/60 hidden md:flex flex-col justify-between p-4">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Core IDP Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Active Pipeline Status Card */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              AI Engine Pipeline
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Online
            </span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Fast Classifier:</span>
              <span className="font-mono text-slate-200">gemini-2.5-flash</span>
            </div>
            <div className="flex justify-between">
              <span>Deep Reasoning:</span>
              <span className="font-mono text-slate-200">gemini-2.5-pro</span>
            </div>
            <div className="flex justify-between">
              <span>Vector RAG:</span>
              <span className="font-mono text-slate-200">text-embedding-004</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Storage & pgvector Status */}
      <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>Supabase pgvector (768d)</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          IVFFlat cosine index active with strict Organization RLS policies.
        </p>
      </div>
    </aside>
  );
};

