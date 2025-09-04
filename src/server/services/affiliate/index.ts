
import { db } from '@/database';
import {
    NewAffiliate,
    NewAffiliateInfo,
    NewAffiliateWithdrawal,
    affiliate,
    affiliateInfo,
    affiliateWithdrawals,
    users,
} from '@/database/schemas';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { sendEmail } from '@/libs/emails/resend';
import { renderWithdrawalRequestEmail } from '@/libs/emails/email-utils';
export interface IAffiliateService {
    getMyAffiliate: (params: { ownerId: string }) => Promise<any>;
    createAffiliateInfo: (params: NewAffiliateInfo) => Promise<any>;
    getAffiliateInfo: (params: { ownerId: string }) => Promise<any>;
    countclickAffiliate: (params: { link: string }) => Promise<any>;
    addAffiliateRef: (params: { link: string, userId: string }) => Promise<any>;
    updateUserAffiliateRef: (params: { affiliateId: string, userId: string }) => Promise<any>;
    withdrawAffiliate: (params: { affiliateId: string, userId: string }) => Promise<any>;
    processWithdrawal: (params: { withdrawalId: string, userId: string }) => Promise<any>;
}

export class AffiliateService implements IAffiliateService {

    async getAffiliateInfoByUserId(data: { userId: string }) {
        const affiliate = await db.select().from(affiliateInfo).where(eq(affiliateInfo.ownerId, data.userId));
        return affiliate;
    }

    async getFullUser(data: { userId: string }) {
        const user = await db.select().from(users).where(eq(users.id, data.userId));
        return user;
    }

    async getMyAffiliate(data: { ownerId: string }) {
        const myAffiliate = await db
            .select({
                affiliate: affiliate,
                user: users,
            })
            .from(affiliate)
            .innerJoin(users, eq(affiliate.affiliateUserId, users.id))
            .where(eq(affiliate.ownerId, data.ownerId));

        return myAffiliate;
    }


    async createAffiliateInfo(data: NewAffiliateInfo) {
        const id = crypto
            .createHash("sha256")
            .update(String(data.ownerId) + Date.now()) // add timestamp for uniqueness
            .digest("hex")
            .slice(0, 12)
        const link = process.env.APP_URL + '/signup?ref=' + id;
        const newAffiliateLink: NewAffiliateInfo = {
            link: link,
            ownerId: data.ownerId,
        };
        const [inserted] = await db.insert(affiliateInfo).values(newAffiliateLink).returning();
        return inserted;
    }

    async getAffiliateInfo(data: { ownerId: string }) {
        const affiliateLink = await db.select().from(affiliateInfo).where(eq(affiliateInfo.ownerId, data.ownerId));
        return affiliateLink;
    }

    async countclickAffiliate(data: { link: string }) {
        const affiliates = await db.select().from(affiliateInfo).where(eq(affiliateInfo.link, data.link));
        if (affiliates.length > 0 && affiliates[0]) {
            const updated = await db.update(affiliateInfo).set({ totalClicks: (affiliates[0].totalClicks || 0) + 1 }).where(eq(affiliateInfo.link, data.link));
            return updated[0];
        }
    }

    async addAffiliateRef(data: { link: string, userId: string, }) {
        const link = process.env.APP_URL + '/signup?ref=' + data.link;
        const ownerId = await db.select().from(affiliateInfo).where(eq(affiliateInfo.link, link)).then(res => res[0].ownerId);
        if (!ownerId) {
            return;
        }
        const newAffiliate: NewAffiliate = {
            link: link,
            ownerId: ownerId,
            affiliateUserId: data.userId,
        };
        const [inserted] = await db.insert(affiliate).values(newAffiliate).returning();
        if (inserted) {
            const affiliates = await db.select().from(affiliateInfo).where(eq(affiliateInfo.link, link));
            await db.update(affiliateInfo).set({ totalSignups: (affiliates[0].totalSignups || 0) + 1 }).where(eq(affiliateInfo.link, link));
        }
        return inserted;
    }

    async updateUserAffiliateRef(data: { affiliateId: string, userId: string }) {
        const updated = await db.update(users).set({ affiliateId: data.affiliateId }).where(eq(users.id, data.userId));
        return updated;
    }

    async withdrawAffiliate(data: { affiliateId: string, userId: string }) {
        const affiliate = await db.select().from(affiliateInfo).where(eq(affiliateInfo.id, data.affiliateId));
        const user = await db.select().from(users).where(eq(users.id, data.userId));
        const newWithdrawal: NewAffiliateWithdrawal = {
            userId: data.userId,
            amount: affiliate[0]?.totalRevenue || 0,
            status: 'pending',
        };
        const [inserted] = await db.insert(affiliateWithdrawals).values(newWithdrawal).returning();
        const link = process.env.APP_URL + '/pay?userId=' + user[0].id + '&amount=' + affiliate[0]?.totalRevenue + '&withdrawalId=' + inserted.id;
        //  await db.update(affiliateInfo).set({ totalRevenue: 0 }).where(eq(affiliateInfo.id, data.affiliateId));
        sendEmail({
            to: process.env.ADMIN_EMAIL || '',
            subject: 'Withdrawal Request',
            html: renderWithdrawalRequestEmail({
                user: { id: user[0].id, email: user[0].email || '', name: user[0].firstName || user[0].username || '' },
                affiliateInfo: { totalRevenue: affiliate[0]?.totalRevenue || 0, totalClicks: affiliate[0].totalClicks || 0, totalSignups: affiliate[0].totalSignups || 0, link: affiliate[0].link },
                withdrawalAmount: affiliate[0]?.totalRevenue || 0,
                markAsPaidLink: link
            })
        });

        await db.update(affiliateInfo).set({ totalRevenue: 0 }).where(eq(affiliateInfo.id, data.affiliateId));
      
        return inserted;
        // return updated;
    }

    async processWithdrawal(data: { withdrawalId: string, userId: string }) {
        const updated = await db.update(affiliateWithdrawals).set({ status: 'paid' }).where(eq(affiliateWithdrawals.id, data.withdrawalId));
        return updated;
    }
}