'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { PropsWithChildren, memo, useEffect, useMemo, useState, useTransition } from 'react';
import { useTranslation } from 'react-i18next';

import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';

import UserUpdater from './UserUpdater';
import { useAppearance } from './useAppearance';

const Clerk = memo(({ children }: PropsWithChildren) => {
  const { enableClerkSignUp } = useServerConfigStore(featureFlagsSelectors);
  const appearance = useAppearance();
  const {
    i18n: { language, getResourceBundle },
  } = useTranslation('clerk');

  const localization = useMemo(() => getResourceBundle(language, 'clerk'), [language]);

  // Inject CSS for modal centering
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .cl-modal {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .cl-modalContent {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        transform: none !important;
        margin: auto !important;
      }
      .cl-modalBackdrop {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
    `;
    document.head.append(style);
    return () => {
      style.remove();
    };
  }, []);

  // When useAppearance returns different result during SSR vs. client-side (when theme mode is auto), the appearance is not applied
  // It's because Clerk internally re-applies SSR props after transition which overrides client-side props, see https://github.com/clerk/javascript/blob/main/packages/nextjs/src/app-router/client/ClerkProvider.tsx
  // This re-renders the provider after transition to make sure client-side props are always applied
  const [count, setCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    if (count || isPending) return;
    startTransition(() => {
      setCount((count) => count + 1);
    });
  }, [count, setCount, isPending, startTransition]);

  const updatedAppearance = useMemo(
    () => ({
      ...appearance,
      elements: {
        ...appearance.elements,
        ...(!enableClerkSignUp ? { footerAction: { display: 'none' } } : {}),
      },
    }),
    [appearance, enableClerkSignUp],
  );

  return (
    <ClerkProvider
      appearance={updatedAppearance}
      localization={localization}
      signUpUrl={!enableClerkSignUp ? '/login' : '/signup'} // Redirect sign-up to sign-in if disabled
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      {children}
      <UserUpdater />
    </ClerkProvider>
  );
});

export default Clerk;
