# AetherIDP — Enterprise Intelligent Document Processing & Vector RAG Platform

A production-grade, enterprise-ready full-stack Intelligent Document Processing (IDP) platform built with **React 19 (Vite)**, **Tailwind CSS**, **Node.js + Express (TypeScript)**, **Supabase Cloud PostgreSQL (`pgvector`)**, **Google Gemini SDK (`@google/genai`)**, and **Zod**.

---

## Architecture & Key Capabilities

1. **Multi-Format Document Ingestion (`/documents` & `/dashboard`)**:
   - Drag-and-drop uploader supporting PDF, PNG, JPEG, WEBP, Scanned TIFF, DOCX, and TXT with instant preview and one-click sample generators.
   - Configurable Department Routing (`Finance`, `Legal`, `Healthcare`, `Engineering`), Custom Extraction Schema Profiles, and Strictness Mode (`gemini-2.5-flash` vs `gemini-2.5-pro`).
2. **Gemini Multimodal Classification & Structured JSON Extraction**:
   - Uses `@google/genai` server-side with strict `Schema` definitions to classify document types, extract domain-specific key-value pairs and line items, and compute field-level confidence scores (`0.0` to `1.0`).
3. **Human-in-the-Loop (HITL) Verification Studio (`/documents/:id`)**:
   - Split-screen Document Facsimile/Image Preview on the left and Interactive Key-Value & Line-Item Editor on the right.
   - Automatically highlights fields scoring below the organization's confidence threshold (e.g., `<85%`) in amber, allows manual overrides, Re-Analysis with `gemini-2.5-pro`, and one-click **Approve & Lock**.
4. **Semantic Vector Knowledge Discovery — RAG (`/search`)**:
   - Chunks extracted documents and generates 768-dimensional embeddings using `text-embedding-004`.
   - Queries `document_chunks` via cosine similarity (`match_document_chunks` RPC) and synthesizes grounded answers with direct source citations.
5. **Supabase Cloud PostgreSQL Schema, RLS & Migration Runner**:
   - Full DDL, `pgvector` index, Row Level Security (`get_user_org_id()`), and enterprise seed data in [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).
   - Automated Node.js/TypeScript migration & seed script in [`server/src/scripts/migrate.ts`](server/src/scripts/migrate.ts).

---

## Quick Start

### 1. Configure Environment Variables
Copy `.env.example` to `.env` in the project root and populate your credentials:

```env
PORT=5000
NODE_ENV=development

SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
DATABASE_URL=postgresql://postgres:your-db-password@db.your-supabase-project.supabase.co:5432/postgres

GEMINI_API_KEY=your-gemini-api-key-here
```

### 2. Install Dependencies
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 3. Run Supabase Cloud Database Migrations & Seed Data
```bash
npm run migrate
```

### 4. Start the Full-Stack Application
```bash
npm run dev
```
- **Backend API**: `http://localhost:5000`
- **Frontend Studio**: `http://localhost:5173`

