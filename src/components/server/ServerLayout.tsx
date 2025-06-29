import { FC, PropsWithChildren, ReactNode } from 'react';

import { DynamicLayoutProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

interface ServerLayoutProps<T> {
  Desktop: FC<T>;
  Mobile: FC<T>;
}

interface ServerLayoutInnerProps extends DynamicLayoutProps {
  children: ReactNode;
}

const ServerLayout =
  <T extends PropsWithChildren>({ Desktop, Mobile }: ServerLayoutProps<T>): FC<T> =>
  // @ts-expect-error
  async (props: ServerLayoutInnerProps) => {
    // '_modal' is intentionally unused, but destructured for type compatibility
    const { params: paramsPromise, modal: _modal, ...res } = props;
    if (!paramsPromise) {
      throw new Error(
        `paramsPromise is required for ServerLayout, please pass params props to ServerLayout`,
      );
    }

    const isMobile = await RouteVariants.getIsMobile(props);

    // Pass only the children and other props, excluding modal and params
    return isMobile ? <Mobile {...(res as T)} /> : <Desktop {...(res as T)} />;
  };

ServerLayout.displayName = 'ServerLayout';

export default ServerLayout;
