import { createContext } from 'react';

export type PendingEventTemplate = {
  kind: number;
  content: string;
  tags: string[][];
  /** Optional explicit timestamp; otherwise filled in at sign time. */
  created_at?: number;
};

export type PendingEvent = {
  /** Stable client-side id (uuid). */
  id: string;
  /** Hex pubkey of the user who originally tried to publish this. */
  pubkey: string;
  /** Unsigned event template. Re-signed and re-broadcast on retry. */
  template: PendingEventTemplate;
  /** Human-readable label, e.g. "Level completion: Sunrise". */
  description: string;
  /** Last error message we saw when trying to publish. */
  lastError: string;
  /** Unix seconds the original attempt failed. */
  failedAt: number;
};

export type PendingEventsContextType = {
  /** Pending events for the currently-logged-in user (or [] when logged out). */
  events: PendingEvent[];
  /** Queue a fresh failure (called by useReliablePublish). */
  enqueue: (entry: { template: PendingEventTemplate; description: string; error: unknown }) => void;
  /** Re-publish a queued event. Removes it from the queue on success. */
  retry: (id: string) => Promise<void>;
  /** Forget a queued event without retrying. */
  dismiss: (id: string) => void;
  /** Forget every queued event for the current user. */
  clear: () => void;
  /** True while at least one retry is in-flight. */
  isRetrying: boolean;
};

export const PendingEventsContext = createContext<PendingEventsContextType | undefined>(undefined);
