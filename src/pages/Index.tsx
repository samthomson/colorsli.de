import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Template } from '@/components/Template';
import { ArcadePill, type ArcadePillTone } from '@/components/ArcadePill';

/**
 * Home menu — a stack of ArcadePills, one tone each so the player can tell
 * modes apart at a glance without reading. Sizing/colour live entirely on
 * the shared button component (DRY) and the container is intentionally
 * narrower than the COLOR SLIDE wordmark so the brand stays the hero.
 */
const homeLinks: Array<{ to: string; label: string; tone: ArcadePillTone }> = [
  { to: '/practice', label: 'Practice', tone: 'cyan' },
  { to: '/play', label: 'Play', tone: 'rainbow' },
  { to: '/high-scores', label: 'High Scores', tone: 'amber' },
  { to: '/discover', label: 'Discover', tone: 'emerald' },
  { to: '/create', label: 'Create', tone: 'indigo' },
];

const Index = () => {
  useSeoMeta({
    title: 'Color Slide - Home',
    description: 'Choose how you want to play Color Slide.',
  });

  return (
    <Template showExit={false} brandVariant="hero">
      <section className="mx-auto flex w-full max-w-md flex-col gap-2.5 sm:gap-3">
        {homeLinks.map((item) => (
          <ArcadePill
            key={item.to}
            asChild
            tone={item.tone}
            size="lg"
            block
            bob={false}
          >
            <Link to={item.to}>{item.label}</Link>
          </ArcadePill>
        ))}
      </section>
    </Template>
  );
};

export default Index;
