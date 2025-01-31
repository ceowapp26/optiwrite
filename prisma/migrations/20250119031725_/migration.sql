/*
  Warnings:

  - A unique constraint covering the columns `[contentId]` on the table `Content` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Content_contentId_key" ON "Content"("contentId");
