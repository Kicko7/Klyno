import Image from 'next/image';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

interface CustomOpenRouterIconProps {
  size?: number;
  style?: React.CSSProperties;
  type?: 'avatar' | 'mono';
}

const CustomOpenRouterIcon = memo<CustomOpenRouterIconProps>(
  ({ size = 20, style, type = 'mono' }) => {
    return <Image src={'/logo.png'} alt="Klyno AI" width={size} height={size} />;
  },
);

CustomOpenRouterIcon.displayName = 'CustomOpenRouterIcon';

export default CustomOpenRouterIcon;