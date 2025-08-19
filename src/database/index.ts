import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { creditTransactions } from './schemas/creditTransactions';
import { credits } from './schemas/credits';
import { userCredits } from './schemas/userCredits';
import { Credit, NewCredit } from './types';
import { teamChatMessages, teamChats, users } from './schemas';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema: { credits, userCredits, creditTransactions, teamChatMessages, teamChats, users } });

export type { Credit, NewCredit };
export { credits } from './schemas/credits';
