import { useSeoMeta } from '@unhead/react';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Discover = () => {
  useSeoMeta({
    title: 'Colour Slide - Discover',
    description: 'Browse featured boards, creators, and community challenges.',
  });

  return (
    <AppShell title="Discover" subtitle="Find community levels, ideas, and challenges.">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Discover is coming next</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          This page is ready as a template target for listing featured levels and recent community activity.
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default Discover;
