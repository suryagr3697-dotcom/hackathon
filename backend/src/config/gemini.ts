import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY environment variable is missing.');
}

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'MISSING_GEMINI_API_KEY',
});

let geminiKeyRejected = false;

export function isGeminiApiAvailable(): boolean {
  const key = process.env.GEMINI_API_KEY || '';
  if (
    !key ||
    key === 'MISSING_GEMINI_API_KEY' ||
    key.includes('your-gemini-api-key-here') ||
    key.startsWith('AQ.') ||
    geminiKeyRejected
  ) {
    return false;
  }
  return true;
}

export function markGeminiKeyIfRejected(err: unknown): void {
  const msg = (err as Error)?.message || '';
  if (msg.includes('401') || msg.includes('API key not valid') || msg.includes('UNAUTHENTICATED')) {
    geminiKeyRejected = true;
  }
}

// Standard model definitions with automatic fallback to current active Google AI Studio models
export const FAST_MODEL = 'gemini-2.5-flash';
export const REASONING_MODEL = 'gemini-2.5-pro';
export const EMBEDDING_MODEL = 'text-embedding-004';

export const ACTIVE_FAST_MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash'];
export const ACTIVE_REASONING_MODELS = ['gemini-3.8-pro', 'gemini-3.8-flash', 'gemini-2.5-pro'];
export const ACTIVE_EMBEDDING_MODELS = ['gemini-embedding-001', 'text-embedding-004'];

export const IDP_SYSTEM_PROMPT = `You are an elite AI Document Intelligence Engine, MCP-Orchestrated Document Summarizer, and Zero-Hallucination Data Extractor.
CRITICAL GROUNDING DIRECTIVE:
1. You must read the uploaded document thoroughly and extract/summarize ONLY facts, figures, clauses, and text explicitly present inside the document.
2. NEVER invent, assume, extrapolate, or hallucinate any information outside the provided document. If a field is not present in the document, omit it or mark it as "Not specified in document".
3. Provide a comprehensive, multi-section executive summary, key takeaways, verbatim textual evidence quotes, full transcribed document text, and structured key-value entities conforming strictly to the requested JSON schema.`;

export const documentExtractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    documentType: {
      type: Type.STRING,
      description: 'Classify the document type based strictly on its content: Invoice, TaxForm, Contract, MedicalRecord, Receipt, TechnicalSpec, Report, Other',
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: 'Overall extraction and grounding confidence score between 0.0 and 1.0',
    },
    entities: {
      type: Type.OBJECT,
      description: 'Extracted key-value entities and comprehensive MCP document summarization grounded strictly in the document',
      properties: {
        vendorOrIssuer: { type: Type.STRING, description: 'Author, issuer, organization, or vendor explicitly named in the document' },
        recipient: { type: Type.STRING, description: 'Recipient, client, or target audience explicitly named in the document' },
        documentDate: { type: Type.STRING, description: 'Document date (YYYY-MM-DD or as written in document)' },
        invoiceNumber: { type: Type.STRING, description: 'Document ID, reference number, or invoice number if present' },
        paymentTerms: { type: Type.STRING },
        totalAmount: { type: Type.NUMBER },
        taxAmount: { type: Type.NUMBER },
        currency: { type: Type.STRING },
        governingLaw: { type: Type.STRING },
        liabilityCap: { type: Type.STRING },
        terminationClause: { type: Type.STRING },
        patientReference: { type: Type.STRING },
        diagnosisCodes: { type: Type.STRING },
        equipmentModel: { type: Type.STRING },
        serialNumber: { type: Type.STRING },
        operatingVoltage: { type: Type.STRING },
        maintenanceInterval: { type: Type.STRING },
        lineItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unitPrice: { type: Type.NUMBER },
              totalPrice: { type: Type.NUMBER },
            },
            required: ['description', 'totalPrice'],
          },
        },
        summary: {
          type: Type.STRING,
          description: 'Comprehensive, detailed executive summary of the entire document strictly grounded in the text',
        },
        keyTakeaways: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Bullet list of key facts, critical obligations, findings, or takeaways explicitly stated in the document',
        },
        verbatimQuotes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Exact verbatim quotes or sentences directly from the document supporting the summary',
        },
        fullExtractedText: {
          type: Type.STRING,
          description: 'Complete, verbatim transcription of the readable text content inside the document for zero-hallucination RAG',
        },
      },
      required: ['summary', 'keyTakeaways', 'fullExtractedText'],
    },
    fieldConfidence: {
      type: Type.OBJECT,
      description: 'Field-level confidence scores between 0.0 and 1.0 for each extracted key',
      properties: {
        vendorOrIssuer: { type: Type.NUMBER },
        recipient: { type: Type.NUMBER },
        documentDate: { type: Type.NUMBER },
        invoiceNumber: { type: Type.NUMBER },
        totalAmount: { type: Type.NUMBER },
        currency: { type: Type.NUMBER },
        governingLaw: { type: Type.NUMBER },
        liabilityCap: { type: Type.NUMBER },
        terminationClause: { type: Type.NUMBER },
        lineItems: { type: Type.NUMBER },
        summary: { type: Type.NUMBER },
      },
    },
  },
  required: ['documentType', 'confidenceScore', 'entities'],
};

