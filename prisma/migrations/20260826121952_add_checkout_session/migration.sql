-- CreateEnum
CREATE TYPE "CheckoutSessionStatus" AS ENUM ('active', 'abandoned', 'converted', 'discarded');

-- CreateTable
CREATE TABLE "checkout_session" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "CheckoutSessionStatus" NOT NULL DEFAULT 'active',
    "name" TEXT,
    "phone" TEXT,
    "districtArea" TEXT,
    "address" TEXT,
    "note" TEXT,
    "deliveryMethod" TEXT,
    "paymentMethod" TEXT,
    "userAgent" TEXT,
    "abandonedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "convertedOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_session_item" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "checkout_session_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checkout_session_sessionId_key" ON "checkout_session"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_session_convertedOrderId_key" ON "checkout_session"("convertedOrderId");

-- CreateIndex
CREATE INDEX "checkout_session_phone_idx" ON "checkout_session"("phone");

-- CreateIndex
CREATE INDEX "checkout_session_status_updatedAt_idx" ON "checkout_session"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "checkout_session_item_sessionId_idx" ON "checkout_session_item"("sessionId");

-- AddForeignKey
ALTER TABLE "checkout_session" ADD CONSTRAINT "checkout_session_convertedOrderId_fkey" FOREIGN KEY ("convertedOrderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_session_item" ADD CONSTRAINT "checkout_session_item_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "checkout_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_session_item" ADD CONSTRAINT "checkout_session_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
