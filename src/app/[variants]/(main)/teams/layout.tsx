import { PropsWithChildren } from 'react';

import DesktopLayout from './_layout/Desktop';
import MobileLayout from './_layout/Mobile';

const OrganizationLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      <DesktopLayout>{children}</DesktopLayout>
      <MobileLayout>{children}</MobileLayout>
    </>
  );
};

OrganizationLayout.displayName = 'OrganizationLayout';

export default OrganizationLayout;
