import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAppStore } from '../store/useAppStore';

// Client-Side Runtime Zod Schemas (Section 16)
export const DocumentUpdateZodSchema = z.object({
  documentType: z.string().min(1),
  overallConfidence: z.number().min(0).max(1),
  extractedData: z.record(z.any()),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed', 'needs_review']),
});

export const SearchQueryZodSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters long.'),
  limit: z.number().optional().default(5),
  documentId: z.string().optional(),
});

export interface McpToolCallTrace {
  toolName: string;
  mcpResourceUri: string;
  arguments: Record<string, any>;
  status: 'executed' | 'verified';
  outputPreview: string;
  latencyMs: number;
}

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
}

export interface DocumentItem {
  id: string;
  org_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  department_tag: string;
  extraction_template: string;
  strictness_used: 'fast' | 'deep';
  processing_time_ms: number;
  document_type: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';
  overall_confidence: number;
  extracted_data: {
    documentType?: string;
    confidenceScore?: number;
    entities?: {
      vendorOrIssuer?: string;
      recipient?: string;
      documentDate?: string;
      invoiceNumber?: string;
      paymentTerms?: string;
      totalAmount?: number;
      taxAmount?: number;
      currency?: string;
      governingLaw?: string;
      liabilityCap?: string;
      terminationClause?: string;
      patientReference?: string;
      diagnosisCodes?: string;
      equipmentModel?: string;
      serialNumber?: string;
      operatingVoltage?: string;
      maintenanceInterval?: string;
      lineItems?: LineItem[];
      summary?: string;
      keyTakeaways?: string[];
      verbatimQuotes?: string[];
      fullExtractedText?: string;
      [key: string]: any;
    };
    fieldConfidence?: Record<string, number>;
    mcpToolTrace?: McpToolCallTrace[];
    [key: string]: any;
  };
  preview_data_url?: string;
  created_at: string;
  updated_at: string;
}

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = isLocalhost
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function getAuthHeaders(): HeadersInit {
  const { session } = useAppStore.getState();
  return {
    Authorization: `Bearer ${session.token}`,
    'x-org-id': session.orgId,
    'x-user-role': session.role,
  };
}

async function safeReadJson<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  const text = await res.text();
  if (!text || !text.trim()) {
    throw new Error(`${defaultErrorMsg} (Server returned an empty response)`);
  }
  try {
    const parsed = JSON.parse(text);
    if (!res.ok) {
      throw new Error(parsed?.error || defaultErrorMsg);
    }
    return parsed as T;
  } catch (err) {
    if (!res.ok && (err as Error).message !== `Unexpected token`) {
      throw err;
    }
    throw new Error(defaultErrorMsg);
  }
}

export function useDocumentsQuery(filters?: {
  status?: string;
  type?: string;
  department?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters?.type && filters.type !== 'all') params.set('type', filters.type);
      if (filters?.department && filters.department !== 'all') params.set('department', filters.department);
      if (filters?.search) params.set('search', filters.search);

      const res = await fetch(`${API_BASE_URL}/api/documents?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      return safeReadJson<{
        documents: DocumentItem[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(res, 'Failed to load documents');
    },
  });
}

export function useDocumentDetailQuery(id?: string) {
  return useQuery({
    queryKey: ['document', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await safeReadJson<{ document: DocumentItem }>(res, 'Document not found');
      return data.document;
    },
  });
}

export function useUploadDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      file: File;
      department: string;
      template: string;
      strictness: 'fast' | 'deep';
    }) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('department', payload.department);
      formData.append('template', payload.template);
      formData.append('strictness', payload.strictness);

      const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      return safeReadJson<{ message: string; document: DocumentItem }>(res, 'Upload failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useUpdateDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      documentType: string;
      overallConfidence: number;
      extractedData: Record<string, any>;
      processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';
    }) => {
      const { id, ...body } = payload;
      // Validate with client-side Zod before sending
      const validated = DocumentUpdateZodSchema.parse(body);

      const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validated),
      });
      return safeReadJson<{ message: string; document: DocumentItem }>(
        res,
        'Failed to update document'
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useReprocessDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; strictness: 'fast' | 'deep'; template: string }) => {
      const res = await fetch(`${API_BASE_URL}/api/documents/${payload.id}/reprocess`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strictness: payload.strictness,
          template: payload.template,
        }),
      });
      return safeReadJson<{ message: string; document: DocumentItem }>(res, 'Reprocessing failed');
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useMcpSummarizeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; focusPrompt?: string }) => {
      const res = await fetch(`${API_BASE_URL}/api/mcp/summarize/${payload.id}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ focusPrompt: payload.focusPrompt }),
      });
      return safeReadJson<{
        message: string;
        mcpSummary: {
          documentId: string;
          fileName: string;
          documentType: string;
          executiveSummary: string;
          keyTakeaways: string[];
          verbatimQuotes: string[];
          structuredEntities: Record<string, any>;
          groundingStatus: string;
          mcpProtocolVersion: string;
          mcpToolTrace: McpToolCallTrace[];
        };
      }>(res, 'MCP Summarization failed');
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useSemanticSearchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { query: string; limit?: number; documentId?: string }) => {
      const validated = SearchQueryZodSchema.parse(payload);
      const res = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validated),
      });
      return safeReadJson<{
        query: string;
        answer: string;
        citations: Array<{
          chunkId: string;
          documentId: string;
          fileName: string;
          documentType: string;
          departmentTag: string;
          content: string;
          similarity: number;
          totalAmount?: number;
          vendorOrIssuer?: string;
        }>;
        mcpToolTrace?: McpToolCallTrace[];
        groundingStatus?: string;
        embeddingModel: string;
        vectorDimensions: number;
        latencyMs: number;
      }>(res, 'Search failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useAnalyticsQuery() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/analytics`, {
        headers: getAuthHeaders(),
      });
      return safeReadJson<{
        summary: {
          totalDocuments: number;
          completedDocs: number;
          needsReviewDocs: number;
          failedDocs: number;
          straightThroughRate: number;
          avgConfidence: number;
          avgLatencyMs: number;
          totalExtractedValue: number;
          indexedVectorChunks: number;
          errorRate: number;
        };
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
        auditLogs: Array<{
          id: string;
          action: string;
          details: Record<string, any>;
          created_at: string;
        }>;
      }>(res, 'Failed to fetch analytics');
    },
  });
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: getAuthHeaders(),
      });
      return safeReadJson<{
        organization: {
          id: string;
          name: string;
          webhook_url: string;
          strictness_mode: 'fast' | 'deep';
          confidence_threshold: number;
          custom_schemas: Array<{
            id: string;
            name: string;
            domain: string;
            fields: string[];
          }>;
        };
        environmentStatus: {
          supabaseConfigured: boolean;
          geminiConfigured: boolean;
          fastModel: string;
          reasoningModel: string;
          embeddingModel: string;
          vectorDimensions: number;
        };
      }>(res, 'Failed to fetch settings');
    },
  });
}

