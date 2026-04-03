import { Link } from "react-router-dom";
import { UserCircle2, KeyRound, ChevronRight } from "lucide-react";
import { Card, CardContent } from "../../../shared/components/Card";
import { ROUTES } from "../../../shared/constants/routes";

const settingsCards = [
  {
    to: ROUTES.SETTINGS_PROFILE,
    icon: UserCircle2,
    title: "Hồ sơ cá nhân",
    description: "Cập nhật thông tin cá nhân và hình đại diện",
    color: "bg-brand-50 text-brand-600",
  },
  {
    to: ROUTES.SETTINGS_CHANGE_PASSWORD,
    icon: KeyRound,
    title: "Đổi mật khẩu",
    description: "Thay đổi mật khẩu để bảo vệ tài khoản",
    color: "bg-amber-50 text-amber-600",
  },
];

export function SettingsIndexPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Cài đặt</h1>
        <p className="mt-1 text-sm text-slate-500">Quản lý tài khoản và cấu hình hệ thống</p>
      </div>

      <div className="space-y-4">
        {settingsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.to} to={card.to} className="block">
              <Card hover>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`grid h-12 w-12 place-items-center rounded-xl ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{card.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500 truncate">{card.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
