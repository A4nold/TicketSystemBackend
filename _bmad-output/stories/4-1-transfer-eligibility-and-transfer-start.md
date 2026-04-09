# Story 4.1: Transfer Eligibility and Transfer Start

Status: complete

## Story

As an attendee who owns a ticket,
I want to start a transfer only when the ticket is eligible,
so that I can hand off my ticket through the platform with clear rules and without confusion.

## Acceptance Criteria

1. Given an authenticated attendee is viewing a ticket they currently own, when that ticket is eligible for transfer under the event's rules, then the product presents transfer as an available action, and the attendee can begin the transfer flow from the owned-ticket experience.
2. Given an attendee starts a transfer for an eligible ticket, when the transfer request is submitted successfully, then the product reflects that the ticket is now in a transfer-pending state, and the attendee receives clear confirmation that ownership has not yet changed until acceptance is completed.
3. Given a ticket is not eligible for transfer because of event policy, timing, state, or ownership conditions, when the attendee attempts to start a transfer, then the product blocks the action, and it provides a clear explanation of why transfer is not currently allowed.
4. Given the attendee is starting a transfer, when the transfer initiation flow is shown, then the product communicates the consequences of starting the transfer clearly, and it avoids implying that the ticket is immediately gone before acceptance occurs.
5. Given a transfer request already exists or the ticket is otherwise unavailable for a new transfer, when the attendee attempts to start another transfer, then the product prevents duplicate or contradictory transfer initiation, and the current transfer-related state remains understandable.
6. Given the attendee views the ticket after starting a transfer, when the owned-ticket list or ticket detail is refreshed, then the ticket state is shown as transfer pending, and the attendee can distinguish that state from active, resale-listed, used, or unavailable states.
7. Given the transfer flow is used on a mobile device, when the attendee starts the transfer, then the action, resulting state, and any blocking reason remain readable and usable on a small screen, and the transfer path does not require unnecessary navigation or guesswork.
8. Given the product cannot start a transfer because of a temporary system or network issue, when the attendee submits the transfer initiation, then the product shows a clear failure or retry state, and it does not leave the attendee uncertain about whether the transfer request was actually created.

## Tasks / Subtasks

- [x] Add a frontend transfer-start client. (AC: 1, 2, 8)
  - [x] Add a call for `POST /api/me/tickets/:serialNumber/transfer`.
  - [x] Model the transfer response needed to reflect pending state.

- [x] Add transfer-start UX to the owned-ticket detail page. (AC: 1, 2, 4, 7)
  - [x] Show a recipient email form and optional message field when the ticket is eligible.
  - [x] Explain that ownership does not change until the recipient accepts.
  - [x] Refresh the ticket detail after successful transfer creation.

- [x] Block transfer when the current ticket state is not eligible. (AC: 3, 5, 6)
  - [x] Show clear transfer-unavailable messaging for transfer-pending, resale-listed, used, and other limited states.
  - [x] Keep the ticket detail state understandable after a successful transfer initiation.

- [x] Verify the implementation. (AC: 1-8)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added an authenticated frontend transfer-start client.
- Added a mobile-first transfer initiation panel to the owned-ticket detail experience.
- Ensured transfer start clearly communicates pending ownership change and refreshes backend truth after submission.
- Kept transfer acceptance and cancellation deferred to later stories.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/4-1-transfer-eligibility-and-transfer-start.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/transfers/transfers-client.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/ticket-transfer-panel.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/owned-ticket-detail.tsx`

### Change Log

- 2026-04-09: Implemented Story 4.1 by adding transfer eligibility and transfer-start UX to the owned-ticket detail experience.
