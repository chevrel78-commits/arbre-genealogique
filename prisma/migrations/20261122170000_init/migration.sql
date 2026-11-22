-- CreateTable
CREATE TABLE `JournalEmail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(30) NOT NULL,
    `destinataire` VARCHAR(255) NOT NULL,
    `statut` ENUM('ENVOYE', 'ECHEC', 'SIMULE') NOT NULL,
    `erreur` VARCHAR(500) NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JournalEmail_creeLe_idx`(`creeLe`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TentativeConnexion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `espace` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `ip` VARCHAR(64) NOT NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TentativeConnexion_espace_email_creeLe_idx`(`espace`, `email`, `creeLe`),
    INDEX `TentativeConnexion_espace_ip_creeLe_idx`(`espace`, `ip`, `creeLe`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
