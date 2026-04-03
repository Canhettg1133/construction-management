import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { env } from "../../config/env";
import {
  authenticate,
  asyncHandler,
  loadUserPermissions,
  requireProjectMembership,
  requireToolPermission,
} from "../../shared/middleware";
import { reportImageController } from "./report-image.controller";
import { LIMITS, ALLOWED_IMAGE_TYPES } from "@construction/shared";

const router: Router = Router({ mergeParams: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
    cb(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: LIMITS.MAX_IMAGE_SIZE, files: LIMITS.MAX_REPORT_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ hỗ trợ file JPG/PNG"));
    }
  },
});

router.use(authenticate);
router.use(requireProjectMembership());
router.use(loadUserPermissions);

router.get("/", requireToolPermission("DAILY_REPORT", "READ"), asyncHandler(reportImageController.list));
router.get("/:imageId/view", requireToolPermission("DAILY_REPORT", "READ"), asyncHandler(reportImageController.view));
router.post("/", requireToolPermission("DAILY_REPORT", "STANDARD"), upload.array("images", LIMITS.MAX_REPORT_IMAGES), asyncHandler(reportImageController.upload));
router.delete("/:imageId", requireToolPermission("DAILY_REPORT", "ADMIN"), asyncHandler(reportImageController.delete));

export default router;
