-- CreateTable
CREATE TABLE `activity` (
    `activityId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `resourceType` ENUM('image', 'video', 'album', 'category', 'tag', 'user', 'document') NOT NULL,
    `resourceId` INTEGER NULL,
    `details` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_activity_action_created`(`action`, `createdAt` DESC),
    INDEX `idx_activity_cleanup`(`createdAt`),
    INDEX `idx_activity_resource_type`(`resourceType`, `resourceId`, `createdAt` DESC),
    INDEX `idx_activity_user_created`(`userId`, `createdAt` DESC),
    PRIMARY KEY (`activityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `album_images` (
    `albumId` INTEGER NOT NULL,
    `imageId` INTEGER NOT NULL,
    `sortOrder` INTEGER NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_album_img_album_sort`(`albumId`, `sortOrder`),
    INDEX `idx_album_img_image`(`imageId`),
    PRIMARY KEY (`albumId`, `imageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `album_videos` (
    `albumId` INTEGER NOT NULL,
    `videoId` INTEGER NOT NULL,
    `sortOrder` INTEGER NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_album_vid_album_sort`(`albumId`, `sortOrder`),
    INDEX `idx_album_vid_video`(`videoId`),
    PRIMARY KEY (`albumId`, `videoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `albums` (
    `albumId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `coverImageId` INTEGER NULL,
    `coverVideoId` INTEGER NULL,
    `isPublic` BOOLEAN NULL DEFAULT false,
    `isSystem` BOOLEAN NULL DEFAULT false,
    `deletedAt` TIMESTAMP(0) NULL,
    `imageCount` INTEGER NULL DEFAULT 0,
    `videoCount` INTEGER NULL DEFAULT 0,
    `totalItems` INTEGER NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `coverImageId`(`coverImageId`),
    INDEX `coverVideoId`(`coverVideoId`),
    INDEX `idx_albums_public_created`(`isPublic`, `createdAt` DESC),
    INDEX `idx_albums_search`(`name`(200), `description`(200)),
    INDEX `idx_albums_system`(`isSystem`),
    INDEX `idx_albums_user_deleted_created`(`userId`, `deletedAt`, `createdAt` DESC),
    PRIMARY KEY (`albumId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `categoryId` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `color` VARCHAR(7) NULL DEFAULT '#007bff',
    `slug` VARCHAR(120) NOT NULL,
    `isSystem` BOOLEAN NULL DEFAULT false,
    `itemCount` INTEGER NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `slug`(`slug`),
    INDEX `idx_categories_name`(`name`),
    INDEX `idx_categories_slug`(`slug`),
    INDEX `idx_categories_system_count`(`isSystem`, `itemCount` DESC),
    PRIMARY KEY (`categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_comments` (
    `commentId` INTEGER NOT NULL AUTO_INCREMENT,
    `documentId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `pageNumber` INTEGER NULL,
    `isResolved` BOOLEAN NULL DEFAULT false,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_document_comments_doc_created`(`documentId`, `createdAt` DESC),
    INDEX `idx_document_comments_doc_resolved`(`documentId`, `isResolved`),
    INDEX `idx_document_comments_user`(`userId`),
    PRIMARY KEY (`commentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_shares` (
    `shareId` INTEGER NOT NULL AUTO_INCREMENT,
    `documentId` INTEGER NOT NULL,
    `sharedBy` INTEGER NOT NULL,
    `sharedWith` INTEGER NULL,
    `canView` BOOLEAN NULL DEFAULT true,
    `canDownload` BOOLEAN NULL DEFAULT true,
    `canEdit` BOOLEAN NULL DEFAULT false,
    `shareToken` VARCHAR(100) NULL,
    `expiresAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `lastAccessedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `shareToken`(`shareToken`),
    INDEX `idx_document_shares_doc_token`(`documentId`, `shareToken`),
    INDEX `idx_document_shares_sharedBy`(`sharedBy`),
    INDEX `idx_document_shares_sharedWith_expires`(`sharedWith`, `expiresAt`),
    INDEX `idx_document_shares_token_expires`(`shareToken`, `expiresAt`),
    PRIMARY KEY (`shareId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_versions` (
    `versionId` INTEGER NOT NULL AUTO_INCREMENT,
    `documentId` INTEGER NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `documentPath` VARCHAR(500) NOT NULL,
    `fileSize` BIGINT NOT NULL,
    `changeDescription` TEXT NULL,
    `uploadedBy` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_document_versions_doc_version`(`documentId`, `versionNumber` DESC),
    INDEX `idx_document_versions_uploadedBy`(`uploadedBy`),
    UNIQUE INDEX `unique_document_version`(`documentId`, `versionNumber`),
    PRIMARY KEY (`versionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folder_images` (
    `folderId` INTEGER NOT NULL,
    `imageId` INTEGER NOT NULL,
    `sortOrder` INTEGER NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_folder_img_folder_sort`(`folderId`, `sortOrder`),
    INDEX `idx_folder_img_image`(`imageId`),
    PRIMARY KEY (`folderId`, `imageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folder_videos` (
    `folderId` INTEGER NOT NULL,
    `videoId` INTEGER NOT NULL,
    `sortOrder` INTEGER NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_folder_vid_folder_sort`(`folderId`, `sortOrder`),
    INDEX `idx_folder_vid_video`(`videoId`),
    PRIMARY KEY (`folderId`, `videoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folders` (
    `folderId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `parentFolderId` INTEGER NULL,
    `color` VARCHAR(7) NULL DEFAULT '#6c757d',
    `isSystem` BOOLEAN NULL DEFAULT false,
    `sortOrder` INTEGER NULL DEFAULT 0,
    `itemCount` INTEGER NULL DEFAULT 0,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`folderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `documentId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `originalFilename` VARCHAR(255) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `documentPath` VARCHAR(500) NOT NULL,
    `fileSize` BIGINT NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `usersUserId` INTEGER NULL,

    UNIQUE INDEX `documents_filename_key`(`filename`),
    PRIMARY KEY (`documentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folder_documents` (
    `folderId` INTEGER NOT NULL,
    `documentId` INTEGER NOT NULL,
    `sortOrder` INTEGER NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_folder_doc_folder_sort`(`folderId`, `sortOrder`),
    INDEX `idx_folder_doc_document`(`documentId`),
    PRIMARY KEY (`folderId`, `documentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `image_categories` (
    `imageId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_img_cat_category_image`(`categoryId`, `imageId`),
    PRIMARY KEY (`imageId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `image_tags` (
    `imageId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_img_tag_tag_image`(`tagId`, `imageId`),
    PRIMARY KEY (`imageId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `images` (
    `imageId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `originalFilename` VARCHAR(255) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `imagePath` VARCHAR(500) NOT NULL,
    `thumbnailPath` VARCHAR(500) NULL,
    `mediumPath` VARCHAR(500) NULL,
    `fileSize` BIGINT NOT NULL,
    `mimeType` VARCHAR(50) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `isFavorite` BOOLEAN NULL DEFAULT false,
    `isPublic` BOOLEAN NULL DEFAULT false,
    `uploadDate` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `takenDate` TIMESTAMP(0) NULL,
    `cameraInfo` JSON NULL,
    `location` VARCHAR(200) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `yearMonth` CHAR(7) NULL,

    INDEX `idx_images_filename`(`filename`),
    INDEX `idx_images_mime_deleted`(`mimeType`, `deletedAt`),
    INDEX `idx_images_public_deleted_created`(`isPublic`, `deletedAt`, `createdAt` DESC),
    INDEX `idx_images_search`(`title`(255), `description`(200)),
    INDEX `idx_images_size`(`fileSize`),
    INDEX `idx_images_user_deleted_created`(`userId`, `deletedAt`, `createdAt` DESC),
    INDEX `idx_images_user_favorite_deleted`(`userId`, `isFavorite`, `deletedAt`, `createdAt` DESC),
    INDEX `idx_images_user_yearmonth`(`userId`, `yearMonth`, `deletedAt`),
    PRIMARY KEY (`imageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `query_cache` (
    `cacheId` INTEGER NOT NULL AUTO_INCREMENT,
    `cacheKey` VARCHAR(255) NOT NULL,
    `cacheData` JSON NOT NULL,
    `expiresAt` TIMESTAMP(0) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `cacheKey`(`cacheKey`),
    INDEX `idx_cache_expires_cleanup`(`expiresAt`),
    INDEX `idx_cache_key_expires`(`cacheKey`, `expiresAt`),
    PRIMARY KEY (`cacheId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shares` (
    `shareId` INTEGER NOT NULL AUTO_INCREMENT,
    `imageId` INTEGER NULL,
    `videoId` INTEGER NULL,
    `albumId` INTEGER NULL,
    `sharedBy` INTEGER NOT NULL,
    `sharedWithEmail` VARCHAR(100) NULL,
    `token` VARCHAR(255) NOT NULL,
    `expiresAt` TIMESTAMP(0) NULL,
    `passwordProtected` BOOLEAN NULL DEFAULT false,
    `accessPassword` VARCHAR(255) NULL,
    `viewCount` INTEGER NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `token`(`token`),
    INDEX `albumId`(`albumId`),
    INDEX `idx_shares_expires_cleanup`(`expiresAt`),
    INDEX `idx_shares_token_expires`(`token`, `expiresAt`),
    INDEX `idx_shares_user_created`(`sharedBy`, `createdAt` DESC),
    INDEX `imageId`(`imageId`),
    INDEX `videoId`(`videoId`),
    PRIMARY KEY (`shareId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `tagId` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `color` VARCHAR(7) NULL DEFAULT '#6c757d',
    `slug` VARCHAR(120) NOT NULL,
    `usageCount` INTEGER NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `slug`(`slug`),
    INDEX `idx_tags_name`(`name`),
    INDEX `idx_tags_slug`(`slug`),
    INDEX `idx_tags_usage_desc`(`usageCount` DESC),
    PRIMARY KEY (`tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trash` (
    `trashId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `itemType` ENUM('image', 'video', 'document', 'folder') NOT NULL,
    `itemId` INTEGER NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `originalPath` VARCHAR(500) NOT NULL,
    `fileSize` BIGINT NOT NULL,
    `mimeType` VARCHAR(100) NULL,
    `metadata` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `permanentDeleteAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_trash_item_type`(`itemType`, `itemId`),
    INDEX `idx_trash_permanent_cleanup`(`permanentDeleteAt`, `itemType`),
    INDEX `idx_trash_user_deleted`(`userId`, `deletedAt` DESC),
    PRIMARY KEY (`trashId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `userId` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `storageUsed` BIGINT NULL DEFAULT 0,
    `storageLimit` BIGINT NULL DEFAULT 5368709120,
    `imageCount` INTEGER NULL DEFAULT 0,
    `videoCount` INTEGER NULL DEFAULT 0,
    `documentCount` INTEGER NULL DEFAULT 0,
    `albumCount` INTEGER NULL DEFAULT 0,
    `totalMediaCount` INTEGER NULL DEFAULT 0,
    `profileImagePath` VARCHAR(500) NULL,
    `bio` TEXT NULL,
    `location` VARCHAR(200) NULL,
    `isActive` BOOLEAN NULL DEFAULT true,
    `emailVerified` BOOLEAN NULL DEFAULT false,
    `lastLogin` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `role` ENUM('user', 'admin', 'moderator') NOT NULL DEFAULT 'user',
    `status` ENUM('active', 'suspended', 'inactive') NOT NULL DEFAULT 'active',
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `username`(`username`),
    UNIQUE INDEX `email`(`email`),
    INDEX `idx_users_active_email`(`isActive`, `email`),
    INDEX `idx_users_email`(`email`),
    INDEX `idx_users_login`(`lastLogin` DESC),
    INDEX `idx_users_role_status_active`(`role`, `status`, `isActive`, `deletedAt`),
    INDEX `idx_users_username`(`username`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `video_categories` (
    `videoId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_vid_cat_category_video`(`categoryId`, `videoId`),
    PRIMARY KEY (`videoId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `video_tags` (
    `videoId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_vid_tag_tag_video`(`tagId`, `videoId`),
    PRIMARY KEY (`videoId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `videos` (
    `videoId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `originalFilename` VARCHAR(255) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `videoPath` VARCHAR(500) NOT NULL,
    `thumbnailPath` VARCHAR(500) NULL,
    `fileSize` BIGINT NOT NULL,
    `mimeType` VARCHAR(50) NOT NULL,
    `duration` INTEGER NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `fps` DECIMAL(5, 2) NULL,
    `bitrate` INTEGER NULL,
    `codec` VARCHAR(50) NULL,
    `isFavorite` BOOLEAN NULL DEFAULT false,
    `isPublic` BOOLEAN NULL DEFAULT false,
    `uploadDate` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `recordedDate` TIMESTAMP(0) NULL,
    `cameraInfo` JSON NULL,
    `location` VARCHAR(200) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `yearMonth` CHAR(7) NULL,

    INDEX `idx_videos_duration_deleted`(`duration`, `deletedAt`),
    INDEX `idx_videos_filename`(`filename`),
    INDEX `idx_videos_mime_deleted`(`mimeType`, `deletedAt`),
    INDEX `idx_videos_public_deleted_created`(`isPublic`, `deletedAt`, `createdAt` DESC),
    INDEX `idx_videos_search`(`title`(255), `description`(200)),
    INDEX `idx_videos_size`(`fileSize`),
    INDEX `idx_videos_user_deleted_created`(`userId`, `deletedAt`, `createdAt` DESC),
    INDEX `idx_videos_user_favorite_deleted`(`userId`, `isFavorite`, `deletedAt`, `createdAt` DESC),
    INDEX `idx_videos_user_yearmonth`(`userId`, `yearMonth`, `deletedAt`),
    PRIMARY KEY (`videoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activity` ADD CONSTRAINT `activity_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `album_images` ADD CONSTRAINT `album_images_ibfk_1` FOREIGN KEY (`albumId`) REFERENCES `albums`(`albumId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `album_images` ADD CONSTRAINT `album_images_ibfk_2` FOREIGN KEY (`imageId`) REFERENCES `images`(`imageId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `album_videos` ADD CONSTRAINT `album_videos_ibfk_1` FOREIGN KEY (`albumId`) REFERENCES `albums`(`albumId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `album_videos` ADD CONSTRAINT `album_videos_ibfk_2` FOREIGN KEY (`videoId`) REFERENCES `videos`(`videoId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `albums` ADD CONSTRAINT `albums_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `albums` ADD CONSTRAINT `albums_ibfk_2` FOREIGN KEY (`coverImageId`) REFERENCES `images`(`imageId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `albums` ADD CONSTRAINT `albums_ibfk_3` FOREIGN KEY (`coverVideoId`) REFERENCES `videos`(`videoId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_comments` ADD CONSTRAINT `document_comments_ibfk_1` FOREIGN KEY (`documentId`) REFERENCES `documents`(`documentId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_comments` ADD CONSTRAINT `document_comments_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_ibfk_1` FOREIGN KEY (`documentId`) REFERENCES `documents`(`documentId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_ibfk_2` FOREIGN KEY (`sharedBy`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_ibfk_3` FOREIGN KEY (`sharedWith`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_ibfk_1` FOREIGN KEY (`documentId`) REFERENCES `documents`(`documentId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_ibfk_2` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `folder_images` ADD CONSTRAINT `folder_images_ibfk_1` FOREIGN KEY (`folderId`) REFERENCES `folders`(`folderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `folder_images` ADD CONSTRAINT `folder_images_ibfk_2` FOREIGN KEY (`imageId`) REFERENCES `images`(`imageId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `folder_videos` ADD CONSTRAINT `folder_videos_ibfk_1` FOREIGN KEY (`folderId`) REFERENCES `folders`(`folderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `folder_videos` ADD CONSTRAINT `folder_videos_ibfk_2` FOREIGN KEY (`videoId`) REFERENCES `videos`(`videoId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `folders` ADD CONSTRAINT `folders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `folders` ADD CONSTRAINT `folders_parentFolderId_fkey` FOREIGN KEY (`parentFolderId`) REFERENCES `folders`(`folderId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_usersUserId_fkey` FOREIGN KEY (`usersUserId`) REFERENCES `users`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `folder_documents` ADD CONSTRAINT `folder_documents_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `folders`(`folderId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `folder_documents` ADD CONSTRAINT `folder_documents_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`documentId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `image_categories` ADD CONSTRAINT `image_categories_ibfk_1` FOREIGN KEY (`imageId`) REFERENCES `images`(`imageId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `image_categories` ADD CONSTRAINT `image_categories_ibfk_2` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`categoryId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `image_tags` ADD CONSTRAINT `image_tags_ibfk_1` FOREIGN KEY (`imageId`) REFERENCES `images`(`imageId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `image_tags` ADD CONSTRAINT `image_tags_ibfk_2` FOREIGN KEY (`tagId`) REFERENCES `tags`(`tagId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `images` ADD CONSTRAINT `images_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `shares` ADD CONSTRAINT `shares_ibfk_1` FOREIGN KEY (`imageId`) REFERENCES `images`(`imageId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `shares` ADD CONSTRAINT `shares_ibfk_2` FOREIGN KEY (`videoId`) REFERENCES `videos`(`videoId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `shares` ADD CONSTRAINT `shares_ibfk_3` FOREIGN KEY (`albumId`) REFERENCES `albums`(`albumId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `shares` ADD CONSTRAINT `shares_ibfk_4` FOREIGN KEY (`sharedBy`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `trash` ADD CONSTRAINT `trash_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `video_categories` ADD CONSTRAINT `video_categories_ibfk_1` FOREIGN KEY (`videoId`) REFERENCES `videos`(`videoId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `video_categories` ADD CONSTRAINT `video_categories_ibfk_2` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`categoryId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `video_tags` ADD CONSTRAINT `video_tags_ibfk_1` FOREIGN KEY (`videoId`) REFERENCES `videos`(`videoId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `video_tags` ADD CONSTRAINT `video_tags_ibfk_2` FOREIGN KEY (`tagId`) REFERENCES `tags`(`tagId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `videos` ADD CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE ON UPDATE NO ACTION;
