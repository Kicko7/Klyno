'use client';

import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  FolderPlus,
  Grid3X3,
  ImageIcon,
  MessageCircle,
  Plus,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';

import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { useOrganizationStore } from '@/store/organization/store';

import CompanySelector from './CompanySelector';

// This will be dynamically populated with team chat sessions
const mainItems = [
  { title: 'Pages', icon: FileText },
  { title: 'Gallery', icon: ImageIcon },
  { title: 'Tools', icon: Settings },
];


const sharedItems = [
  {
    title: 'Client work',
    icon: FolderOpen,
    items: [
      { title: 'Subfolder 1.1', icon: FolderOpen },
      { title: 'Folder 2', icon: FolderOpen },
      { title: 'Folder 3', icon: FolderOpen },
      { title: 'Personal Folder 1', icon: FolderOpen },
      { title: 'Personal Folder 2', icon: FolderOpen },
    ],
  },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userOrgs?: any; // Replace 'any' with the correct type if known
}

export function AppSidebar({ userOrgs, ...props }: AppSidebarProps) {
  const router = useRouter();
  const createSession = useSessionStore((s) => s.createSession);
  const switchSession = useSessionStore((s) => s.switchSession);
  const { organizations } = useOrganizationStore();
  const currentOrganization = organizations[0];
  
  // Get team chat sessions for the current organization
  const teamChats = useSessionStore(
    (s) => currentOrganization?.id 
      ? sessionSelectors.teamChatSessionsByOrg(currentOrganization.id)(s)
      : []
  );

  const [openSections, setOpenSections] = React.useState({
    recent: true,
    private: true,
    shared: true,
    chats: true,
    clientWork: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }));
  };

  const handleNewPrivateChat = useCallback(async () => {
    try {
      // Create a new session
      const newSessionId = await createSession({
        meta: {
          title: 'New Private Chat',
          description: `Private chat session for ${currentOrganization?.name || 'organization'}`,
          isTeamChat: true,
          organizationId: currentOrganization?.id,
          teamMembers: [],
        },
      });
      
      // Navigate to the chat view
      router.push('/teams?view=chat');
    } catch (error) {
      console.error('Failed to create new private chat session:', error);
    }
  }, [createSession, currentOrganization, router]);
  
  const handleChatClick = useCallback((chatId: string) => {
    switchSession(chatId);
    router.push('/teams?view=chat');
  }, [switchSession, router]);

  return (
    <Sidebar className="border-r border-border/40  text-slate-100 ml-12" {...props}>
      <SidebarHeader className="border-b border-grey p-4 bg-black">
        <CompanySelector />
        <div className="mt-4 px-1">
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white justify-start gap-2 mr-0"
            onClick={handleNewPrivateChat}
          >
            <Plus className="w-4 h-4" />
            New private chat
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-black px-4 py-4">
        {/* Chats Section - Show team chats */}
        <SidebarGroup>
          <Collapsible open={openSections.chats} onOpenChange={() => toggleSection('chats')}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-white text-xs uppercase tracking-wider font-medium hover:text-slate-300 cursor-pointer flex items-center gap-1">
                {openSections.chats ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Chats
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {teamChats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton 
                        className="text-slate-300 hover:text-slate-200 hover:bg-slate-800"
                        onClick={() => handleChatClick(chat.id)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{chat.meta?.title || 'Untitled Chat'}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {teamChats.length === 0 && (
                    <SidebarMenuItem>
                      <SidebarMenuButton className="text-slate-400 cursor-default">
                        <span>No chats yet</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Recent Section */}
        <SidebarGroup>
          <Collapsible open={openSections.recent} onOpenChange={() => toggleSection('recent')}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-white text-xs uppercase tracking-wider font-medium hover:text-slate-300 cursor-pointer flex items-center gap-1">
                {openSections.recent ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Recent
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton className="text-slate-300 hover:text-slate-100 hover:bg-slate-800">
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Private Section */}
        <SidebarGroup>
          <Collapsible open={openSections.private} onOpenChange={() => toggleSection('private')}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-slate-400 text-xs uppercase tracking-wider font-medium hover:text-slate-300 cursor-pointer flex items-center gap-1">
                {openSections.private ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Private
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton className="text-slate-300 hover:text-slate-100 hover:bg-slate-800">
                      <span>Create Private Project</span>
                      <Plus className="w-4 h-4 ml-auto" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Shared Section */}
        <SidebarGroup>
          <Collapsible open={openSections.shared} onOpenChange={() => toggleSection('shared')}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-slate-400 text-xs uppercase tracking-wider font-medium hover:text-slate-300 cursor-pointer flex items-center gap-1">
                {openSections.shared ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Shared
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sharedItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <Collapsible
                        open={openSections.clientWork}
                        onOpenChange={() => toggleSection('clientWork')}
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="text-slate-300 hover:text-slate-100 hover:bg-slate-800">
                            <span className="w-4 h-4 flex items-center justify-center text-emerald-400 font-bold text-xs">
                              C
                            </span>
                            <span>{item.title}</span>
                            {openSections.clientWork ? (
                              <ChevronDown className="w-3 h-3 ml-auto" />
                            ) : (
                              <ChevronRight className="w-3 h-3 ml-auto" />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                                  <FolderOpen className="w-4 h-4 text-yellow-500" />
                                  <span>{subItem.title}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
