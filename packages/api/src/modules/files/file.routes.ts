import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { fileController } from "./file.controller";
import { authenticate, authorize, asyncHandler } from "../../shared/middleware";
import { env } from "../../config/env";
import { LIMITS, ALLOWED_FILE_TYPES } from "@construction/shared";

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
  limits: { fileSize: env.MAX_FILE_SIZE },
});

router.use(authenticate);

router.get("/", asyncHandler(fileController.list));
router.get("/:fileId/download", asyncHandler(fileController.download));
router.post("/", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), upload.single("file"), asyncHandler(fileController.upload));
router.delete("/:fileId", authorize("ADMIN", "PROJECT_MANAGER"), asyncHandler(fileController.delete));

export default router;
