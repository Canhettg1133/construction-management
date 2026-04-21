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

// Inventory CRUD
router.get("/inventory", requireToolPermission("WAREHOUSE", "READ"), asyncHandler(warehouseController.listInventory));
router.get("/inventory/:id", requireToolPermission("WAREHOUSE", "READ"), asyncHandler(warehouseController.getInventoryItem));
router.post("/inventory", requireToolPermission("WAREHOUSE", "STANDARD"), asyncHandler(warehouseController.createInventoryItem));
router.patch("/inventory/:id", requireToolPermission("WAREHOUSE", "STANDARD"), asyncHandler(warehouseController.updateInventoryItem));
router.delete("/inventory/:id", requireToolPermission("WAREHOUSE", "ADMIN"), asyncHandler(warehouseController.deleteInventoryItem));

// Transactions
router.get("/transactions", requireToolPermission("WAREHOUSE", "READ"), asyncHandler(warehouseController.listTransactions));
router.post("/transactions", requireToolPermission("WAREHOUSE", "STANDARD"), asyncHandler(warehouseController.createTransaction));
router.post("/requests", requireToolPermission("WAREHOUSE", "READ"), asyncHandler(warehouseController.createRequest));
router.patch("/requests/:id", requireToolPermission("WAREHOUSE", "STANDARD"), asyncHandler(warehouseController.updateRequest));

export default router;