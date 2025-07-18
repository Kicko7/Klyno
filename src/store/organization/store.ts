import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { renderEmail } from '@/libs/emails/render-email';
import { OrganizationInvitation } from '@/libs/emails/templates/organization-invitation';
import { lambdaClient } from '@/libs/trpc/client';

export interface OrganizationState {
  error: any;
  isCreating: boolean;
  isFetchingMembers: boolean;
  isInviting: boolean;
  isLoading: boolean;
  organizationMembers: any[];
  organizations: any[];
  CreateOrgModal: boolean;
  showCreateOrgModal: () => void;
  hideCreateOrgModal: () => void;
}

export interface OrganizationAction {
  createOrganization: (name: string) => Promise<any>;
  fetchOrganizationMembers: (organizationId: string) => Promise<void>;
  fetchOrganizations: () => Promise<void>;
  inviteMember: (params: {
    email: string;
    organizationId: string;
    role: 'admin' | 'member';
    teamId: string;
  }) => Promise<void>;
}

export interface OrganizationStore extends OrganizationState, OrganizationAction {}

const initialOrganizationState: OrganizationState = {
  error: null,
  isCreating: false,
  isFetchingMembers: false,
  isInviting: false,
  isLoading: false,
  organizationMembers: [],
  organizations: [],
  CreateOrgModal: false,
  showCreateOrgModal: () => void {},
  hideCreateOrgModal: () => void {},
};

export const useOrganizationStore = create<OrganizationStore>()(
  devtools(
    (set, get) => ({
      ...initialOrganizationState,
      createOrganization: async (name) => {
        set({ isCreating: true });
        try {
          const newOrg = await lambdaClient.organization.createOrganization.mutate({ name });
          await get().fetchOrganizations();
          set({ isCreating: false });
          return newOrg;
        } catch (error) {
          set({ error, isCreating: false });
          throw error;
        }
      },
      fetchOrganizationMembers: async (organizationId) => {
        set({ isFetchingMembers: true });
        try {
          const members = await lambdaClient.organization.getOrganizationMembers.query({
            organizationId,
          });
          set({ isFetchingMembers: false, organizationMembers: members });
        } catch (error) {
          set({ error, isFetchingMembers: false });
        }
      },
      fetchOrganizations: async () => {
        set({ isLoading: true });
        try {
          const organizations = await lambdaClient.organization.getMyOrganizations.query();
          set({ isLoading: false, organizations });
        } catch (error) {
          set({ error, isLoading: false });
        }
      },
      showCreateOrgModal: () => {
        set({ CreateOrgModal: true });
      },
      hideCreateOrgModal: () => {
        set({ CreateOrgModal: false });
      },
      inviteMember: async ({ organizationId, email, role, teamId }) => {
        set({ isInviting: true });
        try {
          // Generate a unique token for the invitation
          const token = nanoid();
          
          // Generate email HTML if needed
          const emailHtml = renderEmail(
            OrganizationInvitation({
              organizationName: get().organizations.find(org => org.id === organizationId)?.name || 'Organization',
            }),
          );
          
          await lambdaClient.organization.inviteMember.mutate({
            email,
            organizationId,
            role,
            teamId,
            token,
            html: emailHtml,
          });
          // Refresh organization members after successful invite
          await get().fetchOrganizationMembers(organizationId);
        } catch (error) {
          set({ error });
          throw error;
        } finally {
          set({ isInviting: false });
        }
      },
    }),
    {
      name: 'LobeOrganizationStore',
    },
  ),
);
