import "reflect-metadata";
import "dotenv/config";

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const bootstrapLogger = new Logger("Bootstrap");

  process.on("unhandledRejection", (reason) => {
    const message =
      reason instanceof Error ? reason.message : "Unhandled promise rejection";
    const stack = reason instanceof Error ? reason.stack : undefined;
    bootstrapLogger.error(`runtime.backend.unhandled_rejection message="${message}"`, stack);
  });

  process.on("uncaughtException", (error) => {
    bootstrapLogger.error(
      `runtime.backend.uncaught_exception message="${error.message}"`,
      error.stack,
    );
  });

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const port = Number(process.env.PORT ?? 3000);
  const allowedOrigins = (
    process.env.CORS_ORIGINS ??
    "http://localhost:3001,http://localhost:3002,http://127.0.0.1:3001,http://127.0.0.1:3002"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Private Event Smart Ticketing API")
    .setDescription(
      "Backend API for organizers, attendees, and door staff in the smart ticketing platform.",
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste the JWT access token obtained from /api/auth/login.",
      },
      "bearer",
    )
    .addTag("auth")
    .addTag("root")
    .addTag("health")
    .addTag("events")
    .addTag("orders")
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument);

  await app.listen(port);

  bootstrapLogger.log(`API running on http://localhost:${port}/api`);
  bootstrapLogger.log(`Swagger docs on http://localhost:${port}/docs`);
}

bootstrap();
