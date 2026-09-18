/**
 * Privacy and security utility functions for Public QR Asset Verification.
 * Debre Berhan University Asset Tracking System.
 */

/**
 * Masks a person's full name to "First Name + Last Initial" to prevent exposure
 * of full identity, employee details, or student information.
 *
 * Examples:
 * - "John Doe" -> "John D."
 * - "Abebe Kebede" -> "Abebe K."
 * - "John Michael Doe" -> "John D."
 * - "A" -> "A"
 * - "" | null | undefined -> null
 */
export function maskPersonName(fullName: string | null | undefined): string | null {
  if (!fullName || typeof fullName !== "string") {
    return null;
  }

  const trimmed = fullName.trim();
  if (!trimmed) {
    return null;
  }

  // Split by whitespace
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  // Single word/name
  if (parts.length === 1) {
    return parts[0];
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const lastInitial = lastName.charAt(0).toUpperCase();

  return `${firstName} ${lastInitial}.`;
}

/**
 * Resolves the application's canonical base URL without trailing slash.
 * Prioritizes configured environment variables rather than hardcoding localhost or Vercel preview domains.
 */
export function getAppBaseUrl(): string {
  // If running in browser, use window origin
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Safely parses and formats a date without risk of `.toISOString()` crashes on invalid dates.
 */
export function formatSafeDate(rawDate: unknown): string | null {
  if (!rawDate) return null;

  try {
    const d = rawDate instanceof Date ? rawDate : new Date(String(rawDate));
    if (isNaN(d.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return null;
  }
}

/**
 * In-memory sliding window rate limiter for public verification endpoint.
 * Prevents automated scrapers from brute-forcing asset codes or public IDs.
 */
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 60; // Max 60 verification requests per minute per IP

export function checkVerificationRateLimit(ip: string = "anonymous"): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Clean up occasionally
  if (rateLimitMap.size > 5000) {
    rateLimitMap.forEach((val, key) => {
      if (val.expiresAt < now) {
        rateLimitMap.delete(key);
      }
    });
  }

  if (!entry || entry.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count };
}
