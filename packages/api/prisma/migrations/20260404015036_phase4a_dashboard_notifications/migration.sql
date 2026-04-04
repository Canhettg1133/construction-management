-- DropIndex
DROP INDEX `notifications_created_at_idx` ON `notifications`;

-- DropIndex
DROP INDEX `notifications_is_read_idx` ON `notifications`;

-- AlterTable
ALTER TABLE `notifications` DROP COLUMN `link`,
    ADD COLUMN `data` JSON NULL,
    MODIFY `message` TEXT NOT NULL,
    MODIFY `type` ENUM('TASK_ASSIGNED', 'TASK_DEADLINE_SOON', 'TASK_OVERDUE', 'REPORT_PENDING_APPROVAL', 'SAFETY_VIOLATION', 'SAFETY_REPORT_PENDING', 'QUALITY_REPORT_PENDING', 'LOW_STOCK_ALERT', 'TRANSACTION_PENDING', 'PROJECT_PROGRESS_UPDATE') NOT NULL;

-- AlterTable
ALTER TABLE `safety_reports` MODIFY `photos` JSON NULL;

-- CreateIndex
CREATE INDEX `notifications_user_id_is_read_idx` ON `notifications`(`user_id`, `is_read`);

-- CreateIndex
CREATE INDEX `notifications_user_id_created_at_idx` ON `notifications`(`user_id`, `created_at`);

