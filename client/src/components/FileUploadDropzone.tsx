import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FlaskConical,
  ArrowRight,
} from 'lucide-react';
import { useUploadDocumentMutation } from '../hooks/useIdpApi';
import { useAppStore } from '../store/useAppStore';

const SAMPLE_TEMPLATES = [
  {
    label: 'Sample Q4 Cloud Invoice (PDF)',
    fileName: 'INV-2026-Q4-GoogleCloud-VertexAI.pdf',
    mime: 'application/pdf',
    dept: 'Finance',
    template: 'Invoice Schema',
    content: `INVOICE: INV-GCP-2026-1194
Vendor: Google Cloud EMEA Limited
Recipient: Apex Global Enterprises
Date: 2026-10-28
Payment Terms: Net 30
Line Item 1: Vertex AI Gemini 2.5 Pro Throughput Units (10x @ $3,400.00) = $34,000.00
Line Item 2: Cloud Spanner Enterprise Multi-Region Instance = $6,200.00
Total Amount: $42,450.00 USD`,
  },
  {
    label: 'Sample Enterprise NDA / SLA Contract',
    fileName: 'NDA-SLA-2026-Quantum Robotics-Corp.pdf',
    mime: 'application/pdf',
    dept: 'Legal',
    template: 'Contract Clause Schema',
    content: `MASTER NON-DISCLOSURE & SERVICE LEVEL AGREEMENT
Parties: Quantum Robotics Corporation & Apex Global Enterprises
Effective Date: 2026-10-29
Governing Law: State of New York
Liability Cap: $250,000 aggregate cap
Termination: 30 days written notice required by either party.
Total Retainer Value: $94,500.00 USD`,
  },
  {
    label: 'Sample Medical Diagnostic Claim',
    fileName: 'MED-CLAIM-2026-StanfordHealth-9012.txt',
    mime: 'text/plain',
    dept: 'Healthcare',
    template: 'Medical Claim Schema',
    content: `MEDICAL CLAIM SUBMISSION
Provider: Stanford Health Diagnostic Center
Recipient: Apex Corporate Health Plan
Date: 2026-10-25
Diagnosis: ICD-10 J20.9, R05.9
Total Amount: $3,680.00 USD`,
  },
];

export const FileUploadDropzone: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    strictnessMode,
    setStrictnessMode,
    selectedTemplate,
    setSelectedTemplate,
    selectedDepartment,
    setSelectedDepartment,
  } = useAppStore();

  const uploadMutation = useUploadDocumentMutation();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewText, setPreviewText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastIngestedDocId, setLastIngestedDocId] = useState<string | null>(null);

  const validateAndStageFile = (file: File) => {
    setErrorMessage(null);
    setLastIngestedDocId(null);

    const allowedExt = /\.(pdf|png|jpe?g|webp|tiff?|txt|csv|docx?)$/i;
    if (!allowedExt.test(file.name) && !file.type.startsWith('image/') && !file.type.includes('pdf') && !file.type.startsWith('text/')) {
      setErrorMessage('Unsupported file format. Please upload PDF, PNG, JPEG, WEBP, TIFF, DOCX, or TXT.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('text/') || file.size < 64000) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        setPreviewText(text.slice(0, 400));
      };
      reader.readAsText(file);
    } else {
      setPreviewText(`Binary document ready (${(file.size / 1024).toFixed(1)} KB · ${file.type || 'application/pdf'})`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndStageFile(e.dataTransfer.files[0]);
    }
  };

  const handleRunPipeline = async (fileToUpload?: File, deptOverride?: string, templateOverride?: string) => {
    const targetFile = fileToUpload || selectedFile;
    if (!targetFile) return;

    setErrorMessage(null);
    try {
      const result = await uploadMutation.mutateAsync({
        file: targetFile,
        department: deptOverride || selectedDepartment,
        template: templateOverride || selectedTemplate,
        strictness: strictnessMode,
      });
      setLastIngestedDocId(result.document.id);
      setSelectedFile(null);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to execute IDP extraction pipeline.');
    }
  };

  const handleGenerateSample = async (sample: (typeof SAMPLE_TEMPLATES)[0]) => {
    const blob = new Blob([sample.content], { type: sample.mime });
    const file = new File([blob], sample.fileName, { type: sample.mime });
    setSelectedDepartment(sample.dept);
    setSelectedTemplate(sample.template);
    await handleRunPipeline(file, sample.dept, sample.template);
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            Multimodal Document Ingestion & Schema Routing
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Supports PDF, PNG, JPEG, WEBP, Scanned TIFF, DOCX & TXT — automatically classified and indexed into pgvector.
          </p>
        </div>

        {/* Form & Advisory Configuration Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="Finance">Dept: Finance & Accounting</option>
            <option value="Legal">Dept: Legal & Compliance</option>
            <option value="Healthcare">Dept: Healthcare & Claims</option>
            <option value="Engineering">Dept: Engineering & Ops</option>
          </select>

          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="Auto-Detect Schema">Profile: Auto-Detect Schema</option>
            <option value="Invoice Schema">Profile: Invoice Schema</option>
            <option value="Contract Clause Schema">Profile: Contract Clause Schema</option>
            <option value="Medical Claim Schema">Profile: Medical Claim Schema</option>
            <option value="Technical Specification Schema">Profile: Technical Spec Schema</option>
          </select>

          <select
            value={strictnessMode}
            onChange={(e) => setStrictnessMode(e.target.value as 'fast' | 'deep')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-indigo-300 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="fast">Fast (gemini-2.5-flash)</option>
            <option value="deep">Deep Analysis (gemini-2.5-pro)</option>
          </select>
        </div>
      </div>

      {/* Drag and Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-all p-6 text-center ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-slate-700/80 hover:border-indigo-500/60 bg-slate-950/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.txt,.csv,.docx"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              validateAndStageFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            {uploadMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>
          <div className="text-sm font-medium text-slate-200">
            {selectedFile ? (
              <span className="text-indigo-300 font-semibold">{selectedFile.name}</span>
            ) : (
              <>
                Drag & drop your enterprise document here, or{' '}
                <span className="text-indigo-400 underline">browse computer</span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-500">
            PDF, PNG, JPEG, WEBP, Scanned TIFF, or TXT up to 25 MB
          </p>
        </div>
      </div>

      {/* Staged File Preview & Launch Button */}
      {selectedFile && (
        <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white">
                {selectedFile.name}{' '}
                <span className="text-slate-400 font-normal">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              {previewText && (
                <p className="text-[11px] text-slate-400 font-mono line-clamp-1 mt-0.5">
                  {previewText}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={uploadMutation.isPending}
            onClick={(e) => {
              e.stopPropagation();
              handleRunPipeline();
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-600/20"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Extracting with Gemini...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Run Multimodal Extraction
              </>
            )}
          </button>
        </div>
      )}

      {/* Quick One-Click Sample Document Generators for Immediate Testing */}
      {!compact && (
        <div className="pt-1 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
            Instant Test Samples:
          </span>
          {SAMPLE_TEMPLATES.map((sample) => (
            <button
              key={sample.fileName}
              type="button"
              disabled={uploadMutation.isPending}
              onClick={() => handleGenerateSample(sample)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
            >
              + {sample.label}
            </button>
          ))}
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Banner */}
      {lastIngestedDocId && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Document classified, Zod-validated, and vector-indexed into Supabase `document_chunks`!
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/documents/${lastIngestedDocId}`)}
            className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-semibold flex items-center gap-1 shrink-0"
          >
            Inspect in Verification Studio <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

