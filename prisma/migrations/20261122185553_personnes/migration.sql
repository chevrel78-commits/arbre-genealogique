-- CreateTable
CREATE TABLE `Personne` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `civilite` ENUM('M', 'MME', 'MLLE') NOT NULL,
    `prenom` VARCHAR(100) NOT NULL,
    `nom` VARCHAR(100) NOT NULL,
    `nomJeuneFille` VARCHAR(100) NULL,
    `anneeNaissance` SMALLINT NULL,
    `photo` VARCHAR(255) NULL,
    `familleOrigineId` INTEGER NULL,
    `creeParId` INTEGER NULL,
    `modifieParId` INTEGER NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modifieLe` DATETIME(3) NOT NULL,

    INDEX `Personne_nom_prenom_idx`(`nom`, `prenom`),
    INDEX `Personne_familleOrigineId_idx`(`familleOrigineId`),
    INDEX `Personne_creeParId_idx`(`creeParId`),
    INDEX `Personne_modifieParId_idx`(`modifieParId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Famille` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parent1Id` INTEGER NULL,
    `parent2Id` INTEGER NULL,
    `marie` BOOLEAN NOT NULL DEFAULT true,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modifieLe` DATETIME(3) NOT NULL,

    INDEX `Famille_parent1Id_idx`(`parent1Id`),
    INDEX `Famille_parent2Id_idx`(`parent2Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Personne` ADD CONSTRAINT `Personne_familleOrigineId_fkey` FOREIGN KEY (`familleOrigineId`) REFERENCES `Famille`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Personne` ADD CONSTRAINT `Personne_creeParId_fkey` FOREIGN KEY (`creeParId`) REFERENCES `Membre`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Personne` ADD CONSTRAINT `Personne_modifieParId_fkey` FOREIGN KEY (`modifieParId`) REFERENCES `Membre`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Famille` ADD CONSTRAINT `Famille_parent1Id_fkey` FOREIGN KEY (`parent1Id`) REFERENCES `Personne`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Famille` ADD CONSTRAINT `Famille_parent2Id_fkey` FOREIGN KEY (`parent2Id`) REFERENCES `Personne`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
