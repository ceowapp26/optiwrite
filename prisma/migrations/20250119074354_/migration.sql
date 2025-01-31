/*
  Warnings:

  - You are about to drop the column `shopifyChargeId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `totalCredits` on the `Usage` table. All the data in the column will be lost.
  - You are about to drop the column `totalCreditsUsed` on the `Usage` table. All the data in the column will be lost.
  - You are about to drop the column `totalRemainingCredits` on the `Usage` table. All the data in the column will be lost.
  - You are about to drop the column `shopId` on the `WebhookLog` table. All the data in the column will be lost.
  - You are about to drop the column `processedAt` on the `WebhookQueue` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `WebhookQueue` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[shopifyPurchaseId]` on the table `CreditPurchase` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shopifySubscriptionId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Made the column `shopifyPurchaseId` on table `CreditPurchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `shopifySubscriptionId` on table `Subscription` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `shopName` to the `WebhookLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopName` to the `WebhookQueue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `WebhookQueue` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `WebhookQueue` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "WebhookQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'FAILED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'USAGE_OVER_LIMIT';
ALTER TYPE "NotificationType" ADD VALUE 'USAGE_APPROACHING_LIMIT';
ALTER TYPE "NotificationType" ADD VALUE 'TRIAL_ENDING';
ALTER TYPE "NotificationType" ADD VALUE 'TRIAL_ENDED';
ALTER TYPE "NotificationType" ADD VALUE 'PACKAGE_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_EXPIRED';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'SCHEDULED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'DECLINED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIAL';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'INCOMPLETE';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'INCOMPLETE_EXPIRED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'RENEWING';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TERMINATED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'GRACE_PERIOD';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'ON_HOLD';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'FAILED_PAYMENT';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PRORATE_CANCELED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIAL_ENDED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIAL_ENDING';

-- DropForeignKey
ALTER TABLE "AssociatedUser" DROP CONSTRAINT "AssociatedUser_shopId_fkey";

-- DropForeignKey
ALTER TABLE "CreditPurchase" DROP CONSTRAINT "CreditPurchase_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_shopId_fkey";

-- DropIndex
DROP INDEX "Payment_shopifyTransactionId_key";

-- DropIndex
DROP INDEX "Subscription_shopifyChargeId_idx";

-- DropIndex
DROP INDEX "WebhookQueue_shop_idx";

-- DropIndex
DROP INDEX "WebhookQueue_status_attempts_idx";

-- AlterTable
ALTER TABLE "AIFeature" ADD COLUMN     "conversionRate" INTEGER,
ALTER COLUMN "creditLimits" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CrawlFeature" ADD COLUMN     "conversionRate" INTEGER,
ALTER COLUMN "creditLimits" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CreditPurchase" ADD COLUMN     "expiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "shopifyPurchaseId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "shopifyChargeId",
ALTER COLUMN "shopifySubscriptionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Usage" DROP COLUMN "totalCredits",
DROP COLUMN "totalCreditsUsed",
DROP COLUMN "totalRemainingCredits";

-- AlterTable
ALTER TABLE "WebhookLog" DROP COLUMN "shopId",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "shopName" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "WebhookQueue" DROP COLUMN "processedAt",
DROP COLUMN "shop",
ADD COLUMN     "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastAttempt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "shopName" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "WebhookQueueStatus" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_shopifyPurchaseId_key" ON "CreditPurchase"("shopifyPurchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shopifySubscriptionId_key" ON "Subscription"("shopifySubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_shopifySubscriptionId_idx" ON "Subscription"("shopifySubscriptionId");

-- CreateIndex
CREATE INDEX "WebhookLog_shopName_idx" ON "WebhookLog"("shopName");

-- CreateIndex
CREATE INDEX "WebhookQueue_shopName_status_idx" ON "WebhookQueue"("shopName", "status");

-- CreateIndex
CREATE INDEX "WebhookQueue_topic_status_attempts_idx" ON "WebhookQueue"("topic", "status", "attempts");

-- AddForeignKey
ALTER TABLE "AssociatedUser" ADD CONSTRAINT "AssociatedUser_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_shopName_fkey" FOREIGN KEY ("shopName") REFERENCES "Shop"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookQueue" ADD CONSTRAINT "WebhookQueue_shopName_fkey" FOREIGN KEY ("shopName") REFERENCES "Shop"("name") ON DELETE CASCADE ON UPDATE CASCADE;
