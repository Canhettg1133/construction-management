import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { fileController } from "./file.controller";
import {
  authenticate,
  asyncHandler,
  loadUserPermissions,
  requireProjectMembership,
  requireToolPermission,
} from "../../shared/middleware";
import { env } from "../../config/env";
import { ALLOWED_FILE_TYPES } from "@construction/shared";

const router: Router = Router({ mergeParams: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
    cb(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Multer interprets UTF-8 filenames as Latin1. Decode to UTF-8.
    const decodedName = Buffer.from(file.originalname, "latin1").toString("utf8");
    cb(null, `${Date.now()}-${decodedName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Loai file khong duoc ho tro"));
  },
});

router.use(authenticate);
router.use(requireProjectMembership());
router.use(loadUserPermissions);

router.get("/", requireToolPermission("FILE", "READ"), asyncHandler(fileController.list));
router.get("/:fileId/view", requireToolPermission("FILE", "READ"), asyncHandler(fileController.view));
router.get("/:fileId/download", requireToolPermission("FILE", "READ"), asyncHandler(fileController.download));
router.post("/", requireToolPermission("FILE", "STANDARD"), upload.single("file"), asyncHandler(fileController.upload));
router.post("/upload", requireToolPermission("FILE", "STANDARD"), upload.single("file"), asyncHandler(fileController.upload));
router.delete("/:fileId", requireToolPermission("FILE", "ADMIN"), asyncHandler(fileController.delete));

export default router;
