import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import { useTheme } from 'antd-style';
import { ChevronDown, ChevronRight, FolderOpen, MessageCircle, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import CreateSubFolderChat from '@/features/SharedFolder/createChatFolder';
import CreateParentFolderModal from '@/features/SharedFolder/createParentFolder';
import CreateSubFolderModal from '@/features/SharedFolder/createSubFolder';
import { useTeamChatRoute } from '@/hooks/useTeamChatRoute';
import { useOrganizationStore } from '@/store/organization/store';
import { useSharedFolderStore } from '@/store/sharedFolder/store';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';

interface TeamSharedProps {
  openSections: {
    recent: boolean;
    private: boolean;
    shared: boolean;
    chats: boolean;
    clientWork: Record<string, boolean>; // folderId -> open state
    subFolder: Record<string, boolean>; // subFolderId -> open state
  };
  toggleSection: (section: string) => void;
  toggleClientWorkFolder: (folderId: string) => void;
  toggleSubFolder: (parentFolderId: string, subFolderId: string) => void;
}

export default function TeamSharedSectionHeader({
  openSections,
  toggleSection,
  toggleClientWorkFolder,
  toggleSubFolder,
}: TeamSharedProps) {
  const theme = useTheme();
  const sharedFolders = useSharedFolderStore((state) => state.sharedFolders);
  const getMySharedFolders = useSharedFolderStore((state) => state.getMySharedFolders);
  const selectedParentFolderId = useSharedFolderStore((state) => state.selectedParentFolderId);
  const setSelectedParentFolderId = useSharedFolderStore(
    (state) => state.setSelectedParentFolderId,
  );
  const selectedSubFolderId = useSharedFolderStore((state) => state.selectedSubFolderId);
  const setSelectedSubFolderId = useSharedFolderStore((state) => state.setSelectedSubFolderId);

  const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId);

  useEffect(() => {
    if (!selectedOrganizationId) return;
    getMySharedFolders({ organizationId: selectedOrganizationId });
  }, [selectedOrganizationId]);

  const [openParentModal, setOpenParentModal] = useState(false);
  const [openSubFolderModal, setOpenSubFolderModal] = useState(false);
  const [openSubChatModal, setOpenSubChatModal] = useState(false);

  const { activeTeamChatId, setActiveTeamChat } = useTeamChatStore();
  const { switchToTeamChat } = useTeamChatRoute();

  // Helper function to check if a parent folder contains the active chat
  const isParentFolderActive = (parentFolder: any) => {
    if (!activeTeamChatId) return false;
    return parentFolder.subFolders?.some((subFolder: any) =>
      subFolder.chats?.some((chat: any) => chat.id === activeTeamChatId),
    );
  };

  // Helper function to check if a subfolder contains the active chat
  const isSubFolderActive = (subFolder: any) => {
    if (!activeTeamChatId) return false;
    return subFolder.chats?.some((chat: any) => chat.id === activeTeamChatId);
  };

  async function handleChatClick(chatId: string) {
    // If it's already the active chat, no need to navigate
    if (activeTeamChatId === chatId) {
      return;
    }
    if (!selectedOrganizationId) return;

    try {
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
      await switchToTeamChat(selectedOrganizationId, chatId);
      console.log('✅ Successfully switched to chat:', chatId);
    } catch (error) {
      console.error('❌ Error switching to chat:', error);
    }
  }

  return (
    <>
      <SidebarGroup>
        {/* SHARED SECTION */}
        <Collapsible open={openSections.shared} onOpenChange={() => toggleSection('shared')}>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel
              className={`${theme.appearance === 'dark' ? 'text-slate-400' : 'text-black'} 
              text-xs uppercase tracking-wider font-medium 
              flex items-center justify-between gap-1 cursor-pointer`}
            >
              <div className="flex items-center gap-1">
                {openSections.shared ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Shared
              </div>

              {/* Plus Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenParentModal(true);
                }}
                className={`p-1 rounded-md transition-colors 
                         ${
                           theme.appearance === 'dark'
                             ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                             : 'hover:bg-slate-200 text-slate-600 hover:text-black'
                         }`}
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
              </button>
            </SidebarGroupLabel>
          </CollapsibleTrigger>

          {/* Shared Folders List */}
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {sharedFolders?.map((item) => {
                  const isParentOpen = openSections.clientWork[item?.id] || false;
                  const isParentActive = isParentFolderActive(item);

                  return (
                    <SidebarMenuItem key={item?.id}>
                      {/* PARENT FOLDER */}
                      <Collapsible
                        open={isParentOpen}
                        onOpenChange={() => toggleClientWorkFolder(item?.id)}
                        onClick={() => {
                          if (selectedParentFolderId !== item?.id) {
                            setSelectedParentFolderId(item?.id);
                          }
                        }}
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={`${theme.appearance === 'dark' && 'hover:!bg-[inherit]'} 
                              ${
                                isParentActive
                                  ? theme.appearance === 'dark'
                                    ? 'bg-emerald-900/50 border-l-2 border-emerald-400'
                                    : 'bg-emerald-100 border-l-2 border-emerald-500'
                                  : ''
                              }`}
                          >
                            <span className="w-4 h-4 flex items-center justify-center text-emerald-400 font-bold text-xs">
                              K
                            </span>
                            <span
                              className={`${
                                theme.appearance === 'dark' ? 'text-white' : 'text-black'
                              } ${isParentActive ? 'font-semibold' : ''}`}
                            >
                              {item?.name}
                            </span>

                            <div className="ml-auto flex items-center gap-2">
                              {/* Add Subfolder Button */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectedParentFolderId !== item?.id) {
                                    setSelectedParentFolderId(item?.id);
                                  }
                                  setOpenSubFolderModal(true);
                                }}
                                className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </div>

                              {isParentOpen ? (
                                <ChevronDown
                                  className={`w-3 h-3 ${
                                    theme.appearance === 'dark' ? 'text-white' : 'text-black'
                                  }`}
                                />
                              ) : (
                                <ChevronRight
                                  className={`w-3 h-3 ${
                                    theme.appearance === 'dark' ? 'text-white' : 'text-black'
                                  }`}
                                />
                              )}
                            </div>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        {/* SUBFOLDERS */}
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subFolders?.map((subItem) => {
                              // Fixed: Use a composite key for subfolder state
                              const compositeKey = `${item.id}_${subItem.id}`;
                              const isSubOpen = openSections?.subFolder[compositeKey] || false;
                              const isSubActive = isSubFolderActive(subItem);

                              return (
                                <SidebarMenuSubItem
                                  key={subItem?.id}
                                  onClick={() => {
                                    if (selectedSubFolderId !== subItem?.id) {
                                      setSelectedSubFolderId(subItem?.id);
                                    }
                                  }}
                                >
                                  {/* Collapsible Subfolder */}
                                  <Collapsible
                                    open={isSubOpen}
                                    onOpenChange={() => toggleSubFolder(item?.id, subItem?.id)}
                                  >
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuSubButton
                                        className={`text-slate-400 hover:text-slate-200 hover:bg-white/10 flex items-center justify-start
                                          ${
                                            isSubActive
                                              ? theme.appearance === 'dark'
                                                ? 'bg-emerald-800/40 border-l-2 border-emerald-300 ml-2'
                                                : 'bg-emerald-50 border-l-2 border-emerald-400 ml-2'
                                              : ''
                                          }`}
                                      >
                                        {isSubOpen ? (
                                          <ChevronDown
                                            className="w-3 h-3"
                                            style={{
                                              color:
                                                theme.appearance === 'dark' ? 'white' : 'black',
                                            }}
                                          />
                                        ) : (
                                          <ChevronRight
                                            className="w-3 h-3"
                                            style={{
                                              color:
                                                theme.appearance === 'dark' ? 'white' : 'black',
                                            }}
                                          />
                                        )}
                                        <FolderOpen
                                          className={`w-4 h-4 ${theme.appearance === 'dark' ? 'text-white' : 'text-black'}`}
                                          style={{
                                            color: theme?.appearance === 'dark' ? 'white' : 'black',
                                          }}
                                        />
                                        <span
                                          className={`${
                                            theme.appearance === 'dark'
                                              ? 'text-slate-200'
                                              : 'text-primary-300'
                                          } text-xs ${isSubActive ? 'font-semibold' : ''}`}
                                        >
                                          {subItem?.name}
                                        </span>

                                        {/* Push plus icon to far right */}
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedSubFolderId !== subItem?.id) {
                                              setSelectedSubFolderId(subItem?.id);
                                            }
                                            setOpenSubChatModal(true);
                                          }}
                                          className="ml-auto flex items-center justify-center"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </span>
                                      </SidebarMenuSubButton>
                                    </CollapsibleTrigger>

                                    {/* Example subitems inside subfolder */}
                                    <CollapsibleContent>
                                      {subItem?.chats?.map((chat) => {
                                        const isChatActive = chat.id === activeTeamChatId;

                                        return (
                                          <div
                                            key={chat?.id}
                                            className={`flex justify-start items-center gap-2 mt-1 cursor-pointer px-4 py-1 ml-4 rounded-md transition-colors
                                              ${
                                                isChatActive
                                                  ? theme.appearance === 'dark'
                                                    ? 'bg-emerald-700/60 text-emerald-100 font-medium'
                                                    : 'bg-emerald-200 text-emerald-900 font-medium'
                                                  : theme.appearance === 'dark'
                                                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-black'
                                              }`}
                                            onClick={() => handleChatClick(chat?.id)}
                                          >
                                            <div>
                                              <MessageCircle className="w-3 h-3" />
                                            </div>
                                            <div className="text-xs truncate">{chat?.title}</div>
                                          </div>
                                        );
                                      })}
                                    </CollapsibleContent>
                                  </Collapsible>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>

      {/* MODALS */}
      <CreateParentFolderModal open={openParentModal} onClose={() => setOpenParentModal(false)} />
      <CreateSubFolderModal
        open={openSubFolderModal}
        onClose={() => setOpenSubFolderModal(false)}
        parentId={selectedParentFolderId}
      />
      <CreateSubFolderChat open={openSubChatModal} onClose={() => setOpenSubChatModal(false)} />
    </>
  );
}
