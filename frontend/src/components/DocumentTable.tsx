import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Download,
  Building,
} from 'lucide-react';
import { DocumentItem } from '../hooks/useIdpApi';
import { ConfidenceBadge } from './ConfidenceBadge';

interface DocumentTableProps {
  documents: DocumentItem[];
  isLoading?: boolean;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({ documents, isLoading }) => {
  const renderStatusBadge = (status: DocumentItem['processing_status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs HITL Review
          </span>
        );
      case 'processing':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
    }
  };

  const handleExportSingleJson = (doc: DocumentItem) => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.file_name.replace(/\.[^/.]+$/, '')}_extracted.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-8 text-center text-sm text-slate-400">
        Loading organization document corpus...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-10 text-center space-y-2">
        <FileText className="w-8 h-8 text-slate-500 mx-auto" />
        <div className="text-sm font-semibold text-slate-200">No matching documents found</div>
        <p className="text-xs text-slate-400">
          Upload a document above or clear your active search filters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-4">Document & Vendor</th>
              <th className="py-3.5 px-4">AI Classification</th>
              <th className="py-3.5 px-4">Department</th>
              <th className="py-3.5 px-4">Extracted Total</th>
              <th className="py-3.5 px-4">Confidence Score</th>
              <th className="py-3.5 px-4">Pipeline Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-sm">
            {documents.map((doc) => {
              const entities = doc.extracted_data?.entities || {};
              const amount = entities.totalAmount;
              const currency = entities.currency || 'USD';

              return (
                <tr
                  key={doc.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <Link
                          to={`/documents/${doc.id}`}
                          className="font-semibold text-slate-100 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                        >
                          <span>{doc.file_name}</span>
                        </Link>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-500" />
                            {entities.vendorOrIssuer || 'Unidentified Issuer'}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-[11px]">
                            {(doc.file_size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200">
                      {doc.document_type}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      {doc.strictness_used === 'deep' ? 'gemini-2.5-pro' : 'gemini-2.5-flash'}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-xs text-slate-300">{doc.department_tag || 'General'}</span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-xs text-slate-200 font-semibold">
                    {amount !== undefined
                      ? `$${Number(amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ${currency}`
                      : '—'}
                  </td>

                  <td className="py-3.5 px-4">
                    <ConfidenceBadge score={doc.overall_confidence} showLabel={false} />
                  </td>

                  <td className="py-3.5 px-4">{renderStatusBadge(doc.processing_status)}</td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleExportSingleJson(doc)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Download Validated JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        to={`/documents/${doc.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium transition-all"
                      >
                        <span>Studio</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

