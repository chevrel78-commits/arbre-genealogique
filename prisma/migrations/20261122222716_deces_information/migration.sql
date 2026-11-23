-- AlterTable
ALTER TABLE `Personne` ADD COLUMN `anneeDeces` SMALLINT NULL,
    ADD COLUMN `decede` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `information` TEXT NULL,
    ADD COLUMN `jourDeces` TINYINT NULL,
    ADD COLUMN `moisDeces` TINYINT NULL;
