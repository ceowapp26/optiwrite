/*
  Warnings:

  - You are about to drop the column `shopifyOrderId` on the `CreditPurchase` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "BillingEvent" DROP CONSTRAINT "BillingEvent_creditPurchaseId_fkey";

-- DropForeignKey
ALTER TABLE "BillingEvent" DROP CONSTRAINT "BillingEvent_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "BillingEvent" DROP CONSTRAINT "BillingEvent_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_subscriptionId_fkey";

-- DropIndex
DROP INDEX "CreditPurchase_shopifyOrderId_idx";

-- DropIndex
DROP INDEX "CreditPurchase_shopifyOrderId_key";

-- AlterTable
ALTER TABLE "CreditPurchase" DROP COLUMN "shopifyOrderId",
ADD COLUMN     "shopifyPurchaseId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "shopifySubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "AssociatedUserToSubscription" (
    "associatedUserId" BIGINT NOT NULL,
    "subscriptionId" TEXT NOT NULL,

    CONSTRAINT "AssociatedUserToSubscription_pkey" PRIMARY KEY ("associatedUserId","subscriptionId")
);

-- CreateTable
CREATE TABLE "AssociatedUserToCreditPurchase" (
    "associatedUserId" BIGINT NOT NULL,
    "purchaseId" TEXT NOT NULL,

    CONSTRAINT "AssociatedUserToCreditPurchase_pkey" PRIMARY KEY ("associatedUserId","purchaseId")
);

-- CreateIndex
CREATE INDEX "CreditPurchase_shopifyPurchaseId_idx" ON "CreditPurchase"("shopifyPurchaseId");

-- AddForeignKey
ALTER TABLE "AssociatedUserToSubscription" ADD CONSTRAINT "AssociatedUserToSubscription_associatedUserId_fkey" FOREIGN KEY ("associatedUserId") REFERENCES "AssociatedUser"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociatedUserToSubscription" ADD CONSTRAINT "AssociatedUserToSubscription_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociatedUserToCreditPurchase" ADD CONSTRAINT "AssociatedUserToCreditPurchase_associatedUserId_fkey" FOREIGN KEY ("associatedUserId") REFERENCES "AssociatedUser"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociatedUserToCreditPurchase" ADD CONSTRAINT "AssociatedUserToCreditPurchase_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "CreditPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_creditPurchaseId_fkey" FOREIGN KEY ("creditPurchaseId") REFERENCES "CreditPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
