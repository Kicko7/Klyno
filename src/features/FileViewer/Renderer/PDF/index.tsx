'use client';

import dynamic from 'next/dynamic';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Fragment, memo, useCallback, useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { lambdaQuery } from '@/libs/trpc/client';

import HighlightLayer from './HighlightLayer';
import { useStyles } from './style';
import useResizeObserver from './useResizeObserver';

// Dynamically import react-pdf components to reduce initial bundle size
const Document = dynamic(() => import('react-pdf').then((mod) => ({ default: mod.Document })), {
  loading: () => <div>Loading PDF viewer...</div>,
  ssr: false,
});

const Page = dynamic(() => import('react-pdf').then((mod) => ({ default: mod.Page })), {
  ssr: false,
});

// Dynamically import PDF.js configuration
const setupPdfJs = async () => {
  const { pdfjs } = await import('react-pdf');
  // 如果海外的地址： https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs
  pdfjs.GlobalWorkerOptions.workerSrc = `https://registry.npmmirror.com/pdfjs-dist/${pdfjs.version}/files/build/pdf.worker.min.mjs`;
};

const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
};

const maxWidth = 1200;

interface PDFViewerProps {
  fileId: string;
  url: string | null;
}

const PDFViewer = memo<PDFViewerProps>(({ url, fileId }) => {
  const { styles } = useStyles();
  const [numPages, setNumPages] = useState<number>(0);
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPdfJsReady, setIsPdfJsReady] = useState(false);

  // Initialize PDF.js when component mounts
  useEffect(() => {
    setupPdfJs().then(() => setIsPdfJsReady(true));
  }, []);

  // eslint-disable-next-line no-undef
  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries;

    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useResizeObserver(containerRef, onResize);

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }: PDFDocumentProxy) => {
    setNumPages(nextNumPages);
    setIsLoaded(true);
  };

  const { data } = lambdaQuery.chunk.getChunksByFileId.useInfiniteQuery(
    { id: fileId },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

  const dataSource = data?.pages.flatMap((page) => page.items) || [];

  // Don't render until PDF.js is ready
  if (!isPdfJsReady) {
    return (
      <Flexbox className={styles.container}>
        <Flexbox align={'center'} className={styles.documentContainer} padding={24}>
          <div>Loading PDF viewer...</div>
        </Flexbox>
      </Flexbox>
    );
  }

  return (
    <Flexbox className={styles.container}>
      <Flexbox
        align={'center'}
        className={styles.documentContainer}
        padding={24}
        ref={setContainerRef}
        style={{ height: isLoaded ? undefined : '100%' }}
      >
        <Document
          className={styles.document}
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          options={options}
        >
          {Array.from({ length: numPages }, (el, index) => {
            const width = containerWidth ? Math.min(containerWidth, maxWidth) : maxWidth;

            return (
              <Fragment key={`page_${index + 1}`}>
                <Page className={styles.page} pageNumber={index + 1} width={width}>
                  <HighlightLayer dataSource={dataSource} pageNumber={index + 1} width={width} />
                </Page>
              </Fragment>
            );
          })}
        </Document>
      </Flexbox>
    </Flexbox>
  );
});

export default PDFViewer;
