import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
import QRCode from "qrcode";

import { PrismaService } from "../prisma/prisma.service";

type FlyerSize = "4x5" | "A4" | "9x16";

const FLYER_DIMENSIONS: Record<FlyerSize, { height: number; width: number }> = {
  "4x5": { width: 1080, height: 1350 },
  A4: { width: 1240, height: 1754 },
  "9x16": { width: 1080, height: 1920 },
};

@Injectable()
export class EventFlyerService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(eventId: string, size: FlyerSize) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          include: {
            profile: true,
          },
        },
        ticketTypes: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    const flyerQrTargetUrl = (
      process.env.FLYER_QR_TARGET_URL ??
      "https://testflight.apple.com/join/QCyMX5sj"
    ).trim();
    const qrDataUrl = await QRCode.toDataURL(flyerQrTargetUrl, { margin: 1, width: 280 });

    const organizerName =
      [event.organizer.profile?.firstName, event.organizer.profile?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || event.organizer.email;
    const venueLabel =
      [event.venueName, event.venueAddress].filter(Boolean).join(", ") ||
      "Venue details to be confirmed";
    const dateLabel = new Intl.DateTimeFormat("en-IE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: event.timezone,
    }).format(event.startsAt);
    const priceLabel = this.buildFlyerPriceLabel(event.ticketTypes);

    const { width, height } = FLYER_DIMENSIONS[size];
    const safeTitle = this.escapeXml(event.title);
    const safeOrganizer = this.escapeXml(`By ${organizerName}`);
    const safeDate = this.escapeXml(dateLabel);
    const safeVenue = this.escapeXml(venueLabel);
    const safePrice = this.escapeXml(priceLabel);
    const imageHref = event.coverImageUrl ? this.escapeXml(event.coverImageUrl) : null;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="fallbackBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f8f86"/>
      <stop offset="100%" stop-color="#172033"/>
    </linearGradient>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.2)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.72)"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#fallbackBg)"/>
  ${
    imageHref
      ? `<image href="${imageHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />`
      : ""
  }
  <rect width="${width}" height="${height}" fill="url(#overlay)"/>
  <text x="72" y="120" font-size="32" font-family="Arial, sans-serif" fill="#f6d2ab" letter-spacing="2">MAYA</text>
  <text x="72" y="${height - 430}" font-size="68" font-weight="700" font-family="Arial, sans-serif" fill="#ffffff">${safeTitle}</text>
  <text x="72" y="${height - 368}" font-size="34" font-family="Arial, sans-serif" fill="#e9eef7">${safeOrganizer}</text>
  <text x="72" y="${height - 300}" font-size="30" font-family="Arial, sans-serif" fill="#e9eef7">${safeDate}</text>
  <text x="72" y="${height - 248}" font-size="30" font-family="Arial, sans-serif" fill="#e9eef7">${safeVenue}</text>
  <text x="72" y="${height - 178}" font-size="44" font-weight="700" font-family="Arial, sans-serif" fill="#ffffff">${safePrice}</text>
  <rect x="${width - 352}" y="${height - 352}" width="280" height="280" rx="18" fill="#ffffff" />
  <image href="${qrDataUrl}" x="${width - 344}" y="${height - 344}" width="264" height="264" />
  <text x="72" y="${height - 94}" font-size="34" font-family="Arial, sans-serif" fill="#ffffff">Get tickets on Maya</text>
</svg>`;

    const storageDir = join(process.cwd(), "uploads", "flyers");
    await fs.mkdir(storageDir, { recursive: true });
    const filename = `${event.id}-${size}-${Date.now()}-${randomUUID()}.svg`;
    const absolutePath = join(storageDir, filename);
    await fs.writeFile(absolutePath, svg, "utf8");

    const backendBase = (
      process.env.BACKEND_PUBLIC_URL ??
      process.env.PUBLIC_API_URL ??
      "http://localhost:3000"
    ).replace(/\/$/, "");

    return {
      imageUrl: `${backendBase}/media/flyers/${filename}`,
      size,
    };
  }

  private escapeXml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private buildFlyerPriceLabel(
    ticketTypes: Array<{
      currency: string;
      maxOfferPrice?: { toString(): string } | string | null;
      minOfferPrice?: { toString(): string } | string | null;
      price: { toString(): string } | string;
      pricingMode?: string | null;
    }>,
  ) {
    if (!ticketTypes.length) {
      return "Tickets available";
    }

    const numericPrices = ticketTypes
      .map((ticketType) => ({
        currency: ticketType.currency,
        value: Number(ticketType.price.toString()),
      }))
      .filter((entry) => Number.isFinite(entry.value))
      .sort((a, b) => a.value - b.value);

    if (!numericPrices.length) {
      return "Tickets available";
    }

    const minPrice = numericPrices[0];
    const maxPrice = numericPrices[numericPrices.length - 1];

    if (!minPrice || !maxPrice) {
      return "Tickets available";
    }

    const formatter = new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: minPrice.currency,
    });

    const hasFreeTicket = minPrice.value <= 0;
    if (hasFreeTicket) {
      return `Free - ${formatter.format(maxPrice.value)}`;
    }

    return `${formatter.format(minPrice.value)} - ${formatter.format(maxPrice.value)}`;
  }
}
