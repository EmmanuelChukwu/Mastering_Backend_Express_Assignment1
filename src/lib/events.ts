import { EventEmitter } from "events";

/*
 * This is the ONE EventEmitter used by the application.
 *
 * Think of it as a central notice board:
 *
 *     auth.service.ts
 *            │
 *            │ "USER_REGISTERED happened"
 *            ▼
 *        appEvents
 *          /    \
 *         /      \
 *        ▼        ▼
 *    listener   listener
 *
 * The service doesn't need to know who is listening.
 */

export const appEvents = new EventEmitter();

/*
 * Node warns when an EventEmitter has more than 10 listeners
 * for the same event by default.
 *
 * Our application can legitimately have more than 10 listeners
 * as it grows, so we raise that limit.
 */
appEvents.setMaxListeners(20);