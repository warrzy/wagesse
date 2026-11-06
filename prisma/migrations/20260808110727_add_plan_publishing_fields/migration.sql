-- AlterTable
ALTER TABLE `SubscriptionPlan` ADD COLUMN `archivedAt` DATETIME(3) NULL,
    ADD COLUMN `badge` VARCHAR(191) NULL,
    ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isVisible` BOOLEAN NOT NULL DEFAULT true;
