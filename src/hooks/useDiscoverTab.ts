import { useSearchParams } from 'next/navigation';
import { DiscoverTab } from '@/types/discover';

export const useDiscoverTab = () => {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as DiscoverTab | null;
  return type ?? DiscoverTab.Assistants;
};
