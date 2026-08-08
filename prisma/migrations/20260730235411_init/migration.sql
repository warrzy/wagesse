-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `phoneVerified` DATETIME(3) NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `profilePhoto` VARCHAR(191) NULL,
    `role` ENUM('VISITOR', 'CLIENT', 'TRUCKER', 'OPERATOR', 'ADMIN') NOT NULL DEFAULT 'CLIENT',
    `status` ENUM('ACTIVE', 'BLOCKED', 'SUSPENDED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `lastLoginAt` DATETIME(3) NULL,
    `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorSecret` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_phone_idx`(`phone`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `resource` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Permission_name_key`(`name`),
    UNIQUE INDEX `Permission_resource_action_key`(`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `id` VARCHAR(191) NOT NULL,
    `role` ENUM('VISITOR', 'CLIENT', 'TRUCKER', 'OPERATOR', 'ADMIN') NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `gratedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RolePermission_role_permissionId_key`(`role`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `companyRegistration` VARCHAR(191) NULL,
    `companyType` ENUM('INDIVIDUAL', 'CONSTRUCTION_COMPANY', 'QUARRY', 'MINING_COMPANY', 'MATERIAL_TRADER', 'TRANSPORT_SOCIETY', 'OTHER') NOT NULL DEFAULT 'INDIVIDUAL',
    `taxNumber` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `provinceCode` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `sector` VARCHAR(191) NULL,
    `landmark` VARCHAR(191) NULL,
    `alternatePhone` VARCHAR(191) NULL,
    `preferredLanguage` VARCHAR(191) NOT NULL DEFAULT 'fr',
    `totalRequests` INTEGER NOT NULL DEFAULT 0,
    `totalMissions` INTEGER NOT NULL DEFAULT 0,
    `successRate` DOUBLE NOT NULL DEFAULT 100,
    `averageRating` DOUBLE NOT NULL DEFAULT 0,
    `verificationStatus` ENUM('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `CustomerProfile_userId_key`(`userId`),
    INDEX `CustomerProfile_userId_idx`(`userId`),
    INDEX `CustomerProfile_companyType_idx`(`companyType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TruckerProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `truckerType` ENUM('INDEPENDENT_DRIVER', 'TRUCK_OWNER', 'TRANSPORT_COMPANY') NOT NULL DEFAULT 'INDEPENDENT_DRIVER',
    `organizationId` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `provinceCode` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `sector` VARCHAR(191) NULL,
    `operatingLicense` VARCHAR(191) NULL,
    `licenseExpiry` DATETIME(3) NULL,
    `insurancePolicy` VARCHAR(191) NULL,
    `insuranceExpiry` DATETIME(3) NULL,
    `averageRating` DOUBLE NOT NULL DEFAULT 0,
    `totalRatings` INTEGER NOT NULL DEFAULT 0,
    `totalMissions` INTEGER NOT NULL DEFAULT 0,
    `acceptanceRate` DOUBLE NOT NULL DEFAULT 100,
    `cancellationRate` DOUBLE NOT NULL DEFAULT 0,
    `orangeMoneyNumber` VARCHAR(191) NULL,
    `mobileMoneyNumber` VARCHAR(191) NULL,
    `bankAccount` VARCHAR(191) NULL,
    `verificationStatus` ENUM('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `verificationBadges` JSON NOT NULL,
    `subscriptionPlanId` VARCHAR(191) NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `lastAvailabilityUpdate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `TruckerProfile_userId_key`(`userId`),
    INDEX `TruckerProfile_userId_idx`(`userId`),
    INDEX `TruckerProfile_organizationId_idx`(`organizationId`),
    INDEX `TruckerProfile_truckerType_idx`(`truckerType`),
    INDEX `TruckerProfile_verificationStatus_idx`(`verificationStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceArea` (
    `id` VARCHAR(191) NOT NULL,
    `truckerId` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `provinceCode` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `radiusKm` INTEGER NULL DEFAULT 50,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ServiceArea_city_idx`(`city`),
    UNIQUE INDEX `ServiceArea_truckerId_city_provinceCode_key`(`truckerId`, `city`, `provinceCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Organization` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `registrationNumber` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Organization_registrationNumber_key`(`registrationNumber`),
    INDEX `Organization_city_idx`(`city`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganizationMember` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrganizationMember_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `OrganizationMember_userId_organizationId_key`(`userId`, `organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `truckerId` VARCHAR(191) NOT NULL,
    `licensePlate` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `vehicleType` ENUM('DUMP_TRUCK_3_AXLES', 'DUMP_TRUCK_4_AXLES', 'DUMP_TRUCK_5_AXLES', 'TIPPER_TRUCK', 'FLATBED', 'CONTAINER_TRUCK', 'ARTICULATED_TRUCK', 'OTHER') NOT NULL,
    `axles` INTEGER NULL,
    `capacityTonnes` DOUBLE NOT NULL,
    `capacityM3` DOUBLE NULL,
    `benneType` VARCHAR(191) NULL,
    `condition` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NOT NULL DEFAULT 'GOOD',
    `isOperational` BOOLEAN NOT NULL DEFAULT true,
    `photos` JSON NOT NULL,
    `insuranceExpiry` DATETIME(3) NULL,
    `inspectionExpiry` DATETIME(3) NULL,
    `availability` JSON NULL,
    `driverId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Vehicle_licensePlate_key`(`licensePlate`),
    INDEX `Vehicle_truckerId_idx`(`truckerId`),
    INDEX `Vehicle_licensePlate_idx`(`licensePlate`),
    INDEX `Vehicle_vehicleType_idx`(`vehicleType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleDocument` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `expiryDate` DATETIME(3) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,

    INDEX `VehicleDocument_vehicleId_idx`(`vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Driver` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `licenseNumber` VARCHAR(191) NOT NULL,
    `licenseExpiry` DATETIME(3) NOT NULL,
    `licenseCategory` VARCHAR(191) NULL,
    `idCardUrl` VARCHAR(191) NULL,
    `idCardExpiry` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Driver_phone_key`(`phone`),
    UNIQUE INDEX `Driver_licenseNumber_key`(`licenseNumber`),
    INDEX `Driver_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `truckerId` VARCHAR(191) NULL,
    `documentType` ENUM('IDENTITY_CARD', 'PASSPORT', 'DRIVER_LICENSE', 'VEHICLE_REGISTRATION', 'INSURANCE_CERTIFICATE', 'INSPECTION_CERTIFICATE', 'BUSINESS_LICENSE', 'TAX_CERTIFICATE', 'COMPANY_REGISTRATION', 'BANK_STATEMENT', 'OTHER') NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `expiryDate` DATETIME(3) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verifiedBy` VARCHAR(191) NULL,
    `verificationNotes` VARCHAR(191) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,

    INDEX `Document_customerId_idx`(`customerId`),
    INDEX `Document_truckerId_idx`(`truckerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Material` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `density` DOUBLE NULL,
    `icon` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Material_name_key`(`name`),
    INDEX `Material_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TruckType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `minCapacity` DOUBLE NOT NULL,
    `maxCapacity` DOUBLE NOT NULL,
    `icon` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TruckType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransportRequest` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `requestType` ENUM('ONE_TIME', 'RECURRING', 'URGENT') NOT NULL DEFAULT 'ONE_TIME',
    `materialId` VARCHAR(191) NULL,
    `materialDescription` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` ENUM('TONNES', 'CUBIC_METERS', 'NUMBER_OF_TRIPS', 'FULL_TRUCK_LOAD') NOT NULL,
    `pickupCity` VARCHAR(191) NOT NULL,
    `pickupProvince` VARCHAR(191) NULL,
    `pickupDistrict` VARCHAR(191) NULL,
    `pickupSector` VARCHAR(191) NULL,
    `pickupLandmark` VARCHAR(191) NULL,
    `pickupLat` DOUBLE NULL,
    `pickupLng` DOUBLE NULL,
    `pickupAccessNotes` VARCHAR(191) NULL,
    `dropoffCity` VARCHAR(191) NOT NULL,
    `dropoffProvince` VARCHAR(191) NULL,
    `dropoffDistrict` VARCHAR(191) NULL,
    `dropoffSector` VARCHAR(191) NULL,
    `dropoffLandmark` VARCHAR(191) NULL,
    `dropoffLat` DOUBLE NULL,
    `dropoffLng` DOUBLE NULL,
    `requestedDate` DATETIME(3) NOT NULL,
    `urgency` ENUM('STANDARD', 'URGENT', 'VERY_URGENT') NOT NULL DEFAULT 'STANDARD',
    `truckTypePreference` VARCHAR(191) NULL,
    `minCapacity` DOUBLE NULL,
    `needsDriver` BOOLEAN NOT NULL DEFAULT false,
    `numberOfTrucks` INTEGER NOT NULL DEFAULT 1,
    `numberOfTrips` INTEGER NULL,
    `budgetEstimate` DOUBLE NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `photos` JSON NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_PAYMENT', 'PUBLISHED', 'MATCHED', 'IN_NEGOTIATION', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'DRAFT',
    `publishedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `TransportRequest_customerId_idx`(`customerId`),
    INDEX `TransportRequest_status_idx`(`status`),
    INDEX `TransportRequest_requestedDate_idx`(`requestedDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Match` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `truckerId` VARCHAR(191) NOT NULL,
    `matchScore` DOUBLE NOT NULL,
    `scoreBreakdown` JSON NULL,
    `status` ENUM('PROPOSED', 'INTERESTED', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED', 'MISSION_CREATED', 'ARCHIVED') NOT NULL DEFAULT 'PROPOSED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `proposedAt` DATETIME(3) NULL,

    INDEX `Match_requestId_idx`(`requestId`),
    INDEX `Match_truckerId_idx`(`truckerId`),
    UNIQUE INDEX `Match_requestId_truckerId_key`(`requestId`, `truckerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactUnlock` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `unlockedContacts` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ContactUnlock_paymentId_key`(`paymentId`),
    UNIQUE INDEX `ContactUnlock_requestId_paymentId_key`(`requestId`, `paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quote` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `truckerId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NULL,
    `totalPrice` DOUBLE NOT NULL,
    `pricePerTrip` DOUBLE NULL,
    `numberOfTrips` INTEGER NOT NULL DEFAULT 1,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `proposedDate` DATETIME(3) NOT NULL,
    `estimatedDuration` VARCHAR(191) NULL,
    `validUntil` DATETIME(3) NOT NULL,
    `comments` VARCHAR(191) NULL,
    `specialConditions` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTER_OFFER', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,

    INDEX `Quote_requestId_idx`(`requestId`),
    INDEX `Quote_truckerId_idx`(`truckerId`),
    INDEX `Quote_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mission` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `truckerId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `missionReference` VARCHAR(191) NOT NULL,
    `contractMaterial` VARCHAR(191) NULL,
    `contractQuantity` DOUBLE NULL,
    `contractUnit` VARCHAR(191) NULL,
    `contractPrice` DOUBLE NOT NULL,
    `contractCurrency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `scheduledDate` DATETIME(3) NOT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `pickupLocation` VARCHAR(191) NOT NULL,
    `dropoffLocation` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_PAYMENT', 'PAID', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'TRUCK_EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'LOADING_IN_PROGRESS', 'EN_ROUTE_DELIVERY', 'ARRIVED_DELIVERY', 'DELIVERED', 'PENDING_CONFIRMATION', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED') NOT NULL DEFAULT 'DRAFT',
    `paymentId` VARCHAR(191) NULL,
    `platformCommission` DOUBLE NULL,
    `platformCommissionRate` DOUBLE NULL DEFAULT 0.10,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Mission_missionReference_key`(`missionReference`),
    INDEX `Mission_requestId_idx`(`requestId`),
    INDEX `Mission_customerId_idx`(`customerId`),
    INDEX `Mission_truckerId_idx`(`truckerId`),
    INDEX `Mission_status_idx`(`status`),
    INDEX `Mission_scheduledDate_idx`(`scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MissionStatusHistory` (
    `id` VARCHAR(191) NOT NULL,
    `missionId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('DRAFT', 'PENDING_PAYMENT', 'PAID', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'TRUCK_EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'LOADING_IN_PROGRESS', 'EN_ROUTE_DELIVERY', 'ARRIVED_DELIVERY', 'DELIVERED', 'PENDING_CONFIRMATION', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED') NULL,
    `newStatus` ENUM('DRAFT', 'PENDING_PAYMENT', 'PAID', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'TRUCK_EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'LOADING_IN_PROGRESS', 'EN_ROUTE_DELIVERY', 'ARRIVED_DELIVERY', 'DELIVERED', 'PENDING_CONFIRMATION', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED') NOT NULL,
    `reason` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `changedBy` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MissionStatusHistory_missionId_idx`(`missionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryProof` (
    `id` VARCHAR(191) NOT NULL,
    `missionId` VARCHAR(191) NOT NULL,
    `proofType` VARCHAR(191) NOT NULL,
    `photoUrl` VARCHAR(191) NOT NULL,
    `gpsLat` DOUBLE NULL,
    `gpsLng` DOUBLE NULL,
    `otpCode` VARCHAR(191) NULL,
    `otpVerifiedAt` DATETIME(3) NULL,
    `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,
    `verifiedBy` VARCHAR(191) NULL,

    INDEX `DeliveryProof_missionId_idx`(`missionId`),
    UNIQUE INDEX `DeliveryProof_missionId_proofType_key`(`missionId`, `proofType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rating` (
    `id` VARCHAR(191) NOT NULL,
    `raterId` VARCHAR(191) NOT NULL,
    `missionId` VARCHAR(191) NULL,
    `truckerRatingMissionId` VARCHAR(191) NULL,
    `truckerId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `comment` VARCHAR(191) NULL,
    `ratedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Rating_missionId_key`(`missionId`),
    UNIQUE INDEX `Rating_truckerRatingMissionId_key`(`truckerRatingMissionId`),
    INDEX `Rating_raterId_idx`(`raterId`),
    INDEX `Rating_truckerId_idx`(`truckerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dispute` (
    `id` VARCHAR(191) NOT NULL,
    `missionId` VARCHAR(191) NOT NULL,
    `truckerId` VARCHAR(191) NULL,
    `filedBy` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `evidence` JSON NOT NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'APPEAL_FILED', 'APPEAL_RESOLVED') NOT NULL DEFAULT 'OPEN',
    `resolution` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Dispute_missionId_key`(`missionId`),
    INDEX `Dispute_missionId_idx`(`missionId`),
    INDEX `Dispute_truckerId_idx`(`truckerId`),
    INDEX `Dispute_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionPlan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tier` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `monthlyPrice` DOUBLE NOT NULL,
    `annualPrice` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `trialDays` INTEGER NOT NULL DEFAULT 0,
    `maxVehicles` INTEGER NOT NULL DEFAULT 1,
    `maxRequests` INTEGER NULL,
    `maxProposals` INTEGER NULL,
    `features` JSON NOT NULL,
    `platformCommissionRate` DOUBLE NOT NULL DEFAULT 0.10,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubscriptionPlan_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `truckerId` VARCHAR(191) NULL,
    `planId` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `autoRenewal` BOOLEAN NOT NULL DEFAULT true,
    `lastPaymentDate` DATETIME(3) NULL,
    `nextPaymentDate` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscription_truckerId_key`(`truckerId`),
    INDEX `Subscription_customerId_idx`(`customerId`),
    INDEX `Subscription_truckerId_idx`(`truckerId`),
    INDEX `Subscription_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionPayment` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `status` ENUM('INITIATED', 'PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'EXPIRED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED') NOT NULL DEFAULT 'INITIATED',
    `paymentMethod` VARCHAR(191) NOT NULL,
    `transactionRef` VARCHAR(191) NULL,
    `providerRef` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `failureReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SubscriptionPayment_paymentId_key`(`paymentId`),
    UNIQUE INDEX `SubscriptionPayment_transactionRef_key`(`transactionRef`),
    INDEX `SubscriptionPayment_subscriptionId_idx`(`subscriptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `payer` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `type` ENUM('CONTACT_UNLOCK', 'MISSION_PAYMENT', 'SUBSCRIPTION', 'PLATFORM_FEE', 'REFUND') NOT NULL,
    `description` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NOT NULL,
    `providerName` VARCHAR(191) NOT NULL,
    `providerReference` VARCHAR(191) NULL,
    `status` ENUM('INITIATED', 'PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'EXPIRED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED') NOT NULL DEFAULT 'INITIATED',
    `lastAttemptAt` DATETIME(3) NULL,
    `platformFee` DOUBLE NOT NULL DEFAULT 0,
    `providerFee` DOUBLE NOT NULL DEFAULT 0,
    `missionId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `initiatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,

    UNIQUE INDEX `Payment_reference_key`(`reference`),
    UNIQUE INDEX `Payment_providerReference_key`(`providerReference`),
    UNIQUE INDEX `Payment_missionId_key`(`missionId`),
    INDEX `Payment_payer_idx`(`payer`),
    INDEX `Payment_customerId_idx`(`customerId`),
    INDEX `Payment_status_idx`(`status`),
    INDEX `Payment_type_idx`(`type`),
    INDEX `Payment_confirmedAt_idx`(`confirmedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `attemptNumber` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `requestData` VARCHAR(191) NULL,
    `responseData` VARCHAR(191) NULL,
    `attemptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentAttempt_paymentId_idx`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `fromUser` VARCHAR(191) NOT NULL,
    `toUser` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `type` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `missionId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Transaction_fromUser_idx`(`fromUser`),
    INDEX `Transaction_toUser_idx`(`toUser`),
    INDEX `Transaction_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `account` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `entryType` VARCHAR(191) NOT NULL,
    `balanceAfter` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LedgerEntry_account_idx`(`account`),
    INDEX `LedgerEntry_transactionId_idx`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Commission` (
    `id` VARCHAR(191) NOT NULL,
    `missionId` VARCHAR(191) NULL,
    `truckerId` VARCHAR(191) NOT NULL,
    `commissionAmount` DOUBLE NOT NULL,
    `commissionRate` DOUBLE NOT NULL,
    `missionAmount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,

    INDEX `Commission_truckerId_idx`(`truckerId`),
    INDEX `Commission_missionId_idx`(`missionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payout` (
    `id` VARCHAR(191) NOT NULL,
    `truckerId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `paymentMethod` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `transactionId` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Payout_transactionId_key`(`transactionId`),
    INDEX `Payout_truckerId_idx`(`truckerId`),
    INDEX `Payout_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Refund` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `reason` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Refund_paymentId_idx`(`paymentId`),
    INDEX `Refund_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `invoiceDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `platformFee` DOUBLE NOT NULL,
    `tax` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    `items` JSON NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `paidAt` DATETIME(3) NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_invoiceNumber_key`(`invoiceNumber`),
    INDEX `Invoice_customerId_idx`(`customerId`),
    INDEX `Invoice_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentWebhook` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `signature` VARCHAR(191) NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `processedAt` DATETIME(3) NULL,
    `error` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentWebhook_provider_idx`(`provider`),
    INDEX `PaymentWebhook_processed_idx`(`processed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('ACCOUNT_CONFIRMATION', 'DOCUMENTS_RECEIVED', 'PROFILE_VALIDATED', 'PROFILE_REJECTED', 'NEW_REQUEST_AVAILABLE', 'NEW_QUOTE_RECEIVED', 'QUOTE_ACCEPTED', 'PAYMENT_CONFIRMED', 'MISSION_ACCEPTED', 'TRUCK_EN_ROUTE', 'DELIVERY_COMPLETED', 'PAYMENT_AVAILABLE', 'DOCUMENT_EXPIRING_SOON', 'SUBSCRIPTION_EXPIRING_SOON', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'SYSTEM_ALERT') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `actionUrl` VARCHAR(191) NULL,
    `actionLabel` VARCHAR(191) NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `deliveryChannels` JSON NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_type_idx`(`type`),
    INDEX `Notification_read_idx`(`read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `lastMessageAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `attachments` JSON NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Message_conversationId_idx`(`conversationId`),
    INDEX `Message_senderId_idx`(`senderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportTicket` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `description` VARCHAR(191) NOT NULL,
    `attachments` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `resolution` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SupportTicket_userId_idx`(`userId`),
    INDEX `SupportTicket_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `changes` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_resource_idx`(`resource`),
    INDEX `AuditLog_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlatformSetting_key_key`(`key`),
    INDEX `PlatformSetting_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ConversationToUser` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ConversationToUser_AB_unique`(`A`, `B`),
    INDEX `_ConversationToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerProfile` ADD CONSTRAINT `CustomerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TruckerProfile` ADD CONSTRAINT `TruckerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TruckerProfile` ADD CONSTRAINT `TruckerProfile_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TruckerProfile` ADD CONSTRAINT `TruckerProfile_subscriptionPlanId_fkey` FOREIGN KEY (`subscriptionPlanId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceArea` ADD CONSTRAINT `ServiceArea_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationMember` ADD CONSTRAINT `OrganizationMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationMember` ADD CONSTRAINT `OrganizationMember_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleDocument` ADD CONSTRAINT `VehicleDocument_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransportRequest` ADD CONSTRAINT `TransportRequest_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransportRequest` ADD CONSTRAINT `TransportRequest_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `TransportRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactUnlock` ADD CONSTRAINT `ContactUnlock_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `TransportRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactUnlock` ADD CONSTRAINT `ContactUnlock_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `TransportRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mission` ADD CONSTRAINT `Mission_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `TransportRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mission` ADD CONSTRAINT `Mission_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mission` ADD CONSTRAINT `Mission_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mission` ADD CONSTRAINT `Mission_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MissionStatusHistory` ADD CONSTRAINT `MissionStatusHistory_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `Mission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryProof` ADD CONSTRAINT `DeliveryProof_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `Mission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_raterId_fkey` FOREIGN KEY (`raterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `Mission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_truckerRatingMissionId_fkey` FOREIGN KEY (`truckerRatingMissionId`) REFERENCES `Mission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `Mission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `Mission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentAttempt` ADD CONSTRAINT `PaymentAttempt_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `Mission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Commission` ADD CONSTRAINT `Commission_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `Mission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Commission` ADD CONSTRAINT `Commission_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payout` ADD CONSTRAINT `Payout_truckerId_fkey` FOREIGN KEY (`truckerId`) REFERENCES `TruckerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ConversationToUser` ADD CONSTRAINT `_ConversationToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ConversationToUser` ADD CONSTRAINT `_ConversationToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
