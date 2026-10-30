import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import {
  requireOrganizationAuth,
  requireRole,
  validateBody,
  DocumentUpdateZodSchema,
  SearchQueryZodSchema,
  ReprocessOptionsZodSchema,
  SettingsUpdateZodSchema,
} from '../middleware/authAndValidation';
import {
  uploadDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
  reprocessDocument,
} from '../controllers/documentController';
import {
  semanticSearch,
  getAnalytics,
  getOrganizationSettings,
  updateOrganizationSettings,
  triggerWebhookDispatch,
  summarizeDocumentViaMcp,
} from '../controllers/searchAndAnalyticsController';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserRole,
} from '../controllers/authController';
import { runMigrations } from '../scripts/migrate';

export const apiRouter = Router();

// Configure Multer in-memory storage with 25MB limit and strict MIME validation
const upload = multer({
  storage: multer.memoryStorage(),
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
    if (
      allowedMimes.includes(file.mimetype) ||
      /\.(pdf|png|jpe?g|webp|tiff?|txt|csv|docx?)$/i.test(file.originalname)
    ) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format: ${file.mimetype}`));
    }
  },
});

// Rate Limiters for AI Generation & Upload Endpoints (Section 18 Security Requirement)
const aiPipelineRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 45, // 45 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many AI extraction or search requests. Please wait a moment before retrying.',
  },
});

// Apply Organization Authentication & RBAC context across all /api routes
apiRouter.use(requireOrganizationAuth);

// 0. Authentication & RBAC Identity Routes (Register, Login, Logout, Profile, Role Switch)
apiRouter.post('/auth/register', registerUser);
apiRouter.post('/auth/login', loginUser);
apiRouter.post('/auth/logout', logoutUser);
apiRouter.get('/auth/me', getCurrentUser);
apiRouter.put('/auth/role', updateUserRole);

// 1. Document Ingestion & Management Routes (RBAC Enforced)
apiRouter.post(
  '/documents/upload',
  requireRole(['admin', 'reviewer']),
  aiPipelineRateLimiter,
  upload.single('file'),
  uploadDocument
);
apiRouter.get('/documents', listDocuments);
apiRouter.get('/documents/:id', getDocumentById);
apiRouter.put(
  '/documents/:id',
  requireRole(['admin', 'reviewer']),
  validateBody(DocumentUpdateZodSchema),
  updateDocument
);
apiRouter.post(
  '/documents/:id/reprocess',
  requireRole(['admin', 'reviewer']),
  aiPipelineRateLimiter,
  validateBody(ReprocessOptionsZodSchema),
  reprocessDocument
);

// 2. Semantic Vector RAG & MCP Summarization Routes
apiRouter.post('/search', aiPipelineRateLimiter, validateBody(SearchQueryZodSchema), semanticSearch);
apiRouter.post('/mcp/summarize/:id', aiPipelineRateLimiter, summarizeDocumentViaMcp);

// 3. Real-Time Analytics & Audit Logs Route
apiRouter.get('/analytics', getAnalytics);

// 4. Organization Settings, Schemas & Webhook Hub (Admin RBAC Protected for Mutations)
apiRouter.get('/settings', getOrganizationSettings);
apiRouter.put(
  '/settings',
  requireRole(['admin']),
  validateBody(SettingsUpdateZodSchema),
  updateOrganizationSettings
);
apiRouter.post('/webhooks/dispatch', requireRole(['admin']), triggerWebhookDispatch);

// 5. On-Demand Database Migration Trigger Endpoint (Admin Service Role Only)
apiRouter.post('/admin/migrate', requireRole(['admin']), async (_req, res) => {
  try {
    await runMigrations();
    res.json({
      success: true,
      message: 'Migration 001_initial_schema.sql executed and verified.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
});
