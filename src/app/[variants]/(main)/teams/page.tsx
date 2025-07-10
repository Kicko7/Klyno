import { Metadata } from 'next';

import TeamsClient from './Client';

export const metadata: Metadata = {
  title: 'Teams',
};

const TeamsPage = () => {
  return <TeamsClient />;
};

export default TeamsPage;
