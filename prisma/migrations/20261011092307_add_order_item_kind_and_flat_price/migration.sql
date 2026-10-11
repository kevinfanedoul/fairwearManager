-- CreateEnum
CREATE TYPE "OrderItemKind" AS ENUM ('BREAKDOWN', 'FLAT');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "flatPrice" DECIMAL(10,2),
ADD COLUMN     "kind" "OrderItemKind" NOT NULL DEFAULT 'BREAKDOWN';
