import { useSeoMeta } from '@unhead/react';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Practice = () => {
  useSeoMeta({
    title: 'Colour Slide - Practice',
    description: 'Practice specific mechanics and improve your Colour Slide strategy.',
  });

  return (
    <AppShell title="Practice" subtitle="Train with focused drills and tutorials.">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Practice mode scaffold</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Use this page for guided scenarios like exact-4 training, 5+ avoidance, and move-efficiency drills.
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default Practice;
