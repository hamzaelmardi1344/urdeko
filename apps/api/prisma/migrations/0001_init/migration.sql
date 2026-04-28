-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'HANDED_OVER', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'CARD', 'WALLET');

-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('CREATED', 'CONFIRMED', 'PREPARED', 'HANDED_OVER', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED', 'REMINDER_SENT', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "DeliveryProvider" AS ENUM ('AMANA', 'SPEEDAF', 'SENDIT', 'MANUAL');

-- CreateEnum
CREATE TYPE "WhatsappTemplateType" AS ENUM ('ORDER_CONFIRMATION', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'CART_ABANDONED', 'REVIEW_REQUEST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneE164" TEXT,
    "fullName" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "whatsappNumber" TEXT NOT NULL,
    "instagramHandle" TEXT,
    "city" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "planSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthlyOrderQuota" INTEGER NOT NULL DEFAULT 20,
    "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionDarija" TEXT,
    "priceMAD" INTEGER NOT NULL,
    "comparePriceMAD" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "unlimited" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceInstagramPostId" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "priceMAD" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "notes" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpentMAD" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "subtotalMAD" INTEGER NOT NULL,
    "deliveryMAD" INTEGER NOT NULL DEFAULT 0,
    "discountMAD" INTEGER NOT NULL DEFAULT 0,
    "totalMAD" INTEGER NOT NULL,
    "abandonedAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "imageUrlSnapshot" TEXT,
    "unitPriceMAD" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalMAD" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderEventType" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "DeliveryProvider" NOT NULL,
    "externalId" TEXT,
    "trackingUrl" TEXT,
    "pickupAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cashCollectedMAD" INTEGER,
    "cashRemittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "rawPayload" JSONB,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopDeliveryConfig" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "provider" "DeliveryProvider" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "apiKeyEnc" TEXT NOT NULL,
    "defaultPickupCity" TEXT,

    CONSTRAINT "ShopDeliveryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappTemplate" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "type" "WhatsappTemplateType" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WhatsappTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "paddleSubId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" TEXT NOT NULL,
    "renewsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "orders" INTEGER NOT NULL,
    "revenue" INTEGER NOT NULL,
    "newCustomers" INTEGER NOT NULL,
    "topProductId" TEXT,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_ownerId_key" ON "Shop"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- CreateIndex
CREATE INDEX "Shop_slug_idx" ON "Shop"("slug");

-- CreateIndex
CREATE INDEX "Shop_ownerId_idx" ON "Shop"("ownerId");

-- CreateIndex
CREATE INDEX "Product_shopId_status_idx" ON "Product"("shopId", "status");

-- CreateIndex
CREATE INDEX "Customer_shopId_idx" ON "Customer"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_shopId_phoneE164_key" ON "Customer"("shopId", "phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE INDEX "Order_shopId_status_idx" ON "Order"("shopId", "status");

-- CreateIndex
CREATE INDEX "Order_shopId_createdAt_idx" ON "Order"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_orderId_key" ON "Delivery"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopDeliveryConfig_shopId_provider_key" ON "ShopDeliveryConfig"("shopId", "provider");

-- CreateIndex
CREATE INDEX "WhatsappTemplate_shopId_type_idx" ON "WhatsappTemplate"("shopId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shopId_key" ON "Subscription"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_paddleSubId_key" ON "Subscription"("paddleSubId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_shopId_date_key" ON "AnalyticsSnapshot"("shopId", "date");

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopDeliveryConfig" ADD CONSTRAINT "ShopDeliveryConfig_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappTemplate" ADD CONSTRAINT "WhatsappTemplate_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

