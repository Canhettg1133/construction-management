import { Trophy } from "lucide-react";
import type { DashboardActiveMember } from "@construction/shared";

interface ActiveMembersWidgetProps {
  members: DashboardActiveMember[];
}

export function ActiveMembersWidget({ members }: ActiveMembersWidgetProps) {
  const avatarFallback = (name: string) =>
    name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (members.length === 0) {
    return (
      <div className="app-card">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Thành viên tích cực</h3>
        </div>
        <p className="py-4 text-center text-sm text-slate-500">Chưa có hoạt động nổi bật trong tuần này.</p>
      </div>
    );
  }

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-700">Thành viên tích cực</h3>
        <span className="ml-auto text-xs text-slate-400">7 ngày qua</span>
      </div>

      <div className="space-y-3">
        {members.map((member, index) => (
          <div key={member.id} className="flex items-center gap-3">
            <div className="relative">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
                  {avatarFallback(member.name)}
                </div>
              )}
              {index === 0 ? (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px]">
                  *
                </div>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">
                {member.name}
                {index === 0 ? <span className="ml-1 text-xs text-amber-500">(Nổi bật)</span> : null}
              </p>
            </div>

            <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {member.actionCount} hoạt động
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
