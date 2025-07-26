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

import { useOrganizationStore } from '@/store/organization/store';
import { useTeamChatStore } from '@/store/teamChat';

import CompanySelector from './CompanySelector';
import { ChatItemDropdown } from './ChatItemDropdown';

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
  const { organizations } = useOrganizationStore();
  const currentOrganization = organizations[0];
  
  // Use the new team chat store
  const {
    teamChats,
    activeTeamChatId,
    createTeamChat,
    setActiveTeamChat,
    loadTeamChats,
    isLoading,
  } = useTeamChatStore();
  
  // Load team chats when organization changes
  React.useEffect(() => {
    if (currentOrganization?.id) {
      console.log('🔍 Loading team chats for sidebar:', currentOrganization.id);
      loadTeamChats(currentOrganization.id);
    }
  }, [currentOrganization?.id, loadTeamChats]);

  const [openSections, setOpenSections] = React.useState({
    recent: true,
    private: true,
    shared: true,
    chats: true,
    clientWork: true,
  });
  
  const [isCreatingChat, setIsCreatingChat] = React.useState(false);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }));
  };

  const handleNewPrivateChat = useCallback(async () => {
    if (isCreatingChat || !currentOrganization?.id) return;
    
    try {
      setIsCreatingChat(true);
      console.log('🚀 Creating new team chat from sidebar button...');
      
      await createTeamChat(currentOrganization.id);
      router.push('/teams?view=chat');
    } catch (error) {
      console.error('Failed to create new team chat:', error);
    } finally {
      setIsCreatingChat(false);
    }
  }, [createTeamChat, currentOrganization?.id, router, isCreatingChat]);
  
  const handleChatClick = useCallback((chatId: string) => {
    setActiveTeamChat(chatId);
    router.push('/teams?view=chat');
  }, [setActiveTeamChat, router]);

  return (
    <Sidebar className="border-r border-border/40  text-slate-100 ml-12" {...props}>
      <SidebarHeader className="border-b border-grey p-4 bg-black">
        <CompanySelector />
        <div className="mt-4 px-1">
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white justify-start gap-2 mr-0 disabled:opacity-50"
            onClick={handleNewPrivateChat}
            disabled={isCreatingChat}
          >
            <Plus className="w-4 h-4" />
            {isCreatingChat ? 'Creating...' : 'New private chat'}
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
                  {teamChats.map((chat) => {
                    const isPublic = chat.metadata?.isPublic || false;
                    return (
                      <SidebarMenuItem key={chat.id}>
                        <div className="relative group">
                          <SidebarMenuButton 
                            className={`bg-black/20 text-slate-300 hover:text-slate-200 hover:bg-slate-800 pr-8 ${
                              activeTeamChatId === chat.id ? 'bg-slate-800 text-white' : ''
                            } ${isPublic ? 'border-l-2 border-emerald-500' : ''}`}
                            onClick={() => handleChatClick(chat.id)}
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span className="flex-1 truncate">{chat.title || 'Untitled Chat'}</span>
                            {isPublic && (
                              <Users className="w-3 h-3 text-emerald-400 ml-1" />
                            )}
                          </SidebarMenuButton>
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChatItemDropdown chat={chat} />
                          </div>
                        </div>
                      </SidebarMenuItem>
                    );
                  })}
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
