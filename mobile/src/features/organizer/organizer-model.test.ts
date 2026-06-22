import { describe, expect, it } from "vitest";

import {
  blankEventEditorState,
  blankTicketTypeEditorState,
  buildOrganizerEventCreatePayload,
  buildOrganizerEventPatch,
  buildTicketTypePayload,
  formatLocalDateTimeInput,
  getStaffStatusCopy,
  parseLocalDateTimeInput,
  toEventEditorState,
  validateEventEditorState,
  validateStaffInvite,
  validateTicketTypeEditorState,
} from "@/features/organizer/organizer-model";
import type { OrganizerEventResponse } from "@/lib/organizer/events-client";

function buildEvent(overrides: Partial<OrganizerEventResponse> = {}): OrganizerEventResponse {
  return {
    allowResale: false,
    coverImageUrl: null,
    currency: "EUR",
    description: "Campus night.",
    endsAt: "2026-05-12T23:00:00.000Z",
    id: overrides.id ?? "event-1",
    issuedTicketsCount: 140,
    metrics: {
      resaleListings: 0,
      scanAttempts: 0,
      tickets: 140,
    },
    paymentReadiness: {
      blockingCode: null,
      blockingMessage: null,
      canPublishPaidEvent: true,
      hasPaidTicketTypes: false,
      isReadyForPaidEvents: false,
      organizerOnboardingStatus: null,
      paidTicketTypeCount: 0,
      selectedProvider: null,
    },
    organizer: {
      email: "owner@example.com",
      firstName: "Ada",
      id: "user-1",
      lastName: "Lovelace",
    },
    postEventContent: {
      ctaLabel: null,
      ctaUrl: null,
      message: null,
      publishedAt: null,
    },
    resalePolicy: {
      endsAt: null,
      maxResalePrice: null,
      minResalePrice: null,
      resaleRoyaltyPercent: null,
      startsAt: null,
    },
    salesWindow: {
      endsAt: null,
      startsAt: null,
    },
    slug: overrides.slug ?? "campus-neon",
    staff: [],
    startsAt: "2026-05-12T20:00:00.000Z",
    status: "PUBLISHED",
    ticketTypes: [],
    timezone: "Europe/Dublin",
    title: "Campus Neon",
    venueAddress: "1 Fleet Street",
    venueName: "The Yard",
    ...overrides,
  };
}

describe("organizer-model", () => {
  it("maps event detail into editable state", () => {
    const form = toEventEditorState(buildEvent());

    expect(form.title).toBe("Campus Neon");
    expect(form.currency).toBe("EUR");
    expect(form.timezone).toBe("Europe/Dublin");
    expect(form.startsAt).toContain("2026-05-12");
  });

  it("builds an event patch with optional fields omitted", () => {
    const payload = buildOrganizerEventPatch({
      coverImageUrl: "",
      description: "",
      currency: "NGN",
      endsAt: "",
      salesEndAt: "",
      salesStartAt: "",
      slug: "campus-neon",
      startsAt: "2026-05-12T20:00",
      status: "PUBLISHED",
      timezone: "Europe/Dublin",
      title: " Campus Neon ",
      venueAddress: "",
      venueName: "The Yard",
    });

    expect(payload.description).toBeUndefined();
    expect(payload.currency).toBe("NGN");
    expect(payload.title).toBe("Campus Neon");
    expect(payload.venueAddress).toBeUndefined();
    expect(payload.venueName).toBe("The Yard");
    expect(payload.startsAt).toBe("2026-05-12T19:00:00.000Z");
  });

  it("builds a create payload from a blank event shell", () => {
    const blank = blankEventEditorState();
    const payload = buildOrganizerEventCreatePayload({
      ...blank,
      slug: "campus-neon",
      title: "Campus Neon",
    });

    expect(payload.title).toBe("Campus Neon");
    expect(payload.slug).toBe("campus-neon");
    expect(payload.currency).toBe("EUR");
    expect(payload.status).toBe("DRAFT");
    expect(payload.startsAt).toContain("T");
  });

  it("parses and formats local datetime values safely", () => {
    const parsed = parseLocalDateTimeInput("2026-05-12T20:05");

    expect(parsed).toBeTruthy();
    expect(formatLocalDateTimeInput(parsed as Date)).toBe("2026-05-12T20:05");
    expect(parseLocalDateTimeInput("2026-02-31T20:05")).toBeNull();
  });

  it("builds ticket type payloads with numeric conversions", () => {
    const payload = buildTicketTypePayload({
      ...blankTicketTypeEditorState(),
      maxPerOrder: "4",
      name: "VIP",
      price: "9500",
      quantity: "50",
      sortOrder: "2",
    });

    expect(payload.name).toBe("VIP");
    expect(payload.quantity).toBe(50);
    expect(payload.maxPerOrder).toBe(4);
    expect(payload.sortOrder).toBe(2);
  });

  it("reports pending and active staff states clearly", () => {
    expect(getStaffStatusCopy(null)).toBe("Invite pending");
    expect(getStaffStatusCopy("2026-04-01T10:00:00.000Z")).toBe("Active");
  });

  it("validates the required event fields before save", () => {
    const result = validateEventEditorState({
      coverImageUrl: "",
      description: "",
      currency: "EUR",
      endsAt: "not-a-date",
      salesEndAt: "not-a-date",
      salesStartAt: "",
      slug: "",
      startsAt: "",
      status: "DRAFT",
      timezone: "",
      title: "",
      venueAddress: "",
      venueName: "",
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.title).toBeTruthy();
    expect(result.fieldErrors.startsAt).toBeTruthy();
    expect(result.fieldErrors.endsAt).toBeTruthy();
    expect(result.fieldErrors.salesEndAt).toBeTruthy();
  });

  it("validates ticket type numeric fields and invite email", () => {
    const ticketTypeResult = validateTicketTypeEditorState({
      ...blankTicketTypeEditorState(),
      name: "",
      price: "25.000",
      quantity: "0",
    });
    const staffInviteResult = validateStaffInvite("invalid-email");
    const blankStaffInviteResult = validateStaffInvite("");

    expect(ticketTypeResult.isValid).toBe(false);
    expect(ticketTypeResult.fieldErrors.price).toBeTruthy();
    expect(ticketTypeResult.fieldErrors.quantity).toBeTruthy();
    expect(staffInviteResult.fieldErrors.email).toBeTruthy();
    expect(blankStaffInviteResult.isValid).toBe(true);
  });
});
