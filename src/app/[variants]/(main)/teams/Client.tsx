import { useTeams } from '@/hooks/useTeams';

const TeamsClient = () => {
  const { teams, createTeam } = useTeams();

  return (
    <div>
      <h1>Teams</h1>
      <ul>
        {teams.map((team) => (
          <li key={team.id}>{team.name}</li>
        ))}
      </ul>
      <button onClick={createTeam}>Create Team</button>
    </div>
  );
};

export default TeamsClient;
