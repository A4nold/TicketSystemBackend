# Story 1.1: Frontend Starter and Application Shell Setup

Status: complete

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the product team,
I want the frontend initialized from the approved starter and core app shell,
so that attendee, organizer, and scanner features are built on a consistent, deployable foundation.

## Acceptance Criteria

1. The frontend exists as a working `Next.js App Router` application aligned to the approved architecture, using TypeScript and Tailwind, and can be run locally without ad hoc setup.
2. The application shell supports separation of public, attendee, organizer, and scanner surfaces so later stories do not require a fundamental route reorganization.
3. Environment-driven API configuration is in place so the frontend can consume the deployed backend as an external system of record.
4. The styling and component foundation supports the approved token-based design direction and is ready for reusable UI primitives and product components.
5. The setup story provides only foundational structure and does not prematurely implement unrelated feature behavior.

## Tasks / Subtasks

- [x] Initialize the frontend app in a dedicated workspace folder using the approved `Next.js App Router` stack. (AC: 1)
  - [x] Create the frontend app with TypeScript, Tailwind, ESLint, App Router, and the `@/*` import alias.
  - [x] Ensure the app can install, build, and run locally with clear scripts.
  - [x] Add a minimal README note or local instructions only if the generated project lacks enough context for running it.

- [x] Establish the foundational route/app shell structure for the four product surfaces. (AC: 2)
  - [x] Add top-level route groups or equivalent structure for public, attendee, organizer, and scanner areas.
  - [x] Add shared layout scaffolding that later stories can extend without reorganizing the app.
  - [x] Add placeholder entry screens or route markers only where needed to prove the structure works.

- [x] Add environment-driven backend configuration and a minimal API client foundation. (AC: 3)
  - [x] Add `NEXT_PUBLIC_API_BASE_URL` handling for local and deployed environments.
  - [x] Create a shared `lib/api` foundation for future domain modules.
  - [x] Keep the frontend as a pure web client consuming the existing NestJS backend.

- [x] Establish the design-system and state-management foundations approved in architecture. (AC: 4)
  - [x] Add the initial shared UI/component folders and token-ready styling structure.
  - [x] Add TanStack Query and its root provider wiring.
  - [x] Add a base app/provider composition that later stories can extend for auth, query, and theming.

- [x] Keep the setup intentionally narrow and verify it does not absorb feature work. (AC: 5)
  - [x] Do not implement attendee purchase, wallet, organizer CRUD, or scanner validation in this story.
  - [x] Validate that the generated structure enables later stories without needing a rewrite.
  - [x] Confirm the app builds cleanly after setup.

## Dev Notes

- This is a **foundation story**, but it still needs to preserve user-value sequencing by enabling later attendee, organizer, and scanner stories without front-loading feature implementation.
- The frontend should be created as a **separate web app** that consumes the already deployed Railway backend, not as a second backend layer.
- There is **no sprint-status.yaml** in this repo, so this story file is being created directly as a standalone ready-for-dev artifact.
- There is **no project-context.md** in this repo, so the planning docs below are the full source of truth.

### Technical Requirements

- Use `Next.js App Router` with `TypeScript`, `Tailwind CSS`, and a themeable component foundation. [Source: [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md)]
- Add `@tanstack/react-query` early because remote backend state is a critical part of the frontend architecture. [Source: [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md)]
- Keep the frontend as a **web client only**; backend business truth remains in the NestJS API. [Source: [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md), [architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/architecture.md)]
- Prepare the structure for `public`, `attendee`, `organizer`, and `scanner` surfaces. [Source: [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md)]
- Use environment-driven API configuration targeting the deployed Railway backend via `NEXT_PUBLIC_API_BASE_URL`. [Source: [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md)]

### Architecture Compliance

- The approved frontend stack is a **Next.js PWA** rather than native mobile apps. [Source: [architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/architecture.md#Final Recommendation)]
- The system architecture separates `Web App` from `NestJS API`; do not collapse those boundaries in implementation. [Source: [architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/architecture.md#Architecture Overview)]
- The frontend architecture explicitly selected:
  - Next.js App Router
  - Tailwind
  - shadcn/ui-style primitives
  - TanStack Query
  - feature-oriented organization
  - route groups by role. [Source: [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md#Selected Starter: Next.js App Router with TypeScript, Tailwind, and shadcn/ui foundation), [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md#Core Architectural Decisions)]

### Library / Framework Requirements

- Preferred starter command from the architecture doc:

```bash
pnpm create next-app@latest ticketsystem-frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

- Immediate additions expected by architecture:
  - `@tanstack/react-query`
  - `zod`
  - shadcn/ui-compatible primitive setup
- Use `React Hook Form + Zod` later for forms, but this story only needs to prepare the foundation, not implement form flows. [Source: [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md)]

### File Structure Requirements

- Recommended shared frontend layers:
  - `app/(...)`
  - `components/ui`
  - `components/product`
  - `features/<domain>`
  - `lib/api`
  - `lib/auth`
  - `lib/query`
- This repo currently does **not** have the monorepo `apps/web` structure from the broader architecture doc implemented, so choose one frontend location and keep it consistent. The safest fit is to create a dedicated frontend app folder without disturbing the deployed backend. [Source: [architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/architecture.md#Recommended Repository Layout), [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md#Frontend Architecture)]

### UX Compliance

- The shell should support the UX requirement that the product behaves as a **hybrid web app**:
  - SEO-aware public pages
  - app-like authenticated areas. [Source: [prd.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/prd.md#Web App Specific Requirements)]
- The setup must support a themeable design system and token-based visual foundation. [Source: [ux-design-specification.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/ux-design-specification.md#Design System Foundation), [ux-design-specification.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/ux-design-specification.md#Visual Design Foundation)]
- Do not add generic dashboard-heavy scaffolding; later organizer and scanner flows need different tones within one system. [Source: [ux-design-specification.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/ux-design-specification.md)]

### Testing Requirements

- At minimum for this story:
  - the frontend app installs
  - the frontend app builds
  - the route shell/provider wiring compiles
  - environment variable usage does not break the build
- If lightweight tests are added, prefer simple smoke coverage over heavy feature tests because this is a foundation story.

### Project Structure Notes

- Current repo reality:
  - deployed backend lives at repo root
  - planning artifacts live in `_bmad-output`
  - no frontend app exists yet
- The architecture docs mention both a monorepo-style future layout and a dedicated frontend Railway service. For this story, prioritize **minimal disruption** to the existing backend and create a clean frontend app boundary that can be deployed separately later.

### Git Intelligence Summary

- Recent repo work is deployment-focused:
  - `d4869e4 Install openssl in Docker image`
  - `48e8dd3 prisma changes`
  - `14539f9 Allow Prisma generate without DATABASE_URL at build`
  - `ac32984 Fix Docker build install mode`
  - `4a396ef Use Dockerfile for Railway deploy`
- Practical implication:
  - avoid touching the backend deployment setup in this story
  - keep frontend foundation work isolated from existing Docker/Railway backend behavior

### References

- [epics.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/epics.md#Epic-1:-Public-Event-Access-and-Attendee-Authentication)
- [epics.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/epics.md#Story-1.1:-Frontend-Starter-and-Application-Shell-Setup)
- [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md)
- [architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/architecture.md)
- [prd.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/prd.md#Web-App-Specific-Requirements)
- [ux-design-specification.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/ux-design-specification.md#Design-System-Foundation)
- [ux-design-specification.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/ux-design-specification.md#Visual-Design-Foundation)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- No sprint status file found
- No project-context file found
- Recent git history reviewed for repo context
- Scaffolded isolated Next.js app in `frontend/` via `npm create next-app`
- Installed foundational frontend dependencies with `npm install @tanstack/react-query zod clsx tailwind-merge`
- Verified the frontend with `npm run lint` and `npm run build`

### Completion Notes List

- Created an isolated `frontend/` Next.js App Router app with TypeScript, Tailwind, ESLint, and the `@/*` alias.
- Added route-group-ready shells for public, attendee, organizer, and scanner surfaces without implementing feature logic early.
- Added `NEXT_PUBLIC_API_BASE_URL` configuration, a minimal shared API client, and TanStack Query root provider wiring.
- Replaced the default starter styling with token-ready visual foundations aligned to the approved UX direction.
- Switched the frontend build script to `next build --webpack` because Turbopack panicked under the local sandbox during CSS processing.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/1-1-frontend-starter-and-application-shell-setup.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/.env.example`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/README.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/next.config.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/package.json`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(attendee)/layout.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(attendee)/tickets/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(organizer)/layout.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(organizer)/organizer/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/layout.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(scanner)/layout.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(scanner)/scanner/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/globals.css`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/layout.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/components/product/surface-shell.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/components/providers/app-providers.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/components/ui/panel.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/README.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/api/client.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/surfaces.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/config/env.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/query/index.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/utils.ts`

### Change Log

- 2026-04-08: Implemented Story 1.1 by scaffolding the isolated frontend app, adding route-group shell structure, wiring providers and API config, and verifying lint/build success.
