# Story 4.2: Transfer Acceptance and Ownership Update

Status: complete

## Story

As a transfer recipient,
I want to accept a pending transfer and become the new ticket owner,
so that the ticket moves to my account through a clear and trustworthy ownership change.

## Acceptance Criteria

1. Given a valid pending transfer exists for a ticket, when the intended recipient opens the transfer acceptance flow as an authenticated user, then the product displays enough ticket and event context for them to understand what they are accepting, and the product makes it clear that acceptance will transfer ownership into their account.
2. Given the recipient is eligible to accept the pending transfer, when they confirm acceptance, then the product completes the transfer, and the ticket ownership is updated to the recipient's account.
3. Given a transfer has been accepted successfully, when the ownership update completes, then the original owner no longer sees the ticket as an active owned ticket, and the new owner can access the ticket through their owned-ticket experience.
4. Given a transfer is no longer valid because it expired, was cancelled, was already accepted, or otherwise became unavailable, when the recipient attempts to accept it, then the product blocks acceptance, and it provides a clear explanation of why the transfer can no longer be completed.
5. Given the recipient is not authenticated when they try to accept a transfer, when the product requires account-bound ownership acceptance, then the recipient is prompted to sign in or register, and the transfer context is preserved so they can continue the acceptance flow after authentication.
6. Given ownership changes after a successful transfer, when the new owner views the transferred ticket, then the product reflects the latest ticket state in their account, and the old owner is not shown contradictory active ownership information.
7. Given the transfer acceptance flow is used on a mobile device, when the recipient completes or attempts acceptance, then the acceptance action, confirmation, and resulting ownership state are readable and operable on a small screen, and the user is not left uncertain about whether they now own the ticket.
8. Given the product cannot complete the transfer acceptance because of a temporary system or network issue, when the recipient submits acceptance, then the product shows a clear failure or retry state, and it avoids implying that ownership changed if the outcome cannot be confirmed.

## Tasks / Subtasks

- [x] Extend the transfer client for acceptance and transfer links. (AC: 1, 2, 8)
  - [x] Add an accept-transfer call.
  - [x] Add a transfer-link helper for the recipient route.

- [x] Add a transfer acceptance route and recipient flow. (AC: 1, 5, 7)
  - [x] Create a shareable transfer acceptance page with preserved serial-number context.
  - [x] Require attendee authentication before acceptance while preserving next-path state.
  - [x] Show clear acceptance messaging and mobile-friendly actions.

- [x] Show success and invalid-transfer states clearly. (AC: 2, 3, 4, 6, 8)
  - [x] Confirm when the ticket moved into the recipient account.
  - [x] Link the recipient into the newly owned ticket detail and wallet.
  - [x] Show retry/unavailable messaging for invalid or failed acceptance attempts.

- [x] Surface the shareable accept link from transfer start. (AC: 1)
  - [x] Give the sender a copyable accept path after transfer creation.

- [x] Verify the implementation. (AC: 1-8)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added a recipient-facing transfer acceptance route with auth handoff.
- Added transfer acceptance API support and success/error states.
- Surfaced a shareable acceptance link after transfer creation.
- Linked successful recipients into their new owned-ticket experience.

### File List

- [frontend/src/lib/transfers/transfers-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/transfers/transfers-client.ts)
- [frontend/src/features/tickets/ticket-transfer-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/ticket-transfer-panel.tsx)
- [frontend/src/features/transfers/transfer-acceptance-screen.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/transfers/transfer-acceptance-screen.tsx)
- [frontend/src/app/(public)/transfer/accept/[serialNumber]/page.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/transfer/accept/[serialNumber]/page.tsx)

### Change Log

- Added a public transfer acceptance route with preserved sign-in return flow.
- Added frontend transfer acceptance client support and sender-facing shareable accept links.
- Added recipient success, invalid-transfer, and retry states tied to backend truth.
