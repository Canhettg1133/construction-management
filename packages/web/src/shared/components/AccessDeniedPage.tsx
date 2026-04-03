import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import {
  PROJECT_ROLE_LABELS,
  SPECIAL_PRIVILEGE_LABELS,
  SYSTEM_ROLE_LABELS,
  TOOL_LABELS,
  type SpecialPrivilege,
  type ToolId,
} from "@construction/shared";
import { ROUTES } from "../constants/routes";

interface AccessDeniedPageProps {
  title?: string;
  description?: string;
  backTo?: string;
  requiredRole?: string;
  requiredTool?: ToolId;
  requiredPrivilege?: SpecialPrivilege;
}

function resolveRoleLabel(requiredRole?: string) {
  if (!requiredRole) {
    return null;
  }

  const systemRoleLabel = SYSTEM_ROLE_LABELS[requiredRole as keyof typeof SYSTEM_ROLE_LABELS];
  if (systemRoleLabel) {
    return systemRoleLabel;
  }

  const projectRoleLabel = PROJECT_ROLE_LABELS[requiredRole as keyof typeof PROJECT_ROLE_LABELS];
  if (projectRoleLabel) {
    return projectRoleLabel;
  }

  return requiredRole;
}

export function AccessDeniedPage({
  title = "Ban khong co quyen truy cap trang nay",
  description = "Lien he quan tri vien hoac truong ban chi huy de duoc cap quyen.",
  backTo = ROUTES.DASHBOARD,
  requiredRole,
  requiredTool,
  requiredPrivilege,
}: AccessDeniedPageProps) {
  const requirements = [
    requiredRole ? `Vai tro: ${resolveRoleLabel(requiredRole)}` : null,
    requiredTool ? `Cong cu: ${TOOL_LABELS[requiredTool]}` : null,
    requiredPrivilege ? `Quyen dac biet: ${SPECIAL_PRIVILEGE_LABELS[requiredPrivilege]}` : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-600">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="mt-4 text-center">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        {requirements.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Can co:</p>
            <ul className="mt-1 list-disc pl-5">
              {requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lai
          </Link>
        </div>
      </div>
    </div>
  );
}
