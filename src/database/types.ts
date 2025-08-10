import { InferModel } from 'drizzle-orm';

import { credits } from './schemas/credits';

export type Credit = InferModel<typeof credits>;
export type NewCredit = InferModel<typeof credits, 'insert'>;
