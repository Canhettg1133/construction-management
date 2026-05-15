-- Add global AI settings and tool gateway metadata.
ALTER TABLE `audit_logs`
  MODIFY `entity_type` ENUM(
    'USER',
    'PROJECT',
    'PROJECT_MEMBER',
    'PROJECT_TOOL_PERMISSION',
    'SPECIAL_PRIVILEGE_ASSIGNMENT',
    'DAILY_REPORT',
    'TASK',
    'FILE',
    'AI_PROVIDER_PROFILE',
    'AI_PROVIDER_CREDENTIAL',
    'PROJECT_AI_SETTING',
    'AI_SYSTEM_SETTING',
    'AI_CHAT_THREAD',
    'AI_CHAT_MESSAGE'
  ) NOT NULL;

ALTER TABLE `ai_chat_messages`
  ADD COLUMN `tool_calls` JSON NULL,
  ADD COLUMN `tool_results` JSON NULL,
  ADD COLUMN `omitted_tools` JSON NULL;

CREATE TABLE `ai_system_settings` (
  `id` VARCHAR(40) NOT NULL DEFAULT 'global',
  `default_provider_profile_id` VARCHAR(191) NULL,
  `enabled_source_tools` JSON NULL,
  `global_system_prompt` TEXT NULL,
  `max_context_items` INTEGER NOT NULL DEFAULT 40,
  `allow_drafts` BOOLEAN NOT NULL DEFAULT true,
  `updated_by` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `ai_system_settings_default_provider_profile_id_idx` (`default_provider_profile_id`),
  INDEX `ai_system_settings_updated_by_idx` (`updated_by`),
  CONSTRAINT `ai_system_settings_default_provider_profile_id_fkey`
    FOREIGN KEY (`default_provider_profile_id`) REFERENCES `ai_provider_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ai_system_settings_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
