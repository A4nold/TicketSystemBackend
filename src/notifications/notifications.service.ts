import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationStatus,
  NotificationType,
  PushDeviceStatus,
  Prisma,
} from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { ListUserNotificationsQueryDto } from "./dto/list-user-notifications-query.dto";

type TransferRecipientEmailInput = Readonly<{
  acceptUrl: string;
  eventStartsAt: Date;
  eventTitle: string;
  recipientEmail: string;
  senderEmail: string;
  serialNumber: string;
  ticketTypeName: string;
}>;

type CreateUserNotificationInput = Readonly<{
  actionUrl?: string;
  body: string;
  metadata?: Prisma.InputJsonValue;
  pushBody?: string;
  pushData?: Prisma.InputJsonValue;
  pushTitle?: string;
  sendPush?: boolean;
  title: string;
  type: NotificationType;
  userId: string;
}>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createUserNotification(input: CreateUserNotificationInput) {
    const notification = await this.prisma.userNotification.create({
      data: {
        actionUrl: input.actionUrl,
        body: input.body,
        metadata: input.metadata,
        title: input.title,
        type: input.type,
        userId: input.userId,
      },
    });

    if (input.sendPush) {
      await this.sendPushToUsers([input.userId], {
        body: input.pushBody ?? input.body,
        data: {
          ...(input.actionUrl ? { actionUrl: input.actionUrl } : {}),
          ...(this.toPushData(input.pushData) ?? {}),
        },
        title: input.pushTitle ?? input.title,
      });
    }

    return notification;
  }

  async registerPushDevice(
    user: AuthenticatedUser,
    payload: {
      expoPushToken: string;
      platform: "IOS" | "ANDROID";
      deviceName?: string;
      appVersion?: string;
    },
  ) {
    return this.prisma.pushDevice.upsert({
      where: {
        expoPushToken: payload.expoPushToken,
      },
      update: {
        appVersion: payload.appVersion?.trim() || null,
        deviceName: payload.deviceName?.trim() || null,
        lastErrorAt: null,
        lastErrorReason: null,
        lastRegisteredAt: new Date(),
        platform: payload.platform,
        status: PushDeviceStatus.ACTIVE,
        userId: user.id,
      },
      create: {
        appVersion: payload.appVersion?.trim() || null,
        deviceName: payload.deviceName?.trim() || null,
        expoPushToken: payload.expoPushToken,
        lastRegisteredAt: new Date(),
        platform: payload.platform,
        status: PushDeviceStatus.ACTIVE,
        userId: user.id,
      },
    });
  }

  async unregisterPushDevice(
    user: AuthenticatedUser,
    payload: {
      expoPushToken: string;
    },
  ) {
    await this.prisma.pushDevice.deleteMany({
      where: {
        expoPushToken: payload.expoPushToken,
        userId: user.id,
      },
    });

    return {
      ok: true,
    };
  }

  async listUserNotifications(
    user: AuthenticatedUser,
    query: ListUserNotificationsQueryDto = {},
  ) {
    const take = query.limit ?? 10;
    const notifications = await this.prisma.userNotification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(query.cursor
        ? {
            cursor: {
              id: query.cursor,
            },
            skip: 1,
          }
        : {}),
      take: take + 1,
    });

    const hasMore = notifications.length > take;
    const pageItems = hasMore ? notifications.slice(0, take) : notifications;

    return {
      items: pageItems.map((notification) => ({
        actionUrl: notification.actionUrl,
        body: notification.body,
        createdAt: notification.createdAt,
        id: notification.id,
        metadata: notification.metadata,
        readAt: notification.readAt,
        status: notification.status,
        title: notification.title,
        type: notification.type,
      })),
      nextCursor: hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null,
    };
  }

  async markNotificationAsRead(notificationId: string, user: AuthenticatedUser) {
    const notification = await this.prisma.userNotification.findFirst({
      where: {
        id: notificationId,
        userId: user.id,
      },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification "${notificationId}" was not found for user "${user.id}".`,
      );
    }

    if (notification.status === NotificationStatus.READ) {
      return {
        actionUrl: notification.actionUrl,
        body: notification.body,
        createdAt: notification.createdAt,
        id: notification.id,
        metadata: notification.metadata,
        readAt: notification.readAt,
        status: notification.status,
        title: notification.title,
        type: notification.type,
      };
    }

    const updatedNotification = await this.prisma.userNotification.update({
      where: { id: notification.id },
      data: {
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });

    return {
      actionUrl: updatedNotification.actionUrl,
      body: updatedNotification.body,
      createdAt: updatedNotification.createdAt,
      id: updatedNotification.id,
      metadata: updatedNotification.metadata,
      readAt: updatedNotification.readAt,
      status: updatedNotification.status,
      title: updatedNotification.title,
      type: updatedNotification.type,
    };
  }

  async notifyTransferCreated(input: {
    eventTitle: string;
    recipientEmail: string | null;
    recipientUserId: string | null;
    senderUserId: string;
    serialNumber: string;
  }) {
    await this.createUserNotification({
      actionUrl: `/wallet/${encodeURIComponent(input.serialNumber)}`,
      body: `Your transfer for ${input.eventTitle} is pending acceptance.`,
      metadata: {
        serialNumber: input.serialNumber,
      },
      title: "Transfer started",
      type: NotificationType.TRANSFER_CREATED,
      userId: input.senderUserId,
    });

    if (input.recipientUserId) {
      await this.createUserNotification({
        actionUrl: `/transfer/accept/${encodeURIComponent(input.serialNumber)}`,
        body: `A ticket for ${input.eventTitle} is waiting for your review.`,
        metadata: {
          recipientEmail: input.recipientEmail,
          serialNumber: input.serialNumber,
        },
        sendPush: true,
        title: "Ticket waiting in your inbox",
        type: NotificationType.TRANSFER_RECEIVED,
        userId: input.recipientUserId,
      });
    }
  }

  async notifyTransferAccepted(input: {
    eventTitle: string;
    recipientUserId: string;
    senderUserId: string;
    serialNumber: string;
  }) {
    await this.prisma.$transaction([
      this.prisma.userNotification.create({
        data: {
          actionUrl: "/wallet",
          body: `Your transfer for ${input.eventTitle} was accepted successfully.`,
          metadata: {
            serialNumber: input.serialNumber,
          },
          title: "Transfer accepted",
          type: NotificationType.TRANSFER_ACCEPTED,
          userId: input.senderUserId,
        },
      }),
      this.prisma.userNotification.create({
        data: {
          actionUrl: `/wallet/${encodeURIComponent(input.serialNumber)}`,
          body: `You now own the ticket for ${input.eventTitle}.`,
          metadata: {
            serialNumber: input.serialNumber,
          },
          title: "Ticket added to your wallet",
          type: NotificationType.TRANSFER_ACCEPTED,
          userId: input.recipientUserId,
        },
      }),
    ]);
  }

  async notifyTransferCancelled(input: {
    eventTitle: string;
    recipientUserId: string | null;
    senderUserId: string;
    serialNumber: string;
  }) {
    const operations = [
      this.prisma.userNotification.create({
        data: {
          actionUrl: `/wallet/${encodeURIComponent(input.serialNumber)}`,
          body: `Your transfer for ${input.eventTitle} was cancelled and the ticket remains in your wallet.`,
          metadata: {
            serialNumber: input.serialNumber,
          },
          title: "Transfer cancelled",
          type: NotificationType.TRANSFER_CANCELLED,
          userId: input.senderUserId,
        },
      }),
    ];

    if (input.recipientUserId) {
      operations.push(
        this.prisma.userNotification.create({
          data: {
            actionUrl: "/wallet",
            body: `A pending transfer for ${input.eventTitle} is no longer available.`,
            metadata: {
              serialNumber: input.serialNumber,
            },
            title: "Transfer no longer available",
            type: NotificationType.TRANSFER_CANCELLED,
            userId: input.recipientUserId,
          },
        }),
      );
    }

    await this.prisma.$transaction(operations);
  }

  async notifyTransferExpired(input: {
    eventTitle: string;
    recipientUserId: string | null;
    senderUserId: string;
    serialNumber: string;
  }) {
    await this.createUserNotification({
      actionUrl: `/wallet/${encodeURIComponent(input.serialNumber)}`,
      body: `The pending transfer for ${input.eventTitle} expired and the ticket stayed in your wallet.`,
      metadata: {
        serialNumber: input.serialNumber,
      },
      title: "Transfer expired",
      type: "TRANSFER_EXPIRED" as NotificationType,
      userId: input.senderUserId,
    });

    if (input.recipientUserId) {
      await this.createUserNotification({
        actionUrl: "/wallet",
        body: `The transfer for ${input.eventTitle} expired before it was accepted.`,
        metadata: {
          serialNumber: input.serialNumber,
        },
        sendPush: true,
        title: "Transfer expired",
        type: "TRANSFER_EXPIRED" as NotificationType,
        userId: input.recipientUserId,
      });
    }
  }

  async notifyOrderPaid(input: {
    eventTitle: string;
    orderId: string;
    ticketCount: number;
    userId: string;
  }) {
    await this.createUserNotification({
      actionUrl: `/wallet?recentOrderId=${encodeURIComponent(input.orderId)}`,
      body: `${input.ticketCount} ticket${input.ticketCount === 1 ? "" : "s"} for ${input.eventTitle} ${input.ticketCount === 1 ? "is" : "are"} now in your wallet.`,
      metadata: {
        orderId: input.orderId,
        ticketCount: input.ticketCount,
      },
      sendPush: true,
      title: "Purchase complete",
      type: "ORDER_PAID" as NotificationType,
      userId: input.userId,
    });
  }

  async notifyTransferReminder(input: {
    eventTitle: string;
    recipientUserId: string;
    serialNumber: string;
  }) {
    await this.createUserNotification({
      actionUrl: `/transfer/accept/${encodeURIComponent(input.serialNumber)}`,
      body: `A pending transfer for ${input.eventTitle} is still waiting for your review.`,
      metadata: {
        serialNumber: input.serialNumber,
      },
      sendPush: true,
      title: "Transfer reminder",
      type: "TRANSFER_REMINDER" as NotificationType,
      userId: input.recipientUserId,
    });
  }

  async sendEventReminderPush(input: {
    eventId: string;
    eventSlug: string;
    eventTitle: string;
    startsAt: Date;
    userIds: string[];
  }) {
    await this.sendPushToUsers(input.userIds, {
      body: `${input.eventTitle} starts soon. Open your wallet to keep entry ready.`,
      data: {
        eventId: input.eventId,
        eventSlug: input.eventSlug,
        startsAt: input.startsAt.toISOString(),
        actionUrl: `/wallet?eventSlug=${encodeURIComponent(input.eventSlug)}`,
      },
      title: "Event reminder",
    });
  }

  async notifyResaleListed(input: {
    eventTitle: string;
    sellerUserId: string;
    serialNumber: string;
  }) {
    await this.createUserNotification({
      actionUrl: `/wallet/${encodeURIComponent(input.serialNumber)}`,
      body: `Your ticket for ${input.eventTitle} is now live in the official resale marketplace.`,
      metadata: {
        serialNumber: input.serialNumber,
      },
      title: "Resale listing is live",
      type: NotificationType.RESALE_LISTED,
      userId: input.sellerUserId,
    });
  }

  async notifyResaleSold(input: {
    buyerUserId: string;
    eventTitle: string;
    sellerUserId: string;
    serialNumber: string;
  }) {
    await this.prisma.$transaction([
      this.prisma.userNotification.create({
        data: {
          actionUrl: "/wallet",
          body: `Your resale listing for ${input.eventTitle} has sold.`,
          metadata: {
            serialNumber: input.serialNumber,
          },
          title: "Resale completed",
          type: NotificationType.RESALE_SOLD,
          userId: input.sellerUserId,
        },
      }),
      this.prisma.userNotification.create({
        data: {
          actionUrl: `/wallet/${encodeURIComponent(input.serialNumber)}`,
          body: `Your purchase for ${input.eventTitle} is now in your wallet.`,
          metadata: {
            serialNumber: input.serialNumber,
          },
          title: "Ticket added from resale",
          type: NotificationType.RESALE_SOLD,
          userId: input.buyerUserId,
        },
      }),
    ]);
  }

  async notifyResaleCancelled(input: {
    eventTitle: string;
    sellerUserId: string;
    serialNumber: string;
  }) {
    await this.createUserNotification({
      actionUrl: `/wallet/${encodeURIComponent(input.serialNumber)}`,
      body: `Your resale listing for ${input.eventTitle} has been cancelled.`,
      metadata: {
        serialNumber: input.serialNumber,
      },
      title: "Resale listing cancelled",
      type: NotificationType.RESALE_CANCELLED,
      userId: input.sellerUserId,
    });
  }

  async notifyPostEventPublished(input: {
    eventId: string;
    eventSlug: string;
    eventTitle: string;
  }) {
    const eligibleOwners = await this.prisma.ticket.findMany({
      where: {
        eventId: input.eventId,
        status: {
          notIn: ["CANCELLED", "REFUNDED"],
        },
      },
      distinct: ["currentOwnerId"],
      select: {
        currentOwnerId: true,
      },
    });

    if (eligibleOwners.length === 0) {
      return;
    }

    await this.prisma.$transaction(
      eligibleOwners.map((owner) =>
        this.prisma.userNotification.create({
          data: {
            actionUrl: `/wallet?eventSlug=${encodeURIComponent(input.eventSlug)}`,
            body: `New post-event content is available for ${input.eventTitle}.`,
            metadata: {
              eventId: input.eventId,
              eventSlug: input.eventSlug,
            },
            title: "Post-event update is live",
            type: "POST_EVENT_PUBLISHED" as NotificationType,
            userId: owner.currentOwnerId,
          },
        }),
      ),
    );
  }

  private async sendPushToUsers(
    userIds: string[],
    payload: {
      body: string;
      data?: Record<string, string>;
      title: string;
    },
  ) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

    if (uniqueUserIds.length === 0) {
      return;
    }

    const devices = await this.prisma.pushDevice.findMany({
      where: {
        status: PushDeviceStatus.ACTIVE,
        userId: {
          in: uniqueUserIds,
        },
      },
      select: {
        expoPushToken: true,
        id: true,
      },
    });

    if (devices.length === 0) {
      return;
    }

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        devices.map((device) => ({
          body: payload.body,
          data: payload.data,
          sound: "default",
          title: payload.title,
          to: device.expoPushToken,
        })),
      ),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Expo push send failed: status=${response.status} body=${body}`);
      return;
    }

    const result = (await response.json()) as {
      data?: Array<{
        details?: {
          error?: string;
        };
        status?: string;
      }>;
    };

    const tickets = result.data ?? [];

    await Promise.all(
      devices.map(async (device, index) => {
        const ticket = tickets[index];

        if (ticket?.status === "ok") {
          await this.prisma.pushDevice.update({
            where: { id: device.id },
            data: {
              lastDeliveredAt: new Date(),
              lastErrorAt: null,
              lastErrorReason: null,
            },
          });
          return;
        }

        const errorReason = ticket?.details?.error ?? "Unknown Expo push delivery error";
        await this.prisma.pushDevice.update({
          where: { id: device.id },
          data: {
            lastErrorAt: new Date(),
            lastErrorReason: errorReason,
            status:
              errorReason === "DeviceNotRegistered"
                ? PushDeviceStatus.DISABLED
                : PushDeviceStatus.ERROR,
          },
        });
      }),
    );
  }

  private toPushData(value?: Prisma.InputJsonValue) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        item == null ? "" : String(item),
      ]),
    );
  }

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
