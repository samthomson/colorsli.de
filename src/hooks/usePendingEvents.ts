import { useContext } from 'react';
import { PendingEventsContext } from '@/contexts/PendingEventsContext';

/** Access the pending-events queue + its mutation actions. */
export function usePendingEvents() {
  const ctx = useContext(PendingEventsContext);
  if (!ctx) {
    throw new Error(
      'usePendingEvents must be used inside <PendingEventsProvider>',
    );
  }
  return ctx;
}
