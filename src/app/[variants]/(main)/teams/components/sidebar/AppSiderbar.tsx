'use client';

import { useTheme } from 'antd-style';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  ImageIcon,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
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
import { useTeamChatRoute } from '@/hooks/useTeamChatRoute';
import { useOrganizationStore } from '@/store/organization/store';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';

import { ChatItemDropdown } from './ChatItemDropdown';
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
  const { organizations, selectedOrganizationId } = useOrganizationStore();
  const currentOrganization = organizations.find((org) => org.id === selectedOrganizationId);
  const userState = useUserStore();

  // Use the team chat routing hook
  const { switchToTeamChat } = useTeamChatRoute();

  // Use the new team chat store
  const {
    teamChatsByOrg,
    activeTeamChatId,
    createTeamChat,
    setActiveTeamChat,
    isLoading,
    currentOrganizationId,
    refreshTeamChats,
    refreshSidebar,
    setCurrentOrganizationId,
  } = useTeamChatStore();

  // Get chats for current organization
  const teamChats = currentOrganization?.id ? teamChatsByOrg[currentOrganization.id] || [] : [];

  // Debug logging
  console.log('🔍 Sidebar debug:', {
    currentOrganizationId: currentOrganization?.id,
    teamChatStoreCurrentOrgId: currentOrganizationId,
    teamChatsByOrgKeys: Object.keys(teamChatsByOrg),
    teamChatsCount: teamChats.length,
    isLoading,
    userState: {
      userId: userState.user?.id,
      isSignedIn: userState.isSignedIn,
      isLoaded: userState.isLoaded,
    },
  });

  // Handle organization switching - load chats and clear active chat
  React.useEffect(() => {
    if (currentOrganization?.id && userState.isSignedIn && userState.user?.id) {
      console.log('🔍 Organization changed in sidebar:', currentOrganization.id);

      // Synchronize organization ID in team chat store
      setCurrentOrganizationId(currentOrganization.id);

      // Clear active chat when organization changes
      setActiveTeamChat(null);

      // Load team chats for the new organization
      refreshTeamChats();

      // Reset URL to teams page
      router.push('/teams');
    }
  }, [
    currentOrganization?.id,
    setActiveTeamChat,
    setCurrentOrganizationId,
    router,
    refreshTeamChats,
    userState.isSignedIn,
    userState.user?.id,
  ]);

  // Initial load when component mounts and organization is already selected
  React.useEffect(() => {
    if (
      currentOrganization?.id &&
      !currentOrganizationId &&
      userState.isSignedIn &&
      userState.user?.id
    ) {
      console.log('🔍 Initial organization load in sidebar:', currentOrganization.id);

      // Synchronize organization ID in team chat store
      setCurrentOrganizationId(currentOrganization.id);

      // Load team chats for the current organization
      refreshTeamChats();
    }
  }, [
    currentOrganization?.id,
    currentOrganizationId,
    setCurrentOrganizationId,
    refreshTeamChats,
    userState.isSignedIn,
    userState.user?.id,
  ]);

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
    if (
      isCreatingChat ||
      !currentOrganization?.id ||
      !userState.isSignedIn ||
      !userState.user?.id
    ) {
      console.warn('⚠️ Cannot create chat: user not authenticated or no organization');
      return;
    }

    try {
      setIsCreatingChat(true);
      console.log('🚀 Creating new team chat from sidebar button...');

      // Create new chat and get its ID
      const newChatId = await createTeamChat(currentOrganization.id);

      // Generate a topic ID for the new chat
      const topicId = `topic_${newChatId}_${Date.now()}`;

      // Set active chat in store
      setActiveTeamChat(newChatId, topicId);

      // Navigate with chat ID and topic in URL
      const query = new URLSearchParams({
        view: 'chat',
        chatId: newChatId,
        topic: topicId,
      }).toString();

      router.push(`/teams?${query}`);
    } catch (error) {
      console.error('Failed to create new team chat:', error);
    } finally {
      setIsCreatingChat(false);
    }
  }, [
    createTeamChat,
    currentOrganization?.id,
    router,
    isCreatingChat,
    setActiveTeamChat,
    userState.isSignedIn,
    userState.user?.id,
  ]);

  const handleChatClick = useCallback(
    async (chatId: string) => {
      // If it's already the active chat, no need to navigate
      if (activeTeamChatId === chatId) {
        return;
      }

      // Check if user is authenticated
      if (!userState.isSignedIn || !userState.user?.id) {
        console.warn('⚠️ Cannot access chat: user not authenticated');
        return;
      }

      // Check if we have a current organization
      if (!currentOrganization?.id) {
        console.warn('⚠️ No organization selected');
        return;
      }

      try {
        // Find the chat in current organization's chats
        const chat = teamChats.find((c) => c.id === chatId);
        if (!chat) {
          console.warn('⚠️ Chat not found in current organization');
          return;
        }

        // Try to set active chat in store
        try {
          await setActiveTeamChat(chatId);
        } catch (error) {
          // If server is down, use local state
          if (error instanceof Error && error.message.includes('Failed to fetch')) {
            console.warn('⚠️ Server connection error, using local state');
            useTeamChatStore.setState({
              activeTeamChatId: chatId,
              error: 'Server connection error. Using local data.',
            });
          } else {
            throw error;
          }
        }

        // Use the routing hook to ensure consistent URL parameters
        await switchToTeamChat(currentOrganization.id, chatId);
        console.log('✅ Successfully switched to chat:', chatId);
      } catch (error) {
        console.error('❌ Error switching to chat:', error);
      }
    },
    [
      setActiveTeamChat,
      router,
      activeTeamChatId,
      userState.isSignedIn,
      userState.user?.id,
      currentOrganization?.id,
      teamChats,
    ],
  );

  const theme = useTheme();
  return (
    <Sidebar className="border-r border-border/40  text-slate-100 ml-12" {...props}>
      <SidebarHeader
        className={`border-b border-grey p-4 ${theme.appearance === 'dark' ? 'bg-black text-white' : 'bg-white'}`}
      >
        <CompanySelector />
        <div className="mt-4 px-1">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white justify-start gap-2 mr-0 disabled:opacity-50"
            onClick={handleNewPrivateChat}
            disabled={isCreatingChat || !userState.isSignedIn || !userState.user?.id}
          >
            <Plus className="w-4 h-4" />
            {isCreatingChat
              ? 'Creating...'
              : !userState.isSignedIn || !userState.user?.id
                ? 'Sign in to create chat'
                : 'New private chat'}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent
        className={`${theme.appearance === 'dark' ? 'bg-black' : 'bg-white'} px-4 py-4`}
      >
        {/* Chats Section - Show team chats */}
        <SidebarGroup>
          <Collapsible open={openSections.chats} onOpenChange={() => toggleSection('chats')}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel
                className={`${theme.appearance === 'dark' ? 'text-white' : 'text-black'} text-xs uppercase tracking-wider font-medium hover:text-slate-300 cursor-pointer flex items-center gap-1`}
              >
                {openSections.chats ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Chats
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🔄 Manual refresh triggered');
                      if (userState.isSignedIn && userState.user?.id) {
                        refreshSidebar();
                      } else {
                        console.warn('⚠️ Cannot refresh sidebar: user not authenticated');
                      }
                    }}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {teamChats.map((chat) => {
                    const isPublic = chat.metadata?.isPublic || false;
                    return (
                      <SidebarMenuItem key={chat.id} className="">
                        <div className="relative-group">
                          <SidebarMenuButton
                            className={`${theme.appearance === 'dark' ? 'bg-white hover:bg-white' : 'bg-black hover:bg-black'} text-slate-300 pr-8 transition-all duration-300 ease-in-out rounded-xl ${activeTeamChatId === chat.id
                                ? theme.appearance === 'dark'
                                  ? 'bg-white text-black'
                                  : 'bg-black text-white'
                                : ''
                              } ${isPublic ? ' border-emerald-500' : ''}`}
                            onClick={(e) => handleChatClick(chat.id)}
                          >
                            <MessageCircle
                              className={`w-4 h-4 ${theme.appearance === 'dark' ? 'text-black' : 'text-white'}`}
                            />
                            <span
                              className={`flex-1 truncate ${theme.appearance === 'dark' ? 'text-black' : 'text-white'}`}
                            >
                              {chat.title || 'Untitled Chat'}
                            </span>
                            {isPublic && <Users className="w-3 h-3 text-emerald-400 ml-1" />}
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
                      <SidebarMenuButton
                        className="text-slate-400 hover:text-white cursor-pointer"
                        onClick={() => {
                          // console.log('🔍 Manual load team chats triggered');
                          // console.log('🔍 User state:', {
                          //   isSignedIn: userState.isSignedIn,
                          //   userId: userState.user?.id,
                          //   isLoaded: userState.isLoaded,
                          // });
                          if (
                            currentOrganization?.id &&
                            userState.isSignedIn &&
                            userState.user?.id
                          ) {
                            refreshTeamChats();
                          } else {
                            console.warn(
                              '⚠️ Cannot load team chats: user not authenticated or no organization',
                            );
                          }
                        }}
                      >
                        <span>
                          {!userState.isSignedIn || !userState.user?.id
                            ? 'Please sign in to view chats'
                            : 'No chats yet'}
                        </span>
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
              <SidebarGroupLabel
                className={`${theme.appearance === 'dark' ? 'text-white' : 'text-black'} text-xs uppercase tracking-wider font-medium hover:text-slate-300 cursor-pointer flex items-center gap-1`}
              >
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
                      <SidebarMenuButton className="text-slate-300 hover:text-slate-100 hover:bg-white/10">
                        <item.icon
                          className={`w-4 h-4 ${theme.appearance === 'dark' ? 'text-white' : 'text-black'}`}
                        />
                        <span
                          className={` ${theme.appearance === 'dark' ? 'text-slate-200' : 'text-black'}`}
                        >
                          {item.title}
                        </span>
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
              <SidebarGroupLabel
                className={`${theme.appearance == 'dark' ? 'text-slate-400' : 'text-black'} text-xs uppercase tracking-wider font-medium hover:text-slate-300 cursor-pointer flex items-center gap-1`}
              >
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
                  <SidebarMenuItem
                    className={`${theme.appearance === 'dark' ? 'hover:text-black' : ''}`}
                  >
                    <SidebarMenuButton>
                      <span
                        className={`${theme.appearance === 'dark' ? 'text-black-200 hover:text-black' : 'text-black'} `}
                      >
                        Create Private Project
                      </span>
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
              <SidebarGroupLabel
                className={`${theme.appearance == 'dark' ? 'text-slate-400' : 'text-black'} text-xs uppercase tracking-wider font-medium hover:text-slate-300 cursor-pointer flex items-center gap-1`}
              >
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
                          <SidebarMenuButton
                                 style={{
                                  background:"black"
                                 }}
                          >
                            <span className="w-4 h-4 flex items-center justify-center text-emerald-400 font-bold text-xs">
                              C
                            </span>
                            <span
                              className={`${theme.appearance === 'dark' ? 'text-dark' : 'text-white'}`}
                            >
                              {item.title}
                            </span>
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
                                <SidebarMenuSubButton className="text-slate-400 hover:text-slate-200 hover:bg-white/10">
                                  <FolderOpen className="w-4 h-4 text-slate-200" style={{color:theme.appearance == "dark" ? 'white':''}} />
                                  <span className={`${theme.appearance == "dark" ? 'text-slate-200':'text-primary-300'} text-xs`}>{subItem.title}</span>
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
