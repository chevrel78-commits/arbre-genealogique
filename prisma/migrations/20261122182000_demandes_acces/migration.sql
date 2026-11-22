-- CreateTable
CREATE TABLE `JetonEmail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jetonHash` CHAR(64) NOT NULL,
    `type` ENUM('MOT_DE_PASSE') NOT NULL,
    `membreId` INTEGER NOT NULL,
    `expireLe` DATETIME(3) NOT NULL,
    `utiliseLe` DATETIME(3) NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `JetonEmail_jetonHash_key`(`jetonHash`),
    INDEX `JetonEmail_membreId_idx`(`membreId`),
    INDEX `JetonEmail_expireLe_idx`(`expireLe`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `JetonEmail` ADD CONSTRAINT `JetonEmail_membreId_fkey` FOREIGN KEY (`membreId`) REFERENCES `Membre`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
