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

const CompanySelector = () => {
  const router = useRouter();
  const { showCreateOrgModal, fetchOrganizations, isLoading, organizations } =
    useOrganizationStore();
  const [selectedOrganization, setSelectedOrganization] = useState<any>(null);

  useEffect(() => {
    if (!organizations || organizations.length === 0) {
      fetchOrganizations();
    }
  }, [organizations, fetchOrganizations]);

  // Set the first organization as selected when organizations are loaded
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrganization) {
      setSelectedOrganization(organizations[0]);
    }
  }, [organizations, selectedOrganization]);

  const handleWorkspaceMembersClick = () => {
    if (selectedOrganization?.id) {
      router.push(`/teams?view=members&organizationId=${selectedOrganization.id}`);
    }
  };

  const ShowCompany = ({ org }: { org: any }) => {

    if (!org) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-white/10 rounded">
            <span className="text-xs font-bold text-slate-300">?</span>
          </div>
          <span className="font-semibold text-slate-100 text-wrap">No organization</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 bg-white/10 rounded">
          <span className="text-xs font-bold text-slate-300">
            {org.name ? org.name.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
        <span className="font-semibold text-slate-100 text-wrap">{org.name || 'Unknown'}</span>
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
          className="w-72 bg-black -md border-slate-200 text-slate-200 "
          align="start"
        >
          <div className="p-2">
            <div 
              className="flex items-center gap-2 p-2 rounded hover:bg-white/10 cursor-pointer"
              onClick={handleWorkspaceMembersClick}
            >
              <Users className="w-4 h-4 text-slate-200" />
              <span className="text-slate-200">Workspace members</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-700 cursor-pointer">
              <Grid3X3 className="w-4 h-4 text-slate-200" />
              <span className="text-slate-200">My integrations</span>
            </div>

            <div className="mt-4 mb-2">
              <span className="text-xs text-slate-200 font-medium">Your workspaces:</span>
            </div>

            <div className="flex flex-col gap-2">
              {organizations.map((org: any) => (
                <div
                  key={org.id || org.name}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-700 cursor-pointer"
                  onClick={() => setSelectedOrganization(org)}
                >
                  <ShowCompany org={org} />
                </div>
              ))}
            </div>

            <div
              className="flex items-center gap-2 p-2 rounded hover:bg-slate-700 cursor-pointer mt-1"
              onClick={() => showCreateOrgModal()}
            >
              <FolderPlus className="w-4 h-4 text-slate-200" />
              <span className="text-slate-200">Create new workspace</span>
            </div>

            <div className="border-t border-slate-700 mt-2 pt-2">
              <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-700 cursor-pointer">
                <FileText className="w-4 h-4 text-slate-200" />
                <span className="text-slate-200">Pages</span>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CompanySelector;
