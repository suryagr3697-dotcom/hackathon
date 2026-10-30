import React, { useState } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { useDocumentsQuery } from '../hooks/useIdpApi';
import { FileUploadDropzone } from '../components/FileUploadDropzone';
import { DocumentTable } from '../components/DocumentTable';

export const DocumentsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useDocumentsQuery({
    status: statusFilter,
    type: typeFilter,
    department: departmentFilter,
    search: searchQuery,
  });

  const documents = data?.documents || [];

  const handleBatchExportCsv = () => {
    const headers = [
      'ID',
      'FileName',
      'DocumentType',
      'Department',
      'Status',
      'Confidence',
      'VendorOrIssuer',
      'TotalAmount',
      'Currency',
      'CreatedAt',
    ];
    const rows = documents.map((d) => [
      d.id,
      `"${d.file_name}"`,
      d.document_type,
      d.department_tag,
      d.processing_status,
      d.overall_confidence,
      `"${(d.extracted_data?.entities?.vendorOrIssuer || '').replace(/"/g, '""')}"`,
      d.extracted_data?.entities?.totalAmount ?? 0,
      d.extracted_data?.entities?.currency || 'USD',
      d.created_at,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enterprise_idp_corpus_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Document Management & Ingestion Hub
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload multi-format files, filter by AI classification or verification status, and export structured reports
          </p>
        </div>

        <button
          type="button"
          onClick={handleBatchExportCsv}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          Export Corpus CSV ({documents.length})
        </button>
      </div>

      {/* Ingestion Widget */}
      <FileUploadDropzone />

      {/* Search & Multi-Facet Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by filename, vendor, summary, or document class..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Verified (Completed)</option>
            <option value="needs_review">Needs HITL Review</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Document Classes</option>
            <option value="Invoice">Invoices</option>
            <option value="Contract">Contracts & SLAs</option>
            <option value="MedicalRecord">Medical Claims</option>
            <option value="TechnicalSpec">Technical Specs</option>
            <option value="TaxForm">Tax Forms</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Departments</option>
            <option value="Finance">Finance</option>
            <option value="Legal">Legal</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Engineering">Engineering</option>
          </select>
        </div>
      </div>

      {/* Document Data Grid */}
      <DocumentTable documents={documents} isLoading={isLoading} />
    </div>
  );
};

