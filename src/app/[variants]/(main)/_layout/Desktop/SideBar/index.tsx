'use client';

import { SideNav } from '@lobehub/ui';
import { useTheme } from 'antd-style';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { Suspense, memo } from 'react';

import { isDesktop } from '@/const/version';
import { useActiveTabKey } from '@/hooks/useActiveTabKey';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { electronStylish } from '@/styles/electron';

import Avatar from './Avatar';
import BottomActions from './BottomActions';
import PinList from './PinList';
import TopActions from './TopActions';

// Credits display component for sidebar
// const CreditsDisplay = memo(() => {
//   const theme = useTheme();

//   return (
//     <div
//       style={{
//         margin: '8px 12px',
//         padding: '8px 12px',
//         background: theme.colorFillTertiary,
//         borderRadius: 8,
//         fontSize: 12,
//         color: theme.colorTextSecondary,
//         textAlign: 'center',
//         cursor: 'pointer',
//       }}
//       onClick={() => {
//         // Navigate to pricing page to show subscription info
//         window.location.href = '/pricing';
//       }}
//     >
//       <div style={{ marginBottom: 4 }}>Credits</div>
//       <div
//         style={{
//           fontWeight: 600,
//           color: theme.colorPrimary,
//           fontSize: 14,
//         }}
//       >
//         View
//       </div>
//     </div>
//   );
// });

// CreditsDisplay.displayName = 'CreditsDisplay';

const Top = () => {
  const [isPinned] = useQueryState('pinned', parseAsBoolean);
  const sidebarKey = useActiveTabKey();

  return (
    <>
      <TopActions isPinned={isPinned} tab={sidebarKey} />
      {/* <CreditsDisplay /> */}
    </>
  );
};

const Nav = memo(() => {
  const theme = useTheme();
  const inZenMode = useGlobalStore(systemStatusSelectors.inZenMode);
  const { showPinList } = useServerConfigStore(featureFlagsSelectors);

  return (
    !inZenMode && (
      <SideNav
        avatar={
          <div className={electronStylish.nodrag}>
            <Avatar />
          </div>
        }
        bottomActions={
          <div className={electronStylish.nodrag}>
            <BottomActions />
          </div>
        }
        className={electronStylish.draggable}
        style={{
          height: '100%',
          zIndex: 100,
          ...(isDesktop
            ? { background: 'transparent', borderInlineEnd: 0, paddingBlockStart: 8 }
            : { background: theme.colorBgLayout }),
        }}
        topActions={
          <Suspense>
            <div className={electronStylish.nodrag}>
              <Top />
              {showPinList && <PinList />}
            </div>
          </Suspense>
        }
      />
    )
  );
});

Nav.displayName = 'DesktopNav';

export default Nav;
