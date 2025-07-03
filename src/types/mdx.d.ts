declare module '@mdx-js/react' {
  import React from 'react';

  export interface MDXProviderComponents {
    [key: string]: React.ComponentType<any>;
  }

  export interface MDXProviderProps {
    children: React.ReactNode;
    components?: MDXProviderComponents;
  }

  export const MDXProvider: React.ComponentType<MDXProviderProps>;
}

declare module '*.mdx' {
  import React from 'react';

  const Component: React.ComponentType<any>;
  export default Component;
}

export {};
