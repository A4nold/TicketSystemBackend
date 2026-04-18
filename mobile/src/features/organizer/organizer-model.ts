import type {
  CreateOrganizerEventPayload,
  CreateTicketTypePayload,
  OrganizerEventResponse,
  OrganizerTicketTypeResponse,
} from "@/lib/organizer/events-client";

export type EventEditorState = {
  description: string;
  endsAt: string;
  slug: string;
  startsAt: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  timezone: string;
  title: string;
  venueAddress: string;
  venueName: string;
};

export type TicketTypeEditorState = {
  currency: string;
  description: string;
  isActive: boolean;
  maxPerOrder: string;
  name: string;
  price: string;
  quantity: string;
  saleEndsAt: string;
  saleStartsAt: string;
  sortOrder: string;
};

export type FormValidationResult = {
  fieldErrors: Partial<Record<string, string>>;
  isValid: boolean;
};

export function toLocalDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

export function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export function toEventEditorState(event: OrganizerEventResponse): EventEditorState {
  return {
    description: event.description ?? "",
    endsAt: toLocalDateTime(event.endsAt),
    slug: event.slug,
    startsAt: toLocalDateTime(event.startsAt),
    status: event.status as EventEditorState["status"],
    timezone: event.timezone,
    title: event.title,
    venueAddress: event.venueAddress ?? "",
    venueName: event.venueName ?? "",
  };
}

export function blankTicketTypeEditorState(): TicketTypeEditorState {
  return {
    currency: "EUR",
    description: "",
    isActive: true,
    maxPerOrder: "",
    name: "",
    price: "",
    quantity: "",
    saleEndsAt: "",
    saleStartsAt: "",
    sortOrder: "0",
  };
}

export function toTicketTypeEditorState(
  ticketType: OrganizerTicketTypeResponse,
): TicketTypeEditorState {
  return {
    currency: ticketType.currency,
    description: ticketType.description ?? "",
    isActive: ticketType.isActive,
    maxPerOrder: ticketType.maxPerOrder ? String(ticketType.maxPerOrder) : "",
    name: ticketType.name,
    price: ticketType.price,
    quantity: String(ticketType.quantity),
    saleEndsAt: toLocalDateTime(ticketType.saleEndsAt),
    saleStartsAt: toLocalDateTime(ticketType.saleStartsAt),
    sortOrder: "0",
  };
}

export function buildOrganizerEventPatch(
  form: EventEditorState,
): Partial<CreateOrganizerEventPayload> {
  return {
    description: form.description || undefined,
    endsAt: toIsoDateTime(form.endsAt),
    slug: form.slug || undefined,
    startsAt: new Date(form.startsAt).toISOString(),
    status: form.status,
    timezone: form.timezone,
    title: form.title.trim(),
    venueAddress: form.venueAddress || undefined,
    venueName: form.venueName || undefined,
  };
}

export function buildTicketTypePayload(form: TicketTypeEditorState): CreateTicketTypePayload {
  return {
    currency: form.currency || "EUR",
    description: form.description || undefined,
    isActive: form.isActive,
    maxPerOrder: form.maxPerOrder ? Number(form.maxPerOrder) : undefined,
    name: form.name.trim(),
    price: form.price.trim(),
    quantity: Number(form.quantity),
    saleEndsAt: toIsoDateTime(form.saleEndsAt),
    saleStartsAt: toIsoDateTime(form.saleStartsAt),
    sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
  };
}

export function getStaffStatusCopy(acceptedAt: string | null) {
  return acceptedAt ? "Active" : "Invite pending";
}

function isValidDateTimeInput(value: string) {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

export function validateEventEditorState(form: EventEditorState): FormValidationResult {
  const fieldErrors: Partial<Record<string, string>> = {};

  if (!form.title.trim()) {
    fieldErrors.title = "Add an event title.";
  }

  if (!form.startsAt.trim()) {
    fieldErrors.startsAt = "Add the event start time.";
  } else if (!isValidDateTimeInput(form.startsAt)) {
    fieldErrors.startsAt = "Use a valid start time.";
  }

  if (form.endsAt.trim() && !isValidDateTimeInput(form.endsAt)) {
    fieldErrors.endsAt = "Use a valid end time or leave it empty.";
  }

  if (!form.timezone.trim()) {
    fieldErrors.timezone = "Add a timezone.";
  }

  if (!form.slug.trim()) {
    fieldErrors.slug = "Add a short event slug.";
  }

  return {
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}

export function validateTicketTypeEditorState(
  form: TicketTypeEditorState,
): FormValidationResult {
  const fieldErrors: Partial<Record<string, string>> = {};

  if (!form.name.trim()) {
    fieldErrors.name = "Add a ticket type name.";
  }

  if (!/^\d+(\.\d{1,2})?$/.test(form.price.trim())) {
    fieldErrors.price = "Use a price like 15.00.";
  }

  if (!/^\d+$/.test(form.quantity.trim()) || Number(form.quantity) <= 0) {
    fieldErrors.quantity = "Enter a quantity greater than zero.";
  }

  if (
    form.maxPerOrder.trim() &&
    (!/^\d+$/.test(form.maxPerOrder.trim()) || Number(form.maxPerOrder) <= 0)
  ) {
    fieldErrors.maxPerOrder = "Use a whole number greater than zero.";
  }

  if (form.saleStartsAt.trim() && !isValidDateTimeInput(form.saleStartsAt)) {
    fieldErrors.saleStartsAt = "Use a valid sale start time.";
  }

  if (form.saleEndsAt.trim() && !isValidDateTimeInput(form.saleEndsAt)) {
    fieldErrors.saleEndsAt = "Use a valid sale end time.";
  }

  return {
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}

export function validateStaffInvite(email: string): FormValidationResult {
  const normalized = email.trim();
  const fieldErrors: Partial<Record<string, string>> = {};

  if (normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    fieldErrors.email = "Use a valid email address.";
  }

  return {
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}
