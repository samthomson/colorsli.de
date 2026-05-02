import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Index = () => {
  useSeoMeta({
    title: 'Colour Slide - Home',
    description: 'Choose how you want to play Colour Slide.',
  });

  return (
    <AppShell
      title="Colour Slide"
      subtitle="A puzzle game where you slide rows and columns to match exactly four colors."
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Start here</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Use this as your main navigation hub while you expand the game modes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/play">Play</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/discover">Discover</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/practice">Practice</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/create">Create</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default Index;
