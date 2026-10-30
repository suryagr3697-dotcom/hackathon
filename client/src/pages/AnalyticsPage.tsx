import React from 'react';
import {
  Activity,
  ShieldCheck,
  Clock,
  Terminal,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAnalyticsQuery } from '../hooks/useIdpApi';
import { AnalyticsCharts } from '../components/AnalyticsCharts';

export const AnalyticsPage: React.FC = () => {
  const { data, isLoading } = useAnalyticsQuery();

  if (isLoading || !data) {
    return (
      <div className="p-12 text-center text-sm text-slate-400">
        Loading system telemetry and audit logs...
      </div>
    );
  }

  const { summary, categoryBreakdown, volumeTrend, auditLogs } = data;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          System Performance, Accuracy & Immutable Audit Trail
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time telemetry across Gemini 2.5 Flash/Pro extraction pipelines, field confidence distributions, and RLS audit events
        </p>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Straight-Through Processing</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {summary.straightThroughRate}%
          </div>
          <div className="text-[11px] text-slate-500">
            {summary.completedDocs} of {summary.totalDocuments} auto-verified
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Mean Field Confidence</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {summary.avgConfidence}%
          </div>
          <div className="text-[11px] text-slate-500">
            Across all schema-validated keys
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Mean End-to-End Latency</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono">
            {summary.avgLatencyMs} ms
          </div>
          <div className="text-[11px] text-slate-500">
            Upload + Multimodal + 768d Vector
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pipeline Failure / Error Rate</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300 font-mono">
            {summary.errorRate}%
          </div>
          <div className="text-[11px] text-slate-500">
            Zero unhandled Zod schema exceptions
          </div>
        </div>
      </div>

      {/* Visual Breakdown Charts */}
      <AnalyticsCharts categoryBreakdown={categoryBreakdown} volumeTrend={volumeTrend} />

      {/* Enterprise Audit Trail Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">
              Organization Audit Logs (`audit_logs` PostgreSQL Table)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Showing latest {auditLogs.length} events
          </span>
        </div>

        <div className="divide-y divide-slate-800/70">
          {auditLogs.map((log) => {
            const isWarning = log.action.includes('LOW_CONFIDENCE');
            return (
              <div
                key={log.id}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30 text-xs"
              >
                <div className="flex items-start gap-3">
                  {isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span
                      className={`font-mono font-bold ${
                        isWarning ? 'text-amber-300' : 'text-indigo-300'
                      }`}
                    >
                      {log.action}
                    </span>
                    <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                      {JSON.stringify(log.details)}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-500 shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

