import { ModelIcon } from '@lobehub/icons';
import { ActionIcon, FormGroup, Modal } from '@lobehub/ui';
import { MaximizeIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { FORM_STYLE } from '@/const/layoutTokens';
import { useClientDataSWR } from '@/libs/swr';
import { messageService } from '@/services/message';
import { ModelRankItem } from '@/types/message';

// Dynamically import the heavy charts component
const BarList = dynamic(() => import('@lobehub/charts').then((mod) => ({ default: mod.BarList })), {
  loading: () => <div>Loading chart...</div>,
  ssr: false,
});

const ModelsRank = memo<{ mobile?: boolean }>(({ mobile: _mobile }) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation('auth');
  const { data, isLoading } = useClientDataSWR('rank-models', async () =>
    messageService.rankModels(),
  );

  const showExtra = Boolean(data && data?.length > 5);

  const mapData = (item: ModelRankItem) => {
    return {
      icon: <ModelIcon model={item.id as string} size={24} />,
      id: item.id,
      name: item.id,
      value: item.count,
    };
  };

  const content = (
    <BarList
      data={data?.slice(0, 5).map((item) => mapData(item)) || []}
      height={220}
      leftLabel={t('stats.modelsRank.left')}
      loading={isLoading || !data}
      noDataText={{
        desc: t('stats.empty.desc'),
        title: t('stats.empty.title'),
      }}
      rightLabel={t('stats.modelsRank.right')}
    />
  );

  if (open) {
    return (
      <Modal
        footer={null}
        loading={isLoading || !data}
        onCancel={() => setOpen(false)}
        open={open}
        title={t('stats.modelsRank.title')}
      >
        <Flexbox paddingBlock={24}>
          <BarList
            data={data?.map((item) => mapData(item)) || []}
            height={340}
            leftLabel={t('stats.modelsRank.left')}
            loading={isLoading || !data}
            rightLabel={t('stats.modelsRank.right')}
          />
        </Flexbox>
      </Modal>
    );
  }

  return (
    <FormGroup
      extra={
        showExtra && (
          <ActionIcon
            icon={MaximizeIcon}
            onClick={() => setOpen(true)}
            size={{ blockSize: 28, size: 20 }}
          />
        )
      }
      style={FORM_STYLE.style}
      title={t('stats.modelsRank.title')}
      variant={'borderless'}
    >
      <Flexbox paddingBlock={16}>{content}</Flexbox>
    </FormGroup>
  );
});

export default ModelsRank;
