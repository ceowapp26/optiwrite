-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "appliedToAllPackages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "appliedToAllPlans" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "appliedToAllPackages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "appliedToAllPlans" BOOLEAN NOT NULL DEFAULT false;
