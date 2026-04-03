import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { env } from "../../config/env";
import { authenticate, authorize, asyncHandler } from "../../shared/middleware";
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

router.get("/", asyncHandler(reportImageController.list));
router.get("/:imageId/view", asyncHandler(reportImageController.view));
router.post("/", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), upload.array("images", LIMITS.MAX_REPORT_IMAGES), asyncHandler(reportImageController.upload));
router.delete("/:imageId", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), asyncHandler(reportImageController.delete));

export default router;
