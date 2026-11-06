-- AlterTable
ALTER TABLE `CreditTransaction` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `CreditTransaction_idempotencyKey_key` ON `CreditTransaction`(`idempotencyKey`);

-- CreateTable
CREATE TABLE `CommercialOrder` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `kind` ENUM('CREDIT_PACK', 'SUBSCRIPTION') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `offerCode` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `amountXof` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `credits` INTEGER NOT NULL DEFAULT 0,
    `monthlyBoosts` INTEGER NOT NULL DEFAULT 0,
    `unlockCostCredits` INTEGER NULL,
    `cycleDays` INTEGER NULL,
    `benefits` JSON NOT NULL,
    `badge` VARCHAR(191) NULL,
    `paymentInstructions` TEXT NOT NULL,
    `decisionNote` TEXT NULL,
    `decidedById` VARCHAR(191) NULL,
    `decidedAt` DATETIME(3) NULL,
    `appliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommercialOrder_reference_key`(`reference`),
    INDEX `CommercialOrder_userId_idx`(`userId`),
    INDEX `CommercialOrder_status_idx`(`status`),
    INDEX `CommercialOrder_kind_idx`(`kind`),
    INDEX `CommercialOrder_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommercialOrderEvent` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `actorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommercialOrderEvent_orderId_idx`(`orderId`),
    INDEX `CommercialOrderEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CommercialOrder` ADD CONSTRAINT `CommercialOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommercialOrderEvent` ADD CONSTRAINT `CommercialOrderEvent_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `CommercialOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
