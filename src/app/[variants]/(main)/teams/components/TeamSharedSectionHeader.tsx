import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import { useTheme } from 'antd-style';
import { ChevronDown, ChevronRight, FolderOpen, Plus } from 'lucide-react';
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
import CreateParentFolderModal from '@/features/SharedFolder/createParentFolder';
import { useSharedFolderStore } from '@/store/sharedFolder/store';
import { useUserStore } from '@/store/user';

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

interface TeamSharedProps {
  openSections: {
    recent: boolean;
    private: boolean;
    shared: boolean;
    chats: boolean;
    clientWork: boolean;
  };
  toggleSection: (section: string) => void;
}
export default function TeamSharedSectionHeader({ openSections, toggleSection }: TeamSharedProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const onClose = () => {
    setOpen(false);
  };

  const {sharedFolders,getMySharedFolders} = useSharedFolderStore();
  // console.log(sharedFolders);

  const user = useUserStore((state)=>state.user);
  useEffect(()=>{
    async function getShared() {
      if(!user) return ;
      await getMySharedFolders({userId:user.id})
    }
    getShared()
  },[])
  return (
    <>
      <SidebarGroup>
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
                  e.stopPropagation(); // prevent toggling section
                  setOpen(true)
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
                            background: 'black',
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
                                <FolderOpen
                                  className="w-4 h-4 text-slate-200"
                                  style={{ color: theme.appearance == 'dark' ? 'white' : '' }}
                                />
                                <span
                                  className={`${theme.appearance == 'dark' ? 'text-slate-200' : 'text-primary-300'} text-xs`}
                                >
                                  {subItem.title}
                                </span>
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
      <CreateParentFolderModal open={open} onClose={onClose} />
    </>
  );
}
