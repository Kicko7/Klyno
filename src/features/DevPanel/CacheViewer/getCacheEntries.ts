'use server';

import { existsSync, promises } from 'node:fs';
import pMap from 'p-map';
import { ZodError } from 'zod';

import { type NextCacheFileData, nextCacheFileSchema } from './schema';

const cachePath = '.next/cache/fetch-cache';

export const getCacheFiles = async (): Promise<NextCacheFileData[]> => {
  if (!existsSync(cachePath)) {
    return [];
  }
  const files = await promises.readdir(cachePath);
  let result: NextCacheFileData[] = (await pMap(files, async (file) => {
    // ignore tags-manifest file
    if (/manifest/.test(file)) return false;
    try {
      const fileContent = await promises.readFile(`${cachePath}/${file}`).catch((err) => {
        throw new Error(`Error reading file ${file}`, {
          cause: err,
        });
      });

      const fileStats = await promises.stat(`${cachePath}/${file}`).catch((err) => {
        throw new Error(`Error reading file ${file}`, {
          cause: err,
        });
      });

      const contentStr = fileContent.toString().trim();
      // console.log('filecontentbeforeparse', contentStr);

      let jsonData;
      try {
        // Try to clean the string if there are any BOM or special characters
        const cleanContent = contentStr.replace(/^\uFEFF/, '');
        jsonData = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error(`Error parsing JSON for file ${file}:`, parseError);
        // console.error('Content causing error:', contentStr);
        return false;
      }

      return nextCacheFileSchema.parse({
        ...jsonData,
        id: file,
        timestamp: new Date(fileStats.birthtime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues;
        console.error(`File ${file} do not match the schema`, issues);
      } else {
        console.error(`Error parsing ${file}:`, error);
      }
      return false;
    }
  })) as NextCacheFileData[];

  result = result.filter(Boolean) as NextCacheFileData[];

  return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};
