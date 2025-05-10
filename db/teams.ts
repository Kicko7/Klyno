import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
})

export const insertTeamSchema = createInsertSchema(teams)
export const selectTeamSchema = createSelectSchema(teams)

export type Team = z.infer<typeof selectTeamSchema>
export type NewTeam = z.infer<typeof insertTeamSchema>

export const getTeamById = async (teamId: string) => {
  const { data: team, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return team
}

export const createTeam = async (team: TablesInsert<"teams">) => {
  const { data: createdTeam, error } = await supabase
    .from("teams")
    .insert([team])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdTeam
}

export const updateTeam = async (
  teamId: string,
  team: TablesUpdate<"teams">
) => {
  const { data: updatedTeam, error } = await supabase
    .from("teams")
    .update(team)
    .eq("id", teamId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedTeam
}

export const deleteTeam = async (teamId: string) => {
  const { error } = await supabase.from("teams").delete().eq("id", teamId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const getTeams = async (userId: string) => {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", userId)
  if (error) throw error
  return data
}
