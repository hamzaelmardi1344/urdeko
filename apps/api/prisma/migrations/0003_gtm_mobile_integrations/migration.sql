-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('INSTAGRAM', 'WHATSAPP');

-- CreateTable
CREATE TABLE "ShopIntegration" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalAccountId" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "scopes" JSONB,
    "expiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopIntegration_shopId_idx" ON "ShopIntegration"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopIntegration_shopId_provider_key" ON "ShopIntegration"("shopId", "provider");

-- AddForeignKey
ALTER TABLE "ShopIntegration" ADD CONSTRAINT "ShopIntegration_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
