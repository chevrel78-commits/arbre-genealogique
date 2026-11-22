-- AlterTable
ALTER TABLE `Personne` ADD COLUMN `jourNaissance` TINYINT NULL,
    ADD COLUMN `lieuNaissance` VARCHAR(150) NULL,
    ADD COLUMN `moisNaissance` TINYINT NULL;
