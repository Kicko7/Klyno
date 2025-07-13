import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome to the Team',
};

interface WelcomePageProps {
  params: Promise<{ teamId: string }>;
}

export default async function WelcomePage({ params }: WelcomePageProps) {
  const { teamId } = await params;
  
  // The user has already been added to the team via the webhook
  // Just redirect them to the team page
  redirect(`/teams/${teamId}`);
}
