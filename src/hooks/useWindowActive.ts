import { useEffect, useState } from 'react';

/**
 * True while the tab is visible AND the window has focus. Flips to false when
 * the user switches tabs or focuses another window/app, so continuous
 * render loops (the 3D background, the bubble board) can pause and stop
 * burning GPU/battery while nobody's looking.
 */
export function useWindowActive(): boolean {
  const [active, setActive] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden,
  );

  useEffect(() => {
    const update = () => setActive(!document.hidden && document.hasFocus());
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    update();
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
    };
  }, []);

  return active;
}
