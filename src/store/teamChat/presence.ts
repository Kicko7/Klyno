import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { PresenceData } from '@/types/redis';

export interface TeamPresenceState {
  // State
  presenceMap: Record<string, Record<string, PresenceData>>;
  typingUsers: Record<string, Record<string, boolean>>;

  // Actions
  setPresenceList: (teamId: string, presence: Record<string, PresenceData>) => void;
  updatePresence: (teamId: string, presence: PresenceData) => void;
  removePresence: (teamId: string, userId: string) => void;
  setTyping: (teamId: string, userId: string, isTyping: boolean) => void;
  clearTyping: (teamId: string) => void;
  clearTeamPresence: (teamId: string) => void;
}

export const useTeamPresenceStore = create<TeamPresenceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      presenceMap: {},
      typingUsers: {},

      // Actions
      setPresenceList: (teamId, presence) => {
        set((state) => ({
          presenceMap: {
            ...state.presenceMap,
            [teamId]: presence,
          },
        }));
      },

      updatePresence: (teamId, presence) => {
        set((state) => ({
          presenceMap: {
            ...state.presenceMap,
            [teamId]: {
              ...(state.presenceMap[teamId] || {}),
              [presence.userId]: presence,
            },
          },
        }));
      },

      removePresence: (teamId, userId) => {
        set((state) => {
          const teamPresence = state.presenceMap[teamId];
          if (!teamPresence) return state;

          const { [userId]: _, ...rest } = teamPresence;
          return {
            presenceMap: {
              ...state.presenceMap,
              [teamId]: rest,
            },
          };
        });
      },

      setTyping: (teamId, userId, isTyping) => {
        set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [teamId]: {
              ...(state.typingUsers[teamId] || {}),
              [userId]: isTyping,
            },
          },
        }));
      },

      clearTyping: (teamId) => {
        set((state) => {
          const { [teamId]: _, ...rest } = state.typingUsers;
          return { typingUsers: rest };
        });
      },

      clearTeamPresence: (teamId) => {
        set((state) => {
          const { [teamId]: _, ...presenceRest } = state.presenceMap;
          const { [teamId]: __, ...typingRest } = state.typingUsers;
          return {
            presenceMap: presenceRest,
            typingUsers: typingRest,
          };
        });
      },
    }),
    { name: 'TeamPresenceStore' },
  ),
);
