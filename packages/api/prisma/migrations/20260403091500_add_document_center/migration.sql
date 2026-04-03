-- CreateTable
CREATE TABLE `document_folders` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `document_folders_project_id_idx`(`project_id`),
    INDEX `document_folders_parent_id_idx`(`parent_id`),
    INDEX `document_folders_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `project_files`
    ADD COLUMN `folder_id` VARCHAR(191) NULL,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `parent_version_id` VARCHAR(191) NULL,
    ADD COLUMN `tags` VARCHAR(500) NULL;

-- CreateIndex
CREATE INDEX `project_files_folder_id_idx` ON `project_files`(`folder_id`);

-- CreateIndex
CREATE INDEX `project_files_version_idx` ON `project_files`(`version`);

-- CreateIndex
CREATE INDEX `project_files_parent_version_id_idx` ON `project_files`(`parent_version_id`);

-- AddForeignKey
ALTER TABLE `document_folders` ADD CONSTRAINT `document_folders_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_folders` ADD CONSTRAINT `document_folders_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `document_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_folders` ADD CONSTRAINT `document_folders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_files` ADD CONSTRAINT `project_files_folder_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `document_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_files` ADD CONSTRAINT `project_files_parent_version_id_fkey` FOREIGN KEY (`parent_version_id`) REFERENCES `project_files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
