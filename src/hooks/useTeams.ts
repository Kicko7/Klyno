'use client';

import { useCallback, useEffect, useState } from 'react';

import { lambdaClient } from '@/libs/trpc/client';

interface Team {
  accessedAt?: Date;
  createdAt: Date;
  description?: string | null;
  icon?: string | null;
  id: string;
  isActive?: boolean | null;
  isArchived?: boolean | null;
  name: string;
  organizationId?: string;
  settings?: unknown;
  slug?: string;
  updatedAt?: Date;
}

interface TeamResponse {
  memberCount: number;
  team: Team;
}

export const useTeams = () => {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  const fetchTeams = useCallback(async () => {
    if (hasAttempted) return; // Prevent multiple calls

    try {
      setLoading(true);
      setError(null);
      setHasAttempted(true);

      // Get user's organizations first
      const organizations = await lambdaClient.organization.getMyOrganizations.query();

      if (organizations.length > 0) {
        // Get teams from the first organization
        const teamsResponse = await lambdaClient.organization.getOrganizationTeams.query({
          organizationId: organizations[0].id,
        });
        setTeams(
          teamsResponse.map((team) => ({
            memberCount: 0,
            team,
          })),
        );
      } else {
        setTeams([]);
      }
    } catch (err: any) {
      // Handle unauthorized error gracefully
      if (
        err.data?.code === 'UNAUTHORIZED' ||
        err.code === 'UNAUTHORIZED' ||
        err.message?.includes('Unauthorized') ||
        err.message?.includes('unauthorized')
      ) {
        setError('Please log in to view teams');
      } else {
        setError(err.message || 'An error occurred');
      }
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  }, [hasAttempted]);

  const createTeam = async (teamData: { description?: string; name: string }) => {
    try {
      const organizations = await lambdaClient.organization.getMyOrganizations.query();

      if (organizations.length > 0) {
        await lambdaClient.organization.createTeam.mutate({
          description: teamData.description || '',
          name: teamData.name,
          organizationId: organizations[0].id,
        });
        await fetchTeams();
      }
    } catch (err: any) {
      if (
        err.data?.code === 'UNAUTHORIZED' ||
        err.code === 'UNAUTHORIZED' ||
        err.message?.includes('Unauthorized') ||
        err.message?.includes('unauthorized')
      ) {
        setError('Please log in to view teams');
      } else {
        setError(err.message || 'An error occurred creating team');
      }
      console.error('Error creating team:', err);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const resetAndFetch = useCallback(async () => {
    setHasAttempted(false);
    setError(null);
    setLoading(true);
    await fetchTeams();
  }, [fetchTeams]);

  return {
    createTeam,
    error,
    fetchTeams,
    loading,
    resetAndFetch,
    teams,
  };
};
