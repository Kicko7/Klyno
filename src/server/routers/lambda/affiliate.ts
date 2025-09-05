import { authedProcedure, publicProcedure, router } from "@/libs/trpc/lambda";
import { AffiliateService } from "@/server/services/affiliate";
import { z } from "zod";

export const affiliateRouter = router({
    getAffiliateInfoByUserId: authedProcedure.input(z.object({
        userId: z.string(),
    })).query(async ({ input }) => {
        const service = new AffiliateService();
        return service.getAffiliateInfoByUserId(input);
    }),

    getMyAffiliates: authedProcedure.query(async ({ ctx }) => {
        const service = new AffiliateService();
        return service.getMyAffiliate({ ownerId: ctx.userId });
    }),
    getAffiliateInfo: authedProcedure.query(async ({ ctx }) => {
        const service = new AffiliateService();
        return service.getAffiliateInfo({ ownerId: ctx.userId });
    }),
    createAffiliateInfo: authedProcedure.input(z.object({
        ownerId: z.string(),
        link: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const service = new AffiliateService();
        return service.createAffiliateInfo(input);
    }),
    countclickAffiliate: publicProcedure.input(z.object({
        link: z.string(),
    })).mutation(async ({ input }) => {
        const service = new AffiliateService();
        return service.countclickAffiliate(input);
    }),
    addAffiliateRef: publicProcedure.input(z.object({
        link: z.string(),
        userId: z.string(),
    })).mutation(async ({ input }) => {
        if(!input.userId) {
            return;
        }
        const service = new AffiliateService();
        return service.addAffiliateRef(input);
    }),
    updateUserAffiliateRef: authedProcedure.input(z.object({
        affiliateId: z.string(),
        userId: z.string(),
    })).mutation(async ({ input }) => {
        const service = new AffiliateService();
        return service.updateUserAffiliateRef(input);
    }),
    withdrawAffiliate: authedProcedure.input(z.object({
        affiliateId: z.string(),
        userId: z.string(),
    })).mutation(async ({ input }) => {
        const service = new AffiliateService();
        return service.withdrawAffiliate(input);
    }),
    getFullUser: authedProcedure.input(z.object({
        userId: z.string(),
    })).query(async ({ input }) => {
        const service = new AffiliateService();
        return service.getFullUser(input);
    }),
    processWithdrawal: authedProcedure.input(z.object({
        withdrawalId: z.string(),
        userId: z.string(),
    })).mutation(async ({ input }) => {
        const service = new AffiliateService();
        return service.processWithdrawal(input);
    }),
    getMyWithdrawalHistory: authedProcedure.input(z.object({
        userId: z.string(),
    })).query(async ({ input }) => {
        const service = new AffiliateService();
        return service.getMyWithdrawalHistory(input);
    }),
    updateUserOnboarded: authedProcedure.input(z.object({
        userId: z.string(),
    })).mutation(async ({ input }) => {
        const service = new AffiliateService();
        return service.updateUserOnboarded(input);
    }),
});