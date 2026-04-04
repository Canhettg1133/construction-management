import { useMemo, useState } from "react";

const DEFAULT_ITEMS = [
  "Vat lieu đầu vao dat tieu chưan",
  "Kich thuoc va cao do dung ban ve",
  "Cong tac bao duong be tổng dung quy trinh",
  "Nghiem thu noi bo theo hang muc",
  "Hồ sơ QC da cập nhật day du",
];

export function QualityChecklist() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const completed = useMemo(
    () => DEFAULT_ITEMS.filter((_, idx) => checked[idx]).length,
    [checked]
  );

  return (
    <div className="app-card space-y-3">
      <div className="flex items-center justify-between">
        <h3>QC Checklist</h3>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
          {completed}/{DEFAULT_ITEMS.length}
        </span>
      </div>

      <div className="space-y-2">
        {DEFAULT_ITEMS.map((item, idx) => (
          <label
            key={item}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={Boolean(checked[idx])}
              onChange={(event) =>
                setChecked((prev) => ({ ...prev, [idx]: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}


