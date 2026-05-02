import { useSeoMeta } from '@unhead/react';
import { Template } from '@/components/Template';
import { ColourSlideGame } from '@/components/ColourSlideGame';

const Practice = () => {
  useSeoMeta({
    title: 'Color Slide - Practice',
    description: 'Practice specific mechanics and improve your Color Slide strategy.',
  });

  return (
    <Template pageName="Practice" subtitle="Slide rows and columns to make exact groups of four.">
      <div className="flex justify-center">
        <ColourSlideGame />
      </div>
    </Template>
  );
};

export default Practice;
