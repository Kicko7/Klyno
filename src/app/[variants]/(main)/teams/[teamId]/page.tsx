import { Metadata } from 'next';
import TeamDetailClient from './Client';

interface TeamDetailPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Team Chat',
};

const TeamDetailPage = async ({ params }: TeamDetailPageProps) => {
  const { teamId } = await params;
  return <TeamDetailClient teamId={teamId} />;
};

export default TeamDetailPage;
