import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Database,
  FileCheck2,
  SearchCode,
  Cpu,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useAnalyticsQuery } from '../hooks/useIdpApi';

export const LandingPage: React.FC = () => {
  const { data: analytics } = useAnalyticsQuery();
  const summary = analytics?.summary;

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 p-8 lg:p-12 shadow-2xl">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powered by Gemini 2.5 Flash, Gemini 2.5 Pro & Supabase pgvector</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Enterprise Intelligent Document Processing &{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Vector Knowledge Discovery
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Automate multi-format document ingestion, multi-class AI routing, schema-validated JSON
            extraction, Human-in-the-Loop confidence verification, and 768-dimensional semantic RAG
            queries with strict PostgreSQL Row Level Security.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/dashboard"
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
            >
              <span>Launch Executive Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/documents"
              className="px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-all"
            >
              <FileCheck2 className="w-4 h-4 text-indigo-400" />
              <span>Open Document Studio</span>
            </Link>
            <Link
              to="/search"
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-sm font-semibold flex items-center gap-2 transition-all"
            >
              <SearchCode className="w-4 h-4" />
              <span>Semantic RAG Q&A</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Live Enterprise Statistics Preview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Ingested Enterprise Corpus</div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {summary?.totalDocuments ?? 5} Documents
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Multi-domain active pipeline
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Mean Extraction Confidence</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {summary?.avgConfidence ?? 92.8}%
          </div>
          <div className="text-[11px] text-slate-400">
            Validated against strict Zod & Gemini schemas
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Extracted Financial Value</div>
          <div className="text-2xl font-extrabold text-indigo-300 font-mono">
            ${Number(summary?.totalExtractedValue ?? 297370).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">
            Across Invoices, Contracts & Claims
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Indexed pgvector Chunks</div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono">
            {summary?.indexedVectorChunks ?? 5} Vectors (768d)
          </div>
          <div className="text-[11px] text-slate-400">
            `text-embedding-004` cosine similarity
          </div>
        </div>
      </section>

      {/* Target Enterprise Domains & Capabilities */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            title: 'Financial & Accounting',
            desc: 'Automated line-item extraction for Invoices, Purchase Orders, Bank Statements & Tax Forms.',
            badge: 'Invoice Schema',
            icon: Layers,
          },
          {
            title: 'Legal & Compliance',
            desc: 'Deep clause analysis for NDAs, Master Service Agreements, SLAs, Liability Caps & Governing Law.',
            badge: 'Gemini 2.5 Pro',
            icon: ShieldCheck,
          },
          {
            title: 'Healthcare & Insurance',
            desc: 'Precision ICD-10 diagnosis and CPT procedure extraction across Medical Claims & Lab Reports.',
            badge: 'HIPAA-Ready RLS',
            icon: Cpu,
          },
          {
            title: 'Engineering & Operations',
            desc: 'Structured telemetry and maintenance intervals from Equipment Spec Sheets & Manuals.',
            badge: 'pgvector RAG',
            icon: Database,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {item.badge}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
};

