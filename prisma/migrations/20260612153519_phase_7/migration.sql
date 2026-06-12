-- CreateTable
CREATE TABLE "product_monitors" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" "discussion_source" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_monitors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_monitors_productId_source_key" ON "product_monitors"("productId", "source");

-- AddForeignKey
ALTER TABLE "product_monitors" ADD CONSTRAINT "product_monitors_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
