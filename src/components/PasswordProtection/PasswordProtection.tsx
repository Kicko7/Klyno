'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PasswordPrompt from './PasswordPrompt';

interface PasswordProtectionProps {
  children: React.ReactNode;
  appPassword?: string;
}

export default function PasswordProtection({ children, appPassword }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Check if user is already authenticated (from sessionStorage)
  useEffect(() => {
    const authStatus = sessionStorage.getItem('app_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = async (password: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Simulate password validation delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the configured password from environment or props
      const correctPassword = appPassword || process.env.NEXT_PUBLIC_APP_PASSWORD;

      if (password === correctPassword) {
        setIsAuthenticated(true);
        sessionStorage.setItem('app_authenticated', 'true');
        // Refresh the page to ensure proper routing
        window.location.reload();
      } else {
        setError('Invalid password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <PasswordPrompt onPasswordSubmit={handlePasswordSubmit} error={error} isLoading={isLoading} />;
  }

  return <>{children}</>;
}
