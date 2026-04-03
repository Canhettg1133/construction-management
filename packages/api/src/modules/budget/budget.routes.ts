import { Router } from "express";
import {
  asyncHandler,
  authenticate,
  loadUserPermissions,
  requireProjectMembership,
  requireSpecialPrivilege,
  requireToolPermission,
} from "../../shared/middleware";
import { budgetController } from "./budget.controller";

const router: Router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectMembership());
router.use(loadUserPermissions);

router.get("/", requireToolPermission("BUDGET", "READ"), asyncHandler(budgetController.getOverview));
router.get("/items", requireToolPermission("BUDGET", "READ"), asyncHandler(budgetController.listItems));
router.post("/items", requireToolPermission("BUDGET", "ADMIN"), asyncHandler(budgetController.createItem));
router.patch("/items/:id", requireToolPermission("BUDGET", "ADMIN"), asyncHandler(budgetController.updateItem));
router.post(
  "/disbursements",
  requireToolPermission("BUDGET", "ADMIN"),
  asyncHandler(budgetController.createDisbursement)
);
router.patch(
  "/disbursements/:id",
  requireSpecialPrivilege("BUDGET_APPROVER"),
  asyncHandler(budgetController.approveDisbursement)
);

export default router;
