---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - "chat://private-event-smart-ticketing-project-brief"
  - "/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/ux-design-specification.md"
  - "/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/architecture.md"
  - "/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/railway-deployment-checklist.md"
workflowType: "architecture"
project_name: "Private Event Smart Ticketing Platform Frontend"
user_name: "Arnoldekechi"
date: "2026-04-08"
status: "in_progress"
---

# Frontend Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements**

The frontend must support three distinct but connected experiences within one web application: attendee, organizer, and scanner. Attendees need registration, login, event discovery or direct event access, checkout, owned-ticket views, QR retrieval, transfer actions, and resale actions. Organizers need event creation and editing, ticket-type management, staff invitation and management, and access to operational ticket views. Scanner users need a fast, high-contrast validation interface with manifest access, scan validation, and sync support. The frontend also needs to integrate with the live backend’s JWT auth, order checkout flow, ticket ownership lifecycle, and scan workflows.

**Non-Functional Requirements**

The frontend must be mobile-first, responsive, and suitable for touch interaction by default. Performance requirements are strongest around owned-ticket access, QR display, and scanner validation flows. The UX specification requires strong state visibility, low cognitive load, and high readability under pressure. Accessibility needs are important, especially for status clarity, contrast, and action visibility. The architecture should support PWA-style behavior and degraded connectivity handling, especially for scanner and ticket access scenarios.

**Scale & Complexity**

The frontend complexity is medium-to-high for an MVP because it combines multiple role-specific surfaces in one application while sharing auth, state, and design foundations. The primary domain is a full-stack web application with attendee commerce, organizer operations, and scanner workflows. Estimated frontend architectural components include app shell and routing, auth/session handling, API client layer, role-aware feature modules, design system primitives, form/state utilities, PWA support, and scanner-specific offline-aware flows.

- Primary domain: web application / frontend platform
- Complexity level: medium-high
- Estimated architectural components: 8 to 12

### Technical Constraints & Dependencies

The frontend must integrate with the deployed Railway backend and its REST API surface. JWT-based authentication is already implemented on the backend, so the frontend needs a secure token handling strategy. Checkout and payment flows must support the current order/checkout endpoints and later Stripe redirects. QR display must work with signed ticket payloads coming from the backend. Scanner support must align with the backend’s manifest, validate, and sync endpoints. The frontend should be deployable on Railway and fit the current repo/project direction.

### Cross-Cutting Concerns Identified

- Authentication and protected routing
- Role-aware navigation and feature access
- Shared API client and error handling
- Form validation and mutation feedback
- Mobile responsiveness across all roles
- PWA capability and installability
- Offline/degraded behavior for scanner flows
- Design-system consistency across attendee, organizer, and scanner surfaces
- Performance around ticket, QR, and scan-critical screens

## Starter Template Evaluation

### Primary Technology Domain

Web application / frontend platform based on the project’s requirement for a mobile-first attendee experience, organizer dashboard workflows, and scanner UI in one deployable frontend.

### Starter Options Considered

**Option 1: Raw Next.js App Router starter**
The most stable and official foundation. It gives strong routing, server/client composition, good deployment support, and flexible architecture without overcommitting to a full-stack opinionated pattern.

**Option 2: Next.js plus shadcn/ui setup**
This is not a separate app framework, but a strong enhancement to the raw Next.js starter. It aligns well with the project’s need for a themeable design system and reusable component primitives.

**Option 3: More opinionated full-stack starters**
These provide more batteries-included patterns, but they are less desirable here because the backend already exists and the frontend should integrate with a live external API rather than share a tightly coupled monorepo app runtime.

### Selected Starter: Next.js App Router with TypeScript, Tailwind, and shadcn/ui foundation

**Rationale for Selection:**
This starter is the best fit because it gives the frontend a stable, official, and highly maintainable foundation while preserving design flexibility. It supports mobile-first rendering, protected role-aware routing, PWA extension, and a clean separation between backend API integration and frontend presentation logic. It also matches the project’s UX requirement for a polished, themeable interface without forcing a rigid enterprise UI kit.

**Initialization Command:**

```bash
pnpm create next-app@latest ticketsystem-frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript-first React application using the Next.js App Router model.

**Styling Solution:**
Tailwind CSS as the foundational styling system, extended with design tokens and shadcn/ui-style component primitives.

**Build Tooling:**
Next.js production build pipeline with App Router conventions, route-based code splitting, and deployment-friendly output.

**Testing Framework:**
Not fully provided by default, but compatible with a later addition of Vitest, Testing Library, and Playwright.

**Code Organization:**
App Router structure with route segments, layout composition, colocated UI by feature, and shared component/design-system layers.

**Development Experience:**
Strong TypeScript support, fast local iteration, modern linting, and a clean path for adding shadcn/ui, TanStack Query, and PWA behavior.

**Recommended Additions Immediately After Starter Creation:**
- `shadcn/ui` for themeable accessible primitives
- `@tanstack/react-query` for API state and caching
- `zod` for form/input schemas
- `next-themes` only if theming is needed beyond the default product theme

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Use Next.js App Router as a frontend-only web client, not as a business backend
- Use JWT-based authentication against the existing NestJS API
- Use a shared typed API client layer for all backend communication
- Use TanStack Query for remote server state
- Use feature-oriented route/module organization for attendee, organizer, and scanner surfaces
- Use PWA support with a limited offline-first strategy focused on scanner support and ticket access resilience

**Important Decisions (Shape Architecture):**
- Use cookie-or-memory-backed auth handling strategy with explicit session hydration at app boot
- Use React Hook Form + Zod for forms and validation
- Use server components for shell/layout and client components for interactive authenticated flows
- Use shadcn/ui primitives plus custom product components for ticket-centric UI
- Use route groups to separate attendee, organizer, and scanner application surfaces
- Use environment-driven API base URL configuration for Railway and local development

**Deferred Decisions (Post-MVP):**
- Full offline attendee ticket caching strategy
- Push notifications and install prompts optimization
- Multi-locale/i18n architecture
- Advanced analytics/event instrumentation layer
- Feature flag platform

### Data Architecture

The frontend should not own business truth; it should treat the Railway backend as the authoritative system. Remote domain state should be managed with TanStack Query, including query caching, invalidation, mutation lifecycles, optimistic UX where appropriate, and stale/refetch control. Form-local state should remain local to components and forms rather than being pushed into a global store. Persistent browser storage should be used carefully and only for narrow cases such as scanner manifest storage, session bootstrap metadata, or safe UI preferences.

### Authentication & Security

Authentication should use the backend’s JWT flow, but the frontend should structure it behind an auth service and session provider rather than scattering token logic across pages. Protected routes should be enforced at both navigation and data-access layers. Role-aware UI gating should distinguish attendee, organizer, and scanner capabilities, but final authorization must always remain on the backend. Tokens should not be treated as long-lived UI state; session restoration and logout should be explicit and predictable.

### API & Communication Patterns

The frontend should communicate with the backend through a centralized typed API layer. Each domain area should expose small API modules such as `auth`, `events`, `tickets`, `orders`, `scanner`, and `staff`. TanStack Query should be the default path for fetching and mutating server-backed state. Error handling should be normalized so backend error shapes are converted into predictable frontend-friendly messages and action states. The frontend should not create parallel domain logic that competes with backend state rules.

### Frontend Architecture

The app should use App Router route groups to separate role-specific surfaces while sharing one global app shell and design system. Recommended top-level areas are:
- public marketing/event access
- authenticated attendee app
- authenticated organizer app
- authenticated scanner app

Feature code should be organized by domain rather than by file type alone. Shared layers should include:
- `lib/api`
- `lib/auth`
- `lib/query`
- `components/ui`
- `components/product`
- `features/<domain>`
- `app/(routes...)`

Remote server state belongs in TanStack Query. UI-only ephemeral state belongs in component state or narrowly scoped context. Avoid a large global client store unless a later feature proves the need.

### Infrastructure & Deployment

The frontend should be deployed as its own Railway service, separate from the NestJS backend service. It should consume the Railway backend through a public `NEXT_PUBLIC_API_BASE_URL`. Environment configuration should remain minimal and explicit. The app should be PWA-capable, but offline support should be intentionally scoped: scanner flows get the strongest degraded-mode support, attendee flows get lightweight resilience, and organizer flows remain online-first. Monitoring should start with Railway logs plus frontend error capture later if needed.
