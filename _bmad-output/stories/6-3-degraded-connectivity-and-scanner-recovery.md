# Story 6.3: Degraded Connectivity and Scanner Recovery

Status: complete

## Story

As scanner staff,
I want the scanner flow to behave predictably during poor connectivity and recovery,
so that I can continue operating with as much confidence as possible when live validation conditions are degraded.

## Acceptance Criteria

1. Given scanner staff are operating in an event context with degraded or unstable connectivity, when the scanner can no longer rely on normal live validation, then the product communicates that the scanner is in a degraded or limited operating mode, and the scanner user is not misled into believing full live confirmation is still available.
2. Given scanner staff have access to previously prepared event scanning context, when connectivity degrades during operation, then the product can continue to support the limited scanner workflow allowed by the system's degraded-mode rules, and the scanner user can understand that degraded operation has different confidence boundaries than normal online validation.
3. Given scanner staff attempt validation while connectivity is degraded, when the product returns a degraded-mode outcome or limitation, then the scanner user receives a clear explanation of the current operating condition, and the product preserves high-clarity result communication even when confidence is reduced.
4. Given the scanner cannot validate a ticket confidently because required live state is unavailable, when the user submits the ticket, then the product shows a clear unavailable, retry, or limited-confidence state, and it avoids presenting a false valid or invalid conclusion beyond what the current mode supports.
5. Given connectivity is restored after a degraded period, when the scanner flow recovers, then the product returns to normal live-validation behavior, and the scanner user is informed that current truth can now be confirmed again.
6. Given validation attempts occurred during degraded operation, when the product regains the ability to reconcile scanner activity, then the scanner workflow supports recovery or synchronization behavior consistent with the system's event-validation model, and the scanner user is not left uncertain about whether the system recovered cleanly.
7. Given degraded-mode or recovery behavior is shown on a mobile device in a live event setting, when the scanner views the scanner state, then the current mode, limitation, and next action remain readable and actionable on a small screen, and the interface continues to prioritize operational clarity under pressure.

## Tasks / Subtasks

- [x] Add degraded-mode state handling to the scanner workspace. (AC: 1, 2, 3, 4, 5, 7)
  - [x] Detect online/offline browser state and support a manual degraded-mode simulation toggle for smoke testing.
  - [x] Surface explicit limited-confidence messaging instead of pretending live validation is still authoritative.

- [x] Support queued degraded attempts and recovery sync. (AC: 2, 5, 6)
  - [x] Queue degraded attempts locally against the selected event context.
  - [x] Add sync support against the scanner offline sync endpoint when live connectivity returns.

- [x] Keep degraded and recovered scanner operation understandable. (AC: 3, 4, 5, 6, 7)
  - [x] Show pending sync count, current connectivity, current mode, and sync outcome.
  - [x] Mark degraded attempts clearly in recent scanner history so staff can tell what has and has not been reconciled.

- [x] Verify the implementation. (AC: 1-7)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added browser-driven degraded-mode awareness and a manual simulation toggle for scanner testing.
- Queued degraded attempts locally with explicit limited-confidence messaging instead of pretending live truth is available.
- Added sync support so queued attempts can be reconciled once connectivity returns.

### File List

- [frontend/src/features/scanner/scanner-workspace.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/scanner/scanner-workspace.tsx)
- [frontend/src/lib/scanner/scanner-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/scanner/scanner-client.ts)

### Change Log

- Added degraded-mode and recovery handling to the scanner surface.
- Added offline sync client support and queued-attempt state.
- Extended scanner outcome and history rendering to distinguish live from degraded attempts.
