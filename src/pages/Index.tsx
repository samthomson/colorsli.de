import { useSeoMeta } from '@unhead/react';
import { ColourSlideGame } from '@/components/ColourSlideGame';

const Index = () => {
  useSeoMeta({
    title: 'Colour Slide - Puzzle Game',
    description: 'Match colors by sliding rows and columns in this addictive puzzle game.',
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 p-4">
      <ColourSlideGame />
    </div>
  );
};

export default Index;
