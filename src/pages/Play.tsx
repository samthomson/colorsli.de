import { useSeoMeta } from '@unhead/react';
import { AppShell } from '@/components/AppShell';
import { ColourSlideGame } from '@/components/ColourSlideGame';

const Play = () => {
  useSeoMeta({
    title: 'Colour Slide - Play',
    description: 'Play Colour Slide and clear the board by matching exactly four.',
  });

  return (
    <AppShell title="Play" subtitle="Slide rows and columns to make exact groups of four.">
      <div className="flex justify-center">
        <ColourSlideGame />
      </div>
    </AppShell>
  );
};

export default Play;
