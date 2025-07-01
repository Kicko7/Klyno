import { useSearchParams } from 'next/navigation';

export const useShowMobileWorkspace = () => {
  const searchParams = useSearchParams();
  const showMobileWorkspace = searchParams.get('showMobileWorkspace') === 'true';
  return showMobileWorkspace;
};
