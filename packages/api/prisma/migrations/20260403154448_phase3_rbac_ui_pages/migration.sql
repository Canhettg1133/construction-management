-- CreateTable
CREATE TABLE `safety_reports` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `report_date` DATE NOT NULL,
    `inspector_id` VARCHAR(191) NOT NULL,
    `location` VARCHAR(500) NOT NULL,
    `description` TEXT NOT NULL,
    `violations` INTEGER NOT NULL DEFAULT 0,
    `photos` JSON NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `signed_by` VARCHAR(191) NULL,
    `signed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `safety_reports_project_id_idx`(`project_id`),
    INDEX `safety_reports_report_date_idx`(`report_date`),
    INDEX `safety_reports_inspector_id_idx`(`inspector_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_reports` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `report_date` DATE NOT NULL,
    `inspector_id` VARCHAR(191) NOT NULL,
    `location` VARCHAR(500) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `signed_by` VARCHAR(191) NULL,
    `signed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `quality_reports_project_id_idx`(`project_id`),
    INDEX `quality_reports_report_date_idx`(`report_date`),
    INDEX `quality_reports_inspector_id_idx`(`inspector_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouse_inventory` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `material_name` VARCHAR(200) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `min_quantity` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `max_quantity` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `location` VARCHAR(200) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `warehouse_inventory_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouse_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `inventory_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `note` TEXT NULL,
    `requested_by` VARCHAR(191) NULL,
    `approved_by` VARCHAR(191) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `warehouse_transactions_inventory_id_idx`(`inventory_id`),
    INDEX `warehouse_transactions_status_idx`(`status`),
    INDEX `warehouse_transactions_requested_by_idx`(`requested_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_items` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `estimated_cost` DECIMAL(15, 0) NOT NULL,
    `approved_cost` DECIMAL(15, 0) NULL,
    `spent_cost` DECIMAL(15, 0) NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `budget_items_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_disbursements` (
    `id` VARCHAR(191) NOT NULL,
    `budget_item_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 0) NOT NULL,
    `approved_by` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `budget_disbursements_budget_item_id_idx`(`budget_item_id`),
    INDEX `budget_disbursements_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `safety_reports` ADD CONSTRAINT `safety_reports_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_reports` ADD CONSTRAINT `safety_reports_inspector_id_fkey` FOREIGN KEY (`inspector_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_reports` ADD CONSTRAINT `quality_reports_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_reports` ADD CONSTRAINT `quality_reports_inspector_id_fkey` FOREIGN KEY (`inspector_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_inventory` ADD CONSTRAINT `warehouse_inventory_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_transactions` ADD CONSTRAINT `warehouse_transactions_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `warehouse_inventory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_transactions` ADD CONSTRAINT `warehouse_transactions_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_disbursements` ADD CONSTRAINT `budget_disbursements_budget_item_id_fkey` FOREIGN KEY (`budget_item_id`) REFERENCES `budget_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
