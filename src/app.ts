import { fileURLToPath } from 'node:url';
import express from 'express';
import OpenApiValidator from 'express-openapi-validator';
import { cors } from './http/cors.ts';
import { createErrorHandler } from './http/error-handler.ts';
import { requestLogger } from './http/request-logger.ts';
import type { Logger } from './logger.ts';
import type { NotificationRepository } from './notifications/notification.repository.ts';
import { notificationRoutes } from './notifications/notification.routes.ts';
import type { NotificationSender } from './notifications/notification.sender.ts';
import { createNotificationService } from './notifications/notification.service.ts';

const apiSpec = fileURLToPath(new URL('../openapi.yaml', import.meta.url));

interface AppDeps {
  repository: NotificationRepository;
  sender: NotificationSender;
  logger: Logger;
  validateResponses?: boolean;
}

export function createApp({ repository, sender, logger, validateResponses = false }: AppDeps) {
  const app = express();

  app.use(requestLogger(logger));
  app.use(cors);
  // The body must be parsed before the validator runs.
  app.use(express.json());
  app.use(OpenApiValidator.middleware({ apiSpec, validateResponses }));
  app.use(notificationRoutes(createNotificationService(repository, sender, logger)));
  app.use(createErrorHandler(logger));

  return app;
}
