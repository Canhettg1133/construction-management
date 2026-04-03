import { Router } from "express";
import { projectController } from "./project.controller";
import { authenticate, authorize, validate, asyncHandler } from "../../shared/middleware";
import { createProjectSchema, updateProjectSchema } from "./project.validation";

const router: Router = Router();

router.use(authenticate);

router.get("/", asyncHandler(projectController.list));
router.get("/:id", asyncHandler(projectController.getById));
router.post("/", authorize("ADMIN"), validate(createProjectSchema), asyncHandler(projectController.create));
router.patch("/:id", authorize("ADMIN"), validate(updateProjectSchema), asyncHandler(projectController.update));

export default router;
