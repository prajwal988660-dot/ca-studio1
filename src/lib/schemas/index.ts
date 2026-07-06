import { z } from 'zod';

export * from './india';
export * from './company';
export * from './journal';

/**
 * Convert a ZodError into a list of human-readable "path: message" strings.
 * Issues without a path (root-level refinements) return just the message.
 */
export function formatZodError(err: z.ZodError): string[] {
  return err.issues.map((issue) => {
    const path = issue.path
      .map((segment) => String(segment))
      .filter((segment) => segment.length > 0)
      .join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

/** Return the first human-readable error message from a ZodError. */
export function firstError(err: z.ZodError): string {
  const messages = formatZodError(err);
  return messages[0] ?? 'Validation failed';
}
