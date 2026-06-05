import { useEffect, useState } from 'react';

/**
 * True while the tab is *visible* (foreground). Flips to false only when the
 * tab is actually hidden — the user switches to another tab or minimizes —
 * so continuous render loops (the 3D background, the bubble board) can pause
 * and stop burning GPU/battery while nobody's looking.
 *
 * Deliberately keyed to `document.hidden` only, NOT `document.hasFocus()`:
 * focus can be elsewhere (DevTools open, another app on screen) while the
 * game is still fully visible and being interacted with. Gating on focus
 * froze the WebGL board mid-drag (`frameloop='never'` stops rendering even
 * on prop changes), so the CSS cells moved but the bubbles stayed put.
 */
export function useWindowActive(): boolean {
  const [active, setActive] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden,
  );

  useEffect(() => {
    const update = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return active;
}
