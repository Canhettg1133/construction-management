import { Router } from "express";
import { taskController } from "./task.controller";
import { taskCommentController } from "./task-comment.controller";
import {
  authenticate,
  validate,
  asyncHandler,
  requireProjectMembership,
  loadUserPermissions,
  requireToolPermission,
} from "../../shared/middleware";
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema, createCommentSchema, updateCommentSchema } from "./task.validation";

const router: Router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectMembership());
router.use(loadUserPermissions);

router.get("/", requireToolPermission("TASK", "READ"), asyncHandler(taskController.list));
router.get("/:taskId", requireToolPermission("TASK", "READ"), asyncHandler(taskController.getById));
router.post("/", requireToolPermission("TASK", "STANDARD"), validate(createTaskSchema), asyncHandler(taskController.create));
router.patch("/:taskId", requireToolPermission("TASK", "STANDARD"), validate(updateTaskSchema), asyncHandler(taskController.update));
router.patch("/:taskId/status", requireToolPermission("TASK", "STANDARD"), validate(updateTaskStatusSchema), asyncHandler(taskController.updateStatus));
router.post("/:taskId/submit", requireToolPermission("TASK", "STANDARD"), asyncHandler(taskController.submitForApproval));
router.delete("/:taskId", requireToolPermission("TASK", "ADMIN"), asyncHandler(taskController.delete));

// Comment routes
router.get("/:taskId/comments", requireToolPermission("TASK", "READ"), asyncHandler(taskCommentController.list));
router.post("/:taskId/comments", requireToolPermission("TASK", "STANDARD"), validate(createCommentSchema), asyncHandler(taskCommentController.create));
router.patch("/:taskId/comments/:commentId", requireToolPermission("TASK", "STANDARD"), validate(updateCommentSchema), asyncHandler(taskCommentController.update));
router.delete("/:taskId/comments/:commentId", requireToolPermission("TASK", "ADMIN"), asyncHandler(taskCommentController.delete));

export default router;
