import { ProviderIcon } from '@lobehub/icons';
import { memo } from 'react';

import CustomOpenRouterIcon from './CustomOpenRouterIcon';

interface CustomProviderIconProps {
  provider: string;
  size?: number;
  style?: React.CSSProperties;
  type?: 'avatar' | 'mono';
}

const CustomProviderIcon = memo<CustomProviderIconProps>(({ 
  provider, 
  size = 20, 
  style, 
  type = 'mono' 
}) => {
  if (provider === 'openrouter') {
    return <CustomOpenRouterIcon size={size} style={style} type={type} />;
  }
  // Use default ProviderIcon for all other providers
  return <ProviderIcon provider={provider} size={size} style={style} type={type} />;
});

CustomProviderIcon.displayName = 'CustomProviderIcon';

export default CustomProviderIcon;
