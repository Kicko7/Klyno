import { Button, Text } from '@lobehub/ui';
import { ChevronDown } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { AiProviderModelListItem } from '@/types/aiModel';

import ModelItem from './ModelItem';
import VirtualizedModelList from './VirtualizedModelList';

interface PaginatedModelListProps {
  models: AiProviderModelListItem[];
  itemsPerPage?: number;
  virtualizationThreshold?: number;
  title?: string;
  description?: string;
  showVirtualization?: boolean;
  onModelToggle?: (modelId: string, enabled: boolean) => void;
}

const PaginatedModelList = memo<PaginatedModelListProps>(({
  models,
  itemsPerPage = 10,
  virtualizationThreshold = 50,
  title,
  description,
  showVirtualization = true,
  onModelToggle,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Calculate total pages
  const totalPages = Math.ceil(models.length / itemsPerPage);
  const hasMorePages = currentPage < totalPages;

  // Get models for current page
  const displayedModels = useMemo(() => {
    return models.slice(0, currentPage * itemsPerPage);
  }, [models, currentPage, itemsPerPage]);

  // Handle show more button click
  const handleShowMore = useCallback(() => {
    if (hasMorePages) {
      setIsLoadingMore(true);
      // Simulate loading delay for better UX
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsLoadingMore(false);
      }, 300);
    }
  }, [hasMorePages]);

  // Handle scroll-based loading
  const handleLoadMore = useCallback(() => {
    if (hasMorePages && !isLoadingMore) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsLoadingMore(false);
      }, 300);
    }
  }, [hasMorePages, isLoadingMore]);

  // Set up intersection observer for auto-loading
  useEffect(() => {
    if (!loadMoreRef.current || !hasMorePages) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMorePages && !isLoadingMore) {
          handleLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMorePages, isLoadingMore, handleLoadMore]);

  // Reset pagination when models change
  useEffect(() => {
    setCurrentPage(1);
  }, [models.length]);

  if (models.length === 0) {
    return null;
  }

  const shouldUseVirtualization = showVirtualization && 
    displayedModels.length > virtualizationThreshold;

  return (
    <Flexbox>
      {title && (
        <Text style={{ fontSize: 12, marginTop: 8 }} type={'secondary'}>
          {title}
        </Text>
      )}
      {description && (
        <Text style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
          {description}
        </Text>
      )}
      
      {shouldUseVirtualization ? (
        <VirtualizedModelList 
          models={displayedModels} 
          height={Math.min(600, Math.max(400, displayedModels.length * 2))} 
        />
      ) : (
        <Flexbox gap={2}>
          {displayedModels.map((item) => (
            <ModelItem {...item} key={item.id} />
          ))}
        </Flexbox>
      )}

      {/* Load more trigger for scroll-based loading */}
      {hasMorePages && (
        <div ref={loadMoreRef} style={{ height: '20px', margin: '8px 0' }}>
          {isLoadingMore && (
            <Flexbox align="center" justify="center" padding={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Loading more models...
              </Text>
            </Flexbox>
          )}
        </div>
      )}

      {/* Show more button for manual loading */}
      {hasMorePages && (
        <Button
          block
          icon={ChevronDown}
          loading={isLoadingMore}
          onClick={handleShowMore}
          size={'small'}
          style={{ marginTop: 8 }}
        >
          {isLoadingMore 
            ? 'Loading more models...'
            : 'Show More'
          }
        </Button>
      )}

      {/* Show total count when all models are loaded */}
      {!hasMorePages && models.length > itemsPerPage && (
        <Text style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8 }}>
          Showing all {models.length} models
        </Text>
      )}
    </Flexbox>
  );
});

PaginatedModelList.displayName = 'PaginatedModelList';

export default PaginatedModelList;
