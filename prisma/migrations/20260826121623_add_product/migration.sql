-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "regularPrice" DECIMAL(12,2) NOT NULL,
    "discountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "finalPrice" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "featuredFlag" BOOLEAN NOT NULL DEFAULT false,
    "bestSellerRank" INTEGER,
    "status" "CatalogStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_sku_key" ON "product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- TASK-013 business integrity constraints (PRD 31 / 55)
ALTER TABLE "product" ADD CONSTRAINT "product_stock_nonnegative" CHECK ("stock" >= 0);
ALTER TABLE "product" ADD CONSTRAINT "product_discount_range" CHECK ("discountEnabled" = false OR ("discountPercent" > 0 AND "discountPercent" < 100));
ALTER TABLE "product" ADD CONSTRAINT "product_final_price_positive" CHECK ("finalPrice" > 0);