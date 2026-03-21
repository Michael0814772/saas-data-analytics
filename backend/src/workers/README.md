# workers

Background processors (BullMQ consumers, cron-style jobs) live here.

They must stay outside the HTTP request path and remain retry-safe and idempotent.
