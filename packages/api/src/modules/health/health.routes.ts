import { Router } from "express";

const router: Router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "construction-api",
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
