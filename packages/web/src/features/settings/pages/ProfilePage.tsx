import { useState } from "react";
import { useAuthStore } from "../../../store/authStore";
import { Button } from "../../../shared/components/Button";
import { useUiStore } from "../../../store/uiStore";

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const showToast = useUiStore((s) => s.showToast);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const onSave = () => {
    if (!user) return;
    setUser({ ...user, name, phone });
    showToast({ type: "success", title: "Đã lưu hồ sơ", description: "Thông tin cá nhân đã được cập nhật." });
  };

  return (
    <div className="app-card mx-auto max-w-xl">
      <div className="mb-5 sm:mb-6">
        <h1>Hồ sơ cá nhân</h1>
        <p className="page-subtitle">Cập nhật thông tin liên hệ để phối hợp công việc thuận tiện hơn.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="form-label">Họ tên</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="form-input" />
        </div>

        <div>
          <label className="form-label">Email</label>
          <input value={user?.email ?? ""} disabled className="form-input cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500" />
        </div>

        <div>
          <label className="form-label">Số điện thoại</label>
          <input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} className="form-input" />
        </div>

        <div className="pt-2">
          <Button onClick={onSave}>Lưu thay đổi</Button>
        </div>
      </div>
    </div>
  );
}
