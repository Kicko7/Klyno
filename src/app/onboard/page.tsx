import { useRouter } from 'next/navigation';
import React from 'react';

const OnboardPage = () => {
  const router = useRouter();
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        justifyContent: 'center',
      }}
    >
      <h1>Welcome to Klyno Onboarding</h1>
      <p>
        This is a placeholder for the onboarding process. You can customize this page with your
        onboarding steps.
      </p>
      <button onClick={() => router.push('/chat')} type="button">
        Continue to Chat
      </button>
    </div>
  );
};

export default OnboardPage;
