-- CreateTable
CREATE TABLE `Membre` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prenom` VARCHAR(100) NOT NULL,
    `nom` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `motDePasseHash` VARCHAR(255) NOT NULL,
    `statut` ENUM('EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'DESACTIVE') NOT NULL DEFAULT 'EN_ATTENTE',
    `messageDemande` VARCHAR(1000) NULL,
    `admin` BOOLEAN NOT NULL DEFAULT false,
    `superAdmin` BOOLEAN NOT NULL DEFAULT false,
    `valideParId` INTEGER NULL,
    `valideLe` DATETIME(3) NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modifieLe` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Membre_email_key`(`email`),
    INDEX `Membre_statut_idx`(`statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SessionMembre` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jetonHash` CHAR(64) NOT NULL,
    `membreId` INTEGER NOT NULL,
    `expireLe` DATETIME(3) NOT NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SessionMembre_jetonHash_key`(`jetonHash`),
    INDEX `SessionMembre_membreId_idx`(`membreId`),
    INDEX `SessionMembre_expireLe_idx`(`expireLe`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Membre` ADD CONSTRAINT `Membre_valideParId_fkey` FOREIGN KEY (`valideParId`) REFERENCES `Membre`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SessionMembre` ADD CONSTRAINT `SessionMembre_membreId_fkey` FOREIGN KEY (`membreId`) REFERENCES `Membre`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

