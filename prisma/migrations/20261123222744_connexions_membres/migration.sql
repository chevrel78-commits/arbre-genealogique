-- CreateTable
CREATE TABLE `ConnexionMembre` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `membreId` INTEGER NOT NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ConnexionMembre_creeLe_idx`(`creeLe`),
    INDEX `ConnexionMembre_membreId_idx`(`membreId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConnexionMembre` ADD CONSTRAINT `ConnexionMembre_membreId_fkey` FOREIGN KEY (`membreId`) REFERENCES `Membre`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
