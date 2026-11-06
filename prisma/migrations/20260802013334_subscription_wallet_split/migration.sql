/*
  Warnings:

  - You are about to drop the column `paymentId` on the `ContactUnlock` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[requestId,unlockedByUserId]` on the table `ContactUnlock` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `SubscriptionPlan` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `unlockedByUserId` to the `ContactUnlock` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ContactUnlock` DROP FOREIGN KEY `ContactUnlock_paymentId_fkey`;

-- DropForeignKey
ALTER TABLE `ContactUnlock` DROP FOREIGN KEY `ContactUnlock_requestId_fkey`;

-- DropIndex
DROP INDEX `ContactUnlock_paymentId_key` ON `ContactUnlock`;

-- DropIndex
DROP INDEX `ContactUnlock_requestId_paymentId_key` ON `ContactUnlock`;

-- DropIndex
DROP INDEX `SubscriptionPlan_name_key` ON `SubscriptionPlan`;

-- AlterTable (safe backfill): add unlockedByUserId as NULL first
ALTER TABLE `ContactUnlock` DROP COLUMN `paymentId`,
    ADD COLUMN `unlockedByUserId` VARCHAR(191) NULL;

-- Backfill existing rows (customer who owns the request becomes unlocker)
UPDATE `ContactUnlock` cu
INNER JOIN `TransportRequest` tr ON tr.`id` = cu.`requestId`
INNER JOIN `CustomerProfile` cp ON cp.`id` = tr.`customerId`
SET cu.`unlockedByUserId` = cp.`userId`
WHERE cu.`unlockedByUserId` IS NULL;

-- Now enforce NOT NULL
ALTER TABLE `ContactUnlock` MODIFY `unlockedByUserId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Payment` MODIFY `type` ENUM('CONTACT_UNLOCK', 'CREDIT_PURCHASE', 'MISSION_PAYMENT', 'SUBSCRIPTION', 'PLATFORM_FEE', 'REFUND') NOT NULL;

-- AlterTable
ALTER TABLE `Subscription` MODIFY `status` ENUM('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'PAST_DUE') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `SubscriptionPlan` ADD COLUMN `benefits` JSON NOT NULL,
    ADD COLUMN `code` VARCHAR(191) NULL,
    ADD COLUMN `cycleDays` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `monthlyBoosts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `monthlyCredits` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `unlockCostCredits` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `CreditWallet` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,
    `purchasedBalance` INTEGER NOT NULL DEFAULT 0,
    `subscriptionBalance` INTEGER NOT NULL DEFAULT 0,
    `subscriptionBalanceExpiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CreditWallet_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `type` ENUM('PURCHASE', 'UNLOCK_CONTACT', 'SUBSCRIPTION_MONTHLY_TOPUP', 'ADMIN_ADJUSTMENT', 'PROMO') NOT NULL,
    `amount` INTEGER NOT NULL,
    `balanceAfter` INTEGER NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CreditTransaction_walletId_idx`(`walletId`),
    INDEX `CreditTransaction_type_idx`(`type`),
    INDEX `CreditTransaction_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditPack` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `priceXof` INTEGER NOT NULL,
    `credits` INTEGER NOT NULL,
    `badge` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CreditPack_code_key`(`code`),
    INDEX `CreditPack_isActive_idx`(`isActive`),
    INDEX `CreditPack_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `ContactUnlock_requestId_unlockedByUserId_key` ON `ContactUnlock`(`requestId`, `unlockedByUserId`);

-- CreateIndex
CREATE UNIQUE INDEX `SubscriptionPlan_code_key` ON `SubscriptionPlan`(`code`);

-- AddForeignKey
ALTER TABLE `ContactUnlock` ADD CONSTRAINT `ContactUnlock_unlockedByUserId_fkey` FOREIGN KEY (`unlockedByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure requestId FK still exists (it might already be present; if it was dropped previously, re-add it)
ALTER TABLE `ContactUnlock` ADD CONSTRAINT `ContactUnlock_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `TransportRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditWallet` ADD CONSTRAINT `CreditWallet_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditTransaction` ADD CONSTRAINT `CreditTransaction_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `CreditWallet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
