import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const getTeamMembersByUserId = async (userId: string) => {
  const { data: teamMembers, error } = await supabase
    .from("team_members")
    .select(
      `
      *,
      teams(name),
      profiles!invited_by(email)
    `
    )
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  return teamMembers
}

export const createTeamMember = async (
  teamMember: TablesInsert<"team_members">
) => {
  const { data: createdTeamMember, error } = await supabase
    .from("team_members")
    .insert([teamMember])
    .select(
      `
      *,
      teams(name),
      profiles!invited_by(email)
    `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdTeamMember
}

export const updateTeamMember = async (
  teamMemberId: string,
  teamMember: TablesUpdate<"team_members">
) => {
  const { data: updatedTeamMember, error } = await supabase
    .from("team_members")
    .update(teamMember)
    .eq("id", teamMemberId)
    .select(
      `
      *,
      teams(name),
      profiles!invited_by(email)
    `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedTeamMember
}

export const deleteTeamMember = async (teamMemberId: string) => {
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", teamMemberId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}
