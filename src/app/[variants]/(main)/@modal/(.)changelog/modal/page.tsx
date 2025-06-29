import { DynamicPageProps } from '@/types/next';

// Next.js 15+: Use DynamicPageProps for page components, not DynamicLayoutProps
export const generateMetadata = async (_props: DynamicPageProps) => {
  // ...existing code...
};

const Page = async (_props: DynamicPageProps) => {
  // ...existing code...
};

export default Page;
