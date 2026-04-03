import { Router } from "express";
import {
  asyncHandler,
  authenticate,
  loadUserPermissions,
  requireProjectMembership,
  requireToolPermission,
} from "../../shared/middleware";
import { warehouseController } from "./warehouse.controller";

const router: Router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectMembership());
router.use(loadUserPermissions);

router.get("/inventory", requireToolPermission("WAREHOUSE", "READ"), asyncHandler(warehouseController.listInventory));
router.get(
  "/inventory/:id",
  requireToolPermission("WAREHOUSE", "READ"),
  asyncHandler(warehouseController.getInventoryItem)
);
router.get(
  "/transactions",
  requireToolPermission("WAREHOUSE", "READ"),
  asyncHandler(warehouseController.listTransactions)
);
router.post(
  "/transactions",
  requireToolPermission("WAREHOUSE", "STANDARD"),
  asyncHandler(warehouseController.createTransaction)
);
router.post("/requests", requireToolPermission("WAREHOUSE", "READ"), asyncHandler(warehouseController.createRequest));
router.patch(
  "/requests/:id",
  requireToolPermission("WAREHOUSE", "STANDARD"),
  asyncHandler(warehouseController.updateRequest)
);

export default router;
