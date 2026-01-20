/*
  Warnings:

  - You are about to drop the column `usersUserId` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the `folder_documents` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `documents` DROP FOREIGN KEY `documents_usersUserId_fkey`;

-- DropForeignKey
ALTER TABLE `folder_documents` DROP FOREIGN KEY `folder_documents_documentId_fkey`;

-- DropForeignKey
ALTER TABLE `folder_documents` DROP FOREIGN KEY `folder_documents_folderId_fkey`;

-- DropForeignKey
ALTER TABLE `folders` DROP FOREIGN KEY `folders_parentFolderId_fkey`;

-- DropForeignKey
ALTER TABLE `folders` DROP FOREIGN KEY `folders_userId_fkey`;

-- DropIndex
DROP INDEX `idx_albums_search` ON `albums`;

-- DropIndex
DROP INDEX `idx_images_search` ON `images`;

-- DropIndex
DROP INDEX `idx_videos_search` ON `videos`;

-- AlterTable
ALTER TABLE `documents` DROP COLUMN `usersUserId`,
    ADD COLUMN `category` ENUM('office', 'text', 'design', 'code', 'archive', 'other') NULL DEFAULT 'other',
    ADD COLUMN `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `isFavorite` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `isPublic` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `language` VARCHAR(50) NULL,
    ADD COLUMN `pageCount` INTEGER NULL,
    ADD COLUMN `previewPath` VARCHAR(500) NULL,
    ADD COLUMN `tags` VARCHAR(500) NULL,
    ADD COLUMN `thumbnailPath` VARCHAR(500) NULL,
    ADD COLUMN `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `version` INTEGER NULL DEFAULT 1,
    ADD COLUMN `wordCount` INTEGER NULL;

-- DropTable
DROP TABLE `folder_documents`;

-- CreateIndex
CREATE INDEX `idx_albums_search` ON `albums`(`name`(200), `description`(200));

-- CreateIndex
CREATE INDEX `idx_documents_category_deleted` ON `documents`(`category`, `deletedAt`);

-- CreateIndex
CREATE INDEX `idx_documents_favorite_user` ON `documents`(`isFavorite`, `userId`, `deletedAt`);

-- CreateIndex
CREATE INDEX `idx_documents_mime_user_deleted` ON `documents`(`mimeType`, `userId`, `deletedAt`);

-- CreateIndex
CREATE INDEX `idx_documents_public_created` ON `documents`(`isPublic`, `createdAt` DESC, `deletedAt`);

-- CreateIndex
CREATE INDEX `idx_documents_search` ON `documents`(`title`(255), `description`(200), `tags`(200), `originalFilename`(255));

-- CreateIndex
CREATE INDEX `idx_documents_size_user` ON `documents`(`fileSize`, `userId`);

-- CreateIndex
CREATE INDEX `idx_documents_user_deleted_created` ON `documents`(`userId`, `deletedAt`, `createdAt` DESC);

-- CreateIndex
CREATE INDEX `idx_folders_system` ON `folders`(`isSystem`);

-- CreateIndex
CREATE INDEX `idx_folders_user_parent_deleted` ON `folders`(`userId`, `parentFolderId`, `deletedAt`, `sortOrder`);

-- CreateIndex
CREATE INDEX `idx_images_search` ON `images`(`title`(255), `description`(200));

-- CreateIndex
CREATE INDEX `idx_videos_search` ON `videos`(`title`(255), `description`(200));

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `folders` ADD CONSTRAINT `folders_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `folders` ADD CONSTRAINT `folders_ibfk_2` FOREIGN KEY (`parentFolderId`) REFERENCES `folders`(`folderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- RenameIndex
ALTER TABLE `documents` RENAME INDEX `documents_filename_key` TO `filename`;

-- RenameIndex
ALTER TABLE `folders` RENAME INDEX `folders_parentFolderId_fkey` TO `parentFolderId`;
