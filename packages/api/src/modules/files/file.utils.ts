import fs from "fs";
import path from "path";
import { env } from "../../config/env";

export function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-excel": ".xls",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  };
  return map[mimeType] || "";
}

export function detectFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "excel";
  if (mimeType.includes("word") || mimeType.includes("document")) return "document";
  return "other";
}

export function buildProjectFileRelativePath(projectId: string, fileName: string) {
  return path.join("projects", projectId, "files", fileName);
}

export function moveUploadedFileToRelativePath(tempFilePath: string, relativePath: string) {
  const absolutePath = path.resolve(env.UPLOAD_DIR, relativePath);
  const absoluteDir = path.dirname(absolutePath);
  fs.mkdirSync(absoluteDir, { recursive: true });
  fs.renameSync(tempFilePath, absolutePath);
}

export function resolveStoredFilePath(relativePath: string, fileName: string) {
  const primaryPath = path.resolve(env.UPLOAD_DIR, relativePath);
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  // Backward compatibility with old records storing only random filename in UPLOAD_DIR.
  const fallbackPath = path.resolve(env.UPLOAD_DIR, path.basename(fileName));
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  return null;
}
