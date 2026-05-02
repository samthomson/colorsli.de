import { useSeoMeta } from '@unhead/react';
import { Template } from '@/components/Template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Play = () => {
  useSeoMeta({
    title: 'Colour Slide - Play',
    description: 'Play focused game modes and challenges in Colour Slide.',
  });

  return (
    <Template title="Play" subtitle="Choose a game mode and jump into a challenge.">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Play mode scaffold</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Use this page for quick-play presets, daily challenges, and curated boards.
        </CardContent>
      </Card>
    </Template>
  );
};

export default Play;
