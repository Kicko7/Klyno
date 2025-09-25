import { createContext, useContext, ReactNode } from 'react';

interface ActionBarContextValue {
  sessionId?: string;
}

const ActionBarContext = createContext<ActionBarContextValue>({});

export const ActionBarProvider = ({ children, sessionId }: { children: ReactNode; sessionId?: string }) => (
  <ActionBarContext.Provider value={{ sessionId }}>
    {children}
  </ActionBarContext.Provider>
);

export const useActionBarContext = () => useContext(ActionBarContext);
