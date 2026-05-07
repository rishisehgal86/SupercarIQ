export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the path to the local login page.
 * Replaces the old Manus OAuth URL builder.
 * Accepts an optional returnPath so the login page can redirect back after auth.
 */
export const getLoginUrl = (returnPath?: string): string => {
  const base = "/login";
  if (returnPath) {
    return `${base}?returnTo=${encodeURIComponent(returnPath)}`;
  }
  return base;
};
