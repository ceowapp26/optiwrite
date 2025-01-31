/*
  Warnings:

  - The values [PRDUCT] on the enum `ContentCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContentCategory_new" AS ENUM ('BLOG', 'ARTICLE', 'PRODUCT');
ALTER TABLE "Content" ALTER COLUMN "category" TYPE "ContentCategory_new" USING ("category"::text::"ContentCategory_new");
ALTER TYPE "ContentCategory" RENAME TO "ContentCategory_old";
ALTER TYPE "ContentCategory_new" RENAME TO "ContentCategory";
DROP TYPE "ContentCategory_old";
COMMIT;
