"use client";

import { useEffect, useRef } from "react";
import type { Language } from "@/data/types";
import { useStore } from "@/lib/store";

/**
 * Bridges the two halves of the app: the account lives on the server, every
 * other bit of state lives on the device.
 *
 * - Name: without this, a user who typed their name at sign-up is still greeted
 *   as "friend", because the dashboard reads the device store.
 * - Language: the account is the source of truth, so the language picked on the
 *   login page (or later in Profile) also applies on a phone that has never
 *   seen this account before.
 */
export function AccountSync({
  displayName,
  language,
}: {
  displayName?: string;
  language?: string;
}) {
  const linkAccount = useStore((s) => s.linkAccount);
  const setLanguage = useStore((s) => s.setLanguage);

  // Apply the account language once per mount. Re-applying would fight the
  // Profile picker, whose change hasn't reached this server-rendered prop yet.
  const applied = useRef(false);

  useEffect(() => {
    linkAccount(displayName);
  }, [displayName, linkAccount]);

  useEffect(() => {
    if (applied.current || !language) return;
    applied.current = true;
    setLanguage(language as Language);
  }, [language, setLanguage]);

  return null;
}
