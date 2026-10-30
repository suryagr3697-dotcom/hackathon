import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Webhook,
  Sliders,
  CheckCircle2,
  Play,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useSettingsQuery, API_BASE_URL } from '../hooks/useIdpApi';
import { useAppStore } from '../store/useAppStore';

export const SettingsPage: React.FC = () => {
  const { data, refetch } = useSettingsQuery();
  const {
    session,
    hasPermission,
    setAuthModalOpen,
    confidenceThreshold,
    setConfidenceThreshold,
    strictnessMode,
    setStrictnessMode,
  } = useAppStore();

  const isAdmin = hasPermission('manage:settings');

  const [orgName, setOrgName] = useState('Apex Global Enterprises');
  const [webhookUrl, setWebhookUrl] = useState(
    'https://api.apex-enterprise.internal/webhooks/idp-events'
  );
  const [newSchemaName, setNewSchemaName] = useState('');
  const [newSchemaDomain, setNewSchemaDomain] = useState('Financial & Accounting');
  const [newSchemaFields, setNewSchemaFields] = useState(
    'vendorOrIssuer, recipient, documentDate, totalAmount, taxAmount'
  );
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [migrationOutput, setMigrationOutput] = useState<string | null>(null);

  useEffect(() => {
    if (data?.organization) {
      setOrgName(data.organization.name);
      setWebhookUrl(data.organization.webhook_url);
    }
  }, [data]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);
    const res = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
        'x-org-id': session.orgId,
        'x-user-role': session.role,
      },
      body: JSON.stringify({
        name: orgName,
        webhook_url: webhookUrl,
        strictness_mode: strictnessMode,
        confidence_threshold: confidenceThreshold,
      }),
    });
    const resData = await res.json();
    if (res.ok) {
      setStatusBanner('Organization configuration, strictness policy, and webhook URL saved!');
      refetch();
    } else {
      setStatusBanner(resData.error || 'Failed to save settings (Admin role required).');
    }
  };

  const handleAddCustomSchema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchemaName.trim()) return;
    const existing = data?.organization?.custom_schemas || [];
    const updatedSchemas = [
      ...existing,
      {
        id: `custom-${Date.now()}`,
        name: newSchemaName.trim(),
        domain: newSchemaDomain,
        fields: newSchemaFields
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      },
    ];

    const res = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
        'x-org-id': session.orgId,
        'x-user-role': session.role,
      },
      body: JSON.stringify({ custom_schemas: updatedSchemas }),
    });
    const resData = await res.json();
    if (res.ok) {
      setNewSchemaName('');
      setStatusBanner(`Added custom extraction profile "${newSchemaName}"!`);
      refetch();
    } else {
      setStatusBanner(resData.error || 'Failed to add custom schema (Admin role required).');
    }
  };

  const handleRunMigrationRunner = async () => {
    setMigrationOutput('Running backend/src/scripts/migrate.ts against Supabase...');
    const res = await fetch(`${API_BASE_URL}/api/admin/migrate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.token}`,
        'x-org-id': session.orgId,
        'x-user-role': session.role,
      },
    });
    const result = await res.json();
    setMigrationOutput(result.message || result.error || 'Migration runner finished.');
  };

  const schemas = data?.organization?.custom_schemas || [];
  const envStatus = data?.environmentStatus;

  return (
    <div className="space-y-6 pb-12">
      {!isAdmin && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="text-xs text-amber-200">
            <strong>RBAC Authorization Notice ({session.roleLabel}):</strong> Only users with the{' '}
            <strong>Organization Admin (ADMIN)</strong> role are authorized to modify organization
            settings, custom schemas, or run database migrations.
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 shrink-0"
          >
            Switch to Admin Role
          </button>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          API Configuration, Custom Schemas & Supabase Migration Hub
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage extraction strictness, HITL confidence thresholds, custom domain templates, webhooks, and database migrations
        </p>
      </div>

      {statusBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Organization, Thresholds & Webhook Config */}
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-6 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5 shadow-xl"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Extraction Advisory & Validation Thresholds</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Default Gemini Extraction Strictness
            </label>
            <select
              value={strictnessMode}
              onChange={(e) => setStrictnessMode(e.target.value as 'fast' | 'deep')}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="fast">
                Fast Extraction (gemini-2.5-flash — High-Speed Classification & Line Items)
              </option>
              <option value="deep">
                Deep Legal/Financial Analysis (gemini-2.5-pro — Complex Multi-Clause Reasoning)
              </option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-300">
                Minimum Acceptable Confidence Threshold (HITL Trigger)
              </span>
              <span className="font-mono font-bold text-amber-300">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.98"
              step="0.01"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Any document or extracted field scoring below {Math.round(confidenceThreshold * 100)}% is
              automatically highlighted in yellow and routed to `needs_review`.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-cyan-400" />
              Enterprise Webhook Notification Endpoint
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
          >
            Save Organization & Threshold Settings
          </button>
        </form>

        {/* Right Column: Supabase Cloud Migration Runner & Security Status */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Supabase Cloud PostgreSQL & Migration Runner</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px]">
                001_initial_schema.sql
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              The complete SQL schema (`/supabase/migrations/001_initial_schema.sql`) defines
              `organizations`, `profiles`, `documents`, `document_chunks` (768d `pgvector` with
              IVFFlat cosine index), `audit_logs`, and strict Row Level Security (`get_user_org_id()`).
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Server-Side Gemini SDK:</span>
                <span className="text-emerald-400">@google/genai Isolated</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fast / Deep Models:</span>
                <span className="text-slate-200">
                  {envStatus?.fastModel || 'gemini-2.5-flash'} /{' '}
                  {envStatus?.reasoningModel || 'gemini-2.5-pro'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vector Embedding Model:</span>
                <span className="text-cyan-300">
                  {envStatus?.embeddingModel || 'text-embedding-004'} (768 dims)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunMigrationRunner}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              Trigger `001_initial_schema.sql` Migration & Seed Runner
            </button>

            {migrationOutput && (
              <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 text-[11px] font-mono text-indigo-300">
                {migrationOutput}
              </div>
            )}
          </div>

          {/* Custom Extraction Schema Profiles */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Custom Extraction Schema Templates ({schemas.length})</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {schemas.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{s.name}</span>
                    <span className="text-[10px] text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      {s.domain}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Fields: {s.fields.join(', ')}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCustomSchema} className="pt-2 border-t border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newSchemaName}
                  onChange={(e) => setNewSchemaName(e.target.value)}
                  placeholder="New Schema Name (e.g. Purchase Order)"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <input
                  type="text"
                  value={newSchemaDomain}
                  onChange={(e) => setNewSchemaDomain(e.target.value)}
                  placeholder="Target Domain"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSchemaFields}
                  onChange={(e) => setNewSchemaFields(e.target.value)}
                  placeholder="Comma-separated schema fields..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

