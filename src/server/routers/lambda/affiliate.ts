import { authedProcedure, publicProcedure, router } from "@/libs/trpc/lambda";
import { AffiliateService } from "@/server/services/affiliate";
import { z } from "zod";

export const affiliateRouter = router({
   

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
        const service = new AffiliateService();
        return service.addAffiliateRef(input);
    }),
    updateUserAffiliateRef: publicProcedure.input(z.object({
        affiliateId: z.string(),
        userId: z.string(),
    })).mutation(async ({ input }) => {
        const service = new AffiliateService();
        return service.updateUserAffiliateRef(input);
    }),
});