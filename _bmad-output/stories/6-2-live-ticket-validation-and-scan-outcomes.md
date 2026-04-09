# Story 6.2: Live Ticket Validation and Scan Outcomes

Status: complete

## Story

As scanner staff,
I want to validate a presented ticket and receive an immediate outcome,
so that I can make a confident entry decision without slowing the line.

## Acceptance Criteria

1. Given scanner staff are in a valid event scanning context, when they scan or submit a presented ticket for validation, then the product sends the ticket for event-specific validation, and the scanner flow evaluates the ticket against the latest available ticket state.
2. Given the presented ticket is valid and eligible for entry, when validation completes successfully, then the product returns a clear valid outcome, and the result is visually distinct enough that the scanner can act without hesitation.
3. Given the presented ticket has already been used, is invalid, or is otherwise not eligible for entry, when validation completes, then the product returns the appropriate non-valid outcome, and the scanner can distinguish between valid, already used, invalid, and otherwise ineligible states clearly.
4. Given the validation result indicates a non-valid state, when the scanner views the result, then the product provides enough contextual meaning for the scanner to understand why entry should not proceed, and the result does not rely on color alone to communicate meaning.
5. Given the same event is being scanned in a live-entry context, when the scanner validates tickets in sequence, then the product keeps each scan outcome isolated to the presented ticket, and the scanner can move cleanly from one validation attempt to the next.
6. Given the ticket state changes in the system because of prior use, ownership change, or another lifecycle event, when a scanner submits the ticket for validation, then the product reflects the latest available event ticket state in the returned outcome, and stale ticket truth is not presented as current validation status.
7. Given the validation flow is used on a mobile device under event conditions, when the scan outcome is rendered, then the outcome is readable, high-contrast, and immediately understandable on a small screen, and the scanner can continue operating without navigating through unnecessary interface layers.
8. Given the product cannot complete live validation because of a temporary system or network issue, when the scanner submits a ticket, then the product shows a clear failure or retry state, and it does not imply that a ticket is valid or invalid when current truth cannot be confirmed.

## Tasks / Subtasks

- [x] Extend the scanner client for live validation. (AC: 1, 6, 8)
  - [x] Add a typed validate call for the scanner event endpoint.
  - [x] Preserve scan session continuity between attempts.

- [x] Add a live validation panel to the scanner workspace. (AC: 1, 2, 3, 4, 7, 8)
  - [x] Allow manual submission of a QR token id or full signed QR payload.
  - [x] Show clear valid / already used / blocked / invalid states without relying on color alone.

- [x] Support repeated scanner attempts in sequence. (AC: 3, 5, 6)
  - [x] Keep a recent-attempt list tied to the selected event context.
  - [x] Add manifest-backed quick picks for smoke testing until camera scanning is added.

- [x] Verify the implementation. (AC: 1-8)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added typed scanner validation support and a live validation panel to the scanner workspace.
- Preserved scan session continuity so repeated attempts stay in the same live entry context.
- Added clear result messaging and recent-attempt tracking for sequential door operation.

### File List

- [frontend/src/lib/scanner/scanner-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/scanner/scanner-client.ts)
- [frontend/src/features/scanner/scanner-workspace.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/scanner/scanner-workspace.tsx)
- [frontend/src/app/(scanner)/scanner/page.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(scanner)/scanner/page.tsx)

### Change Log

- Added the scanner validate API client.
- Extended the scanner workspace with manual validation, outcome rendering, and attempt history.
- Kept validation inside the selected event setup surface so scanner staff can work without leaving the page.
