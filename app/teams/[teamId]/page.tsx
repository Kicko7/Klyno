import { TeamSidebar } from "@/components/teams/TeamSidebar"
import { TeamChatList } from "@/components/teams/TeamChatList"
import { InviteModal } from "@/components/teams/InviteModal"
import { TeamMembers } from "@/components/teams/TeamMembers"
import { ChatWindow } from "@/components/chat/ChatWindow"

interface TeamPageProps {
  params: { teamId: string; conversationId?: string }
}

export default function TeamPage({ params }: TeamPageProps) {
  const { teamId, conversationId } = params

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <TeamSidebar teamId={teamId} />

      {/* Main content */}
      <div className="flex flex-1 flex-col space-y-6 overflow-y-auto p-6">
        {/* Chat window if a conversation is selected */}
        {conversationId ? (
          <ChatWindow teamId={teamId} conversationId={conversationId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <p className="text-muted-foreground">Select a conversation</p>
          </div>
        )}

        {/* Invite people */}
        <InviteModal teamId={teamId} />

        {/* Show Team Members */}
        <TeamMembers teamId={teamId} />
      </div>
    </div>
  )
}
