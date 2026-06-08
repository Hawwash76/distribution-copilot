-- CreateTable
CREATE TABLE "product_profiles" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "painPoints" TEXT[],
    "personas" TEXT[],
    "keywords" TEXT[],
    "competitors" TEXT[],
    "useCases" TEXT[],
    "valueProps" TEXT[],
    "modelUsed" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_profiles_productId_key" ON "product_profiles"("productId");

-- AddForeignKey
ALTER TABLE "product_profiles" ADD CONSTRAINT "product_profiles_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
