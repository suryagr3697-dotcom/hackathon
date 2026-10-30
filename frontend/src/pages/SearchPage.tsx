import React from 'react';
import { Database, Sparkles } from 'lucide-react';
import { SemanticSearchBox } from '../components/SemanticSearchBox';

export const SearchPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>Semantic Knowledge Discovery (Vector RAG)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
              pgvector 768d
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Query across your organization’s entire ingested document archive using Gemini `text-embedding-004` cosine similarity and grounded synthesis
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>RPC: `match_document_chunks`</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 ml-1" />
        </div>
      </div>

      <SemanticSearchBox />
    </div>
  );
};

