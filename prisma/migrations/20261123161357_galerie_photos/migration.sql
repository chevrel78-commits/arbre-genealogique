-- CreateTable
CREATE TABLE `Photo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fichier` VARCHAR(36) NOT NULL,
    `largeur` INTEGER NOT NULL,
    `hauteur` INTEGER NOT NULL,
    `legende` VARCHAR(255) NULL,
    `jourPrise` TINYINT NULL,
    `moisPrise` TINYINT NULL,
    `anneePrise` SMALLINT NULL,
    `lieu` VARCHAR(150) NULL,
    `ajouteeParId` INTEGER NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Photo_fichier_key`(`fichier`),
    INDEX `Photo_ajouteeParId_idx`(`ajouteeParId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdentificationPhoto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `photoId` INTEGER NOT NULL,
    `personneId` INTEGER NOT NULL,
    `x` DOUBLE NULL,
    `y` DOUBLE NULL,
    `ajouteeParId` INTEGER NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IdentificationPhoto_personneId_idx`(`personneId`),
    INDEX `IdentificationPhoto_ajouteeParId_idx`(`ajouteeParId`),
    UNIQUE INDEX `IdentificationPhoto_photoId_personneId_key`(`photoId`, `personneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Photo` ADD CONSTRAINT `Photo_ajouteeParId_fkey` FOREIGN KEY (`ajouteeParId`) REFERENCES `Membre`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdentificationPhoto` ADD CONSTRAINT `IdentificationPhoto_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `Photo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdentificationPhoto` ADD CONSTRAINT `IdentificationPhoto_personneId_fkey` FOREIGN KEY (`personneId`) REFERENCES `Personne`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdentificationPhoto` ADD CONSTRAINT `IdentificationPhoto_ajouteeParId_fkey` FOREIGN KEY (`ajouteeParId`) REFERENCES `Membre`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
