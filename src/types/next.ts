import type { ReactNode } from 'react';

export interface PageProps<Params, SearchParams = undefined> {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}

export type PagePropsWithId = PageProps<{ id: string }>;

/**
 * Layout props that include modal - required for layout components
 */
export interface DynamicLayoutProps {
  modal: ReactNode;
  params: Promise<{ variants: string }>;
}

/**
 * Page props that don't include modal - for page components
 */
export interface DynamicPageProps {
  params: Promise<{ variants: string }>;
}
