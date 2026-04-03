-- Add new system role fields on users
ALTER TABLE `users`
  ADD COLUMN `system_role` ENUM('ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF' AFTER `phone`,
  ADD COLUMN `specialty` VARCHAR(100) NULL AFTER `system_role`;

UPDATE `users`
SET `system_role` = CASE WHEN `role` = 'ADMIN' THEN 'ADMIN' ELSE 'STAFF' END;

ALTER TABLE `users`
  DROP COLUMN `role`;

CREATE INDEX `users_system_role_idx` ON `users`(`system_role`);

-- Migrate project member roles to new ProjectRole enum
ALTER TABLE `project_members`
  MODIFY `role` ENUM(
    'PROJECT_MANAGER',
    'SITE_ENGINEER',
    'ENGINEER',
    'SAFETY_OFFICER',
    'DESIGN_ENGINEER',
    'QUALITY_MANAGER',
    'WAREHOUSE_KEEPER',
    'CLIENT',
    'VIEWER'
  ) NOT NULL DEFAULT 'SITE_ENGINEER';

UPDATE `project_members`
SET `role` = 'ENGINEER'
WHERE `role` = 'SITE_ENGINEER';

ALTER TABLE `project_members`
  MODIFY `role` ENUM(
    'PROJECT_MANAGER',
    'ENGINEER',
    'SAFETY_OFFICER',
    'DESIGN_ENGINEER',
    'QUALITY_MANAGER',
    'WAREHOUSE_KEEPER',
    'CLIENT',
    'VIEWER'
  ) NOT NULL DEFAULT 'ENGINEER',
  ADD COLUMN `specialty` VARCHAR(100) NULL AFTER `role`;

-- Extend audit entity type for RBAC audit events
ALTER TABLE `audit_logs`
  MODIFY `entity_type` ENUM(
    'USER',
    'PROJECT',
    'PROJECT_MEMBER',
    'PROJECT_TOOL_PERMISSION',
    'SPECIAL_PRIVILEGE_ASSIGNMENT',
    'DAILY_REPORT',
    'TASK',
    'FILE'
  ) NOT NULL;

-- Create project scoped permission override table
CREATE TABLE `project_tool_permissions` (
  `id` VARCHAR(191) NOT NULL,
  `project_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `toolId` ENUM('PROJECT', 'TASK', 'DAILY_REPORT', 'FILE', 'DOCUMENT', 'SAFETY', 'QUALITY', 'WAREHOUSE', 'BUDGET') NOT NULL,
  `level` ENUM('NONE', 'READ', 'STANDARD', 'ADMIN') NOT NULL DEFAULT 'READ',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `project_tool_permissions_project_id_user_id_toolId_key` (`project_id`, `user_id`, `toolId`),
  INDEX `project_tool_permissions_project_id_idx` (`project_id`),
  INDEX `project_tool_permissions_user_id_idx` (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create special privilege assignment table
CREATE TABLE `special_privilege_assignments` (
  `id` VARCHAR(191) NOT NULL,
  `project_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `privilege` ENUM('SAFETY_SIGNER', 'QUALITY_SIGNER', 'BUDGET_APPROVER') NOT NULL,
  `granted_by` VARCHAR(191) NULL,
  `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `special_privilege_assignments_project_id_user_id_privilege_key` (`project_id`, `user_id`, `privilege`),
  INDEX `special_privilege_assignments_project_id_idx` (`project_id`),
  INDEX `special_privilege_assignments_user_id_idx` (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign keys
ALTER TABLE `project_tool_permissions`
  ADD CONSTRAINT `project_tool_permissions_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `project_tool_permissions`
  ADD CONSTRAINT `project_tool_permissions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `special_privilege_assignments`
  ADD CONSTRAINT `special_privilege_assignments_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `special_privilege_assignments`
  ADD CONSTRAINT `special_privilege_assignments_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `special_privilege_assignments`
  ADD CONSTRAINT `special_privilege_assignments_granted_by_fkey`
    FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
