import { useState } from 'react';
import { api } from '@/utils/api';

export const useTeams = () => {
  const [teams, setTeams] = useState([]);

  const fetchTeams = async () => {
    // Fetch teams from server
    const response = await api.organization.getOrganizationTeams({ organizationId: 'your-organization-id' });
    setTeams(response.data.teams);
  };

  const createTeam = async () => {
    // Example function to create a team
    const newTeam = { name: 'New Team' };
    await api.organization.createTeam(newTeam);
    fetchTeams();
  };

  return {
    teams,
    fetchTeams,
    createTeam,
  };
};

