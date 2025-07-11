import { useResponsive } from 'antd-style';
import { PropsWithChildren, memo } from 'react';

const Mobile = memo(({ children }: PropsWithChildren) => {
  const { md = true } = useResponsive();

  if (md) return null;

  return children;
});

Mobile.displayName = 'MobileTeamsLayout';

export default Mobile;
