import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  RefreshCw,
  Download,
  Code2,
  Sliders,
  AlertTriangle,
  Lock,
  Sparkles,
  Plus,
  Trash2,
  Send,
} from 'lucide-react';
import {
  DocumentItem,
  LineItem,
  useUpdateDocumentMutation,
  useReprocessDocumentMutation,
} from '../hooks/useIdpApi';
import { ConfidenceBadge } from './ConfidenceBadge';
import { useAppStore } from '../store/useAppStore';

interface DocumentViewerProps {
  document: DocumentItem;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ document }) => {
  const { confidenceThreshold } = useAppStore();
  const updateMutation = useUpdateDocumentMutation();
  const reprocessMutation = useReprocessDocumentMutation();

  const [activeTab, setActiveTab] = useState<'interactive' | 'json'>('interactive');
  const [docType, setDocType] = useState(document.document_type);
  const [entities, setEntities] = useState<Record<string, any>>(
    document.extracted_data?.entities || {}
  );
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, number>>(
    document.extracted_data?.fieldConfidence || {}
  );
  const [rawJsonText, setRawJsonText] = useState(
    JSON.stringify(document.extracted_data, null, 2)
  );
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  useEffect(() => {
    setDocType(document.document_type);
    setEntities(document.extracted_data?.entities || {});
    setFieldConfidence(document.extracted_data?.fieldConfidence || {});
    setRawJsonText(JSON.stringify(document.extracted_data, null, 2));
  }, [document]);

  const handleEntityChange = (key: string, value: any) => {
    setEntities((prev) => ({
      ...prev,
      [key]: value,
    }));
    // Human override sets field confidence to 1.00 (100% human verified)
    setFieldConfidence((prev) => ({
      ...prev,
      [key]: 1.0,
    }));
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const items: LineItem[] = Array.isArray(entities.lineItems) ? [...entities.lineItems] : [];
    items[index] = {
      ...items[index],
      [field]: field === 'description' ? String(value) : Number(value),
    };
    handleEntityChange('lineItems', items);
  };

  const handleAddLineItem = () => {
    const items: LineItem[] = Array.isArray(entities.lineItems) ? [...entities.lineItems] : [];
    items.push({
      description: 'New Verified Line Item',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    });
    handleEntityChange('lineItems', items);
  };

  const handleRemoveLineItem = (index: number) => {
    const items: LineItem[] = Array.isArray(entities.lineItems) ? [...entities.lineItems] : [];
    items.splice(index, 1);
    handleEntityChange('lineItems', items);
  };

  const handleApproveAndLock = async () => {
    setBannerMsg(null);
    const updatedExtractedData =
      activeTab === 'json'
        ? JSON.parse(rawJsonText)
        : {
            ...document.extracted_data,
            documentType: docType,
            confidenceScore: 0.99,
            entities,
            fieldConfidence,
          };

    await updateMutation.mutateAsync({
      id: document.id,
      documentType: docType,
      overallConfidence: 0.99,
      extractedData: updatedExtractedData,
      processing_status: 'completed',
    });

    setBannerMsg('Human-in-the-Loop verification saved! Document approved, locked at 99% confidence, and synced to pgvector.');
  };

  const handleReprocessWithPro = async () => {
    setBannerMsg(null);
    const res = await reprocessMutation.mutateAsync({
      id: document.id,
      strictness: 'deep',
      template: document.extraction_template || 'Deep Verification Schema',
    });
    setBannerMsg(res.message);
  };

  const handleExport = (format: 'json' | 'csv' | 'report') => {
    const baseName = document.file_name.replace(/\.[^/.]+$/, '');
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${baseName}_verified.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const rows = [
        ['Field', 'Value', 'Confidence'],
        ...Object.entries(entities)
          .filter(([k]) => k !== 'lineItems')
          .map(([k, v]) => [
            k,
            `"${String(v ?? '').replace(/"/g, '""')}"`,
            `${Math.round((fieldConfidence[k] ?? document.overall_confidence) * 100)}%`,
          ]),
      ];
      const csvContent = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${baseName}_extracted.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      window.print();
    }
  };

  const handleTriggerWebhook = async () => {
    const res = await fetch('/api/webhooks/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: document.id, format: 'JSON' }),
    });
    const data = await res.json();
    setWebhookStatus(data.message || 'Webhook dispatched');
    setTimeout(() => setWebhookStatus(null), 5000);
  };

  const scalarFields = Object.entries(entities).filter(
    ([key]) => key !== 'lineItems' && key !== 'summary'
  );
  const lineItems: LineItem[] = Array.isArray(entities.lineItems) ? entities.lineItems : [];

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ConfidenceBadge score={document.overall_confidence} />
          <span className="text-xs text-slate-400 font-mono">
            Latency: {document.processing_time_ms}ms · Model:{' '}
            {document.strictness_used === 'deep' ? 'gemini-2.5-pro' : 'gemini-2.5-flash'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('json')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            type="button"
            onClick={handleTriggerWebhook}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Push Webhook
          </button>
          <button
            type="button"
            disabled={reprocessMutation.isPending}
            onClick={handleReprocessWithPro}
            className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
            Re-Analyze (2.5 Pro)
          </button>
          <button
            type="button"
            disabled={updateMutation.isPending}
            onClick={handleApproveAndLock}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <Lock className="w-3.5 h-3.5" />
            Approve & Lock
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bannerMsg}</span>
        </div>
      )}

      {webhookStatus && (
        <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{webhookStatus}</span>
        </div>
      )}

      {/* Split-Screen Verification Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANE: High-Fidelity Document Preview Renderer */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Original Source Document Preview</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {document.mime_type} · {(document.file_size / 1024).toFixed(1)} KB
            </span>
          </div>

          <div className="p-5 flex-1 bg-slate-950/50 overflow-y-auto space-y-4">
            {document.preview_data_url && document.mime_type.startsWith('image/') ? (
              <img
                src={document.preview_data_url}
                alt={document.file_name}
                className="w-full rounded-xl border border-slate-800 object-contain max-h-[540px]"
              />
            ) : (
              /* Simulated High-Contrast Paper Sheet Preview of the Document */
              <div className="rounded-xl bg-white text-slate-900 p-6 shadow-2xl space-y-5 font-sans border border-slate-300">
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                      {docType.toUpperCase()} DOCUMENT FACSIMILE
                    </div>
                    <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">
                      {entities.vendorOrIssuer || document.file_name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Recipient: {entities.recipient || 'Apex Global Enterprises'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-slate-700">
                      {entities.invoiceNumber || entities.serialNumber || entities.patientReference || 'REF-VERIFIED'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Date: {entities.documentDate || '2026-10-30'}
                    </div>
                  </div>
                </div>

                {/* Highlighted Key Metadata on Document Sheet */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  {scalarFields.slice(0, 6).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-slate-400 uppercase text-[10px] font-semibold block">
                        {k.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="font-semibold text-slate-800 break-words">
                        {String(v ?? '—')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Line Items Table on Document Sheet */}
                {lineItems.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Structured Line Items
                    </div>
                    <table className="w-full text-xs border-t border-b border-slate-200">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-200">
                          <th className="py-1.5">Description</th>
                          <th className="py-1.5 text-right">Qty</th>
                          <th className="py-1.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lineItems.map((item, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-2 font-medium text-slate-800">
                              {item.description}
                            </td>
                            <td className="py-2 text-right font-mono text-slate-600">
                              {item.quantity ?? 1}
                            </td>
                            <td className="py-2 text-right font-mono font-semibold text-slate-900">
                              ${Number(item.totalPrice || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Executive Summary Footer */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Total Validated Value</span>
                  <span className="text-base font-extrabold font-mono text-indigo-700">
                    ${Number(entities.totalAmount || 0).toLocaleString()} {entities.currency || 'USD'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Interactive Key-Value HITL Editor & Raw JSON Schema Inspector */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('interactive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'interactive'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Interactive Key-Value Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'json'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Strict JSON Schema View
              </button>
            </div>
            <span className="text-[11px] text-slate-400">
              Threshold: <strong className="text-amber-300">{Math.round(confidenceThreshold * 100)}%</strong>
            </span>
          </div>

          {activeTab === 'interactive' ? (
            <div className="p-5 space-y-5 overflow-y-auto max-h-[680px]">
              {/* Document Classification Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    AI Document Classification
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Invoice">Invoice (Financial)</option>
                    <option value="Contract">Contract / NDA / SLA (Legal)</option>
                    <option value="MedicalRecord">Medical Claim / Lab Report</option>
                    <option value="TaxForm">Tax Return / W-2 / 1099</option>
                    <option value="TechnicalSpec">Technical Specification</option>
                    <option value="Receipt">Expense Receipt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Executive Summary
                  </label>
                  <input
                    type="text"
                    value={entities.summary || ''}
                    onChange={(e) => handleEntityChange('summary', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Extracted Key-Value Pairs with Low-Confidence Highlighting */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Extracted Domain Entities (Low-Confidence Highlighted in Amber)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {scalarFields.map(([key, value]) => {
                    const conf = fieldConfidence[key] ?? document.overall_confidence;
                    const isLowConfidence = conf < confidenceThreshold;

                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-xl border transition-all ${
                          isLowConfidence
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-slate-300 capitalize flex items-center gap-1.5">
                            {isLowConfidence && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            {key.replace(/([A-Z])/g, ' $1')}
                          </label>
                          <ConfidenceBadge score={conf} showLabel={false} size="sm" />
                        </div>
                        <input
                          type={typeof value === 'number' ? 'number' : 'text'}
                          value={value ?? ''}
                          onChange={(e) =>
                            handleEntityChange(
                              key,
                              typeof value === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Editable Structured Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Structured Line Items ({lineItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line Item
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-950/80 border border-slate-800"
                    >
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity ?? 1}
                          onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                          placeholder="Qty"
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono text-right"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={item.totalPrice ?? 0}
                          onChange={(e) => handleLineItemChange(idx, 'totalPrice', e.target.value)}
                          placeholder="Total"
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-emerald-300 font-mono text-right"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 flex-1">
              <textarea
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
                rows={22}
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

