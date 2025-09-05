'use client';

import { useAffiliateStore } from '@/store/affiliate/store';
import { SignUp } from '@clerk/nextjs';
import { useEffect } from 'react';

export default function SignUpWrapper({ affiliateRef }: { affiliateRef?: string }) {
  const countclickAffiliate = useAffiliateStore((state) => state.countclickAffiliate);
  
  
  useEffect(() => {
    if (affiliateRef) {
      localStorage.setItem('affiliateRef', affiliateRef);
      const link = process.env.NEXT_PUBLIC_APP_URL + '/signup?ref=' + affiliateRef;
      countclickAffiliate({ link });
    }
  }, [affiliateRef]);
  
  return (
    <div className="flex h-screen items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            card: 'shadow-lg',
            rootBox: 'mx-auto',
          },
        }}
        fallbackRedirectUrl="/onboard"
        path="/signup"
        routing="path"
        signInUrl="/login"
      />
    </div>
  );
}
