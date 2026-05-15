import { Bot, ShieldCheck } from 'lucide-react'
import { AiSettingsPanel } from '../components/AiSettingsPanel'

export function AiSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Quản trị toàn hệ thống
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-950">Cài đặt AI</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Cấu hình nhà cung cấp, nhóm khóa, nguồn dữ liệu và lời nhắc nền dùng chung cho Trợ lý AI ở mọi dự án.
          </p>
        </div>
        <div className="hidden h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 lg:grid">
          <Bot className="h-6 w-6" />
        </div>
      </div>

      <AiSettingsPanel />
    </div>
  )
}
