'use client';

import { useEffect } from 'react';

/**
 * Client-only component that initializes DataSync
 * This component should only be rendered in the browser
 */
const DataSyncInitializer = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Dynamic import to ensure DataSync only runs in the browser
    const initializeDataSync = async () => {
      try {
        const { useEnabledDataSync } = await import('@/hooks/useSyncData');
        
        // Create a temporary component to use the hook
        const TempComponent = () => {
          useEnabledDataSync();
          return null;
        };
        
        // Render the temporary component
        const { createRoot } = await import('react-dom/client');
        const container = document.createElement('div');
        container.style.display = 'none';
        document.body.append(container);
        
        const root = createRoot(container);
        root.render(<TempComponent />);
        
        // Cleanup after a short delay
        setTimeout(() => {
          root.unmount();
          container.remove();
        }, 100);
        
      } catch (error) {
        console.error('Failed to initialize DataSync:', error);
      }
    };

    initializeDataSync();
  }, []);

  return null;
};

export default DataSyncInitializer; 