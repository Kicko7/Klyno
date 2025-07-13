'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { lambdaClient } from '@/libs/trpc/client';

const JoinOrganizationPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      // Wait for Clerk to load to get the correct signed-in status
      return;
    }
    if (!isSignedIn) {
      // If the user is not signed in, redirect them to sign up,
      // preserving the token in the redirect URL.
      const signUpUrl = new URL('/sign-up', window.location.origin);
      signUpUrl.searchParams.set('redirect_url', window.location.href);
      router.push(signUpUrl.toString());
      return;
    }

    if (token) {
      lambdaClient.organization.acceptInvitation
        .mutate({ token })
        .then(() => {
          // On success, redirect to the teams/organization page
          router.push('/teams');
        })
        .catch((error) => {
          // Handle errors, e.g., show a notification to the user
          console.error('Failed to accept invitation:', error);
          // Redirect to an error page or show an error message
          router.push('/error'); // Assuming you have an error page
        });
    } else {
      // If there's no token, redirect to the home page or an error page
      router.push('/');
    }
  }, [token, isSignedIn, isLoaded, router]);

  return <div>Processing your invitation...</div>;
};

export default JoinOrganizationPage;
