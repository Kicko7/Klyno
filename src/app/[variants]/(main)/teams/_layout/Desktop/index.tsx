'use client';

import { PropsWithChildren, memo, useEffect, useState } from 'react';

const Desktop = memo(({ children }: PropsWithChildren) => {
  const [mounted, setMounted] = useState(false);
  const [isMd, setIsMd] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Only call useResponsive after mounting
    const checkResponsive = () => {
      if (typeof window !== 'undefined') {
        setIsMd(window.innerWidth >= 768);
      }
    };

    checkResponsive();
    window.addEventListener('resize', checkResponsive);

    return () => {
      window.removeEventListener('resize', checkResponsive);
    };
  }, []);

  if (!mounted) return null;
  if (!isMd) return null;

  return children;
});

Desktop.displayName = 'DesktopTeamsLayout';

export default Desktop;
