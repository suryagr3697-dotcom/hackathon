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

// Standard model definitions with automatic fallback to current active Google AI Studio models
export const FAST_MODEL = 'gemini-2.5-flash';
export const REASONING_MODEL = 'gemini-2.5-pro';
export const EMBEDDING_MODEL = 'text-embedding-004';

export const ACTIVE_FAST_MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash'];
export const ACTIVE_REASONING_MODELS = ['gemini-3.8-pro', 'gemini-3.8-flash', 'gemini-2.5-pro'];
export const ACTIVE_EMBEDDING_MODELS = ['gemini-embedding-001', 'text-embedding-004'];

export const IDP_SYSTEM_PROMPT = `You are an elite AI Document Intelligence Engine and Principal Data Extractor. Your task is to analyze unstructured and structured document inputs (invoices, contracts, medical records, financial statements), classify their exact document type, extract all relevant key-value entities with high precision, calculate field-level confidence scores (0.0 to 1.0), and output strictly valid JSON conforming to the requested schema without any markdown wrapping or extraneous commentary.`;

export const documentExtractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    documentType: {
      type: Type.STRING,
      description: 'Classify the document type: Invoice, TaxForm, Contract, MedicalRecord, Receipt, TechnicalSpec, Other',
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: 'Overall extraction confidence score between 0.0 and 1.0',
    },
    entities: {
      type: Type.OBJECT,
      description: 'Extracted key-value entities with confidence ratings',
      properties: {
        vendorOrIssuer: { type: Type.STRING },
        recipient: { type: Type.STRING },
        documentDate: { type: Type.STRING, description: 'YYYY-MM-DD format' },
        invoiceNumber: { type: Type.STRING },
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
        summary: { type: Type.STRING, description: 'Executive summary of the document contents' },
      },
      required: ['vendorOrIssuer', 'summary'],
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

