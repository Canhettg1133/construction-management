import { Badge } from "../../../../shared/components/Badge";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

function pendingMyTasksCount(myTasks: Array<{ approvalStatus: string; requiresApproval: boolean }> = []) {
  return myTasks.filter((task) => task.requiresApproval && task.approvalStatus === "PENDING").length;
}

export function PendingBadge() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!data || !role.showPendingApprovals) {
    return null;
  }

  if (role.isAdmin || role.isPM) {
    const total = (data.pendingApprovals?.taskCount ?? 0) + (data.pendingApprovals?.reportCount ?? 0);
    if (total === 0) return null;
    return <Badge variant="warning">{total} mục cần duyệt</Badge>;
  }

  if (role.isSafety) {
    const count = data.pendingSafetyApprovals ?? 0;
    if (count === 0) return null;
    return <Badge variant="warning">{count} báo cáo an toàn chờ duyệt</Badge>;
  }

  if (role.isQuality) {
    const count = data.pendingQualityApprovals ?? 0;
    if (count === 0) return null;
    return <Badge variant="warning">{count} báo cáo chất lượng chờ duyệt</Badge>;
  }

  if (role.isEngineer) {
    const myPending = pendingMyTasksCount(data.myTasks ?? []);
    if (myPending === 0) return null;
    return <Badge>{myPending} công việc chờ duyệt</Badge>;
  }

  return null;
}
