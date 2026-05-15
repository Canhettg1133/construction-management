-- Add audit entity types for AI chat administration events.
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
    'AI_CHAT_THREAD',
    'AI_CHAT_MESSAGE'
  ) NOT NULL;

-- Soft-delete AI chat threads so private history can be hidden without losing auditability.
ALTER TABLE `ai_chat_threads`
  ADD COLUMN `deleted_at` DATETIME(3) NULL;

CREATE INDEX `ai_chat_threads_deleted_at_idx` ON `ai_chat_threads`(`deleted_at`);

-- Track message edits and soft-delete message branches after edit/retry.
ALTER TABLE `ai_chat_messages`
  ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `edited_at` DATETIME(3) NULL,
  ADD COLUMN `deleted_at` DATETIME(3) NULL;

CREATE INDEX `ai_chat_messages_deleted_at_idx` ON `ai_chat_messages`(`deleted_at`);
