import { ProviderIcon } from '@lobehub/icons';
import { Avatar } from '@lobehub/ui';
import { Badge } from 'antd';
import { createStyles } from 'antd-style';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo } from 'react';
import { Center, Flexbox } from 'react-layout-kit';

import CustomOpenRouterIcon from '@/components/ProviderIcons/CustomOpenRouterIcon';
import { AiProviderListItem, AiProviderSourceEnum } from '@/types/aiProvider';

export const useStyles = createStyles(({ css, token }) => ({
  active: css`
    background: ${token.colorFillSecondary};
  `,
  container: css`
    cursor: pointer;

    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;

    padding-block: 8px;
    padding-inline: 12px;
    border-radius: ${token.borderRadius}px;

    color: inherit;

    transition: all 0.2s ease-in-out;

    &:hover {
      color: inherit;
      background-color: ${token.colorFill};
    }
  `,
}));

const ProviderItem = memo<AiProviderListItem>(({ id, name, source, enabled, logo }) => {
  // console.log('name', name,'id', id);
  const { styles, cx } = useStyles();
  const pathname = usePathname();

  const activeKey = pathname.split('/').pop() || '';

  const isCustom = source === AiProviderSourceEnum.Custom;
  
  // Custom URL mapping for specific providers
  const getProviderUrl = (providerId: string, providerName: string) => {
    if (providerId === 'openrouter') {
      return '/settings/provider/klyno';
    }
    return `/settings/provider/${providerId}`;
  };

  // Check if this provider is active (handle klyno URL mapping)
  const isActive = activeKey === id || (id === 'openrouter' && activeKey === 'klyno');

  return (
    <Link
      className={cx(styles.container, isActive && styles.active)}
      href={getProviderUrl(id, name || '')}
    >
      <Flexbox gap={8} horizontal>
        {isCustom && logo ? (
          <Avatar
            alt={name || id}
            avatar={logo}
            shape={'square'}
            size={24}
            style={{ borderRadius: 6 }}
          />
        ) : id === 'openrouter' ? (
          <CustomOpenRouterIcon size={24} style={{ borderRadius: 6 }} type={'avatar'} />
        ) : (
          <ProviderIcon provider={id} size={24} style={{ borderRadius: 6 }} type={'avatar'} />
        )}
        {name}
      </Flexbox>
      <Flexbox horizontal>
        {enabled && (
          <Center width={24}>
            <Badge status="success" />
          </Center>
        )}
        {/* cloud slot */}

        {/* cloud slot */}
      </Flexbox>
    </Link>
  );
});
export default ProviderItem;
