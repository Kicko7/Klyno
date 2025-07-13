import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createTeamStore, TeamStore } from './store';

export const useTeamStore = create<TeamStore>()(
  persist(
    createTeamStore,
    {
      name: 'lobe-team-store',
      partialize: (state) => ({
        currentTeam: state.currentTeam,
        currentChannel: state.currentChannel,
      }),
    }
  )
);

export type { TeamStore } from './store';
