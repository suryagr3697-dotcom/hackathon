"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authAndValidation_1 = require("../middleware/authAndValidation");
const documentController_1 = require("../controllers/documentController");
const searchAndAnalyticsController_1 = require("../controllers/searchAndAnalyticsController");
const authController_1 = require("../controllers/authController");
const migrate_1 = require("../scripts/migrate");
exports.apiRouter = (0, express_1.Router)();
// Configure Multer in-memory storage with 25MB limit and strict MIME validation
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB max
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
            'image/tiff',
            'text/plain',
            'text/csv',
            'application/json',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/octet-stream',
        ];
        if (allowedMimes.includes(file.mimetype) ||
            /\.(pdf|png|jpe?g|webp|tiff?|txt|csv|docx?)$/i.test(file.originalname)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file format: ${file.mimetype}`));
        }
    },
});
// Rate Limiters for AI Generation & Upload Endpoints (Section 18 Security Requirement)
const aiPipelineRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute window
    max: 45, // 45 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many AI extraction or search requests. Please wait a moment before retrying.',
    },
});
// Apply Organization Authentication & RLS context across all /api routes
exports.apiRouter.use(authAndValidation_1.requireOrganizationAuth);
// 0. Supabase Authentication Routes (Register, Login, Logout)
exports.apiRouter.post('/auth/register', authController_1.registerUser);
exports.apiRouter.post('/auth/login', authController_1.loginUser);
exports.apiRouter.post('/auth/logout', authController_1.logoutUser);
// 1. Document Ingestion & Management Routes
exports.apiRouter.post('/documents/upload', aiPipelineRateLimiter, upload.single('file'), documentController_1.uploadDocument);
exports.apiRouter.get('/documents', documentController_1.listDocuments);
exports.apiRouter.get('/documents/:id', documentController_1.getDocumentById);
exports.apiRouter.put('/documents/:id', (0, authAndValidation_1.validateBody)(authAndValidation_1.DocumentUpdateZodSchema), documentController_1.updateDocument);
exports.apiRouter.post('/documents/:id/reprocess', aiPipelineRateLimiter, (0, authAndValidation_1.validateBody)(authAndValidation_1.ReprocessOptionsZodSchema), documentController_1.reprocessDocument);
// 2. Semantic Vector RAG Search Route
exports.apiRouter.post('/search', aiPipelineRateLimiter, (0, authAndValidation_1.validateBody)(authAndValidation_1.SearchQueryZodSchema), searchAndAnalyticsController_1.semanticSearch);
// 3. Real-Time Analytics & Audit Logs Route
exports.apiRouter.get('/analytics', searchAndAnalyticsController_1.getAnalytics);
// 4. Organization Settings, Schemas & Webhook Hub
exports.apiRouter.get('/settings', searchAndAnalyticsController_1.getOrganizationSettings);
exports.apiRouter.put('/settings', (0, authAndValidation_1.validateBody)(authAndValidation_1.SettingsUpdateZodSchema), searchAndAnalyticsController_1.updateOrganizationSettings);
exports.apiRouter.post('/webhooks/dispatch', searchAndAnalyticsController_1.triggerWebhookDispatch);
// 5. On-Demand Database Migration Trigger Endpoint (Admin Service Role)
exports.apiRouter.post('/admin/migrate', async (_req, res) => {
    try {
        await (0, migrate_1.runMigrations)();
        res.json({
            success: true,
            message: 'Migration 001_initial_schema.sql executed and verified.',
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});
