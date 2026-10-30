# AetherIDP — Enterprise Intelligent Document Processing & Vector RAG Platform

A production-grade, enterprise-ready full-stack Intelligent Document Processing (IDP) platform built with **React 19 (Vite)**, **Tailwind CSS**, **Node.js + Express (TypeScript)**, **Supabase Cloud PostgreSQL (`pgvector`)**, **Google Gemini SDK (`@google/genai`)**, and **Zod**.

---

## Project Folder Structure (`frontend/` & `backend/`)

```text
Intelligent Document Processing/
├── frontend/                              # React 19 + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx                 # Top bar, RLS org badge, Auth modal, 2.5 Flash/Pro toggle
│   │   │   ├── Sidebar.tsx                # Navigation drawer & live pipeline status
│   │   │   ├── FileUploadDropzone.tsx     # Multi-format drag & drop uploader + sample generators
│   │   │   ├── DocumentTable.tsx          # Searchable, filterable corpus table + JSON export
│   │   │   ├── DocumentViewer.tsx         # Split-screen HITL Verification Studio & JSON editor
│   │   │   ├── ConfidenceBadge.tsx        # Color-coded field confidence badge (>90%, 75-89%, <75%)
│   │   │   ├── SemanticSearchBox.tsx      # Vector RAG search + persistent advisory history
│   │   │   └── AnalyticsCharts.tsx        # 7-day volume & category confidence charts
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx            # /           - Hero overview & live KPI preview
│   │   │   ├── DashboardPage.tsx          # /dashboard  - Executive metrics & quick upload
│   │   │   ├── DocumentsPage.tsx          # /documents  - Document Management Hub
│   │   │   ├── DocumentDetailPage.tsx     # /documents/:id - HITL Verification Studio
│   │   │   ├── SearchPage.tsx             # /search     - Semantic Knowledge Discovery (RAG)
│   │   │   ├── AnalyticsPage.tsx          # /analytics  - Accuracy telemetry & Audit Logs
│   │   │   └── SettingsPage.tsx           # /settings   - Schemas, Thresholds & Migration Trigger
│   │   ├── hooks/
│   │   │   └── useIdpApi.ts               # TanStack Query hooks & client-side Zod schemas
│   │   ├── store/
│   │   │   └── useAppStore.ts             # Zustand client state & persistent Supabase session
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vercel.json                        # Vercel SPA routing & /api/* proxy to Render backend
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                               # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── gemini.ts                  # @google/genai setup, system prompt & extraction schema
│   │   │   ├── supabase.ts                # Service Role & RLS-scoped Supabase clients
│   │   │   └── localStore.ts              # Synchronized enterprise fallback store
│   │   ├── controllers/
│   │   │   ├── authController.ts          # Supabase Auth Register, Login & Logout handlers
│   │   │   ├── documentController.ts      # Upload, List, Detail, HITL Update & Reprocess
│   │   │   └── searchAndAnalyticsController.ts # pgvector RAG search, Analytics & Webhooks
│   │   ├── middleware/
│   │   │   └── authAndValidation.ts       # Zod runtime validation, XSS/filename sanitization & JWT auth
│   │   ├── routes/
│   │   │   └── api.ts                     # Express router + Multer + Rate Limiting
│   │   ├── services/
│   │   │   └── idpPipeline.ts             # End-to-end multimodal extraction & 768d embedding pipeline
│   │   ├── scripts/
│   │   │   ├── migrate.ts                 # Automated Supabase SQL migration & seed runner
│   │   │   └── verifyChecklist.ts         # End-to-end verification suite
│   │   └── server.ts                      # Express entry point
│   ├── tsconfig.json
│   └── package.json
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql         # Tables, pgvector index, RLS policies & seed data
├── render.yaml                            # Render blueprint configuration
├── package.json                           # Root workspace scripts
└── .env.example                           # Environment variables template
```

---

## Quick Start (Local Development)

```bash
# Install dependencies and build both backend and frontend
npm run build

# Apply 001_initial_schema.sql to Supabase Cloud
npm run migrate

# Start Backend (http://localhost:5000) and Frontend (http://localhost:5173)
npm run dev
```

---

## Deployment Configuration

- **Render (Backend)**:
  - **Root Directory**: `backend` (or leave blank to use root `package.json`)
  - **Build Command**: `npm install --include=dev && npm run build`
  - **Start Command**: `npm start`
- **Vercel (Frontend)**:
  - **Root Directory**: `frontend`
  - **Framework Preset**: `Vite`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
