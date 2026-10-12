-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_ownerId_fkey";

-- AlterTable
ALTER TABLE "Todo" DROP COLUMN "ownerId",
ADD COLUMN "assigneeId" TEXT;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
