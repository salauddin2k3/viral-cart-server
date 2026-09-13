-- AlterTable
ALTER TABLE "product" ADD COLUMN     "nameSearch" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "product_nameSearch_idx" ON "product"("nameSearch");
