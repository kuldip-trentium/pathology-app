/*
  Warnings:

  - You are about to drop the column `userId` on the `address` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `labs` table. All the data in the column will be lost.
  - Added the required column `entityId` to the `address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `labs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `address_userId_idx` ON `address`;

-- DropIndex
DROP INDEX `address_userId_key` ON `address`;

-- AlterTable
ALTER TABLE `address` DROP COLUMN `userId`,
    ADD COLUMN `entityId` CHAR(36) NOT NULL,
    ADD COLUMN `entityType` VARCHAR(10) NOT NULL;

-- AlterTable
ALTER TABLE `labs` DROP COLUMN `address`,
    ADD COLUMN `phoneNumber` VARCHAR(20) NOT NULL;

-- CreateIndex
CREATE INDEX `address_entityId_idx` ON `address`(`entityId`);
