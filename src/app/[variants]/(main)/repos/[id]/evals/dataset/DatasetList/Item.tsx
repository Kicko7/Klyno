import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';
import { useSearchParams, useRouter } from 'next/navigation';

import { RAGEvalDataSetItem } from '@/types/eval';

const useStyles = createStyles(({ css, token }) => ({
  active: css`
    background: ${token.colorFillTertiary};

    &:hover {
      background-color: ${token.colorFillSecondary};
    }
  `,
  container: css`
    cursor: pointer;

    margin-block-end: 2px;
    padding-block: 12px;
    padding-inline: 8px;
    border-radius: 8px;

    &:hover {
      background-color: ${token.colorFillTertiary};
    }
  `,
  icon: css`
    min-width: 24px;
    border-radius: 4px;
  `,
  title: css`
    text-align: start;
  `,
}));

const Item = memo<RAGEvalDataSetItem>(({ name, description, id }) => {
  const { styles, cx } = useStyles();

  const searchParams = useSearchParams();
  const router = useRouter();
  const paramId = searchParams.get('id');
  const activeDatasetId = paramId ? parseInt(paramId, 10) : undefined;
  const activateDataset = (value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== undefined) {
      params.set('id', value);
    } else {
      params.delete('id');
    }
    router.replace(`?${params.toString()}`);
  };

  const isActive = activeDatasetId === Number(id);
  return (
    <Flexbox
      className={cx(styles.container, isActive && styles.active)}
      onClick={() => {
        if (!isActive) {
          activateDataset(String(id));
        }
      }}
    >
      <div className={styles.title}>{name}</div>
      {description && <div>{description}</div>}
    </Flexbox>
  );
});

export default Item;
