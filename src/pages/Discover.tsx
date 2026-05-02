import { useSeoMeta } from '@unhead/react';
import { Template } from '@/components/Template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Discover = () => {
  useSeoMeta({
    title: 'Color Slide - Discover',
    description: 'Browse featured boards, creators, and community challenges.',
  });

  return (
    <Template pageName="Discover" subtitle="Find community levels, ideas, and challenges.">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Discover is coming next</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          This page is ready as a template target for listing featured levels and recent community activity.
        </CardContent>
      </Card>
    </Template>
  );
};

export default Discover;
