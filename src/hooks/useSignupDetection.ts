import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';
import { useEffect, useRef } from 'react';

interface SignupCallbacks {
  onSignup?: (user: any) => void;
  onFirstLogin?: (user: any) => void;
  onAffiliateSignup?: (user: any, affiliateRef: string) => void;
}

export const useSignupDetection = (callbacks: SignupCallbacks) => {
  const { user } = useUserStore();
  const isSignedIn = useUserStore(authSelectors.isLogin);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (isSignedIn && user && !hasProcessedRef.current) {
      hasProcessedRef.current = true;
      
      // Check if this is a new signup (you can add more logic here)
      const isNewSignup = checkIfNewSignup(user);
      
      if (isNewSignup) {
        console.log('🎉 New user signup detected:', user);
        
        // Call the signup callback
        callbacks.onSignup?.(user);
        
        // Check for affiliate reference
        const affiliateRef = localStorage.getItem('affiliateRef');
        if (affiliateRef) {
          console.log('🔗 Affiliate signup detected:', affiliateRef);
          callbacks.onAffiliateSignup?.(user, affiliateRef);
          
          // Clear the affiliate reference
          localStorage.removeItem('affiliateRef');
        }
      } else {
        // This is a returning user login
        callbacks.onFirstLogin?.(user);
      }
    }
  }, [isSignedIn, user, callbacks]);

  // Reset the processed flag when user signs out
  useEffect(() => {
    if (!isSignedIn) {
      hasProcessedRef.current = false;
    }
  }, [isSignedIn]);
};

// Helper function to determine if this is a new signup
const checkIfNewSignup = (user: any): boolean => {
  // You can implement various checks here:
  // 1. Check if user was created recently (within last few minutes)
  // 2. Check if this is the first time the user is accessing the app
  // 3. Check localStorage for a "newUser" flag
  // 4. Check if user has default/empty profile data
  
  const userCreatedAt = new Date(user.createdAt || user.created_at);
  const now = new Date();
  const timeDiff = now.getTime() - userCreatedAt.getTime();
  const minutesDiff = timeDiff / (1000 * 60);
  
  // If user was created within the last 5 minutes, consider it a new signup
  return minutesDiff < 5;
};

// Example usage:
export const useSignupExample = () => {
  useSignupDetection({
    onSignup: (user) => {
      console.log('New user signed up:', user);
      // Call your signup functions here
      sendWelcomeEmail(user);
      createUserProfile(user);
      giveWelcomeCredits(user);
    },
    
    onAffiliateSignup: (user, affiliateRef) => {
      console.log('Affiliate signup:', user, affiliateRef);
      // Process affiliate signup
      processAffiliateSignup(user, affiliateRef);
    },
    
    onFirstLogin: (user) => {
      console.log('User logged in:', user);
      // Handle returning user login
    }
  });
};

// Example functions you can call
const sendWelcomeEmail = async (user: any) => {
  try {
    await fetch('/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, email: user.email })
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
};

const createUserProfile = async (user: any) => {
  try {
    await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user.id, 
        email: user.email,
        name: user.fullName || user.firstName + ' ' + user.lastName
      })
    });
  } catch (error) {
    console.error('Failed to create user profile:', error);
  }
};

const giveWelcomeCredits = async (user: any) => {
  try {
    await fetch('/api/user/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user.id, 
        amount: 100,
        type: 'welcome_bonus',
        description: 'Welcome bonus for new users'
      })
    });
  } catch (error) {
    console.error('Failed to give welcome credits:', error);
  }
};

const processAffiliateSignup = async (user: any, affiliateRef: string) => {
  try {
    await fetch('/api/affiliate/process-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        affiliateRef,
        userId: user.id,
        userEmail: user.email
      })
    });
  } catch (error) {
    console.error('Failed to process affiliate signup:', error);
  }
};
