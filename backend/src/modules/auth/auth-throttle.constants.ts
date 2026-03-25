/** Window for auth rate limits (per IP, in-memory store) */
export const AUTH_THROTTLE_TTL_MS = 60_000

/** Must be ≥ any per-route limit on this controller */
export const AUTH_THROTTLE_MODULE_LIMIT = 120
