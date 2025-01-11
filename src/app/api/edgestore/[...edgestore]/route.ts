import { initEdgeStore } from "@edgestore/server";
import { createEdgeStoreNextHandler } from "@edgestore/server/adapters/next/app";

const es = initEdgeStore.create();

export const edgeStoreRouter = es.router({
  publicFiles: es
    .fileBucket({
      maxSize: 1024 * 1024 * 10, // 10MB
      accept: ['image/jpeg', 'image/png', 'image/jpg'],
    })
    .beforeUpload(({ ctx, input, fileInfo }) => {
      console.log('Before upload:', ctx, input, fileInfo);
      return true; 
    })
    .beforeDelete(({ ctx, fileInfo }) => {
      console.log('Before delete:', ctx, fileInfo);
      return true;
    }),
});

const handler = createEdgeStoreNextHandler({
  router: edgeStoreRouter,
});

export { handler as GET, handler as POST };

export type EdgeStoreRouter = typeof edgeStoreRouter;