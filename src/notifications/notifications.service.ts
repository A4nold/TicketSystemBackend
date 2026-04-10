import { Injectable, Logger } from "@nestjs/common";

type TransferRecipientEmailInput = Readonly<{
  acceptUrl: string;
  eventStartsAt: Date;
  eventTitle: string;
  recipientEmail: string;
  senderEmail: string;
  serialNumber: string;
  ticketTypeName: string;
}>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendTransferRecipientEmail(input: TransferRecipientEmailInput) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.NOTIFICATIONS_FROM_EMAIL ?? "Ticket System <no-reply@ticketsystem.local>";
    const subject = `Ticket transfer for ${input.eventTitle}`;
    const text = [
      `You have received a ticket transfer for ${input.eventTitle}.`,
      `Ticket type: ${input.ticketTypeName}`,
      `Serial: ${input.serialNumber}`,
      `From: ${input.senderEmail}`,
      `Event starts: ${input.eventStartsAt.toISOString()}`,
      `Accept transfer: ${input.acceptUrl}`,
    ].join("\n");
    const html = [
      `<p>You have received a ticket transfer for <strong>${input.eventTitle}</strong>.</p>`,
      `<p><strong>Ticket type:</strong> ${input.ticketTypeName}<br />`,
      `<strong>Serial:</strong> ${input.serialNumber}<br />`,
      `<strong>From:</strong> ${input.senderEmail}<br />`,
      `<strong>Event starts:</strong> ${input.eventStartsAt.toISOString()}</p>`,
      `<p><a href="${input.acceptUrl}">Review and accept this ticket</a></p>`,
    ].join("");

    if (!resendApiKey) {
      this.logger.log(
        `Transfer email preview -> to=${input.recipientEmail} subject="${subject}" acceptUrl=${input.acceptUrl}`,
      );
      return { delivered: false, provider: "log-only" as const };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.recipientEmail],
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Transfer recipient email failed: status=${response.status} body=${body}`,
      );
      return { delivered: false, provider: "resend" as const };
    }

    return { delivered: true, provider: "resend" as const };
  }
}
