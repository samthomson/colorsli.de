import { useSeoMeta } from '@unhead/react';
import { Template } from '@/components/Template';
import { ColourSlideGame } from '@/components/ColourSlideGame';

const Practice = () => {
  useSeoMeta({
    title: 'Color Slide - Practice',
    description: 'Warm up on randomly generated boards.',
  });

  return (
    <Template pageName="Practice" subtitle="Random boards. No saving, no scoring — just play.">
      <div className="flex justify-center">
        <ColourSlideGame />
      </div>
    </Template>
  );
};

export default Practice;
