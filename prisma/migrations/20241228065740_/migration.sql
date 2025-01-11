-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STANDARD', 'PRO', 'ULTIMATE');

-- CreateEnum
CREATE TYPE "Interval" AS ENUM ('EVERY_30_DAYS', 'ANNUAL');

-- CreateEnum
CREATE TYPE "Service" AS ENUM ('AI_API', 'CRAWL_API');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'FROZEN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PromotionUnit" AS ENUM ('PERCENTAGE', 'AMOUNT', 'CREDITS', 'DAYS', 'REQUESTS', 'TOKENS');

-- CreateEnum
CREATE TYPE "DiscountUnit" AS ENUM ('PERCENTAGE', 'AMOUNT', 'CREDITS', 'REQUESTS', 'TOKENS');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('SUBSCRIPTION', 'PAY_AS_YOU_GO', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "Package" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'FROZEN', 'EXPIRED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('PROMOTION', 'DISCOUNT', 'CREDIT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BillingEventStatus" AS ENUM ('PENDING', 'APPLIED', 'FAILED', 'REVERSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_TRIAL', 'USAGE_BOOST', 'CREDIT_BONUS', 'TIME_EXTENSION', 'TIER_UPGRADE', 'EARLY_ADAPTER');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'VOLUME', 'LOYALTY', 'SEASONAL', 'REFERRAL', 'EARLY_ADAPTER', 'BUNDLE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'BILLING', 'USAGE_ALERT', 'FEATURE_UPDATE', 'SECURITY', 'MAINTENANCE', 'PAYMENT', 'SUBSCRIPTION', 'API_LIMIT');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentCategory" AS ENUM ('BLOG', 'ARTICLE', 'PRDUCT');

-- CreateEnum
CREATE TYPE "ModelName" AS ENUM ('gpt_4', 'gpt_4_32k', 'gpt_4_1106_preview', 'gpt_4_0125_preview', 'gpt_4_turbo', 'gpt_4_turbo_2024_04_09', 'gpt_3_5_turbo', 'gpt_3_5_turbo_16k', 'gpt_3_5_turbo_1106', 'gpt_3_5_turbo_0125', 'gemini_1_0_pro', 'gemini_1_5_pro', 'gemini_1_5_flash', 'dall_e_3', 'gpt_4o', 'gpt_4o_2024_05_13', 'gpt_4o_mini', 'gpt_4o_mini_2024_07_18', 'claude_3_5_sonnet_20240620', 'claude_3_opus_20240229', 'claude_3_sonnet_20240229', 'claude_3_haiku_20240307');

-- CreateTable
CREATE TABLE "ShopToSession" (
    "shopId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "ShopToSession_pkey" PRIMARY KEY ("shopId","sessionId")
);

-- CreateTable
CREATE TABLE "AssociatedUserToUsage" (
    "associatedUserId" BIGINT NOT NULL,
    "usageId" TEXT NOT NULL,

    CONSTRAINT "AssociatedUserToUsage_pkey" PRIMARY KEY ("associatedUserId","usageId")
);

-- CreateTable
CREATE TABLE "ShopifySession" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineAccessInfo" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "expiresIn" INTEGER NOT NULL,
    "associatedUserScope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineAccessInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssociatedUser" (
    "id" TEXT NOT NULL,
    "onlineAccessInfoId" TEXT,
    "userId" BIGINT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accountOwner" BOOLEAN NOT NULL,
    "locale" TEXT NOT NULL,
    "collaborator" BOOLEAN NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "shopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssociatedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contentId" TEXT,
    "shopifyId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "input" JSONB,
    "output" JSONB,
    "metadata" JSONB,
    "tags" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "category" "ContentCategory",
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEditedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "shopifyPlanId" TEXT,
    "billingType" "BillingType" NOT NULL DEFAULT 'SUBSCRIPTION',
    "name" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "description" TEXT,
    "currency" TEXT,
    "pricePerCredit" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "creditAmount" INTEGER NOT NULL,
    "interval" "Interval" NOT NULL DEFAULT 'EVERY_30_DAYS',
    "trialDays" INTEGER DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cappedAmount" INTEGER,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "planId" TEXT,
    "packageId" TEXT,
    "aiFeatureId" TEXT NOT NULL,
    "crawlFeatureId" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlFeature" (
    "id" TEXT NOT NULL,
    "service" "Service" NOT NULL DEFAULT 'CRAWL_API',
    "requestLimits" INTEGER NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "CrawlFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIFeature" (
    "id" TEXT NOT NULL,
    "service" "Service" NOT NULL DEFAULT 'AI_API',
    "requestLimits" INTEGER NOT NULL,
    "tokenLimits" INTEGER,
    "maxTokens" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "RPM" INTEGER NOT NULL,
    "RPD" INTEGER NOT NULL,
    "TPM" INTEGER NOT NULL,
    "TPD" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "AIFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "usageId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "shopifyChargeId" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerCredit" DOUBLE PRECISION NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "creditAmount" INTEGER NOT NULL,
    "currency" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPurchase" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "creditPackageId" TEXT NOT NULL,
    "purchaseSnapshot" JSONB NOT NULL,
    "shopifyOrderId" TEXT,
    "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "usageId" TEXT NOT NULL,
    "paymentId" TEXT,

    CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "totalCredits" INTEGER,
    "totalCreditsUsed" INTEGER,
    "totalRemainingCredits" INTEGER,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceUsage" (
    "id" TEXT NOT NULL,
    "usageId" TEXT NOT NULL,
    "crawlUsageId" TEXT NOT NULL,
    "aiUsageId" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "ServiceUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlUsageDetails" (
    "id" TEXT NOT NULL,
    "service" "Service" NOT NULL DEFAULT 'CRAWL_API',
    "totalRequests" INTEGER,
    "totalRemainingRequests" INTEGER,
    "totalRequestsUsed" INTEGER,
    "totalCredits" INTEGER,
    "totalCreditsUsed" INTEGER,
    "totalRemainingCredits" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "CrawlUsageDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageDetails" (
    "id" TEXT NOT NULL,
    "service" "Service" NOT NULL DEFAULT 'AI_API',
    "modelName" "ModelName" NOT NULL,
    "inputTokensCount" INTEGER NOT NULL,
    "outputTokensCount" INTEGER NOT NULL,
    "requestsPerMinuteLimit" INTEGER,
    "requestsPerDayLimit" INTEGER,
    "remainingRequestsPerMinute" INTEGER,
    "remainingRequestsPerDay" INTEGER,
    "resetTimeForMinuteRequests" TIMESTAMP(3),
    "resetTimeForDayRequests" TIMESTAMP(3),
    "tokensConsumedPerMinute" INTEGER NOT NULL,
    "tokensConsumedPerDay" INTEGER,
    "totalRequests" INTEGER,
    "totalRemainingRequests" INTEGER,
    "totalRequestsUsed" INTEGER,
    "totalTokens" INTEGER,
    "totalRemainingTokens" INTEGER,
    "totalTokensUsed" INTEGER,
    "totalCredits" INTEGER,
    "totalCreditsUsed" INTEGER,
    "totalRemainingCredits" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTokenUsageUpdateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AIUsageDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "billingType" "BillingType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "adjustedAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "billingPeriodStart" TIMESTAMP(3),
    "billingPeriodEnd" TIMESTAMP(3),
    "shopifyTransactionId" TEXT,
    "refundId" TEXT,
    "refundReason" TEXT,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL,
    "name" "ModelName" NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "maxTokens" INTEGER,
    "RPM" INTEGER NOT NULL,
    "RPD" INTEGER NOT NULL,
    "TPM" INTEGER,
    "TPD" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "creditPurchaseId" TEXT,
    "type" "BillingEventType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "promotionId" TEXT,
    "discountId" TEXT,
    "status" "BillingEventStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAmount" DOUBLE PRECISION,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromotionType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" "PromotionUnit" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliedToAll" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" "DiscountUnit" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliedToAll" BOOLEAN NOT NULL DEFAULT false,
    "minimumAmount" DOUBLE PRECISION,
    "maximumAmount" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionToShop" (
    "promotionId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,

    CONSTRAINT "PromotionToShop_pkey" PRIMARY KEY ("promotionId","shopId")
);

-- CreateTable
CREATE TABLE "PromotionToPlan" (
    "promotionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "PromotionToPlan_pkey" PRIMARY KEY ("promotionId","planId")
);

-- CreateTable
CREATE TABLE "PromotionToPackage" (
    "promotionId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,

    CONSTRAINT "PromotionToPackage_pkey" PRIMARY KEY ("promotionId","packageId")
);

-- CreateTable
CREATE TABLE "DiscountToShop" (
    "discountId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,

    CONSTRAINT "DiscountToShop_pkey" PRIMARY KEY ("discountId","shopId")
);

-- CreateTable
CREATE TABLE "DiscountToPlan" (
    "discountId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "DiscountToPlan_pkey" PRIMARY KEY ("discountId","planId")
);

-- CreateTable
CREATE TABLE "DiscountToPackage" (
    "discountId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,

    CONSTRAINT "DiscountToPackage_pkey" PRIMARY KEY ("discountId","packageId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "systemAnnouncement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "percentage" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemMetrics" (
    "id" TEXT NOT NULL,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "totalShops" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apiUsage" INTEGER NOT NULL DEFAULT 0,
    "averageResponse" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookQueue" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopToSession_sessionId_key" ON "ShopToSession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineAccessInfo_sessionId_key" ON "OnlineAccessInfo"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssociatedUser_onlineAccessInfoId_key" ON "AssociatedUser"("onlineAccessInfoId");

-- CreateIndex
CREATE UNIQUE INDEX "AssociatedUser_userId_key" ON "AssociatedUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_name_key" ON "Shop"("name");

-- CreateIndex
CREATE INDEX "Content_shopId_idx" ON "Content"("shopId");

-- CreateIndex
CREATE INDEX "Content_status_idx" ON "Content"("status");

-- CreateIndex
CREATE INDEX "Content_category_idx" ON "Content"("category");

-- CreateIndex
CREATE INDEX "Content_createdAt_idx" ON "Content"("createdAt");

-- CreateIndex
CREATE INDEX "Plan_shopifyPlanId_idx" ON "Plan"("shopifyPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_name_key" ON "Feature"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_planId_key" ON "Feature"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_packageId_key" ON "Feature"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_aiFeatureId_key" ON "Feature"("aiFeatureId");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_crawlFeatureId_key" ON "Feature"("crawlFeatureId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_usageId_key" ON "Subscription"("usageId");

-- CreateIndex
CREATE INDEX "Subscription_shopId_status_idx" ON "Subscription"("shopId", "status");

-- CreateIndex
CREATE INDEX "Subscription_shopifyChargeId_idx" ON "Subscription"("shopifyChargeId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPackage_name_key" ON "CreditPackage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_shopifyOrderId_key" ON "CreditPurchase"("shopifyOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_usageId_key" ON "CreditPurchase"("usageId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_paymentId_key" ON "CreditPurchase"("paymentId");

-- CreateIndex
CREATE INDEX "CreditPurchase_shopId_status_idx" ON "CreditPurchase"("shopId", "status");

-- CreateIndex
CREATE INDEX "CreditPurchase_shopifyOrderId_idx" ON "CreditPurchase"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "Usage_shopId_idx" ON "Usage"("shopId");

-- CreateIndex
CREATE INDEX "Usage_createdAt_idx" ON "Usage"("createdAt");

-- CreateIndex
CREATE INDEX "Usage_updatedAt_idx" ON "Usage"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceUsage_usageId_key" ON "ServiceUsage"("usageId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceUsage_crawlUsageId_key" ON "ServiceUsage"("crawlUsageId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceUsage_aiUsageId_key" ON "ServiceUsage"("aiUsageId");

-- CreateIndex
CREATE INDEX "ServiceUsage_usageId_idx" ON "ServiceUsage"("usageId");

-- CreateIndex
CREATE INDEX "CrawlUsageDetails_updatedAt_idx" ON "CrawlUsageDetails"("updatedAt");

-- CreateIndex
CREATE INDEX "AIUsageDetails_lastTokenUsageUpdateTime_idx" ON "AIUsageDetails"("lastTokenUsageUpdateTime");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_shopifyTransactionId_key" ON "Payment"("shopifyTransactionId");

-- CreateIndex
CREATE INDEX "Payment_shopId_status_idx" ON "Payment"("shopId", "status");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "Payment_shopifyTransactionId_idx" ON "Payment"("shopifyTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_name_key" ON "AIModel"("name");

-- CreateIndex
CREATE INDEX "BillingEvent_subscriptionId_idx" ON "BillingEvent"("subscriptionId");

-- CreateIndex
CREATE INDEX "BillingEvent_creditPurchaseId_idx" ON "BillingEvent"("creditPurchaseId");

-- CreateIndex
CREATE INDEX "BillingEvent_status_idx" ON "BillingEvent"("status");

-- CreateIndex
CREATE INDEX "BillingEvent_startDate_endDate_idx" ON "BillingEvent"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "Promotion"("isActive");

-- CreateIndex
CREATE INDEX "Promotion_validFrom_validUntil_idx" ON "Promotion"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "Discount_isActive_idx" ON "Discount"("isActive");

-- CreateIndex
CREATE INDEX "Discount_validFrom_validUntil_idx" ON "Discount"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "PromotionToShop_shopId_idx" ON "PromotionToShop"("shopId");

-- CreateIndex
CREATE INDEX "PromotionToPlan_planId_idx" ON "PromotionToPlan"("planId");

-- CreateIndex
CREATE INDEX "PromotionToPackage_packageId_idx" ON "PromotionToPackage"("packageId");

-- CreateIndex
CREATE INDEX "DiscountToShop_shopId_idx" ON "DiscountToShop"("shopId");

-- CreateIndex
CREATE INDEX "DiscountToPlan_planId_idx" ON "DiscountToPlan"("planId");

-- CreateIndex
CREATE INDEX "DiscountToPackage_packageId_idx" ON "DiscountToPackage"("packageId");

-- CreateIndex
CREATE INDEX "Notification_shopId_isRead_idx" ON "Notification"("shopId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SystemMetrics_date_key" ON "SystemMetrics"("date");

-- CreateIndex
CREATE INDEX "WebhookQueue_status_attempts_idx" ON "WebhookQueue"("status", "attempts");

-- CreateIndex
CREATE INDEX "WebhookQueue_shop_idx" ON "WebhookQueue"("shop");

-- AddForeignKey
ALTER TABLE "ShopToSession" ADD CONSTRAINT "ShopToSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ShopifySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopToSession" ADD CONSTRAINT "ShopToSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociatedUserToUsage" ADD CONSTRAINT "AssociatedUserToUsage_associatedUserId_fkey" FOREIGN KEY ("associatedUserId") REFERENCES "AssociatedUser"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociatedUserToUsage" ADD CONSTRAINT "AssociatedUserToUsage_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "Usage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineAccessInfo" ADD CONSTRAINT "OnlineAccessInfo_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ShopifySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociatedUser" ADD CONSTRAINT "AssociatedUser_onlineAccessInfoId_fkey" FOREIGN KEY ("onlineAccessInfoId") REFERENCES "OnlineAccessInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociatedUser" ADD CONSTRAINT "AssociatedUser_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_aiFeatureId_fkey" FOREIGN KEY ("aiFeatureId") REFERENCES "AIFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_crawlFeatureId_fkey" FOREIGN KEY ("crawlFeatureId") REFERENCES "CrawlFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CreditPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "Usage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_creditPackageId_fkey" FOREIGN KEY ("creditPackageId") REFERENCES "CreditPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "Usage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceUsage" ADD CONSTRAINT "ServiceUsage_aiUsageId_fkey" FOREIGN KEY ("aiUsageId") REFERENCES "AIUsageDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceUsage" ADD CONSTRAINT "ServiceUsage_crawlUsageId_fkey" FOREIGN KEY ("crawlUsageId") REFERENCES "CrawlUsageDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceUsage" ADD CONSTRAINT "ServiceUsage_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "Usage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_creditPurchaseId_fkey" FOREIGN KEY ("creditPurchaseId") REFERENCES "CreditPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionToShop" ADD CONSTRAINT "PromotionToShop_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionToShop" ADD CONSTRAINT "PromotionToShop_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionToPlan" ADD CONSTRAINT "PromotionToPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionToPlan" ADD CONSTRAINT "PromotionToPlan_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionToPackage" ADD CONSTRAINT "PromotionToPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CreditPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionToPackage" ADD CONSTRAINT "PromotionToPackage_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountToShop" ADD CONSTRAINT "DiscountToShop_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountToShop" ADD CONSTRAINT "DiscountToShop_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountToPlan" ADD CONSTRAINT "DiscountToPlan_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountToPlan" ADD CONSTRAINT "DiscountToPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountToPackage" ADD CONSTRAINT "DiscountToPackage_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountToPackage" ADD CONSTRAINT "DiscountToPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CreditPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
