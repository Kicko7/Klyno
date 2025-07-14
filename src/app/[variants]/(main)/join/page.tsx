'use client';

import { SignUp, useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Center } from 'react-layout-kit';

import InvitationModal from '@/components/InvitationModal';

const JoinOrganizationPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { isSignedIn, isLoaded } = useAuth();
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      // Wait for Clerk to load to get the correct signed-in status
      return;
    }

    if (!isSignedIn) {
      // If the user is not signed in, show the sign-up modal.
      setShowSignUp(true);
      return;
    }

    if (token) {
      // Show the invitation modal for authenticated users
      setShowInvitationModal(true);
    } else {
      // If there's no token, redirect to the home page
      router.push('/');
    }
  }, [token, isSignedIn, isLoaded, router]);

  // Handle the case where user comes back from sign-in/sign-up
  useEffect(() => {
    if (isSignedIn && isLoaded && token && !showInvitationModal) {
      setShowInvitationModal(true);
    }
  }, [isSignedIn, isLoaded, token, showInvitationModal]);

  const handleCloseModal = () => {
    setShowInvitationModal(false);
    router.push('/teams');
  };

  return (
    <Center>
      <>
        {token && (
          <InvitationModal onClose={handleCloseModal} open={showInvitationModal} token={token} />
        )}
      </>
    </Center>
  );
};

export default JoinOrganizationPage;
