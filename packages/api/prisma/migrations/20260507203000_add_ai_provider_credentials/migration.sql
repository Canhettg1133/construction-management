-- Add audit entity types for AI provider configuration events.
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
    'PROJECT_AI_SETTING'
  ) NOT NULL;

-- Store backend-owned API key pools per provider profile. Keys are encrypted
-- and only a keyed hash is used for duplicate detection.
CREATE TABLE `ai_provider_credentials` (
  `id` VARCHAR(191) NOT NULL,
  `provider_profile_id` VARCHAR(191) NOT NULL,
  `label` VARCHAR(120) NOT NULL,
  `api_key_encrypted` TEXT NOT NULL,
  `key_hash` VARCHAR(128) NOT NULL,
  `is_enabled` BOOLEAN NOT NULL DEFAULT true,
  `last_used_at` DATETIME(3) NULL,
  `failure_count` INTEGER NOT NULL DEFAULT 0,
  `disabled_until` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `ai_provider_credentials_provider_profile_id_key_hash_key` (`provider_profile_id`, `key_hash`),
  INDEX `ai_provider_credentials_provider_profile_id_is_enabled_idx` (`provider_profile_id`, `is_enabled`),
  INDEX `ai_provider_credentials_disabled_until_idx` (`disabled_until`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ai_provider_credentials`
  ADD CONSTRAINT `ai_provider_credentials_provider_profile_id_fkey`
    FOREIGN KEY (`provider_profile_id`) REFERENCES `ai_provider_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
