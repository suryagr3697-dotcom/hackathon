"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = require("./routes/api");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-org-id'],
}));
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'operational',
        service: 'Enterprise Intelligent Document Processing (IDP) API',
        timestamp: new Date().toISOString(),
        models: {
            fast: 'gemini-2.5-flash',
            reasoning: 'gemini-2.5-pro',
            embedding: 'text-embedding-004',
        },
    });
});
// Mount API router
app.use('/api', api_1.apiRouter);
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error('[Server Error]:', err.message);
    res.status(400).json({
        error: err.message || 'Internal Server Error',
    });
});
app.listen(PORT, () => {
    console.log(`====================================================================`);
    console.log(`🚀 Enterprise IDP Backend Server listening on http://localhost:${PORT}`);
    console.log(`====================================================================`);
});
exports.default = app;
