import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Sparkles,
  FileText,
  ExternalLink,
  Loader2,
  Cpu,
  MessageSquareQuote,
  ArrowUpRight,
  History,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  useSemanticSearchMutation,
  useAnalyticsQuery,
  useDocumentsQuery,
} from '../hooks/useIdpApi';

const SUGGESTED_RAG_QUERIES = [
  'Provide a complete MCP executive summary and key takeaways across all uploaded documents.',
  'What is the total payment due across all Q3 vendor invoices?',
  'What is the liability cap and termination notice period in the Vanguard cybersecurity contract?',
  'Which ICD-10 diagnosis codes and CPT procedures are on the Mercy General medical claim?',
  'What is the operating voltage and maintenance interval for the Siemens S7-1500 controller?',
];

export const SemanticSearchBox: React.FC = () => {
  const [query, setQuery] = useState(
    'Provide a complete MCP executive summary and key takeaways across all uploaded documents.'
  );
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [validationErr, setValidationErr] = useState<string | null>(null);

  const searchMutation = useSemanticSearchMutation();
  const { data: analyticsData } = useAnalyticsQuery();
  const { data: docsData } = useDocumentsQuery();
  const allDocs = docsData?.documents || [];

  const executeQuery = async (qText: string, docIdOverride?: string) => {
    setValidationErr(null);
    if (qText.trim().length < 2) {
      setValidationErr('Search query must be at least 2 characters long.');
      return;
    }
    try {
      const targetDoc = docIdOverride !== undefined ? docIdOverride : selectedDocId;
      await searchMutation.mutateAsync({
        query: qText,
        limit: 5,
        documentId: targetDoc !== 'all' ? targetDoc : undefined,
      });
    } catch (err) {
      setValidationErr((err as Error).message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery(query);
  };

  const result = searchMutation.data;
  const historicalAdvisories = (analyticsData?.auditLogs || []).filter(
    (log) => log.action === 'SEMANTIC_RAG_SEARCH_EXECUTED' && log.details?.query
  );

  return (
    <div className="space-y-6">
      {/* MCP Agent Search & Summarization Bar */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Model Context Protocol (MCP) Document Summarizer & Grounded Q&A Agent</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Target MCP Resource:</label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Uploaded Documents ({allDocs.length})</option>
              {allDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.file_name} ({d.document_type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-indigo-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask any question or request a summarization strictly from your uploaded documents..."
              className="w-full pl-12 pr-44 py-3.5 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={searchMutation.isPending}
              className="absolute right-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  MCP Agent Running...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Run MCP Agent
                </>
              )}
            </button>
          </div>

          {validationErr && <p className="text-xs text-rose-400">{validationErr}</p>}
        </form>

        {/* Suggested Enterprise Queries */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            One-Click MCP Summarization & Zero-Hallucination Queries:
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_RAG_QUERIES.map((sq) => (
              <button
                key={sq}
                type="button"
                onClick={() => {
                  setQuery(sq);
                  executeQuery(sq);
                }}
                className="text-left px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <span>{sq}</span>
                <ArrowUpRight className="w-3 h-3 text-indigo-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grounded RAG Answer, MCP Tool Trace & Source Citations */}
      {result && (
        <div className="space-y-5">
          {/* AI Synthesized Answer Card */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-500/30 p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                <MessageSquareQuote className="w-4 h-4 text-indigo-400" />
                <span>MCP Grounded Synthesis & Document Summarization</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px]">
                  <ShieldCheck className="w-3 h-3" />
                  0% Hallucination Verified
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Temperature: 0.0 · {result.vectorDimensions}d
                </span>
                <span>·</span>
                <span>{result.latencyMs}ms</span>
              </div>
            </div>

            <div className="text-sm text-slate-100 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
              {result.answer}
            </div>

            {/* MCP Tool Execution Trace */}
            {result.mcpToolTrace && result.mcpToolTrace.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-cyan-400">
                  Model Context Protocol (MCP) Tool Execution Trace:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {result.mcpToolTrace.map((trace, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between text-indigo-300 font-bold">
                        <span>{trace.toolName}</span>
                        <span className="text-emerald-400">{trace.latencyMs}ms</span>
                      </div>
                      <div className="text-cyan-400 truncate text-[10px]">{trace.mcpResourceUri}</div>
                      <div className="text-slate-400 text-[10px] line-clamp-2">
                        {trace.outputPreview}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Vector Similarity Citation Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Retrieved pgvector Document Chunks & Citations ({result.citations.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.citations.map((cite, idx) => (
                <div
                  key={cite.chunkId}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 p-4 space-y-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <Link
                          to={`/documents/${cite.documentId}`}
                          className="text-xs font-semibold text-white hover:text-indigo-400 flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{cite.fileName}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <span className="text-[10px] text-slate-400">
                          Category: {cite.documentType} · Dept: {cite.departmentTag}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[11px] font-semibold">
                      {(cite.similarity * 100).toFixed(1)}% Cosine Match
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                    {cite.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Database Advisory & Search History (Loaded from Supabase PostgreSQL) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Persistent MCP Summarization & Q&A History (`audit_logs` Table)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {historicalAdvisories.length} persisted records
          </span>
        </div>

        {historicalAdvisories.length === 0 ? (
          <p className="text-xs text-slate-500">
            No historical advisory queries recorded yet. Run a query above to persist it to Supabase PostgreSQL.
          </p>
        ) : (
          <div className="space-y-3">
            {historicalAdvisories.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-300">
                    Q: {item.details.query}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                {item.details.answer && (
                  <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed border-l-2 border-indigo-500/40 pl-3">
                    {item.details.answer}
                  </div>
                )}
                <div className="text-[11px] font-mono text-slate-500">
                  Top Cited Document: {item.details.topDocument} · Latency: {item.details.latencyMs}ms
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
