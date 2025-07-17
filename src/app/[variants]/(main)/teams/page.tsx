import { Metadata } from 'next';

import Main from './components/main';

export const metadata: Metadata = {
  title: 'Organization',
};

const Page = () => {
  return <Main />;
};

export default Page;
