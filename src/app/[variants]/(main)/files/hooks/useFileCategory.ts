import { useSearchParams, useRouter } from 'next/navigation';
import { FilesTabs } from '@/types/files';

export const useFileCategory = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = searchParams.get('category') as FilesTabs | null;
  const setCategory = (value: FilesTabs) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('category', value);
    } else {
      params.delete('category');
    }
    router.replace(`?${params.toString()}`);
  };
  return [category ?? FilesTabs.All, setCategory] as const;
};
