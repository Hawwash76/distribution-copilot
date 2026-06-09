-- AddColumn: soft delete + discovery tracking
ALTER TABLE "products" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "lastDiscoveredAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
