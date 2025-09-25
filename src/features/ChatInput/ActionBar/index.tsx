import { ChatInputActionBar } from '@lobehub/ui/chat';
import { ReactNode, memo } from 'react';

import { ActionKeys, actionMap } from './config';
import { ActionBarProvider, useActionBarContext } from './context';

const RenderActionList = ({ dataSource }: { dataSource: ActionKeys[] }) => {
  const { sessionId } = useActionBarContext();
  
  return (
    <>
      {dataSource.map((key) => {
        const Render = actionMap[key];
        return <Render key={key} {...(sessionId ? { sessionId } : {})} />;
      })}
    </>
  );
};

export interface ActionBarProps {
  leftActions: ActionKeys[];
  leftAreaEndRender?: ReactNode;
  leftAreaStartRender?: ReactNode;
  padding?: number | string;
  rightActions: ActionKeys[];
  rightAreaEndRender?: ReactNode;
  rightAreaStartRender?: ReactNode;
  sessionId?: string;
}

const ActionBar = memo<ActionBarProps>(
  ({
    padding = '0 8px',
    rightAreaStartRender,
    rightAreaEndRender,
    leftAreaStartRender,
    leftAreaEndRender,
    leftActions,
    rightActions,
    sessionId,
  }) => (
    <ActionBarProvider sessionId={sessionId}>
      <ChatInputActionBar
        leftAddons={
          <>
            {leftAreaStartRender}
            <RenderActionList dataSource={leftActions} />
            {leftAreaEndRender}
          </>
        }
        padding={padding}
        rightAddons={
          <>
            {rightAreaStartRender}
            <RenderActionList dataSource={rightActions} />
            {rightAreaEndRender}
          </>
        }
      />
    </ActionBarProvider>
  ),
);

export default ActionBar;
