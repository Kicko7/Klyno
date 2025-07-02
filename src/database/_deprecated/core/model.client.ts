import Dexie, { BulkError } from 'dexie';
import { ZodObject } from 'zod';

import { nanoid } from '@/utils/uuid';

import { BrowserDB, BrowserDBSchema, browserDB } from './db';
import { clientDataSync } from '@/utils/dataSync.client';
import { DBBaseFieldsSchema } from './types/db';

export class BaseModelClient<N extends keyof BrowserDBSchema = keyof BrowserDBSchema, T = BrowserDBSchema[N]['table']> {
  protected readonly db: BrowserDB;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly schema: ZodObject<any>;
  private readonly _tableName: keyof BrowserDBSchema;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(table: N, schema: ZodObject<any>, db = browserDB) {
    this.db = db;
    this.schema = schema;
    this._tableName = table;
  }

  get table() {
    return this.db[this._tableName] as Dexie.Table;
  }

  get yMap() {
    // Client-only YMap access
    if (typeof window === 'undefined') {
      return null;
    }
    
    // This will be resolved asynchronously in the actual methods
    return null;
  }

  // **************** Create *************** //

  /**
   * create a new record
   */
  protected async _addWithSync<TData = BrowserDBSchema[N]['model']>(
    data: TData,
    id: string | number = nanoid(),
    primaryKey: string = 'id',
  ) {
    const result = this.schema.safeParse(data);

    if (!result.success) {
      const errorMsg = `[${this.db.name}][${this._tableName}] Failed to create new record. Error: ${result.error}`;

      const newError = new TypeError(errorMsg);
      // make this error show on console to help debug
      console.error(newError);
      throw newError;
    }

    const tableName = this._tableName;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: any = {
      ...result.data,
      createdAt: Date.now(),
      [primaryKey]: id,
      updatedAt: Date.now(),
    };

    const newId = await this.db[tableName].add(record);

    // sync data to yjs data map (client-only)
    await this.updateYMapItem(newId);

    return { id: newId };
  }

  /**
   * Batch create new records
   * @param dataArray An array of data to be added
   * @param options
   * @param options.generateId
   * @param options.createWithNewId
   */
  protected async _batchAdd<TData = BrowserDBSchema[N]['model']>(
    dataArray: TData[],
    options: {
      /**
       * always create with a new id
       */
      createWithNewId?: boolean;
      idGenerator?: () => string;
      withSync?: boolean;
    } = {},
  ): Promise<{
    added: number;
    errors?: Error[];
    ids: string[];
    skips: string[];
    success: boolean;
  }> {
    const { idGenerator = nanoid, createWithNewId = false, withSync = true } = options;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validatedData: any[] = [];
    const errors = [];
    const skips: string[] = [];

    for (const data of dataArray) {
      const schemaWithId = this.schema.merge(DBBaseFieldsSchema.partial());

      const result = schemaWithId.safeParse(data);

      if (result.success) {
        const item = result.data;
        const autoId = idGenerator();

        const id = createWithNewId ? autoId : (item.id ?? autoId);

        // skip if the id already exists
        if (await this.table.get(id)) {
          skips.push(id as string);
          continue;
        }

        const getTime = (time?: string | number) => {
          if (!time) return Date.now();
          if (typeof time === 'number') return time;

          return new Date(time).valueOf();
        };

        validatedData.push({
          ...item,
          createdAt: getTime(item.createdAt as string),
          id,
          updatedAt: getTime(item.updatedAt as string),
        });
      } else {
        errors.push(result.error);

        const errorMsg = `[${this.db.name}][${
          this._tableName
        }] Failed to create the record. Data: ${JSON.stringify(data)}. Errors: ${result.error}`;
        console.error(new TypeError(errorMsg));
      }
    }
    if (validatedData.length === 0) {
      // No valid data to add
      return { added: 0, errors, ids: [], skips, success: false };
    }

    // Using bulkAdd to insert validated data
    try {
      await this.table.bulkAdd(validatedData);

      if (withSync && typeof window !== 'undefined') {
        await clientDataSync.transact(async () => {
          const pools = validatedData.map(async (item) => {
            await this.updateYMapItem(item.id);
          });
          await Promise.all(pools);
        });
      }

      return {
        added: validatedData.length,
        ids: validatedData.map((item) => item.id),
        skips,
        success: true,
      };
    } catch (error) {
      const bulkError = error as BulkError;
      // Handle bulkAdd errors here
      console.error(`[${this.db.name}][${this._tableName}] Bulk add error:`, bulkError);
      // Return the number of successfully added records and errors
      return {
        added: validatedData.length - skips.length - bulkError.failures.length,
        errors: bulkError.failures,
        ids: validatedData.map((item) => item.id),
        skips,
        success: false,
      };
    }
  }

  // **************** Delete *************** //

  protected async _deleteWithSync(id: string) {
    const result = await this.table.delete(id);
    // sync delete data to yjs data map (client-only)
    if (typeof window !== 'undefined') {
      const yMap = await clientDataSync.getYMap(this._tableName);
      yMap?.delete(id);
    }
    return result;
  }

  protected async _bulkDeleteWithSync(keys: string[]) {
    await this.table.bulkDelete(keys);
    // sync delete data to yjs data map (client-only)
    if (typeof window !== 'undefined') {
      await clientDataSync.transact(async () => {
        const yMap = await clientDataSync.getYMap(this._tableName);
        keys.forEach((id) => {
          yMap?.delete(id);
        });
      });
    }
  }

  protected async _clearWithSync() {
    const result = await this.table.clear();
    // sync clear data to yjs data map (client-only)
    if (typeof window !== 'undefined') {
      const yMap = await clientDataSync.getYMap(this._tableName);
      yMap?.clear();
    }
    return result;
  }

  // **************** Update *************** //

  protected async _updateWithSync(id: string, data: Partial<T>) {
    // we need to check whether the data is valid
    // pick data related schema from the full schema
    const keys = Object.keys(data);
    const partialSchema = this.schema.pick(Object.fromEntries(keys.map((key) => [key, true])));

    const result = partialSchema.safeParse(data);
    if (!result.success) {
      const errorMsg = `[${this.db.name}][${this._tableName}] Failed to update the record:${id}. Error: ${result.error}`;

      const newError = new TypeError(errorMsg);
      // make this error show on console to help debug
      console.error(newError);
      throw newError;
    }

    const success = await this.table.update(id, { ...data, updatedAt: Date.now() });

    // sync data to yjs data map (client-only)
    await this.updateYMapItem(id);

    return { success };
  }

  protected async _putWithSync(data: Record<string, unknown>, id: string) {
    const result = await this.table.put(data, id);

    // sync data to yjs data map (client-only)
    await this.updateYMapItem(id);

    return result;
  }

  protected async _bulkPutWithSync(items: T[]) {
    await this.table.bulkPut(items);

    if (typeof window !== 'undefined') {
      await clientDataSync.transact(async () => {
        items.forEach((items) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.updateYMapItem((items as any).id);
        });
      });
    }
  }

  // **************** Helper *************** //

  private updateYMapItem = async (id: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const newData = await this.table.get(id);
      const yMap = await clientDataSync.getYMap(this._tableName);
      yMap?.set(id, newData);
    } catch (error) {
      console.error('Failed to update YMap item:', error);
    }
  };
} 