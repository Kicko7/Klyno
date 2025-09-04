import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  AffiliateInfoItem,
  AffiliateItem,
  NewAffiliate,
  NewAffiliateInfo,
  UserItem,
} from '@/database/schemas';
import { lambdaClient } from '@/libs/trpc/client';

interface affiliates { 
  affiliate:AffiliateItem;
  user:UserItem
}
export interface AffiliateState {
  loading: boolean;
  affiliates: affiliates[] | [];
  affiliateInfo: AffiliateInfoItem | null;
  loadingCreateAffiliateInfo: boolean;
  affiliateInfoByUserId: AffiliateInfoItem | null;
  fullUser: UserItem | null;
}

export interface AffiliateAction {
  getMyAffiliate: () => Promise<AffiliateItem[]>;
  getAffiliateInfo: () => Promise<AffiliateInfoItem>;
  createAffiliateInfo: (data: NewAffiliateInfo) => Promise<any>;
  countclickAffiliate: (data: { link: string }) => Promise<any>;
  addAffiliateRef: (data: { link: string ,userId: string}) => Promise<any>;
  updateUserAffiliateRef: (data: { affiliateId: string, userId: string }) => Promise<any>;
  withdrawAffiliate: (data: { affiliateId: string, userId: string }) => Promise<any>;
  getAffiliateInfoByUserId: (userId: string) => Promise<AffiliateInfoItem>;
  getFullUser: (userId: string) => Promise<UserItem>;
  processWithdrawal: (data: { withdrawalId: string, userId: string }) => Promise<any>;
}

export interface AffiliateStore extends AffiliateState, AffiliateAction {}

const initialAffiliateState: AffiliateState = {
  loading: false,
  affiliates: [],
  affiliateInfo: null,
  loadingCreateAffiliateInfo: false,
  affiliateInfoByUserId: null,
  fullUser: null,
};

export const useAffiliateStore = create<AffiliateStore>()(
  devtools(
    (set, get) => ({
      ...initialAffiliateState,

      getMyAffiliate: async () => {
        try {
          set({ loading: true });
          const affiliates = await lambdaClient.affiliate.getMyAffiliates.query();
          // console.log(affiliates);
          set({ affiliates });
        } catch (error) {
          console.error(error);
          set({ loading: false });
          throw error;
        }
      },
      getAffiliateInfo: async () => {
        try {
          set({ loading: true });
          const affiliateInfo = await lambdaClient.affiliate.getAffiliateInfo.query();
          set({ affiliateInfo: affiliateInfo[0] });
        } catch (error) {
          console.error(error);
          set({ loading: false });
          throw error;
        } finally {
          set({ loading: false });
        }
      },
      createAffiliateInfo: async (data) => {
        try {
          set({ loadingCreateAffiliateInfo: true });
          const affiliateInfo = await lambdaClient.affiliate.createAffiliateInfo.mutate(data);
          set({ affiliateInfo });
        } catch (error) {
          console.error(error);
          set({ loading: false });
          throw error;
        } finally {
          set({ loadingCreateAffiliateInfo: false });
        }
      },
      countclickAffiliate: async (data) => {
        try {
           await lambdaClient.affiliate.countclickAffiliate.mutate(data);
        }
        catch (error) {
          console.error(error);
          throw error;
        }
      },
      addAffiliateRef: async (data) => {
        try {
        return await lambdaClient.affiliate.addAffiliateRef.mutate(data);
        }
        catch (error) {
          console.error(error);
          throw error;
        }
      },
      updateUserAffiliateRef: async (data) => {
        try {
          await lambdaClient.affiliate.updateUserAffiliateRef.mutate(data);
        }
        catch (error) {
          console.error(error);
          throw error;
        }
      },
      withdrawAffiliate: async (data) => {
        try {
          await lambdaClient.affiliate.withdrawAffiliate.mutate(data);
          set({ affiliateInfo: { ...get().affiliateInfo, totalRevenue: 0 } as AffiliateInfoItem });
        }
        catch (error) {
          console.error(error);
          throw error;
        }
      },
      getAffiliateInfoByUserId: async (userId) => {
        try {
          const affiliateInfo = await lambdaClient.affiliate.getAffiliateInfoByUserId.query({ userId });
          set({ affiliateInfoByUserId: affiliateInfo[0] });
        }
        catch (error) {
          console.error(error);
          throw error;
        }
      },
      getFullUser: async (userId) => {
        try {
          const fullUser = await lambdaClient.affiliate.getFullUser.query({ userId });
          set({ fullUser: fullUser[0] });
          return fullUser[0];
        }
        catch (error) {
          console.error(error);
          throw error;
        }
      },
      processWithdrawal: async (data) => {
        try {
          await lambdaClient.affiliate.processWithdrawal.mutate(data);
        }
        catch (error) {
          console.error(error);
          throw error;
        }
      },
    }),
    { name: 'SharedFolderState' },
  ),
);
