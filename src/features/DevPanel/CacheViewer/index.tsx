import { Empty } from 'antd';
import { Center } from 'react-layout-kit';

import DataTable from './DataTable';
import { CachePanelContextProvider } from './cacheProvider';

const CacheViewer = async () => {
  // Fetch cache data from API route instead of direct import
  let files = [];
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cache`,
      {
        cache: 'no-store', // Ensure fresh data
      },
    );

    if (response.ok) {
      files = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch cache data:', error);
  }

  if (!files || files.length === 0)
    return (
      <Center height={'80%'}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Center>
    );

  return (
    <CachePanelContextProvider entries={files}>
      <DataTable />
    </CachePanelContextProvider>
  );
};

export default CacheViewer;
