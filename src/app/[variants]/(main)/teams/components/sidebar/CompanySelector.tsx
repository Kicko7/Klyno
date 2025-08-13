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

  console.log(organizations)
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

  // When organizations load and no org is selected, select the first
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrganizationId) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId, setSelectedOrganizationId]);

  const handleWorkspaceMembersClick = () => {
    if (selectedOrganization?.id) {
      router.push(`/teams?view=members&organizationId=${selectedOrganization.id}`);
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
        <div className={`flex items-center justify-center w-8 h-8 ${theme.appearance === "dark" ? "bg-white/10 hover:text-black" : "bg-black/50"} rounded`}>
          <span className={`text-xs font-bold ${theme.appearance === "dark"? 'text-black':''}`}>
            {org.name ? org.name.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
        <span className={`font-semibold ${theme.appearance == "dark"? 'text-slate-500':'text-black'} text-wrap`}>{org.name || 'Unknown'}</span>
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
          className={`w-72 ${theme.appearance == "dark" ? 'bg-black':'bg-white'} -md border-slate-200 text-slate-200`}
          align="start"
        >
          <div className="p-2">
            <div
              className="flex items-center gap-2 p-2 rounded cursor-pointer"
              onClick={handleWorkspaceMembersClick}
            >
              <Users className={`w-4 h-4 ${theme.appearance == "dark" ? 'text-slate-200':"text-black"}`} />
              <span className={`${theme.appearance == "dark" ? 'text-slate-200':"text-black"}`}>Workspace members</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-200 cursor-pointer">
              <Grid3X3 className={`w-4 h-4 ${theme.appearance == "dark" ? 'text-slate-200':"text-black"}`} />
              <span className={`${theme.appearance == "dark" ? 'text-slate-200':"text-black"}`}>My integrations</span>
            </div>

            <div className="mt-4 mb-2">
              <span className={`${theme.appearance == "dark" ? 'text-slate-200':"text-black"} text-xs font-medium`}>Your workspaces:</span>
            </div>

            <div className="flex flex-col gap-2">
              {organizations.map((org: any) => (
                <div
                  key={org.id || org.name}
                  className={`flex items-center gap-2 p-2 rounded hover:bg-slate-200 cursor-pointer ${selectedOrganizationId === org.id ? 'bg-slate-200 text-black' : ''}`}
                  onClick={() => setSelectedOrganizationId(org.id)}
                >
                  <ShowCompany org={org} />
                </div>
              ))}
            </div>

            <div
              className="flex items-center gap-2 p-2 rounded hover:bg-slate-200 cursor-pointer mt-1"
              onClick={() => showCreateOrgModal()}
            >
              <FolderPlus className={`w-4 h-4 ${theme.appearance == "dark" ?"text-slate-200":'text-black'}`} />
              <span className={`${theme.appearance == "dark" ?"text-slate-200":'text-black'}`}>Create new workspace</span>
            </div>

            <div className="border-t border-slate-200 mt-2 pt-2">
              <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-200 cursor-pointer">
                <FileText className={`w-4 h-4 ${theme.appearance == "dark" ?"text-slate-200":'text-black'}`} />
                <span className={`${theme.appearance == "dark" ?"text-slate-200":'text-black'}`}>Pages</span>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CompanySelector;
