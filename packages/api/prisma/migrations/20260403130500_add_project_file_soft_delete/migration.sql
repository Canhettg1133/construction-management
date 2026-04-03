-- AlterTable
ALTER TABLE `project_files`
    ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `project_files_deleted_at_idx` ON `project_files`(`deleted_at`);
