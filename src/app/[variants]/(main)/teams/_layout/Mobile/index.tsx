import { PropsWithChildren, memo } from 'react';
import { useResponsive } from 'react-layout-kit';

const Mobile = memo(({ children }: PropsWithChildren) => {
  const { md = true } = useResponsive();

  if (md) return null;

  return <>{children}</>;
});

Mobile.displayName = 'MobileTeamsLayout';

export default Mobile;
