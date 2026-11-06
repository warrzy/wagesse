-- AlterTable
ALTER TABLE `Quote` ADD COLUMN `vehicleId` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'COUNTER_OFFER', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `TransportRequest` ADD COLUMN `notes` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Quote_vehicleId_idx` ON `Quote`(`vehicleId`);

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
