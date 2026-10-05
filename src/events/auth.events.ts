import { appEvents } from "../lib/events";
import { logger } from "../lib/logger";

/*
 * Keep all authentication event names in one place.
 *
 * The "auth:" prefix gives our events a namespace.
 *
 * Later we might have things like:
 *
 * document:uploaded
 * chat:message-sent
 * payment:completed
 */
export const AUTH_EVENTS = {
  USER_REGISTERED: "auth:user-registered",
  USER_LOGGED_IN: "auth:user-logged-in",
  USER_LOGGED_OUT: "auth:user-logged-out",
  TOKEN_REFRESHED: "auth:token-refreshed",
  LOGIN_FAILED: "auth:login-failed",
} as const;

/*
 * USER_REGISTERED
 *
 * The instructor's version creates an analytics record
 * and a welcome conversation here.
 *
 * Our current Project1 schema doesn't contain those models,
 * so for now we'll demonstrate the event with logging.
 *
 * Later, when those models exist, this listener can be replaced
 * with the actual database side effect without changing
 * auth.service.ts.
 */
appEvents.on(AUTH_EVENTS.USER_REGISTERED, async (user) => {
  try {
    logger.info("auth.user_registered", { email: user.email, userId: user.id });

    /*
     * Future side effects could live here:
     *
     * await prisma.usageLog.create(...)
     * await prisma.conversation.create(...)
     * await sendWelcomeEmail(...)
     */
  } catch (error) {
    /*
     * IMPORTANT:
     *
     * A side effect failing should NOT cause registration itself
     * to fail.
     */
    logger.error("Failed to process USER_REGISTERED event", { error });
  }
});

/*
 * USER_LOGGED_IN
 *
 * The instructor uses this event for an authentication/security
 * audit log containing device information.
 */
appEvents.on(AUTH_EVENTS.USER_LOGGED_IN, async (data) => {
  try {
    logger.info("auth.user_logged_in", {
      userId: data.userId,
      deviceInfo: data.deviceInfo ?? "unknown",
    });
  } catch (error) {
    logger.error("Failed to process USER_LOGGED_IN event", { error });
  }
});

/*
 * LOGIN_FAILED
 *
 * Useful for security monitoring.
 *
 * Later this could feed rate limiting or security analytics.
 */
appEvents.on(AUTH_EVENTS.LOGIN_FAILED, async (data) => {
  try {
    logger.warn("auth.login_failed", {
      email: data.email,
      deviceInfo: data.deviceInfo ?? "unknown",
    });
  } catch (error) {
    logger.error("Failed to process LOGIN_FAILED event", { error });
  }
});

/*
 * TOKEN_REFRESHED
 *
 * We don't currently need a database side effect here,
 * but defining the event now gives the authentication system
 * a place to publish refresh activity.
 */
appEvents.on(AUTH_EVENTS.TOKEN_REFRESHED, async (data) => {
  try {
    logger.info("auth.token_refreshed", { userId: data.userId });
  } catch (error) {
    logger.error("Failed to process TOKEN_REFRESHED event", { error });
  }
});

/*
 * USER_LOGGED_OUT
 */
appEvents.on(AUTH_EVENTS.USER_LOGGED_OUT, async (data) => {
  try {
    logger.info("auth.user_logged_out", { userId: data.userId });
  } catch (error) {
    logger.error("Failed to process USER_LOGGED_OUT event", { error });
  }
});
