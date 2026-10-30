import React from 'react';
import { BarChart3, Clock, Layers, ShieldCheck } from 'lucide-react';

interface AnalyticsChartsProps {
  categoryBreakdown: Array<{
    category: string;
    count: number;
    percentage: number;
    avgConfidence: number;
    totalValue: number;
  }>;
  volumeTrend: Array<{
    day: string;
    processed: number;
    verified: number;
    flagged: number;
    avgLatencyMs: number;
  }>;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  categoryBreakdown,
  volumeTrend,
}) => {
  const maxProcessed = Math.max(...volumeTrend.map((v) => v.processed), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: 7-Day Processing Throughput & Verification Bar Chart */}
      <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              7-Day Ingestion Throughput & Straight-Through Verification
            </h3>
            <p className="text-xs text-slate-400">
              Daily document volume across Gemini 2.5 Flash & 2.5 Pro pipelines
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Verified
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Flagged HITL
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {volumeTrend.map((item) => {
            const verifiedWidth = Math.round((item.verified / maxProcessed) * 100);
            const flaggedWidth = Math.round((item.flagged / maxProcessed) * 100);

            return (
              <div key={item.day} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 w-14">{item.day}</span>
                  <div className="flex-1 mx-3 h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                    <div
                      style={{ width: `${verifiedWidth}%` }}
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all"
                    />
                    {flaggedWidth > 0 && (
                      <div
                        style={{ width: `${flaggedWidth}%` }}
                        className="bg-amber-400 h-full transition-all"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400 w-40 justify-end">
                    <span className="text-slate-200 font-semibold">{item.processed} docs</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {item.avgLatencyMs}ms
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Multi-Class Document Category Distribution & Confidence */}
      <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-xl">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Domain Classification & Confidence Breakdown
          </h3>
          <p className="text-xs text-slate-400">
            Accuracy and dollar volume segmented by AI document class
          </p>
        </div>

        <div className="space-y-3.5">
          {categoryBreakdown.map((cat) => (
            <div
              key={cat.category}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  {cat.category}{' '}
                  <span className="text-slate-400 font-normal">({cat.count} docs)</span>
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-emerald-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {cat.avgConfidence}% avg conf
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, cat.avgConfidence)}%` }}
                  className={`h-full rounded-full ${
                    cat.avgConfidence >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Share of Corpus: {cat.percentage}%</span>
                <span>
                  Extracted Value: ${Number(cat.totalValue || 0).toLocaleString()} USD
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

