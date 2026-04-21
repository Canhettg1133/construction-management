-- AlterTable
ALTER TABLE `quality_reports`
  ADD COLUMN `notes` TEXT NULL,
  ADD COLUMN `result` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `safety_checklist_items` (
  `id` VARCHAR(191) NOT NULL,
  `report_id` VARCHAR(191) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `checked` BOOLEAN NOT NULL DEFAULT false,
  `note` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `safety_checklist_items_report_id_idx`(`report_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `safety_incidents` (
  `id` VARCHAR(191) NOT NULL,
  `report_id` VARCHAR(191) NOT NULL,
  `severity` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  `involved_persons` TEXT NULL,
  `immediate_action` TEXT NULL,
  `damages` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `safety_incidents_report_id_key`(`report_id`),
  INDEX `safety_incidents_report_id_idx`(`report_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `safety_near_misses` (
  `id` VARCHAR(191) NOT NULL,
  `report_id` VARCHAR(191) NOT NULL,
  `reporter_id` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `potential_harm` TEXT NULL,
  `witnesses` TEXT NULL,
  `root_cause` TEXT NULL,
  `likelihood` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  `severity` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  `status` VARCHAR(20) NOT NULL DEFAULT 'REPORTED',
  `resolved_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `safety_near_misses_report_id_key`(`report_id`),
  INDEX `safety_near_misses_report_id_idx`(`report_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `safety_corrective_actions` (
  `id` VARCHAR(191) NOT NULL,
  `incident_id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `assigned_to` VARCHAR(191) NULL,
  `due_date` DATE NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `completed_at` DATETIME(3) NULL,
  `completed_note` TEXT NULL,
  `created_by` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `safety_corrective_actions_incident_id_idx`(`incident_id`),
  INDEX `safety_corrective_actions_assigned_to_idx`(`assigned_to`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_punch_list_items` (
  `id` VARCHAR(191) NOT NULL,
  `report_id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `severity` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  `location` VARCHAR(200) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  `fixed_at` DATETIME(3) NULL,
  `note` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `quality_punch_list_items_report_id_idx`(`report_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_report_photos` (
  `id` VARCHAR(191) NOT NULL,
  `report_id` VARCHAR(191) NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `photoUrl` VARCHAR(500) NOT NULL,
  `caption` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `quality_report_photos_report_id_idx`(`report_id`),
  INDEX `quality_report_photos_type_idx`(`type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `safety_checklist_items`
  ADD CONSTRAINT `safety_checklist_items_report_id_fkey`
  FOREIGN KEY (`report_id`) REFERENCES `safety_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_incidents`
  ADD CONSTRAINT `safety_incidents_report_id_fkey`
  FOREIGN KEY (`report_id`) REFERENCES `safety_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_near_misses`
  ADD CONSTRAINT `safety_near_misses_report_id_fkey`
  FOREIGN KEY (`report_id`) REFERENCES `safety_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_near_misses`
  ADD CONSTRAINT `safety_near_misses_reporter_id_fkey`
  FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_corrective_actions`
  ADD CONSTRAINT `safety_corrective_actions_incident_id_fkey`
  FOREIGN KEY (`incident_id`) REFERENCES `safety_incidents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_corrective_actions`
  ADD CONSTRAINT `safety_corrective_actions_assigned_to_fkey`
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_corrective_actions`
  ADD CONSTRAINT `safety_corrective_actions_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_punch_list_items`
  ADD CONSTRAINT `quality_punch_list_items_report_id_fkey`
  FOREIGN KEY (`report_id`) REFERENCES `quality_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_report_photos`
  ADD CONSTRAINT `quality_report_photos_report_id_fkey`
  FOREIGN KEY (`report_id`) REFERENCES `quality_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
