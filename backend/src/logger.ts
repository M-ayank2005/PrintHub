import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-session-token"]',
      'req.headers.cookie',
      'req.body.password',
      'req.body.refreshToken',
      'req.body.token',
      'req.body.customerPhone',
      'req.body.customerName',
      'password',
      'passwordHash',
      'accessToken',
      'refreshToken',
      'token',
      'customerPhone',
    ],
    censor: '***REDACTED***',
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
