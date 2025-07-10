import { PropsWithChildren } from 'react';

import DesktopLayout from './_layout/Desktop';
import MobileLayout from './_layout/Mobile';

const TeamsLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      <DesktopLayout>{children}</DesktopLayout>
      <MobileLayout>{children}</MobileLayout>
    </>
  );
};

TeamsLayout.displayName = 'TeamsLayout';

export default TeamsLayout;
