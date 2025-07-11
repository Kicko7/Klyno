'use client';

import React, { useState } from 'react';
import { Center } from 'react-layout-kit';

import CircleLoading from '@/components/Loading/CircleLoading';
import UserLoginOrSignup from '@/features/User/UserLoginOrSignup';
import { useTeams } from '@/hooks/useTeams';
import { useUserStore } from '@/store/user';

const TeamsAuthWrapper = () => {
  const openLogin = useUserStore((s) => s.openLogin);
  const [showHelp, setShowHelp] = React.useState(false);

  return (
    <Center height={'100vh'} width={'100%'}>
      <div className="max-w-md w-full text-center p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Teams</h1>
          <p className="text-gray-600 text-lg mb-6">Please sign in to view and manage your teams</p>
        </div>
        <UserLoginOrSignup onClick={openLogin} />

        {showHelp && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="mb-2">
              The sign-in modal should open automatically when you click the button above.
            </p>
            <p>
              If the modal doesn&apos;t appear or is not centered, please try refreshing the page.
            </p>
          </div>
        )}

        <button
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
          onClick={() => setShowHelp(!showHelp)}
          type="button"
        >
          {showHelp ? 'Hide' : 'Need help?'}
        </button>
      </div>
    </Center>
  );
};

const TeamsClient = () => {
  const { teams, loading, error, createTeam, resetAndFetch } = useTeams();
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const isSignedIn = useUserStore((s) => s.isSignedIn);

  // Reset and fetch when user signs in
  React.useEffect(() => {
    if (isSignedIn && error === 'Please log in to view teams') {
      resetAndFetch();
    }
  }, [isSignedIn, error, resetAndFetch]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    try {
      await createTeam({ name: newTeamName.trim() });
      setNewTeamName('');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <Center height={'100vh'} width={'100%'}>
        <CircleLoading />
      </Center>
    );
  }

  if (error) {
    if (error === 'Please log in to view teams') {
      return <TeamsAuthWrapper />;
    }
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Teams</h1>
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Teams</h1>

      <div className="mb-6">
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateTeam()}
            placeholder="Team name"
            type="text"
            value={newTeamName}
          />
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!newTeamName.trim() || isCreating}
            onClick={handleCreateTeam}
            type="button"
          >
            {isCreating ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {teams.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No teams yet. Create your first team!
          </div>
        ) : (
          teams.map((teamData) => (
            <div className="p-4 border border-gray-200 rounded-md" key={teamData.team.id}>
              <h3 className="font-semibold text-lg">{teamData.team.name}</h3>
              {teamData.team.description && (
                <p className="text-gray-600 mt-1">{teamData.team.description}</p>
              )}
              <div className="text-sm text-gray-500 mt-2">
                Created: {new Date(teamData.team.createdAt).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-500">Members: {teamData.memberCount}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamsClient;
