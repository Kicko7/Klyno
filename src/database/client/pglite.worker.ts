import { worker } from '@electric-sql/pglite/worker';

import { InitMeta } from './type';

worker({
  async init(options) {
    const { wasmmodule, fsbundle, vectorbundlepath, dbname } = options.meta as InitMeta;
    const { PGlite } = await import('@electric-sql/pglite');

    return new PGlite({
      dataDir: `idb://${dbname}`,
      extensions: {
        vector: {
          name: 'pgvector',
          setup: async (pglite, options) => {
            return { bundlePath: new URL(vectorbundlepath), options };
          },
        },
      },
      fsBundle: fsbundle,
      relaxedDurability: true,
      wasmModule: wasmmodule,
    });
  },
});
