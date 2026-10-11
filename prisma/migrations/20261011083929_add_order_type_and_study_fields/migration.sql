-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('PRODUCT', 'STUDY');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "type" "OrderType" NOT NULL DEFAULT 'PRODUCT';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "gradationSizes" INTEGER,
ADD COLUMN     "gradationTotal" DECIMAL(10,2),
ADD COLUMN     "gradationUnitPrice" DECIMAL(10,2),
ADD COLUMN     "patronage" DECIMAL(10,2),
ADD COLUMN     "prototype" DECIMAL(10,2);
