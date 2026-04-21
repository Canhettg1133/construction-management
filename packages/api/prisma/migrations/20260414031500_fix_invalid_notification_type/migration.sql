UPDATE `notifications`
SET `type` = CASE
  WHEN `title` IN ('Bạn được giao task mới', 'Ban duoc giao task moi') THEN 'TASK_ASSIGNED'
  WHEN `title` IN ('Task đã quá hạn', 'Task da qua han') THEN 'TASK_OVERDUE'
  WHEN `title` IN (
    'Task đã được duyệt',
    'Task da duoc duyet',
    'Task bị từ chối',
    'Task bi tu choi',
    'Báo cáo đã được duyệt',
    'Bao cao da duoc duyet',
    'Báo cáo bị từ chối',
    'Bao cao bi tu choi'
  ) THEN 'PROJECT_PROGRESS_UPDATE'
  ELSE 'PROJECT_PROGRESS_UPDATE'
END
WHERE `type` = '';
