# Practitioner SaaS App

## Overview

A full-stack SaaS application for independent practitioners (coaches, therapists, consultants) to manage clients, sessions, and revenue. Built as a pnpm monorepo.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + React Query + React Hook Form + Zod
- **Backend**: Node.js + Express 5 + PostgreSQL + Drizzle ORM
- **Auth**: JWT (jsonwebtoken + bcryptjs), token stored in localStorage
- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (CJS bundle for API server)

## Key Packages

- `@workspace/saas-app` — React frontend artifact at `/`
- `@workspace/api-server` — Express API server at `/api`
- `@workspace/db` — Drizzle ORM + PostgreSQL schema
- `@workspace/api-spec` — OpenAPI spec + codegen config
- `@workspace/api-client-react` — Generated React Query hooks
- `@workspace/api-zod` — Generated Zod validation schemas

## Features

### Authentication
- Register / Login with email + password
- JWT-based auth (7 day tokens)
- Protected routes with redirect to `/login`

### Clients
- Create, list, delete clients
- Fields: name, phone (optional), notes (optional)
- Client detail view with their sessions

### Sessions
- Create, list, update, delete sessions
- Fields: client, date/time, status (pending/completed/cancelled), price, paid, notes
- Filter by status on sessions list
- Link sessions to clients

### Dashboard
- Total clients, weekly sessions, monthly revenue, unpaid balance stats
- Monthly revenue area chart (last 6 months, using Recharts)
- Recent sessions list with status and paid indicators

## Database Schema

- `users` — id, email, name, password_hash, timestamps
- `clients` — id, user_id (FK), name, phone, notes, timestamps
- `sessions` — id, user_id (FK), client_id (FK), date, status, price, paid, notes, timestamps

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Auth Notes

The API client (`lib/api-client-react/src/custom-fetch.ts`) automatically reads `auth_token` from localStorage and attaches `Authorization: Bearer <token>` headers to all API requests.

JWT secret is read from `SESSION_SECRET` environment variable (falls back to a hardcoded string — set in production).

## Scalability

The structure is ready for future additions:
- Stripe payments: add routes in `artifacts/api-server/src/routes/` + update OpenAPI spec
- Subscriptions: add a `subscriptions` table to the DB schema
- Additional entities: follow the same OpenAPI → codegen → route pattern

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
