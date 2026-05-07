-- Extend project tool permissions with the project AI copilot tool.
ALTER TABLE `project_tool_permissions`
  MODIFY `toolId` ENUM(
    'PROJECT',
    'TASK',
    'DAILY_REPORT',
    'FILE',
    'DOCUMENT',
    'SAFETY',
    'QUALITY',
    'WAREHOUSE',
    'BUDGET',
    'AI_ASSISTANT'
  ) NOT NULL;

-- Store backend-owned AI provider profiles. API keys are encrypted before they
-- reach this table.
CREATE TABLE `ai_provider_profiles` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `provider` ENUM('MOCK', 'OPENAI_RESPONSES', 'OPENAI_COMPATIBLE', 'GEMINI_DIRECT', 'OLLAMA') NOT NULL,
  `base_url` VARCHAR(500) NULL,
  `model` VARCHAR(120) NOT NULL,
  `api_key_encrypted` TEXT NULL,
  `config` JSON NULL,
  `is_enabled` BOOLEAN NOT NULL DEFAULT true,
  `is_default` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `ai_provider_profiles_provider_idx` (`provider`),
  INDEX `ai_provider_profiles_is_enabled_idx` (`is_enabled`),
  INDEX `ai_provider_profiles_is_default_idx` (`is_default`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_chat_threads` (
  `id` VARCHAR(191) NOT NULL,
  `project_id` VARCHAR(191) NOT NULL,
  `owner_id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `visibility` ENUM('PRIVATE') NOT NULL DEFAULT 'PRIVATE',
  `provider_profile_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `ai_chat_threads_project_id_owner_id_idx` (`project_id`, `owner_id`),
  INDEX `ai_chat_threads_project_id_updated_at_idx` (`project_id`, `updated_at`),
  INDEX `ai_chat_threads_provider_profile_id_idx` (`provider_profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_chat_messages` (
  `id` VARCHAR(191) NOT NULL,
  `thread_id` VARCHAR(191) NOT NULL,
  `project_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NULL,
  `role` ENUM('USER', 'ASSISTANT', 'SYSTEM') NOT NULL,
  `content` TEXT NOT NULL,
  `provider` VARCHAR(80) NULL,
  `model` VARCHAR(120) NULL,
  `latency_ms` INTEGER NULL,
  `context_sources` JSON NULL,
  `error_code` VARCHAR(80) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `ai_chat_messages_thread_id_created_at_idx` (`thread_id`, `created_at`),
  INDEX `ai_chat_messages_project_id_created_at_idx` (`project_id`, `created_at`),
  INDEX `ai_chat_messages_user_id_idx` (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_ai_settings` (
  `id` VARCHAR(191) NOT NULL,
  `project_id` VARCHAR(191) NOT NULL,
  `enabled_source_tools` JSON NULL,
  `custom_system_prompt` TEXT NULL,
  `default_provider_profile_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `project_ai_settings_project_id_key` (`project_id`),
  INDEX `project_ai_settings_default_provider_profile_id_idx` (`default_provider_profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ai_chat_threads`
  ADD CONSTRAINT `ai_chat_threads_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ai_chat_threads`
  ADD CONSTRAINT `ai_chat_threads_owner_id_fkey`
    FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ai_chat_threads`
  ADD CONSTRAINT `ai_chat_threads_provider_profile_id_fkey`
    FOREIGN KEY (`provider_profile_id`) REFERENCES `ai_provider_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ai_chat_messages`
  ADD CONSTRAINT `ai_chat_messages_thread_id_fkey`
    FOREIGN KEY (`thread_id`) REFERENCES `ai_chat_threads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ai_chat_messages`
  ADD CONSTRAINT `ai_chat_messages_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ai_chat_messages`
  ADD CONSTRAINT `ai_chat_messages_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `project_ai_settings`
  ADD CONSTRAINT `project_ai_settings_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `project_ai_settings`
  ADD CONSTRAINT `project_ai_settings_default_provider_profile_id_fkey`
    FOREIGN KEY (`default_provider_profile_id`) REFERENCES `ai_provider_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
