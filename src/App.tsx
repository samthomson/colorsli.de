// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from 'unhead/plugins';
import { Suspense } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { NostrSync } from '@/components/NostrSync';
import { PendingEventsProvider } from '@/components/PendingEventsProvider';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { AppConfig } from '@/contexts/AppContext';
import { buildActiveRelayList } from '@/lib/constants';
import AppRouter from './AppRouter';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

const defaultConfig: AppConfig = {
  theme: "light",
  relayMetadata: {
    // Driven from src/lib/constants.ts so dev (private relay) and prod
    // (public relays) are toggled by import.meta.env.DEV in one place.
    relays: buildActiveRelayList(),
    updatedAt: 0,
  },
  publishCompletions: true,
};

// Bump this key whenever the shape or default of AppConfig changes in a way
// that should invalidate any stored client copies (e.g. flipping the dev
// relay set, schema changes). See AGENTS.md "No migrations" rule.
const APP_CONFIG_STORAGE_KEY = "nostr:app-config:v5";

export function App() {
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey={APP_CONFIG_STORAGE_KEY} defaultConfig={defaultConfig}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='nostr:login'>
            <NostrProvider>
              <NostrSync />
              <PendingEventsProvider>
                <TooltipProvider>
                  <Toaster />
                  <Suspense>
                    <AppRouter />
                  </Suspense>
                </TooltipProvider>
              </PendingEventsProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
