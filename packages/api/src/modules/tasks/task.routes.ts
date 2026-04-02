import { Router } from "express";
import { taskController } from "./task.controller";
import { taskCommentController } from "./task-comment.controller";
import { authenticate, authorize, validate, asyncHandler } from "../../shared/middleware";
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema, createCommentSchema, updateCommentSchema } from "./task.validation";

const router: Router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", asyncHandler(taskController.list));
router.get("/:taskId", asyncHandler(taskController.getById));
router.post("/", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), validate(createTaskSchema), asyncHandler(taskController.create));
router.patch("/:taskId", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), validate(updateTaskSchema), asyncHandler(taskController.update));
router.patch("/:taskId/status", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), validate(updateTaskStatusSchema), asyncHandler(taskController.updateStatus));
router.delete("/:taskId", authorize("ADMIN", "PROJECT_MANAGER"), asyncHandler(taskController.delete));

// Comment routes
router.get("/:taskId/comments", asyncHandler(taskCommentController.list));
router.post("/:taskId/comments", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), validate(createCommentSchema), asyncHandler(taskCommentController.create));
router.patch("/:taskId/comments/:commentId", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), validate(updateCommentSchema), asyncHandler(taskCommentController.update));
router.delete("/:taskId/comments/:commentId", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), asyncHandler(taskCommentController.delete));

export default router;
