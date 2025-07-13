import { Metadata } from 'next';

import OrganizationClient from './OrganizationClient';

export const metadata: Metadata = {
  title: 'Organization',
};

const Page = () => {
  return <OrganizationClient />;
};

export default Page;
