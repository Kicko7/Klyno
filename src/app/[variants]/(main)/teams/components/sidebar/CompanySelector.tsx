import { ChevronDown, FileText, FolderPlus, Grid3X3, Loader2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizationStore } from '@/store/organization/store';
import { useTheme } from 'antd-style';
import { useTeamChatStore } from '@/store/teamChat';

const CompanySelector = () => {
  const router = useRouter();
  const {
    showCreateOrgModal,
    fetchOrganizations,
    isLoading,
    organizations,
    selectedOrganizationId,
    setSelectedOrganizationId,
  } = useOrganizationStore();
  const {setCurrentOrganizationId} = useTeamChatStore();

  const theme = useTheme()
  // Fetch organizations on mount if not loaded
  useEffect(() => {
    if (!organizations || organizations.length === 0) {
      fetchOrganizations();
    }
  }, [organizations, fetchOrganizations]);

  // Find the selected organization from the store
  const selectedOrganization =
    organizations?.find((org) => org.id === selectedOrganizationId) || organizations?.[0] || null;

    const setActiveTeamChat = useTeamChatStore((state) => state.setActiveTeamChat);

  // When organizations load and no org is selected, select the first
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrganizationId) {
      setSelectedOrganizationId(organizations[0].id);
      setCurrentOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId, setSelectedOrganizationId]);

  const handleWorkspaceMembersClick = () => {
    if (selectedOrganization?.id) {
      router.push(`/teams?view=members&organizationId=${selectedOrganization.id}`);
    }
  };

  const handleDefaultModelsForOrganizationClick = () => {
    if (selectedOrganization?.id) {
      router.push(`/teams?view=default-models-for-organization&organizationId=${selectedOrganization.id}`);
    }
  };

  const ShowCompany = ({ org }: { org: any }) => {
    if (!org) {
      return (
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-8 h-8 ${theme.appearance === "dark" ? "bg-white/10" : "bg-black/10"} rounded`}>
            <span className="text-xs font-bold text-slate-300">?</span>
          </div>
          <span className="font-semibold text-slate-100 text-wrap">No organization</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className={`flex items-center justify-center w-8 h-8 ${theme.appearance === "dark" ? "bg-white/10" : "bg-black/50"} rounded`}>
          <span className={`text-xs font-bold ${theme.appearance === "dark" ? 'text-white' : 'text-white'}`}>
            {org.name ? org.name.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
        <span className={`font-semibold ${theme.appearance === "dark" ? 'text-slate-200' : 'text-black'} text-wrap`}>{org.name || 'Unknown'}</span>
      </div>
    );
  };

  if (isLoading) return <Skeleton className="h-4 w-[180px] bg-white/10" />;

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 p-2 h-auto text-slate-100 hover:bg-white/10"
          >
            <ShowCompany org={selectedOrganization} />
            <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={`w-72 ${theme.appearance === "dark" ? 'bg-black border-slate-700' : 'bg-white border-slate-200'} -md`}
          align="start"
        >
          <div className="p-2">
            {/* Workspace Members - Fixed hover states */}
            <div
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                theme.appearance === "dark" 
                  ? 'hover:bg-slate-800 text-slate-200 hover:text-white' 
                  : 'hover:bg-slate-100 text-black hover:text-black'
              }`}
              onClick={()=>{
                setActiveTeamChat(null);
                handleWorkspaceMembersClick();
              }}
            >
              <Users className={`w-4 h-4 ${theme.appearance === "dark" ? 'text-slate-200' : "text-black"}`} />
              <span>Workspace members</span>
            </div>

            {/* My Integrations - Fixed hover states */}
            <div className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
              theme.appearance === "dark" 
                ? 'hover:bg-slate-800 text-slate-200 hover:text-white' 
                : 'hover:bg-slate-100 text-black hover:text-black'
            }`}
            onClick={() => {
              setActiveTeamChat(null);
              router.push('/teams/integrations');
            }}
            >
              <Grid3X3 className={`w-4 h-4 ${theme.appearance === "dark" ? 'text-slate-200' : "text-black"}`} />
              <span>My integrations</span>
            </div>

            <div className="mt-4 mb-2">
              <span className={`${theme.appearance === "dark" ? 'text-slate-400' : "text-slate-600"} text-xs font-medium`}>Your workspaces:</span>
            </div>

            {/* Organization List - Fixed hover and selection states */}
            <div className="flex flex-col gap-1">
              {organizations.map((org: any) => (
                <div
                  key={org.id || org.name}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    selectedOrganizationId === org.id
                      ? theme.appearance === "dark"
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-200 text-black'
                      : theme.appearance === "dark"
                        ? 'hover:bg-slate-800 text-slate-200 hover:text-white'
                        : 'hover:bg-slate-100 text-black hover:text-black'
                  }`}
                  onClick={() => {
                    setActiveTeamChat(null);
                    setSelectedOrganizationId(org.id);
                    setCurrentOrganizationId(org.id);
                    router.push(`/teams`);
                  }}
                >
                  <ShowCompany org={org} />
                </div>
              ))}
            </div>

            {/* Create New Workspace - Fixed hover states */}
            <div
              className={`flex items-center gap-2 p-2 rounded cursor-pointer mt-2 transition-colors ${
                theme.appearance === "dark" 
                  ? 'hover:bg-slate-800 text-slate-200 hover:text-white' 
                  : 'hover:bg-slate-100 text-black hover:text-black'
              }`}
              onClick={() => showCreateOrgModal()}
            >
              <FolderPlus className={`w-4 h-4 ${theme.appearance === "dark" ? "text-slate-200" : 'text-black'}`} />
              <span>Create new workspace</span>
            </div>

            {/* Pages Section - Fixed hover states */}
            
            {/* Only show Default Models For Organization for admins */}
            {selectedOrganization?.memberRole === 'owner' && (
              <div className={`border-t ${theme.appearance === "dark" ? 'border-slate-700' : 'border-slate-200'} mt-2 pt-2`}>
                <div className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                  theme.appearance === "dark" 
                    ? 'hover:bg-slate-800 text-slate-200 hover:text-white' 
                    : 'hover:bg-slate-100 text-black hover:text-black'
                }`}
                onClick={()=>{
                  setActiveTeamChat(null);
                  handleDefaultModelsForOrganizationClick();
                }}
                >
                  <FileText className={`w-4 h-4 ${theme.appearance === "dark" ? "text-slate-200" : 'text-black'}`} />
                  <span>Default Models For Organization</span>
                </div>
              </div>
            )}
            <div className={`border-t ${theme.appearance === "dark" ? 'border-slate-700' : 'border-slate-200'} mt-2 pt-2`}>
              <div className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                theme.appearance === "dark" 
                  ? 'hover:bg-slate-800 text-slate-200 hover:text-white' 
                  : 'hover:bg-slate-100 text-black hover:text-black'
              }`}>
                <FileText className={`w-4 h-4 ${theme.appearance === "dark" ? "text-slate-200" : 'text-black'}`} />
                <span>Pages</span>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CompanySelector;