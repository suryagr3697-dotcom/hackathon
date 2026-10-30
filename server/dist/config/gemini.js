"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentExtractionSchema = exports.IDP_SYSTEM_PROMPT = exports.ACTIVE_EMBEDDING_MODELS = exports.ACTIVE_REASONING_MODELS = exports.ACTIVE_FAST_MODELS = exports.EMBEDDING_MODEL = exports.REASONING_MODEL = exports.FAST_MODEL = exports.ai = void 0;
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
if (!process.env.GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY environment variable is missing.');
}
exports.ai = new genai_1.GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || 'MISSING_GEMINI_API_KEY',
});
// Standard model definitions with automatic fallback to current active Google AI Studio models
exports.FAST_MODEL = 'gemini-2.5-flash';
exports.REASONING_MODEL = 'gemini-2.5-pro';
exports.EMBEDDING_MODEL = 'text-embedding-004';
exports.ACTIVE_FAST_MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash'];
exports.ACTIVE_REASONING_MODELS = ['gemini-3.8-pro', 'gemini-3.8-flash', 'gemini-2.5-pro'];
exports.ACTIVE_EMBEDDING_MODELS = ['gemini-embedding-001', 'text-embedding-004'];
exports.IDP_SYSTEM_PROMPT = `You are an elite AI Document Intelligence Engine and Principal Data Extractor. Your task is to analyze unstructured and structured document inputs (invoices, contracts, medical records, financial statements), classify their exact document type, extract all relevant key-value entities with high precision, calculate field-level confidence scores (0.0 to 1.0), and output strictly valid JSON conforming to the requested schema without any markdown wrapping or extraneous commentary.`;
exports.documentExtractionSchema = {
    type: genai_1.Type.OBJECT,
    properties: {
        documentType: {
            type: genai_1.Type.STRING,
            description: 'Classify the document type: Invoice, TaxForm, Contract, MedicalRecord, Receipt, TechnicalSpec, Other',
        },
        confidenceScore: {
            type: genai_1.Type.NUMBER,
            description: 'Overall extraction confidence score between 0.0 and 1.0',
        },
        entities: {
            type: genai_1.Type.OBJECT,
            description: 'Extracted key-value entities with confidence ratings',
            properties: {
                vendorOrIssuer: { type: genai_1.Type.STRING },
                recipient: { type: genai_1.Type.STRING },
                documentDate: { type: genai_1.Type.STRING, description: 'YYYY-MM-DD format' },
                invoiceNumber: { type: genai_1.Type.STRING },
                paymentTerms: { type: genai_1.Type.STRING },
                totalAmount: { type: genai_1.Type.NUMBER },
                taxAmount: { type: genai_1.Type.NUMBER },
                currency: { type: genai_1.Type.STRING },
                governingLaw: { type: genai_1.Type.STRING },
                liabilityCap: { type: genai_1.Type.STRING },
                terminationClause: { type: genai_1.Type.STRING },
                patientReference: { type: genai_1.Type.STRING },
                diagnosisCodes: { type: genai_1.Type.STRING },
                equipmentModel: { type: genai_1.Type.STRING },
                serialNumber: { type: genai_1.Type.STRING },
                operatingVoltage: { type: genai_1.Type.STRING },
                maintenanceInterval: { type: genai_1.Type.STRING },
                lineItems: {
                    type: genai_1.Type.ARRAY,
                    items: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            description: { type: genai_1.Type.STRING },
                            quantity: { type: genai_1.Type.NUMBER },
                            unitPrice: { type: genai_1.Type.NUMBER },
                            totalPrice: { type: genai_1.Type.NUMBER },
                        },
                        required: ['description', 'totalPrice'],
                    },
                },
                summary: { type: genai_1.Type.STRING, description: 'Executive summary of the document contents' },
            },
            required: ['vendorOrIssuer', 'summary'],
        },
        fieldConfidence: {
            type: genai_1.Type.OBJECT,
            description: 'Field-level confidence scores between 0.0 and 1.0 for each extracted key',
            properties: {
                vendorOrIssuer: { type: genai_1.Type.NUMBER },
                recipient: { type: genai_1.Type.NUMBER },
                documentDate: { type: genai_1.Type.NUMBER },
                invoiceNumber: { type: genai_1.Type.NUMBER },
                totalAmount: { type: genai_1.Type.NUMBER },
                currency: { type: genai_1.Type.NUMBER },
                governingLaw: { type: genai_1.Type.NUMBER },
                liabilityCap: { type: genai_1.Type.NUMBER },
                terminationClause: { type: genai_1.Type.NUMBER },
                lineItems: { type: genai_1.Type.NUMBER },
                summary: { type: genai_1.Type.NUMBER },
            },
        },
    },
    required: ['documentType', 'confidenceScore', 'entities'],
};
