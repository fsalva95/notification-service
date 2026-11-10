import { createApp } from './app.ts';
import { createLogger } from './logger.ts';
import { createInMemoryRepository } from './notifications/notification.repository.ts';
import { createSimulatedSender } from './notifications/notification.sender.ts';

const port = Number(process.env.PORT ?? 3000);
const failureRate = Number(process.env.FAILURE_RATE ?? 0.2);
const logger = createLogger();

const app = createApp({
  repository: createInMemoryRepository(),
  sender: createSimulatedSender(failureRate),
  logger,
});

// Express 5 passes a listen error (for example EADDRINUSE) to this callback instead of throwing.
app.listen(port, (error) => {
  if (error) {
    logger.error('server failed to start', { port, error });
    process.exit(1);
  }
  logger.info('server listening', { port, failureRate });
});
