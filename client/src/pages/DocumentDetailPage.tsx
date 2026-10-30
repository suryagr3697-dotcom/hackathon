import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useDocumentDetailQuery } from '../hooks/useIdpApi';
import { DocumentViewer } from '../components/DocumentViewer';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: document, isLoading, error } = useDocumentDetailQuery(id);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm text-slate-400">
        Loading document verification studio...
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <div className="text-base font-semibold text-white">Document Not Found</div>
        <p className="text-xs text-slate-400">
          The requested document ID could not be located in your organization workspace.
        </p>
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Document Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/documents"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h1 className="text-lg font-bold text-white">{document.file_name}</h1>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px]">
                {document.department_tag}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Human-in-the-Loop (HITL) Verification Studio · Inspect low-confidence fields, edit values, and lock schema
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Document Viewer & Editor */}
      <DocumentViewer document={document} />
    </div>
  );
};

