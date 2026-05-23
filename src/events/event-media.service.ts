import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { imageSize } from "image-size";
import { extname, join } from "path";

import { PrismaService } from "../prisma/prisma.service";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 630;
const MEDIA_ROUTE_PREFIX = "/media/events";

@Injectable()
export class EventMediaService {
  private readonly logger = new Logger(EventMediaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async uploadEventHeaderMedia(eventId: string, file: Express.Multer.File) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, coverImageUrl: true, shareImageUrl: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    this.logger.log(
      `event.media.upload.started eventId=${eventId} mimetype=${file?.mimetype ?? "unknown"} size=${file?.size ?? 0}`,
    );

    this.assertUploadFile(file);
    this.assertImageDimensions(file.buffer);

    const extension = this.resolveExtension(file);
    const storageDir = join(process.cwd(), "uploads", "events");
    await fs.mkdir(storageDir, { recursive: true });
    const filename = `${eventId}-${Date.now()}-${randomUUID()}${extension}`;
    const absoluteFilePath = join(storageDir, filename);
    await fs.writeFile(absoluteFilePath, file.buffer);

    const mediaUrl = this.toPublicMediaUrl(filename);
    const previousCoverImageUrl = event.coverImageUrl;

    const updatedEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        coverImageUrl: mediaUrl,
        ...(event.shareImageUrl ? {} : { shareImageUrl: mediaUrl }),
      },
      select: {
        coverImageUrl: true,
        shareImageUrl: true,
      },
    });

    await this.tryDeleteLocalMedia(previousCoverImageUrl);

    this.logger.log(
      `event.media.upload.completed eventId=${eventId} coverImageUrl=${updatedEvent.coverImageUrl ?? "null"}`,
    );

    return {
      coverImageUrl: updatedEvent.coverImageUrl,
      shareImageUrl: updatedEvent.shareImageUrl,
    };
  }

  async removeEventHeaderMedia(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, coverImageUrl: true, shareImageUrl: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    this.logger.log(`event.media.remove.started eventId=${eventId}`);

    const previousCoverImageUrl = event.coverImageUrl;
    const shouldClearShareImage = event.shareImageUrl === event.coverImageUrl;

    const updatedEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        coverImageUrl: null,
        ...(shouldClearShareImage ? { shareImageUrl: null } : {}),
      },
      select: {
        coverImageUrl: true,
        shareImageUrl: true,
      },
    });

    await this.tryDeleteLocalMedia(previousCoverImageUrl);

    this.logger.log(`event.media.remove.completed eventId=${eventId}`);

    return {
      coverImageUrl: updatedEvent.coverImageUrl,
      shareImageUrl: updatedEvent.shareImageUrl,
    };
  }

  private assertUploadFile(file?: Express.Multer.File) {
    if (!file) {
      this.logger.warn("event.media.upload.rejected reason=file_missing");
      throw new BadRequestException("Image file is required.");
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      this.logger.warn(
        `event.media.upload.rejected reason=unsupported_type mimetype=${file.mimetype}`,
      );
      throw new BadRequestException(
        "Unsupported image type. Use JPEG, PNG, or WEBP.",
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      this.logger.warn(
        `event.media.upload.rejected reason=file_too_large size=${file.size} limit=${MAX_FILE_BYTES}`,
      );
      throw new BadRequestException("Image must be 5MB or smaller.");
    }
  }

  private assertImageDimensions(buffer: Buffer) {
    const dimensions = imageSize(buffer);
    const width = dimensions.width ?? 0;
    const height = dimensions.height ?? 0;

    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      this.logger.warn(
        `event.media.upload.rejected reason=dimensions_too_small width=${width} height=${height} required=${MIN_WIDTH}x${MIN_HEIGHT}`,
      );
      throw new BadRequestException(
        `Image dimensions must be at least ${MIN_WIDTH}x${MIN_HEIGHT}.`,
      );
    }
  }

  private resolveExtension(file: Express.Multer.File) {
    if (file.mimetype === "image/png") {
      return ".png";
    }
    if (file.mimetype === "image/webp") {
      return ".webp";
    }

    const originalExt = extname(file.originalname || "").toLowerCase();
    return originalExt === ".jpeg" ? ".jpeg" : ".jpg";
  }

  private toPublicMediaUrl(filename: string) {
    const baseUrl = (
      process.env.BACKEND_PUBLIC_URL ??
      process.env.PUBLIC_API_URL ??
      "http://localhost:3000"
    ).replace(/\/$/, "");

    return `${baseUrl}${MEDIA_ROUTE_PREFIX}/${filename}`;
  }

  private async tryDeleteLocalMedia(url: string | null) {
    if (!url || !url.includes(`${MEDIA_ROUTE_PREFIX}/`)) {
      return;
    }

    const filename = url.split(`${MEDIA_ROUTE_PREFIX}/`)[1];

    if (!filename) {
      return;
    }

    const absoluteFilePath = join(process.cwd(), "uploads", "events", filename);
    await fs.rm(absoluteFilePath, { force: true }).catch(() => undefined);
  }
}
