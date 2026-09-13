"use client";

import { createAuthClient } from "better-auth/react";

/** Same-origin: requests always hit the current host/port (avoids port-mismatch failures). */
export const authClient = createAuthClient();
