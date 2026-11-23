-- Session invalidation and assisted password recovery. No secret is stored here.
ALTER TABLE `User` ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `User` ADD COLUMN `passwordMustChange` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `User` ADD COLUMN `temporaryPasswordExpiresAt` DATETIME(3) NULL;

CREATE TABLE `PasswordAssistanceRequest` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `PasswordAssistanceRequest_identifier_idx`(`identifier`),
    INDEX `PasswordAssistanceRequest_createdAt_idx`(`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
