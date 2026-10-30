import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
} from 'lucide-react';
import { useAnalyticsQuery, useDocumentsQuery } from '../hooks/useIdpApi';
import { FileUploadDropzone } from '../components/FileUploadDropzone';
import { DocumentTable } from '../components/DocumentTable';
import { AnalyticsCharts } from '../components/AnalyticsCharts';

export const DashboardPage: React.FC = () => {
  const { data: analyticsData } = useAnalyticsQuery();
  const { data: docsData, isLoading } = useDocumentsQuery();

  const summary = analyticsData?.summary;
  const recentDocs = (docsData?.documents || []).slice(0, 5);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Executive IDP Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multimodal ingestion metrics, confidence distributions, and straight-through processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/search"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5" /> Query pgvector RAG
          </Link>
          <Link
            to="/documents"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5"
          >
            <span>All Documents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start justify-between">
          <div>
            <span className="text-xs text-slate-400">Processed Documents</span>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">
              {summary?.totalDocuments ?? 5}
            </div>
            <span className="text-[11px] text-emerald-400">
              {summary?.straightThroughRate ?? 80}% Straight-Through Verified
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start justify-between">
          <div>
            <span className="text-xs text-slate-400">Mean Extraction Accuracy</span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
              {summary?.avgConfidence ?? 92.8}%
            </div>
            <span className="text-[11px] text-slate-400">
              Gemini 2.5 Multimodal Schema
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start justify-between">
          <div>
            <span className="text-xs text-slate-400">Avg Pipeline Latency</span>
            <div className="text-2xl font-extrabold text-cyan-300 font-mono mt-1">
              {summary?.avgLatencyMs ?? 1862} ms
            </div>
            <span className="text-[11px] text-slate-400">
              Includes 768d embedding index
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start justify-between">
          <div>
            <span className="text-xs text-slate-400">Human Review Queue (HITL)</span>
            <div className="text-2xl font-extrabold text-amber-300 font-mono mt-1">
              {summary?.needsReviewDocs ?? 1}
            </div>
            <span className="text-[11px] text-amber-400/90">
              Flagged below 85% threshold
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Ingestion Dropzone */}
      <FileUploadDropzone />

      {/* Analytics Charts */}
      {analyticsData && (
        <AnalyticsCharts
          categoryBreakdown={analyticsData.categoryBreakdown}
          volumeTrend={analyticsData.volumeTrend}
        />
      )}

      {/* Recent Ingestion History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Document Ingestions</h2>
          <Link to="/documents" className="text-xs text-indigo-400 hover:underline">
            View Full Corpus →
          </Link>
        </div>
        <DocumentTable documents={recentDocs} isLoading={isLoading} />
      </div>
    </div>
  );
};

