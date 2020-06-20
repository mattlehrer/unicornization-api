import { Response } from 'express';
import * as pino from 'pino';
import { v4 as uuid } from 'uuid';

export default (): Record<string, unknown> => ({
  env: process.env.NODE_ENV,
  server: {
    port: parseInt(process.env.SERVER_PORT, 10),
    baseUrl: process.env.BASE_URL,
  },
  traefik: {
    service: process.env.TRAEFIK_SERVICE,
  },
  redis: {
    // https://github.com/skunight/nestjs-redis
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    db: parseInt(process.env.REDIS_DB),
    password: process.env.REDIS_PASSWORD,
    keyPrefix: process.env.REDIS_PRIFIX,
    enableReadyCheck: Boolean(process.env.REDIS_READY_CHECK),
  },
  frontend: {
    baseUrl: process.env.FRONTEND_BASE_URL,
    loginSuccess: process.env.FRONTEND_LOGIN_SUCCESS,
    loginFailure: process.env.FRONTEND_LOGIN_FAILURE,
    resetPasswordRoute: ensureRouteEndsInSlash(
      process.env.FRONTEND_RESET_PASSWORD_ROUTE,
    ),
    verifyEmailRoute: ensureRouteEndsInSlash(
      process.env.FRONTEND_VERIFY_EMAIL_ROUTE,
    ),
  },
  cors: {
    // https://github.com/expressjs/cors#configuration-options
    credentials: true,
    // TODO: enable CORS only for added domains with async options:
    // https://github.com/expressjs/cors#configuring-cors-asynchronously
    origin: true,
  },
  jwt: {
    expiresIn: process.env.EXPIRES_IN,
    secret: process.env.JWT_SECRET,
  },
  cookie: {
    // https://github.com/expressjs/cookie-session#options
    secret: process.env.COOKIE_SECRET,
    name: 'sess',
    // cookie options
    // https://github.com/pillarjs/cookies#cookiesset-name--value---options--
    httpOnly: true,
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production',
    domain:
      process.env.NODE_ENV === 'production'
        ? process.env.COOKIE_DOMAIN
        : undefined,
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  },
  pino: {
    // https://github.com/iamolegga/nestjs-pino#configuration-params
    pinoHttp: {
      // https://github.com/pinojs/pino-http#pinohttpopts-stream
      genReqId: (
        req: Record<string, any>,
      ): { sessionId: string; reqId: string } => ({
        // https://github.com/goldbergyoni/nodebestpractices/blob/49da9e5e41bd4617856a6ecd847da5b9c299852e/sections/production/assigntransactionid.md
        sessionId: req.session?.id,
        reqId: uuid(),
      }),
      customLogLevel: (res: Response, err: Error): string => {
        if (res.statusCode >= 500 || err) {
          return 'error';
        } else if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },
      logger: pino({
        mixin: addContextRequest,
      }),
    },
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    callbackUrl: process.env.FACEBOOK_CALLBACK_URL,
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL,
  },
  twitter: {
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackUrl: process.env.TWITTER_CALLBACK_URL,
  },
  helmet: {
    // https://helmetjs.github.io/docs/
    frameguard: false,
  },
  rateLimit: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  email: {
    sendGridApiKey: process.env.SENDGRID_API_KEY,
    domain: process.env.SENDGRID_DOMAIN,
    from: {
      verifyEmail: 'info',
      resetPasswordEmail: 'info',
    },
    shouldSendInDev: false, // set to true to send emails when NODE_ENV is !== production
  },
});

function ensureRouteEndsInSlash(route: string) {
  if (route && !route.endsWith('/')) route = route + '/';
  return route;
}

export function addContextRequest(): Record<string, string> {
  return { context: 'Request' };
}
