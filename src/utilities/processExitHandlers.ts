import { type Server } from 'http';

const EVENT = {
  SIGINT: 'SIGINT',
  SIGTERM: 'SIGTERM',
  UNCAUGHT_EXCEPTION: 'uncaughtException',
  UNCAUGHT_REJECTION: 'unhandledRejection',
};

const getEventDescription = (event: string) =>
  `Encountered ${event}. Exiting the Server.`;

// Ref: https://blog.heroku.com/best-practices-nodejs-errors#graceful-shutdowns
const makeCreateExitHandler =
  (server: Server) => (desc: string, code: number) => (err: unknown) => {
    console.error('Server Termination:', desc, err);

    server.close(() => {
      console.log('Server closed');
    });

    // shut down process if timeout exceeded
    setTimeout(() => {
      console.log('Server closure timed out. Exiting the Process.');
      process.exit(code);
    }, 2000).unref();
  };

const attachExitHandlersToProcess = (httpServer: Server) => {
  const createExitHandler = makeCreateExitHandler(httpServer);

  process.on(
    EVENT.UNCAUGHT_EXCEPTION,
    createExitHandler(getEventDescription(EVENT.UNCAUGHT_EXCEPTION), 1),
  );
  process.on(
    EVENT.UNCAUGHT_REJECTION,
    createExitHandler(getEventDescription(EVENT.UNCAUGHT_REJECTION), 1),
  );
  process.on(
    EVENT.SIGTERM,
    createExitHandler(getEventDescription(EVENT.SIGTERM), 0),
  );
  process.on(
    EVENT.SIGINT,
    createExitHandler(getEventDescription(EVENT.SIGINT), 0),
  );
};

export { attachExitHandlersToProcess, EVENT };
