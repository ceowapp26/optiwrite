/*
  Warnings:

  - Added the required column `creditLimits` to the `AIFeature` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creditLimits` to the `CrawlFeature` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AIFeature" ADD COLUMN     "creditLimits" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "CrawlFeature" ADD COLUMN     "creditLimits" INTEGER NOT NULL;
