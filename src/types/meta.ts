import { z } from 'zod';

export const LobeMetaDataSchema = z.object({
  /**
   * 角色头像
   */
  avatar: z.string().optional(),
  /**
   *  背景色
   */
  backgroundColor: z.string().optional(),
  description: z.string().optional(),
  /**
   * Whether this is a team chat session
   */
  isTeamChat: z.boolean().optional(),
  /**
   * Organization ID for team chats
   */
  organizationId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  /**
   * Team members for collaborative chats
   */
  teamMembers: z.array(z.string()).optional(),
  /**
   * 名称
   */
  title: z.string().optional(),
});

export type MetaData = z.infer<typeof LobeMetaDataSchema>;

export interface BaseDataModel {
  createdAt: number;

  id: string;
  meta: MetaData;

  updatedAt: number;
}
