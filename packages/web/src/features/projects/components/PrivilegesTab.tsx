import { SPECIAL_PRIVILEGES, SPECIAL_PRIVILEGE_LABELS, type SpecialPrivilege } from '@construction/shared'
import type { ProjectPermissionMatrixResponse } from '../api/projectSettingsApi'
import { projectSettingsApi } from '../api/projectSettingsApi'
import { useUiStore } from '../../../store/uiStore'

interface PrivilegesTabProps {
  projectId: string
  matrix: ProjectPermissionMatrixResponse
  onRefresh: () => Promise<void>
}

function hasPrivilege(matrix: ProjectPermissionMatrixResponse, userId: string, privilege: SpecialPrivilege) {
  return matrix.specialPrivilegeAssignments.find(
    (assignment) => assignment.userId === userId && assignment.privilege === privilege,
  )
}

export function PrivilegesTab({ projectId, matrix, onRefresh }: PrivilegesTabProps) {
  const showToast = useUiStore((state) => state.showToast)

  const togglePrivilege = async (userId: string, privilege: SpecialPrivilege) => {
    const existing = hasPrivilege(matrix, userId, privilege)

    try {
      if (existing) {
        await projectSettingsApi.revokeSpecialPrivilege(projectId, existing.id)
      } else {
        await projectSettingsApi.assignSpecialPrivilege({ projectId, userId, privilege })
      }

      await onRefresh()
      showToast({
        type: 'success',
        title: existing ? 'Đã thu hồi quyền đặc biệt' : 'Đã cấp quyền đặc biệt',
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể cập nhật quyền đặc biệt',
      })
    }
  }

  return (
    <div className="space-y-3">
      <h3>Quyền đặc biệt</h3>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Người dùng</th>
              {SPECIAL_PRIVILEGES.map((privilege) => (
                <th key={privilege} className="px-3 py-2">
                  {SPECIAL_PRIVILEGE_LABELS[privilege]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.members.map((member) => (
              <tr key={member.userId} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 align-top">
                  <p className="font-medium text-slate-900">{member.user.name}</p>
                  <p className="text-xs text-slate-500">{member.user.email}</p>
                </td>
                {SPECIAL_PRIVILEGES.map((privilege) => {
                  const assigned = hasPrivilege(matrix, member.userId, privilege)
                  return (
                    <td key={privilege} className="px-3 py-2 align-top">
                      <button
                        onClick={() => togglePrivilege(member.userId, privilege)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium ${
                          assigned
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {assigned ? 'Đã cấp' : 'Chưa cấp'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="app-card space-y-2">
        <h3>Lịch sử cấp quyền</h3>
        {matrix.specialPrivilegeAssignments.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có phân quyền đặc biệt nào.</p>
        ) : (
          <div className="space-y-2">
            {matrix.specialPrivilegeAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-800">
                  {assignment.user?.name ?? assignment.userId} · {SPECIAL_PRIVILEGE_LABELS[assignment.privilege]}
                </p>
                <p className="text-xs text-slate-500">
                  Cấp bởi {assignment.granter?.name ?? assignment.grantedBy ?? 'Không xác định'} lúc{' '}
                  {new Date(assignment.grantedAt).toLocaleString('vi-VN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
