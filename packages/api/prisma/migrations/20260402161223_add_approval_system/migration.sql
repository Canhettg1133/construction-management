-- AlterTable
ALTER TABLE `daily_reports` ADD COLUMN `approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `approved_at` DATETIME(3) NULL,
    ADD COLUMN `approved_by` VARCHAR(191) NULL,
    ADD COLUMN `rejected_reason` TEXT NULL,
    ADD COLUMN `submitted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `approved_at` DATETIME(3) NULL,
    ADD COLUMN `approved_by` VARCHAR(191) NULL,
    ADD COLUMN `rejected_reason` TEXT NULL,
    ADD COLUMN `requires_approval` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `submitted_at` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
