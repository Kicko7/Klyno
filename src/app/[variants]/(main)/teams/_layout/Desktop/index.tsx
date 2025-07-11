import { useResponsive } from 'antd-style';
import { PropsWithChildren, memo } from 'react';

const Desktop = memo(({ children }: PropsWithChildren) => {
  const { md = true } = useResponsive();

  if (!md) return null;

  return children;
});

Desktop.displayName = 'DesktopTeamsLayout';

export default Desktop;
