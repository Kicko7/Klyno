import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { credits } from './schemas/credits';
import { Credit, NewCredit } from './types';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema: { credits } });

export type { Credit, NewCredit };
export { credits } from './schemas/credits';
