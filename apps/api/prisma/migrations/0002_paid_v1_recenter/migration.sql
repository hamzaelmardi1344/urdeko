-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('PUBLIC_LINK', 'INSTAGRAM_DM', 'WHATSAPP', 'MANUAL');

-- CreateEnum
CREATE TYPE "CodPaymentStatus" AS ENUM ('PENDING', 'COLLECTED', 'REMITTED', 'RETURNED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('NONE', 'SCHEDULED', 'SENT', 'FAILED', 'DISABLED');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'PUBLIC_LINK',
ADD COLUMN "codPaymentStatus" "CodPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reminderStatus" "ReminderStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastReminderAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Delivery"
ADD COLUMN "courierName" TEXT,
ADD COLUMN "courierPhoneE164" TEXT,
ADD COLUMN "courierNotes" TEXT;

-- CreateIndex
CREATE INDEX "Order_shopId_source_idx" ON "Order"("shopId", "source");

-- CreateIndex
CREATE INDEX "Order_shopId_codPaymentStatus_idx" ON "Order"("shopId", "codPaymentStatus");
