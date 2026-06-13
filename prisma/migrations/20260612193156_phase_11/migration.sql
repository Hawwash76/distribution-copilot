-- CreateIndex
CREATE INDEX "opportunities_productId_status_idx" ON "opportunities"("productId", "status");

-- CreateIndex
CREATE INDEX "opportunities_productId_createdAt_idx" ON "opportunities"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "product_monitors_productId_idx" ON "product_monitors"("productId");

-- CreateIndex
CREATE INDEX "products_userId_isDeleted_idx" ON "products"("userId", "isDeleted");
