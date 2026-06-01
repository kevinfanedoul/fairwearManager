-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN     "appliedAmount" DECIMAL(12,2),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'MAD',
ADD COLUMN     "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1;

UPDATE "Payment"
SET "appliedAmount" = "amount"
WHERE "appliedAmount" IS NULL;

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "currency" TEXT NOT NULL,
    "rateToMad" DECIMAL(12,6) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("currency")
);

INSERT INTO "ExchangeRate" ("currency", "rateToMad", "updatedAt")
VALUES
    ('MAD', 1, CURRENT_TIMESTAMP),
    ('EUR', 10.9, CURRENT_TIMESTAMP),
    ('USD', 10.1, CURRENT_TIMESTAMP),
    ('GBP', 12.8, CURRENT_TIMESTAMP)
ON CONFLICT ("currency") DO NOTHING;
