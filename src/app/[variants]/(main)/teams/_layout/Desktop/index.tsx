import { PropsWithChildren, memo } from 'react';
import { useResponsive } from 'react-layout-kit';

const Desktop = memo(({ children }: PropsWithChildren) => {
  const { md = true } = useResponsive();

  if (!md) return null;

  return <>{children}</>;
});

Desktop.displayName = 'DesktopTeamsLayout';

export default Desktop;
