declare module '@khmyznikov/pwa-install/dist/pwa-install.react.js' {
  import { ComponentType } from 'react';

  interface PWAInstallProps {
    'description': string;
    'id': string;
    'manifest-url': string;
  }

  const PWAInstall: ComponentType<PWAInstallProps>;
  export default PWAInstall;
}

declare module '@khmyznikov/pwa-install' {
  import { ComponentType } from 'react';

  interface PWAInstallProps {
    'description': string;
    'id': string;
    'manifest-url': string;
  }

  const PWAInstall: ComponentType<PWAInstallProps>;
  export default PWAInstall;
}
