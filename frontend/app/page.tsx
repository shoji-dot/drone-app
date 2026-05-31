"use client";
import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const PRE_CHECKLIST = [
  "バッテリー残量確認（80%以上）",
  "プロペラ異常なし",
  "GPS信号確認",
  "飛行エリア安全確認",
  "天候・風速確認",
];
const POST_CHECKLIST = [
  "機体着陸確認",
  "プロペラ停止確認",
  "バッテリー取り外し",
  "機体点検・傷なし確認",
  "飛行ログ記録完了",
];

const TASK_CATEGORIES = ["事前確認", "準備", "申請", "見積", "提出"];
const TASK_STATUSES = ["未対応", "対応中", "完了"];
const PROJECT_STATUSES = ["商談中", "受注", "準備中", "実施済", "完了", "キャンセル"];

function useApi(path: string, deps: any[] = []) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await fetch(API + path);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(Array.isArray(json) ? json : []);
    } catch { setData([]); setError(true); }
    setLoading(false);
  }, [path]);
  useEffect(() => { load(); }, [load, ...deps]);
  return { data, loading, error, reload: load };
}

async function api(method: string, path: string, body?: any) {
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function apiGet(path: string) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ── 共通コンポーネント ──────────────────────────────────────

function Badge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending:    { label: "未着手",     bg: "#FEF3C7", color: "#92400E" },
    active:     { label: "進行中",     bg: "#D1FAE5", color: "#065F46" },
    done:       { label: "完了",       bg: "#DBEAFE", color: "#1E40AF" },
    planned:    { label: "予定",       bg: "#EDE9FE", color: "#4C1D95" },
    flying:     { label: "飛行中",     bg: "#FEE2E2", color: "#991B1B" },
    商談中:     { label: "商談中",     bg: "#FEF3C7", color: "#92400E" },
    受注:       { label: "受注",       bg: "#D1FAE5", color: "#065F46" },
    準備中:     { label: "準備中",     bg: "#DBEAFE", color: "#1E40AF" },
    実施済:     { label: "実施済",     bg: "#EDE9FE", color: "#4C1D95" },
    完了:       { label: "完了",       bg: "#F0FDF4", color: "#166534" },
    キャンセル: { label: "キャンセル", bg: "#F3F4F6", color: "#6B7280" },
  };
  const s = map[status] || map.pending;
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{s.label}</span>;
}

function OfflineBanner() {
  return (
    <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12, padding: "12px 16px", margin: "12px 0", fontSize: 13, color: "#991B1B" }}>
      ⚠️ <strong>バックエンドに接続できません</strong><br />
      <code style={{ fontSize: 11, background: "#FEE2E2", padding: "2px 6px", borderRadius: 4 }}>python -m uvicorn main:app --reload --port 8080</code>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "#fff", width: "100%", borderRadius: "20px 20px 0 0", maxHeight: "90vh", overflow: "auto", padding: "24px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: 99, width: 32, height: 32, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FInput({ label, ...props }: { label: string; [k: string]: any }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>{label}</label>
      <input {...props} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, boxSizing: "border-box" as const, outline: "none", fontFamily: "inherit" }} />
    </div>
  );
}

function FTextarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: any; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>{label}</label>
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3}
        style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }} />
    </div>
  );
}

function Btn({ children, onClick, bg = "#111", color = "#fff", style = {} }: {
  children: React.ReactNode; onClick?: () => void; bg?: string; color?: string; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} style={{ background: bg, color, border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", ...style }}>
      {children}
    </button>
  );
}

function EmptyGuide({ icon, message, sub }: { icon: string; message: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 20px", color: "#9CA3AF" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#6B7280" }}>{message}</p>
      {sub && <p style={{ margin: "6px 0 0", fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 撮影条件モーダル
// ═══════════════════════════════════════════════════════════
function ShootingConditionModal({ project, onClose }: { project: any; onClose: () => void }) {
  const emptyForm = { location_detail: "", area_type: "", altitude: "", purpose: "", camera_spec: "", delivery_format: "", scheduled_start: "", scheduled_end: "", remarks: "" };
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/projects/${project.id}/shooting-condition`)
      .then(data => setForm({ ...emptyForm, ...data, altitude: data.altitude ?? "" }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [project.id]);

  async function save() {
    try {
      await api("PUT", `/projects/${project.id}/shooting-condition`, { ...form, altitude: form.altitude ? parseFloat(form.altitude) : null });
      alert("保存しました");
      onClose();
    } catch { alert("保存に失敗しました"); }
  }

  if (loading) return <Modal title="📷 撮影条件" onClose={onClose}><p style={{ textAlign: "center", color: "#9CA3AF" }}>読み込み中...</p></Modal>;

  return (
    <Modal title={`📷 撮影条件 — ${project.name}`} onClose={onClose}>
      <FTextarea label="撮影場所（詳細）" value={form.location_detail} onChange={(e: any) => setForm({ ...form, location_detail: e.target.value })} placeholder="住所・座標など" />
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>エリア種別</label>
        <select value={form.area_type} onChange={e => setForm({ ...form, area_type: e.target.value })}
          style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }}>
          <option value="">選択</option>
          {["DID（人口集中地区）", "山岳", "海上", "市街地", "その他"].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <FInput label="飛行高度 (m)" value={form.altitude} onChange={(e: any) => setForm({ ...form, altitude: e.target.value })} type="number" placeholder="例：50" />
      <FTextarea label="撮影目的・用途" value={form.purpose} onChange={(e: any) => setForm({ ...form, purpose: e.target.value })} placeholder="例：建設現場の進捗確認" />
      <FTextarea label="カメラ・センサー指定" value={form.camera_spec} onChange={(e: any) => setForm({ ...form, camera_spec: e.target.value })} placeholder="例：4K動画、サーマルカメラ" />
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>納品形式</label>
        <select value={form.delivery_format} onChange={e => setForm({ ...form, delivery_format: e.target.value })}
          style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }}>
          <option value="">選択</option>
          {["動画", "静止画", "RAW", "動画+静止画", "その他"].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}><FInput label="撮影希望開始" value={form.scheduled_start} onChange={(e: any) => setForm({ ...form, scheduled_start: e.target.value })} type="datetime-local" /></div>
        <div style={{ flex: 1 }}><FInput label="撮影希望終了" value={form.scheduled_end} onChange={(e: any) => setForm({ ...form, scheduled_end: e.target.value })} type="datetime-local" /></div>
      </div>
      <FTextarea label="特記事項・禁止事項" value={form.remarks} onChange={(e: any) => setForm({ ...form, remarks: e.target.value })} placeholder="例：17時以降は飛行禁止" />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn bg="#F3F4F6" color="#111" onClick={onClose} style={{ flex: 1 }}>キャンセル</Btn>
        <Btn onClick={save} style={{ flex: 2 }}>💾 保存する</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// タスク管理モーダル（改訂版）
// ═══════════════════════════════════════════════════════════
type SortKey = "due_date" | "category" | "status";

function TaskModal({ project, onClose }: { project: any; onClose: () => void }) {
  const { data: tasks, reload } = useApi(`/projects/${project.id}/tasks`, [project.id]);
  const { data: masters } = useApi("/task-masters");

  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editTarget, setEditTarget] = useState<any>(null);
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const [selectedMasterIds, setSelectedMasterIds] = useState<number[]>([]);
  const [masterDates, setMasterDates] = useState<Record<number, string>>({});
  const [masterNotes, setMasterNotes] = useState<Record<number, string>>({});
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editForm, setEditForm] = useState({ title: "", category: "事前確認", status: "未対応", due_date: "", note: "" });

  const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
    未対応: { bg: "#F3F4F6", color: "#6B7280" },
    対応中: { bg: "#FEF3C7", color: "#92400E" },
    完了:   { bg: "#D1FAE5", color: "#065F46" },
  };

  const masterCategories = ["all", ...Array.from(new Set(masters.map((m: any) => m.category)))];

  function calcDueDate(offsetDays: number | null): string {
    if (offsetDays == null || !project.scheduled_date) return "";
    const base = new Date(project.scheduled_date);
    base.setDate(base.getDate() + offsetDays);
    return base.toISOString().slice(0, 10);
  }

  function toggleMaster(m: any) {
    const id = m.id;
    if (selectedMasterIds.includes(id)) {
      setSelectedMasterIds(selectedMasterIds.filter(x => x !== id));
    } else {
      setSelectedMasterIds([...selectedMasterIds, id]);
      if (!masterDates[id]) setMasterDates({ ...masterDates, [id]: calcDueDate(m.default_offset_days) });
    }
  }

  async function saveFromMaster() {
    if (selectedMasterIds.length === 0) return alert("タスクを1つ以上選択してください");
    try {
      for (const id of selectedMasterIds) {
        const m = masters.find((x: any) => x.id === id);
        if (!m) continue;
        await api("POST", `/projects/${project.id}/tasks`, {
          title: m.name, category: m.category, status: "未対応",
          due_date: masterDates[id] || "", note: masterNotes[id] || "",
        });
      }
      reload(); setView("list"); setSelectedMasterIds([]); setMasterDates({}); setMasterNotes({});
    } catch { alert("保存に失敗しました"); }
  }

  async function saveEdit() {
    if (!editForm.title) return alert("タスク名を入力してください");
    try {
      await api("PUT", `/projects/${project.id}/tasks/${editTarget.id}`, editForm);
      reload(); setView("list");
    } catch { alert("保存に失敗しました"); }
  }

  async function changeStatus(t: any, status: string) {
    try { await api("PUT", `/projects/${project.id}/tasks/${t.id}`, { status }); reload(); }
    catch { alert("更新に失敗しました"); }
  }

  async function del(t: any) {
    if (!confirm(`「${t.title}」を削除しますか？`)) return;
    try { await api("DELETE", `/projects/${project.id}/tasks/${t.id}`); reload(); }
    catch { alert("削除に失敗しました"); }
  }

  const sorted = [...tasks].sort((a: any, b: any) => {
    if (sortKey === "due_date") {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1; if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    }
    if (sortKey === "category") { const ci = (v: string) => TASK_CATEGORIES.indexOf(v); return ci(a.category) - ci(b.category); }
    if (sortKey === "status") { const si = (v: string) => TASK_STATUSES.indexOf(v); return si(a.status) - si(b.status); }
    return 0;
  });

  const grouped = sortKey === "category"
    ? TASK_CATEGORIES.map(cat => ({ cat, items: sorted.filter((t: any) => t.category === cat) })).filter(g => g.items.length > 0)
    : [{ cat: null, items: sorted }];

  function isOverdue(t: any) {
    if (!t.due_date || t.status === "完了") return false;
    return new Date(t.due_date) < new Date(new Date().toISOString().slice(0, 10));
  }

  if (view === "list") return (
    <Modal title={`✅ タスク — ${project.name}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "#F3F4F6", borderRadius: 10, padding: 4 }}>
        {([["category", "カテゴリ"], ["due_date", "期限"], ["status", "ステータス"]] as [SortKey, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setSortKey(k)}
            style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: sortKey === k ? "#fff" : "transparent", color: sortKey === k ? "#4F46E5" : "#6B7280",
              boxShadow: sortKey === k ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>{label}</button>
        ))}
      </div>
      {tasks.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, fontSize: 12, color: "#6B7280" }}>
          完了: {tasks.filter((t: any) => t.status === "完了").length} / {tasks.length}
        </div>
      )}
      {grouped.map(({ cat, items }) => (
        <div key={cat || "all"} style={{ marginBottom: 12 }}>
          {cat && <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#374151", background: "#F3F4F6", padding: "4px 10px", borderRadius: 6 }}>{cat}</p>}
          {items.map((t: any) => (
            <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
              <select value={t.status} onChange={e => changeStatus(t, e.target.value)}
                style={{ background: STATUS_COLOR[t.status]?.bg || "#F3F4F6", color: STATUS_COLOR[t.status]?.color || "#6B7280",
                  border: "none", borderRadius: 8, padding: "4px 6px", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
                {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600,
                  textDecoration: t.status === "完了" ? "line-through" : "none",
                  color: t.status === "完了" ? "#9CA3AF" : "#111",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" as const }}>
                  {sortKey !== "category" && <span style={{ fontSize: 11, color: "#9CA3AF" }}>{t.category}</span>}
                  {t.due_date && (
                    <span style={{ fontSize: 11, color: isOverdue(t) ? "#EF4444" : "#6B7280", fontWeight: isOverdue(t) ? 700 : 400 }}>
                      📅 {t.due_date}{isOverdue(t) ? " ⚠️" : ""}
                    </span>
                  )}
                  {t.note && <span style={{ fontSize: 11, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{t.note}</span>}
                </div>
              </div>
              <button onClick={() => { setEditForm({ title: t.title, category: t.category, status: t.status, due_date: t.due_date || "", note: t.note || "" }); setEditTarget(t); setView("edit"); }}
                style={{ background: "none", border: "none", fontSize: 15, cursor: "pointer", flexShrink: 0, padding: "0 2px" }}>✏️</button>
              <button onClick={() => del(t)} style={{ background: "none", border: "none", fontSize: 15, cursor: "pointer", flexShrink: 0, padding: "0 2px" }}>🗑️</button>
            </div>
          ))}
        </div>
      ))}
      {tasks.length === 0 && <EmptyGuide icon="✅" message="タスクがありません" sub="「＋ タスクを追加」から登録してください" />}
      <button onClick={() => { setSelectedMasterIds([]); setFilterCat("all"); setView("add"); }}
        style={{ width: "100%", marginTop: 12, background: "#EEF2FF", color: "#4F46E5", border: "1.5px dashed #A5B4FC", borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
        ＋ タスクを追加
      </button>
    </Modal>
  );

  if (view === "add") return (
    <Modal title="＋ タスクを追加" onClose={() => setView("list")}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 4 }}>
        {masterCategories.map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            style={{ flexShrink: 0, padding: "6px 12px", border: "none", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: filterCat === cat ? "#4F46E5" : "#F3F4F6", color: filterCat === cat ? "#fff" : "#6B7280" }}>
            {cat === "all" ? "すべて" : cat}
          </button>
        ))}
      </div>
      {selectedMasterIds.length > 0 && (
        <div style={{ background: "#EEF2FF", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#4F46E5", fontWeight: 600 }}>
          ✅ {selectedMasterIds.length} 件選択中
        </div>
      )}
      {masters.filter((m: any) => filterCat === "all" || m.category === filterCat).map((m: any) => {
        const selected = selectedMasterIds.includes(m.id);
        const exists = tasks.some((t: any) => t.title === m.name && t.category === m.category);
        return (
          <div key={m.id}>
            <div onClick={() => !exists && toggleMaster(m)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 4, cursor: exists ? "default" : "pointer",
                background: selected ? "#EEF2FF" : exists ? "#F9FAFB" : "#fff",
                border: `1.5px solid ${selected ? "#A5B4FC" : "#E5E7EB"}`, opacity: exists ? 0.5 : 1 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selected ? "#4F46E5" : "#D1D5DB"}`,
                background: selected ? "#4F46E5" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {selected && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111" }}>{m.name}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>{m.category}</span>
                  {m.default_offset_days != null && project.scheduled_date && (
                    <span style={{ fontSize: 11, color: "#6B7280" }}>📅 推奨: {calcDueDate(m.default_offset_days)}</span>
                  )}
                  {exists && <span style={{ fontSize: 11, color: "#9CA3AF" }}>登録済み</span>}
                </div>
                {m.description && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF" }}>{m.description}</p>}
              </div>
            </div>
            {selected && (
              <div style={{ background: "#F0EDFF", border: "1px solid #C4B5FD", borderRadius: 10, padding: "10px 12px", marginBottom: 8, marginLeft: 30 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 3 }}>期限</label>
                    <input type="date" value={masterDates[m.id] || ""} onChange={e => setMasterDates({ ...masterDates, [m.id]: e.target.value })}
                      style={{ width: "100%", border: "1px solid #C4B5FD", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 3 }}>メモ</label>
                    <input type="text" value={masterNotes[m.id] || ""} onChange={e => setMasterNotes({ ...masterNotes, [m.id]: e.target.value })}
                      placeholder="補足など"
                      style={{ width: "100%", border: "1px solid #C4B5FD", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {masters.filter((m: any) => filterCat === "all" || m.category === filterCat).length === 0 && (
        <EmptyGuide icon="📋" message="マスタータスクがありません" sub="バックエンドの /task-masters を確認してください" />
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Btn bg="#F3F4F6" color="#111" onClick={() => setView("list")} style={{ flex: 1 }}>戻る</Btn>
        <Btn onClick={saveFromMaster} style={{ flex: 2 }}>💾 {selectedMasterIds.length > 0 ? `${selectedMasterIds.length}件を追加` : "追加する"}</Btn>
      </div>
    </Modal>
  );

  return (
    <Modal title="✏️ タスク編集" onClose={() => setView("list")}>
      <FInput label="タスク名 *" value={editForm.title} onChange={(e: any) => setEditForm({ ...editForm, title: e.target.value })} placeholder="例：飛行許可申請" />
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>カテゴリ</label>
          <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
            style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit" }}>
            {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>ステータス</label>
          <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
            style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit" }}>
            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <FInput label="期限" value={editForm.due_date} onChange={(e: any) => setEditForm({ ...editForm, due_date: e.target.value })} type="date" />
      <FTextarea label="メモ" value={editForm.note} onChange={(e: any) => setEditForm({ ...editForm, note: e.target.value })} placeholder="補足事項など" />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn bg="#F3F4F6" color="#111" onClick={() => setView("list")} style={{ flex: 1 }}>戻る</Btn>
        <Btn onClick={saveEdit} style={{ flex: 2 }}>保存する</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// 機体管理モーダル
// ═══════════════════════════════════════════════════════════
function DroneManagerModal({ onClose, onReload }: { onClose: () => void; onReload: () => void }) {
  const { data: drones, reload } = useApi("/drones");
  const [form, setForm] = useState({ name: "", serial: "" });
  const [editTarget, setEditTarget] = useState<any>(null);

  function openAdd() { setForm({ name: "", serial: "" }); setEditTarget("add"); }
  function openEdit(d: any) { setForm({ name: d.name, serial: d.serial || "" }); setEditTarget(d); }
  function cancelEdit() { setEditTarget(null); setForm({ name: "", serial: "" }); }

  async function save() {
    if (!form.name) return alert("機体名を入力してください");
    try {
      editTarget === "add" ? await api("POST", "/drones", form) : await api("PUT", `/drones/${editTarget.id}`, form);
      cancelEdit(); reload(); onReload();
    } catch { alert("保存に失敗しました"); }
  }

  async function del(d: any) {
    if (!confirm(`「${d.name}」を削除しますか？`)) return;
    try { await api("DELETE", `/drones/${d.id}`); reload(); onReload(); } catch { alert("削除に失敗しました"); }
  }

  return (
    <Modal title="🚁 機体管理" onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        {drones.map((d: any) => (
          <div key={d.id}>
            {editTarget?.id !== d.id && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>🚁 {d.name}</p>
                  {d.serial && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>S/N: {d.serial}</p>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openEdit(d)} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>編集</button>
                  <button onClick={() => del(d)} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>削除</button>
                </div>
              </div>
            )}
            {editTarget?.id === d.id && (
              <div style={{ background: "#F0F9FF", border: "1.5px solid #BAE6FD", borderRadius: 12, padding: 14, margin: "8px 0" }}>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#0369A1", fontWeight: 600 }}>✏️ 編集中</p>
                <FInput label="機体名 *" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="例：DJI Mini 4 Pro" />
                <FInput label="シリアル番号" value={form.serial} onChange={(e: any) => setForm({ ...form, serial: e.target.value })} placeholder="例：SN-12345" />
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn bg="#F3F4F6" color="#111" onClick={cancelEdit} style={{ flex: 1, padding: "10px 0" }}>キャンセル</Btn>
                  <Btn onClick={save} style={{ flex: 2, padding: "10px 0" }}>保存する</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
        {drones.length === 0 && <p style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", padding: 16 }}>機体が登録されていません</p>}
      </div>
      {editTarget === "add" ? (
        <div style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: 16 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#374151", fontWeight: 600 }}>＋ 新しい機体</p>
          <FInput label="機体名 *" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="例：DJI Mini 4 Pro" />
          <FInput label="シリアル番号" value={form.serial} onChange={(e: any) => setForm({ ...form, serial: e.target.value })} placeholder="例：SN-12345" />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn bg="#F3F4F6" color="#111" onClick={cancelEdit} style={{ flex: 1, padding: "10px 0" }}>キャンセル</Btn>
            <Btn onClick={save} style={{ flex: 2, padding: "10px 0" }}>追加する</Btn>
          </div>
        </div>
      ) : (
        !editTarget && (
          <button onClick={openAdd} style={{ width: "100%", background: "#EEF2FF", color: "#4F46E5", border: "1.5px dashed #A5B4FC", borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            ＋ 新しい機体を追加
          </button>
        )
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// 飛行中カード
// ═══════════════════════════════════════════════════════════
function ActiveFlightCard({ flight, projects, onFinished }: { flight: any; projects: any[]; onFinished: () => void }) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState(flight.memo || "");
  const [postChecks, setPostChecks] = useState<Record<number, boolean>>({});
  const proj = projects.find((p: any) => p.id === flight.project_id);
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const tick = () => {
      if (!flight.start_time) return;
      const ms = Date.now() - new Date(flight.start_time).getTime();
      const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [flight.start_time]);

  async function endFlight() {
    try {
      await api("PUT", `/flights/${flight.id}`, { status: "done", end_time: new Date().toISOString(), memo });
      for (let i = 0; i < POST_CHECKLIST.length; i++)
        await api("POST", "/checklists", { flight_id: flight.id, type: "post", item: POST_CHECKLIST[i], checked: !!postChecks[i] });
      setOpen(false); onFinished();
    } catch { alert("保存に失敗しました"); }
  }

  return (
    <>
      <div style={{ background: "#FEF2F2", borderRadius: 14, padding: 16, border: "1px solid #FCA5A5", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{proj?.name || `飛行 #${flight.id}`}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>開始: {flight.start_time ? new Date(flight.start_time).toLocaleTimeString("ja-JP") : ""}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <Badge status="flying" />
            <p style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 700, color: "#EF4444", fontVariantNumeric: "tabular-nums" }}>⏱ {elapsed}</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} style={{ width: "100%", background: "#EF4444", color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>🛬 飛行終了・記録する</button>
      </div>
      {open && (
        <Modal title="飛行終了" onClose={() => setOpen(false)}>
          <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{proj?.name || `飛行 #${flight.id}`}</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>開始: {flight.start_time ? new Date(flight.start_time).toLocaleString("ja-JP") : ""}</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#EF4444", fontWeight: 600 }}>経過時間: {elapsed}</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 6 }}>メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3} placeholder="飛行状況・特記事項..."
              style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }} />
          </div>
          <h4 style={{ fontSize: 13, color: "#374151", margin: "0 0 10px" }}>🛬 飛行後チェック</h4>
          {POST_CHECKLIST.map((item, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}>
              <input type="checkbox" checked={!!postChecks[i]} onChange={e => setPostChecks({ ...postChecks, [i]: e.target.checked })} style={{ width: 20, height: 20, accentColor: "#10B981" }} />
              <span style={{ fontSize: 14 }}>{item}</span>
            </label>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <Btn bg="#F3F4F6" color="#111" onClick={() => setOpen(false)} style={{ flex: 1 }}>キャンセル</Btn>
            <Btn bg="#10B981" onClick={endFlight} style={{ flex: 2 }}>✅ 完了・保存</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// HOME TAB
// ═══════════════════════════════════════════════════════════
function HomeTab({ onGoTo }: { onGoTo: (tab: string) => void }) {
  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState("");
  const [droneId, setDroneId] = useState("");
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const [flightId, setFlightId] = useState<number | null>(null);
  const [memo, setMemo] = useState("");
  const [postChecks, setPostChecks] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);
  const [showDroneMgr, setShowDroneMgr] = useState(false);
  const { data: projects, error } = useApi("/projects");
  const { data: drones, reload: reloadDrones } = useApi("/drones");
  const { data: flights, reload } = useApi("/flights");
  const activeFlights = flights.filter((f: any) => f.status === "flying");
  const proj = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId)) : null;

  async function startFlight() {
    if (!PRE_CHECKLIST.every((_, i) => checks[i])) return alert("全チェック項目を確認してください");
    try {
      const f = await api("POST", "/flights", { project_id: parseInt(projectId), drone_id: parseInt(droneId), status: "flying", start_time: new Date().toISOString() });
      for (let i = 0; i < PRE_CHECKLIST.length; i++)
        await api("POST", "/checklists", { flight_id: f.id, type: "pre", item: PRE_CHECKLIST[i], checked: true });
      setFlightId(f.id); setStep(3); reload();
    } catch { alert("バックエンドに接続できません"); }
  }

  async function endFlight() {
    try {
      await api("PUT", `/flights/${flightId}`, { status: "done", end_time: new Date().toISOString(), memo });
      for (let i = 0; i < POST_CHECKLIST.length; i++)
        await api("POST", "/checklists", { flight_id: flightId, type: "post", item: POST_CHECKLIST[i], checked: !!postChecks[i] });
      setDone(true); setStep(0);
      setProjectId(""); setDroneId(""); setChecks({}); setMemo(""); setPostChecks({});
      setTimeout(() => setDone(false), 3000);
      reload();
    } catch { alert("保存に失敗しました"); }
  }

  return (
    <div style={{ padding: "0 20px 100px" }}>
      {error && <OfflineBanner />}
      <div style={{ background: "linear-gradient(135deg,#0F172A,#1E3A5F)", borderRadius: 20, padding: "28px 24px", margin: "20px 0", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -10, top: -10, fontSize: 80, opacity: 0.1 }}>🚁</div>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "#94A3B8" }}>ドローン業務管理</p>
        <h1 style={{ margin: "0 0 20px", fontSize: 26, fontWeight: 800 }}>DroneOps</h1>
        {step === 0 && <button onClick={() => setStep(1)} style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 14, padding: "14px 28px", fontSize: 17, fontWeight: 700, cursor: "pointer", width: "100%" }}>🚀 飛行開始</button>}
        {step > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {["案件選択", "事前確認", "飛行中"].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", margin: "0 auto 4px", background: step > i ? "#3B82F6" : step === i+1 ? "#60A5FA" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{i+1}</div>
                <div style={{ fontSize: 10, color: step >= i+1 ? "#93C5FD" : "#475569" }}>{s}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {done && <div style={{ background: "#D1FAE5", borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center", color: "#065F46", fontWeight: 600 }}>✅ 飛行を完了しました！</div>}

      {step === 1 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>STEP 1 — 案件・機体の選択</h3>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>案件 *</label>
              <button onClick={() => onGoTo("projects")} style={{ fontSize: 11, color: "#3B82F6", background: "none", border: "none", cursor: "pointer", padding: 0 }}>＋ 案件を追加 →</button>
            </div>
            {projects.length === 0 ? (
              <div style={{ background: "#FFF7ED", border: "1.5px dashed #FCD34D", borderRadius: 10, padding: 14, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#92400E", fontWeight: 600 }}>案件が登録されていません</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                  <button onClick={() => onGoTo("customers")} style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>👥 顧客を登録</button>
                  <button onClick={() => onGoTo("projects")} style={{ background: "#fff", color: "#92400E", border: "1px solid #FCD34D", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📋 案件を登録</button>
                </div>
              </div>
            ) : (
              <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", background: "#fff" }}>
                <option value="">選択してください</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>機体 *</label>
              <button onClick={() => setShowDroneMgr(true)} style={{ fontSize: 11, color: "#3B82F6", background: "none", border: "none", cursor: "pointer", padding: 0 }}>＋ 機体を追加・管理 →</button>
            </div>
            {drones.length === 0 ? (
              <div style={{ background: "#EFF6FF", border: "1.5px dashed #93C5FD", borderRadius: 10, padding: 14, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#1E40AF", fontWeight: 600 }}>機体が登録されていません</p>
                <button onClick={() => setShowDroneMgr(true)} style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>🚁 機体を追加する</button>
              </div>
            ) : (
              <>
                <select value={droneId} onChange={e => setDroneId(e.target.value)} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", background: "#fff", marginBottom: 8 }}>
                  <option value="">選択してください</option>
                  {drones.map((d: any) => <option key={d.id} value={d.id}>{d.name}{d.serial ? ` (${d.serial})` : ""}</option>)}
                </select>
                <button onClick={() => setShowDroneMgr(true)} style={{ width: "100%", background: "#F9FAFB", color: "#6B7280", border: "1px solid #E5E7EB", borderRadius: 10, padding: "8px 0", fontSize: 13, cursor: "pointer" }}>🔧 機体を追加・編集する</button>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn bg="#F3F4F6" color="#111" onClick={() => setStep(0)} style={{ flex: 1 }}>キャンセル</Btn>
            <Btn onClick={() => { if (!projectId) return alert("案件を選択してください"); if (!droneId) return alert("機体を選択してください"); setStep(2); }} style={{ flex: 2 }}>次へ →</Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>STEP 2 — 飛行前チェック</h3>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 16px" }}>全項目を確認してチェックを入れてください</p>
          {PRE_CHECKLIST.map((item, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}>
              <input type="checkbox" checked={!!checks[i]} onChange={e => setChecks({ ...checks, [i]: e.target.checked })} style={{ width: 20, height: 20, accentColor: "#3B82F6" }} />
              <span style={{ fontSize: 14 }}>{item}</span>
            </label>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <Btn bg="#F3F4F6" color="#111" onClick={() => setStep(1)} style={{ flex: 1 }}>戻る</Btn>
            <Btn bg="#EF4444" onClick={startFlight} style={{ flex: 2 }}>🚁 飛行開始</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🚁</div>
            <h3 style={{ margin: 0, color: "#EF4444", fontSize: 18 }}>飛行中</h3>
            {proj && <p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0" }}>{proj.name}</p>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 6 }}>メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3} placeholder="飛行状況・特記事項..." style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }} />
          </div>
          <h4 style={{ fontSize: 14, margin: "0 0 12px" }}>飛行後チェック</h4>
          {POST_CHECKLIST.map((item, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}>
              <input type="checkbox" checked={!!postChecks[i]} onChange={e => setPostChecks({ ...postChecks, [i]: e.target.checked })} style={{ width: 20, height: 20, accentColor: "#10B981" }} />
              <span style={{ fontSize: 14 }}>{item}</span>
            </label>
          ))}
          <button onClick={endFlight} style={{ width: "100%", marginTop: 20, background: "#10B981", color: "#fff", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>✅ 飛行終了・記録保存</button>
        </div>
      )}

      {activeFlights.length > 0 && step === 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>現在飛行中</h3>
          {activeFlights.map((f: any) => <ActiveFlightCard key={f.id} flight={f} projects={projects} onFinished={reload} />)}
        </div>
      )}

      {step === 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>最近の飛行</h3>
          {flights.filter((f: any) => f.status === "done").slice(0, 3).map((f: any) => (
            <div key={f.id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E5E7EB", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>飛行 #{f.id}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>{f.start_time ? new Date(f.start_time).toLocaleDateString("ja-JP") : ""}</p>
              </div>
              <Badge status={f.status} />
            </div>
          ))}
          {flights.filter((f: any) => f.status === "done").length === 0 && !error && <EmptyGuide icon="🚁" message="飛行記録がありません" sub="「飛行開始」から記録を始めましょう" />}
        </div>
      )}
      {showDroneMgr && <DroneManagerModal onClose={() => setShowDroneMgr(false)} onReload={reloadDrones} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CUSTOMERS TAB
// ═══════════════════════════════════════════════════════════
function CustomersTab() {
  const { data: customers, error, reload } = useApi("/customers");
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", note: "" });

  async function save() {
    if (!form.name) return alert("名前を入力してください");
    try {
      modal === "add" ? await api("POST", "/customers", form) : await api("PUT", `/customers/${modal.id}`, form);
      reload(); setModal(null);
    } catch { alert("保存に失敗しました"); }
  }

  async function del(id: number) {
    if (!confirm("削除しますか？")) return;
    try { await api("DELETE", `/customers/${id}`); reload(); } catch { alert("削除に失敗しました"); }
  }

  return (
    <div style={{ padding: "0 20px 100px" }}>
      {error && <OfflineBanner />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 16px" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>顧客管理</h2>
        <Btn onClick={() => { setForm({ name: "", company: "", email: "", phone: "", note: "" }); setModal("add"); }} style={{ padding: "8px 16px", fontSize: 14 }}>＋ 追加</Btn>
      </div>
      {customers.map((c: any) => (
        <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #E5E7EB", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#4F46E5", flexShrink: 0 }}>{c.name[0]}</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{c.name}</p>
                  {c.company && <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>{c.company}</p>}
                </div>
              </div>
              {c.phone && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>📞 {c.phone}</p>}
              {c.email && <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>✉️ {c.email}</p>}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => { setForm(c); setModal(c); }} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>編集</button>
              <button onClick={() => del(c.id)} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>削除</button>
            </div>
          </div>
        </div>
      ))}
      {customers.length === 0 && !error && <EmptyGuide icon="👥" message="顧客がいません" sub="「＋ 追加」から登録してください" />}
      {modal && (
        <Modal title={modal === "add" ? "顧客追加" : "顧客編集"} onClose={() => setModal(null)}>
          <FInput label="氏名 *" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="山田 太郎" />
          <FInput label="会社名" value={form.company || ""} onChange={(e: any) => setForm({ ...form, company: e.target.value })} placeholder="株式会社〇〇" />
          <FInput label="電話番号" value={form.phone || ""} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} placeholder="090-0000-0000" type="tel" />
          <FInput label="メール" value={form.email || ""} onChange={(e: any) => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" type="email" />
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>メモ</label>
            <textarea value={form.note || ""} onChange={(e: any) => setForm({ ...form, note: e.target.value })} rows={3} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }} />
          </div>
          <Btn onClick={save} style={{ width: "100%" }}>保存</Btn>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 見積モーダル
// ═══════════════════════════════════════════════════════════
const YEN = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;
const EMPTY_ITEM = () => ({ name: "", description: "", quantity: 1, unit: "式", unit_price: 0 });

function EstimateModal({ project, onClose }: { project: any; onClose: () => void }) {
  const { data: estimates, reload } = useApi(`/projects/${project.id}/estimates`, [project.id]);
  const [view, setView] = useState<"list" | "form">("list");
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ issue_date: "", valid_until: "", tax_rate: 0.1, notes: "", items: [EMPTY_ITEM()] });

  function openAdd() {
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    setForm({ issue_date: today, valid_until: nextMonth, tax_rate: 0.1, notes: "", items: [EMPTY_ITEM()] });
    setEditTarget(null); setView("form");
  }

  function openEdit(e: any) {
    setForm({
      issue_date: e.issue_date || "", valid_until: e.valid_until || "", tax_rate: e.tax_rate, notes: e.notes || "",
      items: e.items.map((i: any) => ({ name: i.name, description: i.description || "", quantity: i.quantity, unit: i.unit, unit_price: i.unit_price })),
    });
    setEditTarget(e); setView("form");
  }

  function setItem(idx: number, key: string, val: any) {
    setForm({ ...form, items: form.items.map((it, i) => i === idx ? { ...it, [key]: val } : it) });
  }

  const subtotal = form.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const tax = Math.round(subtotal * form.tax_rate);
  const total = subtotal + tax;

  async function save() {
    try {
      const body = { ...form, project_id: project.id };
      editTarget ? await api("PUT", `/projects/${project.id}/estimates/${editTarget.id}`, body) : await api("POST", `/projects/${project.id}/estimates`, body);
      reload(); setView("list");
    } catch { alert("保存に失敗しました"); }
  }

  async function del(e: any) {
    if (!confirm(`${e.estimate_number} を削除しますか？`)) return;
    try { await api("DELETE", `/projects/${project.id}/estimates/${e.id}`); reload(); } catch { alert("削除に失敗しました"); }
  }

  async function downloadWord(e: any) {
    const res = await fetch(`${API}/projects/${project.id}/estimates/${e.id}/word`);
    if (!res.ok) { alert("出力に失敗しました"); return; }
    const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${e.estimate_number}.docx`; a.click();
  }

  async function createInvoice(e: any) {
    if (!confirm(`${e.estimate_number} から請求書を作成しますか？`)) return;
    try { await api("POST", `/projects/${project.id}/invoices`, { project_id: project.id, estimate_id: e.id, tax_rate: e.tax_rate }); alert("請求書を作成しました"); }
    catch { alert("作成に失敗しました"); }
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft: { bg: "#F3F4F6", color: "#6B7280" }, sent: { bg: "#DBEAFE", color: "#1E40AF" },
    approved: { bg: "#D1FAE5", color: "#065F46" }, rejected: { bg: "#FEE2E2", color: "#991B1B" },
  };
  const statusLabels: Record<string, string> = { draft: "下書き", sent: "送付済", approved: "承認済", rejected: "却下" };

  if (view === "list") return (
    <Modal title={`💴 見積書 — ${project.name}`} onClose={onClose}>
      {estimates.map((e: any) => (
        <div key={e.id} style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{e.estimate_number}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>発行日: {e.issue_date}{e.valid_until ? ` / 有効期限: ${e.valid_until}` : ""}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: statusColors[e.status]?.bg, color: statusColors[e.status]?.color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{statusLabels[e.status] || e.status}</span>
              <select value={e.status} onChange={async ev => { await api("PATCH", `/projects/${project.id}/estimates/${e.id}/status?status=${ev.target.value}`, {}); reload(); }}
                style={{ fontSize: 11, border: "1px solid #E5E7EB", borderRadius: 6, padding: "2px 4px", cursor: "pointer" }}>
                {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: "#1F4E79" }}>{YEN(e.total)} <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 400 }}>（税込）</span></p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            <button onClick={() => openEdit(e)} style={{ flex: 1, minWidth: 60, background: "#F3F4F6", border: "none", borderRadius: 8, padding: "7px 0", fontSize: 12, cursor: "pointer" }}>✏️ 編集</button>
            <button onClick={() => downloadWord(e)} style={{ flex: 1, minWidth: 60, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 8, padding: "7px 0", fontSize: 12, cursor: "pointer" }}>📄 Word</button>
            <button onClick={() => createInvoice(e)} style={{ flex: 1, minWidth: 60, background: "#F0FDF4", color: "#166534", border: "1px solid #86EFAC", borderRadius: 8, padding: "7px 0", fontSize: 12, cursor: "pointer" }}>🧾 請求書化</button>
            <button onClick={() => del(e)} style={{ flex: 1, minWidth: 60, background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "7px 0", fontSize: 12, cursor: "pointer" }}>🗑️</button>
          </div>
        </div>
      ))}
      {estimates.length === 0 && <EmptyGuide icon="💴" message="見積書がありません" />}
      <button onClick={openAdd} style={{ width: "100%", marginTop: 8, background: "#EEF2FF", color: "#4F46E5", border: "1.5px dashed #A5B4FC", borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>＋ 新規見積書</button>
    </Modal>
  );

  return (
    <Modal title={editTarget ? `✏️ 見積編集` : "＋ 新規見積書"} onClose={() => setView("list")}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}><FInput label="発行日" value={form.issue_date} onChange={(e: any) => setForm({ ...form, issue_date: e.target.value })} type="date" /></div>
        <div style={{ flex: 1 }}><FInput label="有効期限" value={form.valid_until} onChange={(e: any) => setForm({ ...form, valid_until: e.target.value })} type="date" /></div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>消費税率</label>
        <select value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: parseFloat(e.target.value) })}
          style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }}>
          <option value={0.1}>10%</option><option value={0.08}>8%（軽減）</option><option value={0}>非課税</option>
        </select>
      </div>
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#374151" }}>明細</p>
      {form.items.map((it, idx) => (
        <div key={idx} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>明細 {idx + 1}</span>
            {form.items.length > 1 && <button onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} style={{ background: "none", border: "none", color: "#EF4444", fontSize: 16, cursor: "pointer" }}>×</button>}
          </div>
          <FInput label="項目名 *" value={it.name} onChange={(e: any) => setItem(idx, "name", e.target.value)} placeholder="例：空撮撮影費" />
          <FInput label="詳細（任意）" value={it.description} onChange={(e: any) => setItem(idx, "description", e.target.value)} placeholder="例：4K動画撮影 半日" />
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1 }}><FInput label="数量" value={it.quantity} onChange={(e: any) => setItem(idx, "quantity", parseFloat(e.target.value) || 0)} type="number" /></div>
            <div style={{ width: 64 }}>
              <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>単位</label>
              <select value={it.unit} onChange={e => setItem(idx, "unit", e.target.value)} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 6px", fontSize: 14, fontFamily: "inherit" }}>
                {["式", "個", "本", "枚", "時間", "日", "件"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}><FInput label="単価 (¥)" value={it.unit_price} onChange={(e: any) => setItem(idx, "unit_price", parseFloat(e.target.value) || 0)} type="number" /></div>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280", textAlign: "right" }}>小計: <strong>{YEN(it.quantity * it.unit_price)}</strong></p>
        </div>
      ))}
      <button onClick={() => setForm({ ...form, items: [...form.items, EMPTY_ITEM()] })}
        style={{ width: "100%", background: "#F9FAFB", border: "1.5px dashed #D1D5DB", borderRadius: 10, padding: "10px 0", fontSize: 13, color: "#6B7280", cursor: "pointer", marginBottom: 14 }}>＋ 明細を追加</button>
      <div style={{ background: "#EBF3FA", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#374151", marginBottom: 4 }}><span>小計</span><span>{YEN(subtotal)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#374151", marginBottom: 6 }}><span>消費税</span><span>{YEN(tax)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "#1F4E79" }}><span>合計</span><span>{YEN(total)}</span></div>
      </div>
      <FTextarea label="備考" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} placeholder="支払条件・振込先など" />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn bg="#F3F4F6" color="#111" onClick={() => setView("list")} style={{ flex: 1 }}>戻る</Btn>
        <Btn onClick={save} style={{ flex: 2 }}>💾 保存する</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// 請求書モーダル
// ═══════════════════════════════════════════════════════════
function InvoiceModal({ project, onClose }: { project: any; onClose: () => void }) {
  const { data: invoices, reload } = useApi(`/projects/${project.id}/invoices`, [project.id]);
  const [view, setView] = useState<"list" | "form">("list");
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ issue_date: "", due_date: "", tax_rate: 0.1, notes: "", items: [EMPTY_ITEM()] });

  function openAdd() {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    setForm({ issue_date: today, due_date: due, tax_rate: 0.1, notes: "", items: [EMPTY_ITEM()] });
    setEditTarget(null); setView("form");
  }

  function openEdit(inv: any) {
    setForm({
      issue_date: inv.issue_date || "", due_date: inv.due_date || "", tax_rate: inv.tax_rate, notes: inv.notes || "",
      items: inv.items.map((i: any) => ({ name: i.name, description: i.description || "", quantity: i.quantity, unit: i.unit, unit_price: i.unit_price })),
    });
    setEditTarget(inv); setView("form");
  }

  function setItem(idx: number, key: string, val: any) {
    setForm({ ...form, items: form.items.map((it, i) => i === idx ? { ...it, [key]: val } : it) });
  }

  const subtotal = form.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const tax = Math.round(subtotal * form.tax_rate);
  const total = subtotal + tax;

  async function save() {
    try {
      const body = { ...form, project_id: project.id };
      editTarget ? await api("PUT", `/projects/${project.id}/invoices/${editTarget.id}`, body) : await api("POST", `/projects/${project.id}/invoices`, body);
      reload(); setView("list");
    } catch { alert("保存に失敗しました"); }
  }

  async function del(inv: any) {
    if (!confirm(`${inv.invoice_number} を削除しますか？`)) return;
    try { await api("DELETE", `/projects/${project.id}/invoices/${inv.id}`); reload(); } catch { alert("削除に失敗しました"); }
  }

  async function downloadWord(inv: any) {
    const res = await fetch(`${API}/projects/${project.id}/invoices/${inv.id}/word`);
    if (!res.ok) { alert("出力に失敗しました"); return; }
    const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${inv.invoice_number}.docx`; a.click();
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    unpaid: { bg: "#FEF3C7", color: "#92400E" }, paid: { bg: "#D1FAE5", color: "#065F46" },
    overdue: { bg: "#FEE2E2", color: "#991B1B" }, cancelled: { bg: "#F3F4F6", color: "#6B7280" },
  };
  const statusLabels: Record<string, string> = { unpaid: "未払い", paid: "支払済", overdue: "支払期限超過", cancelled: "キャンセル" };

  if (view === "list") return (
    <Modal title={`🧾 請求書 — ${project.name}`} onClose={onClose}>
      {invoices.map((inv: any) => (
        <div key={inv.id} style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{inv.invoice_number}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>発行: {inv.issue_date}{inv.due_date ? ` / 支払期限: ${inv.due_date}` : ""}</p>
              {inv.estimate_id && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF" }}>見積書から作成</p>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: statusColors[inv.status]?.bg, color: statusColors[inv.status]?.color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{statusLabels[inv.status] || inv.status}</span>
              <select value={inv.status} onChange={async ev => { await api("PATCH", `/projects/${project.id}/invoices/${inv.id}/status?status=${ev.target.value}`, {}); reload(); }}
                style={{ fontSize: 11, border: "1px solid #E5E7EB", borderRadius: 6, padding: "2px 4px", cursor: "pointer" }}>
                {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: "#1F4E79" }}>{YEN(inv.total)} <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 400 }}>（税込）</span></p>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => openEdit(inv)} style={{ flex: 1, background: "#F3F4F6", border: "none", borderRadius: 8, padding: "7px 0", fontSize: 12, cursor: "pointer" }}>✏️ 編集</button>
            <button onClick={() => downloadWord(inv)} style={{ flex: 1, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 8, padding: "7px 0", fontSize: 12, cursor: "pointer" }}>📄 Word</button>
            <button onClick={() => del(inv)} style={{ flex: 1, background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "7px 0", fontSize: 12, cursor: "pointer" }}>🗑️</button>
          </div>
        </div>
      ))}
      {invoices.length === 0 && <EmptyGuide icon="🧾" message="請求書がありません" sub="「＋ 新規請求書」または見積書から作成できます" />}
      <button onClick={openAdd} style={{ width: "100%", marginTop: 8, background: "#FFF7ED", color: "#92400E", border: "1.5px dashed #FCD34D", borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>＋ 新規請求書</button>
    </Modal>
  );

  return (
    <Modal title={editTarget ? "✏️ 請求書編集" : "＋ 新規請求書"} onClose={() => setView("list")}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}><FInput label="発行日" value={form.issue_date} onChange={(e: any) => setForm({ ...form, issue_date: e.target.value })} type="date" /></div>
        <div style={{ flex: 1 }}><FInput label="支払期限" value={form.due_date} onChange={(e: any) => setForm({ ...form, due_date: e.target.value })} type="date" /></div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>消費税率</label>
        <select value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: parseFloat(e.target.value) })}
          style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }}>
          <option value={0.1}>10%</option><option value={0.08}>8%（軽減）</option><option value={0}>非課税</option>
        </select>
      </div>
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#374151" }}>明細</p>
      {form.items.map((it, idx) => (
        <div key={idx} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>明細 {idx + 1}</span>
            {form.items.length > 1 && <button onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} style={{ background: "none", border: "none", color: "#EF4444", fontSize: 16, cursor: "pointer" }}>×</button>}
          </div>
          <FInput label="項目名 *" value={it.name} onChange={(e: any) => setItem(idx, "name", e.target.value)} placeholder="例：空撮撮影費" />
          <FInput label="詳細（任意）" value={it.description} onChange={(e: any) => setItem(idx, "description", e.target.value)} placeholder="例：4K動画撮影 半日" />
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1 }}><FInput label="数量" value={it.quantity} onChange={(e: any) => setItem(idx, "quantity", parseFloat(e.target.value) || 0)} type="number" /></div>
            <div style={{ width: 64 }}>
              <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>単位</label>
              <select value={it.unit} onChange={e => setItem(idx, "unit", e.target.value)} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 6px", fontSize: 14, fontFamily: "inherit" }}>
                {["式", "個", "本", "枚", "時間", "日", "件"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}><FInput label="単価 (¥)" value={it.unit_price} onChange={(e: any) => setItem(idx, "unit_price", parseFloat(e.target.value) || 0)} type="number" /></div>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280", textAlign: "right" }}>小計: <strong>{YEN(it.quantity * it.unit_price)}</strong></p>
        </div>
      ))}
      <button onClick={() => setForm({ ...form, items: [...form.items, EMPTY_ITEM()] })}
        style={{ width: "100%", background: "#F9FAFB", border: "1.5px dashed #D1D5DB", borderRadius: 10, padding: "10px 0", fontSize: 13, color: "#6B7280", cursor: "pointer", marginBottom: 14 }}>＋ 明細を追加</button>
      <div style={{ background: "#EBF3FA", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#374151", marginBottom: 4 }}><span>小計</span><span>{YEN(subtotal)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#374151", marginBottom: 6 }}><span>消費税</span><span>{YEN(tax)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "#1F4E79" }}><span>合計</span><span>{YEN(total)}</span></div>
      </div>
      <FTextarea label="備考" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} placeholder="振込先・支払条件など" />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn bg="#F3F4F6" color="#111" onClick={() => setView("list")} style={{ flex: 1 }}>戻る</Btn>
        <Btn onClick={save} style={{ flex: 2 }}>💾 保存する</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// PROJECTS TAB
// ═══════════════════════════════════════════════════════════
function ProjectsTab() {
  const { data: projects, error, reload } = useApi("/projects");
  const { data: customers } = useApi("/customers");
  const [modal, setModal] = useState<any>(null);
  const [shootingModal, setShootingModal] = useState<any>(null);
  const [taskModal, setTaskModal] = useState<any>(null);
  const [estimateModal, setEstimateModal] = useState<any>(null);
  const [invoiceModal, setInvoiceModal] = useState<any>(null);
  const [docsModal, setDocsModal] = useState<any>(null);
  const [form, setForm] = useState({ customer_id: "", name: "", location: "", status: "商談中", scheduled_date: "", note: "" });
  const customerMap = Object.fromEntries(customers.map((c: any) => [c.id, c]));

  async function save() {
    if (!form.name || !form.customer_id) return alert("必須項目を入力してください");
    try {
      const body = { ...form, customer_id: parseInt(form.customer_id) };
      modal === "add" ? await api("POST", "/projects", body) : await api("PUT", `/projects/${modal.id}`, body);
      reload(); setModal(null);
    } catch { alert("保存に失敗しました"); }
  }

  async function del(id: number) {
    if (!confirm("削除しますか？")) return;
    try { await api("DELETE", `/projects/${id}`); reload(); } catch { alert("削除に失敗しました"); }
  }

  return (
    <div style={{ padding: "0 20px 100px" }}>
      {error && <OfflineBanner />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 16px" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>案件管理</h2>
        <Btn onClick={() => { setForm({ customer_id: "", name: "", location: "", status: "商談中", scheduled_date: "", note: "" }); setModal("add"); }} style={{ padding: "8px 16px", fontSize: 14 }}>＋ 追加</Btn>
      </div>
      {customers.length === 0 && !error && (
        <div style={{ background: "#FFF7ED", border: "1px solid #FDE68A", borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 13, color: "#92400E" }}>
          ⚠️ 先に「👥 顧客」タブから顧客を登録してください
        </div>
      )}
      {projects.map((p: any) => (
        <div key={p.id} style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #E5E7EB", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{p.name}</p>
              {customerMap[p.customer_id] && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>👤 {customerMap[p.customer_id].name}{customerMap[p.customer_id].company ? ` / ${customerMap[p.customer_id].company}` : ""}</p>}
              {p.location && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>📍 {p.location}</p>}
              {p.scheduled_date && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>📅 {p.scheduled_date}</p>}
              {p.note && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9CA3AF" }}>{p.note}</p>}
            </div>
            <Badge status={p.status} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" as const }}>
            <button onClick={() => { setForm({ ...p, customer_id: String(p.customer_id) }); setModal(p); }} style={{ flex: 1, minWidth: 60, background: "#F3F4F6", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }}>✏️ 編集</button>
            <button onClick={() => setShootingModal(p)} style={{ flex: 1, minWidth: 60, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }}>📷 撮影条件</button>
            <button onClick={() => setTaskModal(p)} style={{ flex: 1, minWidth: 60, background: "#F0FDF4", color: "#166534", border: "1px solid #86EFAC", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }}>✅ タスク</button>
            <button onClick={() => setEstimateModal(p)} style={{ flex: 1, minWidth: 60, background: "#EEF2FF", color: "#4F46E5", border: "1px solid #A5B4FC", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }}>💴 見積</button>
            <button onClick={() => setInvoiceModal(p)} style={{ flex: 1, minWidth: 60, background: "#FFF7ED", color: "#92400E", border: "1px solid #FCD34D", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }}>🧾 請求</button>
            <button onClick={() => setDocsModal(p)} style={{ flex: 1, minWidth: 60, background: "#F0FDF4", color: "#166534", border: "1px solid #86EFAC", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }}>📄 書類</button>
            <button onClick={() => del(p.id)} style={{ flex: 1, minWidth: 60, background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }}>🗑️ 削除</button>
          </div>
        </div>
      ))}
      {projects.length === 0 && !error && <EmptyGuide icon="📋" message="案件がありません" sub="「＋ 追加」から案件を登録してください" />}
      {modal && (
        <Modal title={modal === "add" ? "案件追加" : "案件編集"} onClose={() => setModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>顧客 *</label>
            <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}
              style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }}>
              <option value="">選択してください</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>)}
            </select>
          </div>
          <FInput label="案件名 *" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="〇〇空撮業務" />
          <FInput label="場所" value={form.location || ""} onChange={(e: any) => setForm({ ...form, location: e.target.value })} placeholder="東京都〇〇区" />
          <FInput label="予定日" value={form.scheduled_date || ""} onChange={(e: any) => setForm({ ...form, scheduled_date: e.target.value })} type="date" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>ステータス</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }}>
              {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>メモ</label>
            <textarea value={form.note || ""} onChange={(e: any) => setForm({ ...form, note: e.target.value })} rows={3}
              style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }} />
          </div>
          <Btn onClick={save} style={{ width: "100%" }}>保存</Btn>
        </Modal>
      )}
      {shootingModal && <ShootingConditionModal project={shootingModal} onClose={() => setShootingModal(null)} />}
      {taskModal && <TaskModal project={taskModal} onClose={() => setTaskModal(null)} />}
      {estimateModal && <EstimateModal project={estimateModal} onClose={() => setEstimateModal(null)} />}
      {invoiceModal && <InvoiceModal project={invoiceModal} onClose={() => setInvoiceModal(null)} />}
      {docsModal && <CustomerDocModal project={docsModal} onClose={() => setDocsModal(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 顧客書類生成モーダル
// ═══════════════════════════════════════════════════════════
const DOC_TYPES = [
  { key: "terms",      label: "利用規約",             icon: "📜" },
  { key: "disclaimer", label: "免責事項",             icon: "🚫" },
  { key: "privacy",    label: "プライバシーポリシー", icon: "🔒" },
  { key: "schedule",   label: "納品スケジュール",     icon: "📆" },
  { key: "all",        label: "全書類まとめて",       icon: "📋" },
];

const DEFAULT_VARS: Record<string, string> = {
  会社名: "株式会社○○○○", 連絡先メール: "info@example.com",
  前日キャンセル料率: "50", 当日キャンセル料率: "100", 無償修正回数: "1", データ保管期間: "2",
  ヒアリング期限: "2", 編集期間: "3〜7", 初稿提出期間: "5〜10", 修正対応期間: "2〜3",
  動画形式: "MP4（フルHD / 4K）", 写真形式: "JPG / RAW（要相談）", 納品方法: "Google Drive（クラウド納品）",
  備考: "・雨天の場合は1回まで無料順延\n・2回目以降の修正は別途料金が発生します",
};

const VARS_BY_TYPE: Record<string, string[]> = {
  terms:      ["会社名", "前日キャンセル料率", "当日キャンセル料率", "無償修正回数", "データ保管期間"],
  disclaimer: ["会社名"],
  privacy:    ["会社名", "連絡先メール"],
  schedule:   ["顧客名", "案件名", "撮影日", "納品予定日", "ヒアリング期限", "編集期間", "初稿提出期間", "修正対応期間", "動画形式", "写真形式", "納品方法", "備考"],
  all:        ["会社名", "連絡先メール", "前日キャンセル料率", "当日キャンセル料率", "無償修正回数", "データ保管期間", "顧客名", "案件名", "撮影日", "納品予定日", "ヒアリング期限", "編集期間", "初稿提出期間", "修正対応期間", "動画形式", "写真形式", "納品方法", "備考"],
};

const VAR_LABELS: Record<string, string> = {
  会社名: "自社名", 連絡先メール: "連絡先メール", 前日キャンセル料率: "前日キャンセル料率（%）",
  当日キャンセル料率: "当日キャンセル料率（%）", 無償修正回数: "無償修正回数（回）", データ保管期間: "データ保管期間（ヶ月）",
  顧客名: "顧客名・会社名", 案件名: "案件名", 撮影日: "撮影予定日", 納品予定日: "納品予定日",
  ヒアリング期限: "ヒアリング期限（週間前）", 編集期間: "編集期間（営業日）", 初稿提出期間: "初稿提出期間（営業日）",
  修正対応期間: "修正対応期間（営業日）", 動画形式: "動画納品形式", 写真形式: "写真納品形式", 納品方法: "納品方法", 備考: "備考",
};

const TEMPLATES_FRONT: Record<string, { title: string; sections: [string, string][] }> = {
  terms: {
    title: "利用規約（ドローン動画制作サービス）",
    sections: [
      ["第1条（目的）", "本規約は、{{会社名}}（以下「当社」といいます）が提供するドローン撮影・動画制作サービス（以下「本サービス」）に関する条件を定めたものです。お客様は本規約に同意の上、本サービスをご利用いただきます。"],
      ["第2条（サービス内容）", "本サービスは以下を含みます：\n・ドローンによる空撮・映像撮影\n・動画・静止画の編集作業\n・映像データの納品（クラウド等）"],
      ["第3条（申込と契約）", "ご依頼は事前の見積・同意をもって契約成立とします。\n撮影内容・範囲・目的により、見積内容が変更される場合があります。"],
      ["第4条（撮影の中止・延期）", "天候不良・法令上の制限等により、撮影が実施できない場合があります。\n撮影当日にお客様の都合で中止された場合、キャンセル料を請求する場合があります。（前日{{前日キャンセル料率}}%、当日{{当日キャンセル料率}}%の基準を適用）"],
      ["第5条（納品と修正）", "編集付きプランの場合、納品後{{無償修正回数}}回の軽微な修正は無償対応します。\n追加修正は別途料金をいただくことがあります。\n納品後のデータ保管期間は原則として{{データ保管期間}}ヶ月とします。"],
    ]
  },
  disclaimer: {
    title: "免責事項",
    sections: [
      ["飛行中のリスクについて", "飛行中の急激な天候変化、第三者の突発的行動、予期せぬ機材故障により、やむを得ず撮影中止・一部撮影不可となる場合がございます。{{会社名}}はこれに関する損害賠償の責任を負いません。"],
      ["権利・許諾について", "撮影許可・使用許諾に必要な権利（建物・人物の肖像権等）は原則としてお客様の責任で取得いただきます。許諾を得ずに撮影・公開されたことによるトラブルには、{{会社名}}は責任を負いません。"],
      ["二次使用について", "編集後の映像が第三者によって二次使用された場合のトラブルについても、{{会社名}}は一切の責任を負いません。"],
    ]
  },
  privacy: {
    title: "プライバシーポリシー（個人情報保護方針）",
    sections: [
      ["方針", "{{会社名}}は、映像制作業務において取得するお客様の個人情報について、以下の通り適切に取り扱います。"],
      ["1. 取得する情報", "・氏名、連絡先（電話・メールアドレス）\n・撮影に関する要望や条件\n・撮影対象物の情報（住所、施設名など）"],
      ["2. 利用目的", "・撮影・編集業務の遂行\n・見積・請求・連絡対応\n・サービス向上のための内部利用"],
      ["3. 第三者提供", "{{会社名}}は、法令に基づく場合を除き、個人情報を第三者に提供しません。"],
      ["4. 管理体制", "取得した情報は、適切なアクセス制限のもと安全に管理し、漏洩・改ざん・紛失を防止します。"],
      ["5. お問い合わせ", "情報の照会・修正・削除については、下記連絡先までお問い合わせください。\n【連絡先】{{連絡先メール}}"],
    ]
  },
  schedule: {
    title: "ドローン撮影・編集・納品スケジュール",
    sections: [
      ["案件情報", "お客様：{{顧客名}}\n案件名：{{案件名}}\n撮影予定日：{{撮影日}}\n納品予定日：{{納品予定日}}"],
      ["ご契約・打ち合わせ段階", "①ヒアリング・お見積（〜撮影{{ヒアリング期限}}週間前まで）\n②撮影計画策定・飛行申請（撮影の7〜10日前）\n③ロケハン・現地確認（撮影の3〜5日前）"],
      ["撮影〜編集工程", "テーブルに置き換えられます"],
      ["納品形式", "動画：{{動画形式}}\n写真：{{写真形式}}\n納品方法：{{納品方法}}"],
      ["備考", "{{備考}}"],
    ]
  },
};

function CustomerDocModal({ project, onClose }: { project: any; onClose: () => void }) {
  const [docType, setDocType] = useState("all");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"select" | "vars">("select");

  useEffect(() => {
    const init = { ...DEFAULT_VARS };
    if (project.name) init["案件名"] = project.name;
    if (project.scheduled_date) init["撮影日"] = project.scheduled_date;
    setVars(init);
  }, [project]);

  useEffect(() => {
    apiGet(`/customers/${project.customer_id}`)
      .then((c: any) => setVars(v => ({ ...v, 顧客名: c.company_name || c.name || "" })))
      .catch(() => {});
  }, [project.customer_id]);

  const neededVars = VARS_BY_TYPE[docType] || [];

  async function download() {
    setLoading(true);
    try {
      const types = docType === "all" ? ["terms", "disclaimer", "privacy", "schedule"] : [docType];
      const templates: Record<string, any> = {};
      types.forEach(t => { templates[t] = TEMPLATES_FRONT[t]; });
      const res = await fetch(`${API}/projects/${project.id}/documents/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_type: docType, variables: vars, templates }),
      });
      if (!res.ok) throw new Error("生成失敗");
      const blob = await res.blob();
      const fname = docType === "all" ? `${vars["顧客名"] || "顧客"}_書類一式.docx` : `${vars["顧客名"] || "顧客"}_${DOC_TYPES.find(d => d.key === docType)?.label}.docx`;
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname; a.click();
    } catch { alert("生成に失敗しました。バックエンドを確認してください。"); }
    setLoading(false);
  }

  return (
    <Modal title={`📄 書類生成 — ${project.name}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 6, background: "#F3F4F6", borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {(["select", "vars"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "7px 0", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: tab === t ? "#fff" : "transparent", color: tab === t ? "#374151" : "#6B7280",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            {t === "select" ? "📋 書類選択" : "✏️ 内容編集"}
          </button>
        ))}
      </div>
      {tab === "select" && (
        <div>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6B7280" }}>生成する書類を選んでください</p>
          {DOC_TYPES.map(dt => (
            <button key={dt.key} onClick={() => setDocType(dt.key)}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", marginBottom: 8,
                border: `2px solid ${docType === dt.key ? "#4F46E5" : "#E5E7EB"}`,
                borderRadius: 12, background: docType === dt.key ? "#EEF2FF" : "#fff", cursor: "pointer", textAlign: "left" as const }}>
              <span style={{ fontSize: 24 }}>{dt.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: docType === dt.key ? "#4F46E5" : "#111" }}>{dt.label}</p>
                {dt.key === "all" && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6B7280" }}>利用規約・免責・プライバシー・スケジュールを1ファイルに</p>}
              </div>
              {docType === dt.key && <span style={{ marginLeft: "auto", color: "#4F46E5", fontSize: 18 }}>✓</span>}
            </button>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn bg="#F3F4F6" color="#111" onClick={() => setTab("vars")} style={{ flex: 1 }}>内容を確認・編集 →</Btn>
            <Btn onClick={download} style={{ flex: 2, background: loading ? "#9CA3AF" : "#111" }}>{loading ? "生成中..." : "📄 Word生成"}</Btn>
          </div>
        </div>
      )}
      {tab === "vars" && (
        <div>
          <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#4338CA" }}>
            ✏️ 顧客ごとに内容を調整できます。空欄はデフォルト値が使われます。
          </div>
          {neededVars.map(key => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>{VAR_LABELS[key] || key}</label>
              {key === "備考" ? (
                <textarea value={vars[key] || ""} onChange={e => setVars({ ...vars, [key]: e.target.value })}
                  rows={3} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }} />
              ) : (
                <input type="text" value={vars[key] || ""} onChange={e => setVars({ ...vars, [key]: e.target.value })}
                  style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" as const }} />
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn bg="#F3F4F6" color="#111" onClick={() => setTab("select")} style={{ flex: 1 }}>← 書類選択</Btn>
            <Btn onClick={download} style={{ flex: 2, background: loading ? "#9CA3AF" : "#111" }}>{loading ? "生成中..." : "📄 Word生成"}</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// 飛行詳細入力モーダル
// ═══════════════════════════════════════════════════════════
function FlightDetailModal({ flight, onClose, onSave }: { flight: any; onClose: () => void; onSave: (form: any) => void }) {
  const [form, setForm] = useState({
    pilot_name: flight.pilot_name || "", pilot_license: flight.pilot_license || "",
    flight_purpose: flight.flight_purpose || "", takeoff_location: flight.takeoff_location || "",
    landing_location: flight.landing_location || "", safety_notes: flight.safety_notes || "",
    squawk_date: flight.squawk_date || "", squawk_detail: flight.squawk_detail || "",
    action_date: flight.action_date || "", action_detail: flight.action_detail || "", confirmer: flight.confirmer || "",
  });
  const [tab, setTab] = useState<"basic"|"squawk">("basic");

  return (
    <Modal title="✏️ 飛行記録 詳細入力" onClose={onClose}>
      <div style={{ background: "#F0F9FF", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#0369A1" }}>
        📋 国土交通省「無人航空機の飛行記録」様式の記載項目です
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["basic", "squawk"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t ? "#0EA5E9" : "#F3F4F6", color: tab === t ? "#fff" : "#374151" }}>
            {t === "basic" ? "🛫 飛行情報" : "⚠️ 記事（不具合）"}
          </button>
        ))}
      </div>
      {tab === "basic" && (
        <>
          <FInput label="③ 飛行させた者の氏名" value={form.pilot_name} onChange={(e: any) => setForm({...form, pilot_name: e.target.value})} placeholder="山田 太郎" />
          <FInput label="技能証明番号（任意）" value={form.pilot_license} onChange={(e: any) => setForm({...form, pilot_license: e.target.value})} placeholder="例：第〇〇〇号" />
          <FTextarea label="④ 飛行概要（目的・特定飛行種別）" value={form.flight_purpose} onChange={(e: any) => setForm({...form, flight_purpose: e.target.value})} placeholder="例：空撮業務　目視内飛行" />
          <FInput label="⑤ 離陸場所" value={form.takeoff_location} onChange={(e: any) => setForm({...form, takeoff_location: e.target.value})} placeholder="例：東京都新宿区〇〇" />
          <FInput label="⑥ 着陸場所" value={form.landing_location} onChange={(e: any) => setForm({...form, landing_location: e.target.value})} placeholder="例：東京都新宿区〇〇" />
          <FTextarea label="⑫ 飛行の安全に影響のあった事項" value={form.safety_notes} onChange={(e: any) => setForm({...form, safety_notes: e.target.value})} placeholder="例：特になし" />
        </>
      )}
      {tab === "squawk" && (
        <>
          <div style={{ background: "#FFF7ED", border: "1px solid #FDE68A", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: "#92400E" }}>⚠️ 不具合が発生した場合のみ記入してください</div>
          <FInput label="⑬ 発生年月日" value={form.squawk_date} onChange={(e: any) => setForm({...form, squawk_date: e.target.value})} type="date" />
          <FTextarea label="不具合事項" value={form.squawk_detail} onChange={(e: any) => setForm({...form, squawk_detail: e.target.value})} placeholder="発生した不具合の内容を記載" />
          <FInput label="処置年月日" value={form.action_date} onChange={(e: any) => setForm({...form, action_date: e.target.value})} type="date" />
          <FTextarea label="処置内容" value={form.action_detail} onChange={(e: any) => setForm({...form, action_detail: e.target.value})} placeholder="実施した処置の内容を記載" />
          <FInput label="確認者" value={form.confirmer} onChange={(e: any) => setForm({...form, confirmer: e.target.value})} placeholder="確認者の氏名" />
        </>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <Btn bg="#F3F4F6" color="#111" onClick={onClose} style={{ flex: 1 }}>キャンセル</Btn>
        <Btn onClick={() => onSave(form)} style={{ flex: 2 }}>保存する</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// MAINTENANCE TAB
// ═══════════════════════════════════════════════════════════
function MaintenanceTab() {
  const { data: drones } = useApi("/drones");
  const [filterDroneId, setFilterDroneId] = useState("");
  const { data: records, reload } = useApi(filterDroneId ? `/maintenance-records/?drone_id=${filterDroneId}` : "/maintenance-records/");
  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const emptyForm = { drone_id: "", performed_at: "", total_flight_time: "", detail: "", reason: "", place: "", engineer: "", remarks: "" };
  const [form, setForm] = useState(emptyForm);
  const droneMap = Object.fromEntries(drones.map((d: any) => [d.id, d]));

  function openNew() { setForm(emptyForm); setEditTarget(null); setModal(true); }
  function openEdit(r: any) {
    setForm({ drone_id: String(r.drone_id), performed_at: r.performed_at, total_flight_time: r.total_flight_time ?? "", detail: r.detail, reason: r.reason || "", place: r.place || "", engineer: r.engineer || "", remarks: r.remarks || "" });
    setEditTarget(r); setModal(true);
  }

  async function save() {
    if (!form.drone_id) return alert("機体を選択してください");
    if (!form.performed_at) return alert("実施年月日を入力してください");
    if (!form.detail) return alert("内容を入力してください");
    const body = { ...form, drone_id: parseInt(form.drone_id), total_flight_time: form.total_flight_time ? parseFloat(form.total_flight_time) : null };
    try {
      editTarget ? await api("PUT", `/maintenance-records/${editTarget.id}`, body) : await api("POST", "/maintenance-records/", body);
      reload(); setModal(false);
    } catch { alert("保存に失敗しました"); }
  }

  async function del(id: number) {
    if (!confirm("削除しますか？")) return;
    try { await api("DELETE", `/maintenance-records/${id}`); reload(); } catch { alert("削除に失敗しました"); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <select value={filterDroneId} onChange={e => setFilterDroneId(e.target.value)} style={{ flex: 1, marginRight: 10, border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: "#fff" }}>
          <option value="">全機体</option>
          {drones.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <Btn onClick={openNew} style={{ padding: "10px 16px", fontSize: 14 }}>＋ 追加</Btn>
        {filterDroneId && (
          <button onClick={async () => {
            const res = await fetch(`${API}/maintenance-records/${filterDroneId}/export-word`);
            if (!res.ok) { alert("出力に失敗しました"); return; }
            const blob = await res.blob();
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `点検整備記録_${filterDroneId}.docx`; a.click();
          }} style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }}>📄 Word</button>
        )}
      </div>
      {records.map((r: any) => (
        <div key={r.id} style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #E5E7EB", marginBottom: 12 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>🚁 {droneMap[r.drone_id]?.name || `機体 #${r.drone_id}`}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>📅 {r.performed_at}　{r.engineer ? `👤 ${r.engineer}` : ""}</p>
          {r.total_flight_time != null && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>⏱ 総飛行時間: {r.total_flight_time}h</p>}
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#374151" }}>{r.detail}</p>
          {r.reason && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>理由: {r.reason}</p>}
          {r.place && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>📍 {r.place}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => openEdit(r)} style={{ flex: 1, background: "#F3F4F6", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13, cursor: "pointer" }}>編集</button>
            <button onClick={() => del(r.id)} style={{ flex: 1, background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13, cursor: "pointer" }}>削除</button>
          </div>
        </div>
      ))}
      {records.length === 0 && <EmptyGuide icon="🔩" message="点検整備記録がありません" sub="「＋ 追加」から登録してください" />}
      {modal && (
        <Modal title={editTarget ? "✏️ 点検整備記録 編集" : "🔩 点検整備記録 追加"} onClose={() => setModal(false)}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>機体 *</label>
            <select value={form.drone_id} onChange={e => setForm({ ...form, drone_id: e.target.value })} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }}>
              <option value="">選択してください</option>
              {drones.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <FInput label="実施年月日 *" value={form.performed_at} onChange={(e: any) => setForm({ ...form, performed_at: e.target.value })} type="date" />
          <FInput label="総飛行時間（h）" value={form.total_flight_time} onChange={(e: any) => setForm({ ...form, total_flight_time: e.target.value })} type="number" placeholder="例：12.5" />
          <FTextarea label="点検・修理・改造・整備の内容 *" value={form.detail} onChange={(e: any) => setForm({ ...form, detail: e.target.value })} placeholder="例：定期点検、プロペラ交換" />
          <FInput label="実施理由" value={form.reason} onChange={(e: any) => setForm({ ...form, reason: e.target.value })} placeholder="例：定期点検、不具合対応" />
          <FInput label="実施場所" value={form.place} onChange={(e: any) => setForm({ ...form, place: e.target.value })} placeholder="例：東京都〇〇区" />
          <FInput label="実施者" value={form.engineer} onChange={(e: any) => setForm({ ...form, engineer: e.target.value })} placeholder="例：山田 太郎" />
          <FTextarea label="備考" value={form.remarks} onChange={(e: any) => setForm({ ...form, remarks: e.target.value })} placeholder="特記事項など" />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn bg="#F3F4F6" color="#111" onClick={() => setModal(false)} style={{ flex: 1 }}>キャンセル</Btn>
            <Btn onClick={save} style={{ flex: 2 }}>保存する</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INSPECTION TAB
// ═══════════════════════════════════════════════════════════
function InspectionTab() {
  const { data: drones } = useApi("/drones");
  const [subTab, setSubTab] = useState<"daily"|"maintenance">("daily");
  const [filterDroneId, setFilterDroneId] = useState("");
  const { data: inspections, reload } = useApi(filterDroneId ? `/daily-inspections/?drone_id=${filterDroneId}` : "/daily-inspections/");
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({ drone_id: "", inspector_name: "", weather: "", temperature: "", notes: "", result: "合格" });
  const [items, setItems] = useState<any[]>([]);
  const droneMap = Object.fromEntries(drones.map((d: any) => [d.id, d]));
  const categories = [...new Set(items.map((i: any) => i.category))];
  const allChecked = items.every((i: any) => i.checked);

  async function openNew() {
    const res = await fetch(API + "/daily-inspections/template/items");
    const tmpl = await res.json();
    setItems(tmpl.map((t: any) => ({ ...t, checked: false, note: "" })));
    setForm({ drone_id: "", inspector_name: "", weather: "", temperature: "", notes: "", result: "合格" });
    setModal(true);
  }

  async function save() {
    if (!form.drone_id) return alert("機体を選択してください");
    if (!form.inspector_name) return alert("点検者名を入力してください");
    try {
      await api("POST", "/daily-inspections/", { ...form, drone_id: parseInt(form.drone_id), temperature: form.temperature ? parseFloat(form.temperature) : null, items });
      reload(); setModal(false);
    } catch { alert("保存に失敗しました"); }
  }

  async function del(id: number) {
    if (!confirm("削除しますか？")) return;
    try { await api("DELETE", `/daily-inspections/${id}`); reload(); } catch { alert("削除に失敗しました"); }
  }

  // ── 点検項目トグル（DailyInspectionItem用）──
  async function toggleInspectionItem(item: any) {
    try {
      await fetch(`${API}/daily-inspections/items/${item.id}?checked=${!item.checked}`, { method: "PUT" });
      setDetail((prev: any) => prev ? {
        ...prev,
        items: prev.items.map((i: any) => i.id === item.id ? { ...i, checked: !i.checked } : i)
      } : prev);
    } catch { alert("更新に失敗しました"); }
  }

  return (
    <div style={{ padding: "0 20px 100px" }}>
      <div style={{ padding: "20px 0 16px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 700 }}>🔧 点検記録</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {([["daily", "📋 日常点検（様式２）"], ["maintenance", "🔩 点検整備（様式３）"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSubTab(id)} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, background: subTab === id ? "#111" : "#F3F4F6", color: subTab === id ? "#fff" : "#6B7280" }}>{label}</button>
          ))}
        </div>
      </div>

      {subTab === "daily" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <select value={filterDroneId} onChange={e => setFilterDroneId(e.target.value)} style={{ flex: 1, marginRight: 10, border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: "#fff" }}>
              <option value="">全機体</option>
              {drones.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Btn onClick={openNew} style={{ padding: "10px 16px", fontSize: 14 }}>＋ 点検記録</Btn>
          </div>
          {inspections.map((ins: any) => (
            <div key={ins.id} style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #E5E7EB", marginBottom: 12 }}>
              <div onClick={() => setDetail(ins)} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>🚁 {droneMap[ins.drone_id]?.name || `機体 #${ins.drone_id}`}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>{new Date(ins.inspected_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}　点検者: {ins.inspector_name}</p>
                    {ins.weather && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>🌤 {ins.weather}{ins.temperature ? `　${ins.temperature}℃` : ""}</p>}
                  </div>
                  <span style={{ background: ins.result === "合格" ? "#D1FAE5" : "#FEE2E2", color: ins.result === "合格" ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>{ins.result}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={async () => {
                  const res = await fetch(`${API}/daily-inspections/${ins.id}/export-word`);
                  if (!res.ok) { alert("出力に失敗しました"); return; }
                  const blob = await res.blob();
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `日常点検記録_${ins.id}.docx`; a.click();
                }} style={{ flex: 2, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 8, padding: "7px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📄 Word出力</button>
                <button onClick={() => del(ins.id)} style={{ flex: 1, background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "7px 0", fontSize: 13, cursor: "pointer" }}>削除</button>
              </div>
            </div>
          ))}
          {inspections.length === 0 && <EmptyGuide icon="🔧" message="点検記録がありません" sub="「＋ 点検記録」から登録してください" />}

          {modal && (
            <Modal title="🔧 日常点検記録" onClose={() => setModal(false)}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>機体 *</label>
                <select value={form.drone_id} onChange={e => setForm({ ...form, drone_id: e.target.value })} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }}>
                  <option value="">選択してください</option>
                  {drones.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <FInput label="点検者名 *" value={form.inspector_name} onChange={(e: any) => setForm({ ...form, inspector_name: e.target.value })} placeholder="山田 太郎" />
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>天候</label>
                  <select value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }}>
                    <option value="">-</option>
                    {["晴れ", "曇り", "雨", "雪", "強風"].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}><FInput label="気温(℃)" value={form.temperature} onChange={(e: any) => setForm({ ...form, temperature: e.target.value })} placeholder="25" type="number" /></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 8 }}>点検項目</label>
                {categories.map(cat => (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#374151", background: "#F3F4F6", padding: "4px 10px", borderRadius: 6 }}>{cat}</p>
                    {items.filter((i: any) => i.category === cat).map((item: any) => {
                      const globalIdx = items.findIndex(i => i === item);
                      return (
                        <label key={globalIdx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}>
                          <input type="checkbox" checked={item.checked} onChange={e => { const next = [...items]; next[globalIdx] = { ...item, checked: e.target.checked }; setItems(next); }} style={{ width: 20, height: 20, accentColor: "#10B981", flexShrink: 0 }} />
                          <span style={{ fontSize: 13 }}>{item.item_name}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 6 }}>総合判定</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["合格", "不合格"].map(r => (
                    <button key={r} onClick={() => setForm({ ...form, result: r })} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, background: form.result === r ? (r === "合格" ? "#D1FAE5" : "#FEE2E2") : "#F3F4F6", color: form.result === r ? (r === "合格" ? "#065F46" : "#991B1B") : "#6B7280" }}>
                      {r === "合格" ? "✅ 合格" : "❌ 不合格"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>特記事項</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="気になる点・特記事項..." style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }} />
              </div>
              {!allChecked && <div style={{ background: "#FFF7ED", border: "1px solid #FDE68A", borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 12, color: "#92400E" }}>⚠️ 未チェックの項目があります</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <Btn bg="#F3F4F6" color="#111" onClick={() => setModal(false)} style={{ flex: 1 }}>キャンセル</Btn>
                <Btn onClick={save} style={{ flex: 2 }}>保存する</Btn>
              </div>
            </Modal>
          )}

          {detail && (
            <Modal title="点検詳細" onClose={() => setDetail(null)}>
              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <p style={{ margin: 0, fontWeight: 700 }}>🚁 {droneMap[detail.drone_id]?.name}</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>{new Date(detail.inspected_at).toLocaleString("ja-JP")}　点検者: {detail.inspector_name}</p>
                {detail.weather && <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>🌤 {detail.weather}{detail.temperature ? `　${detail.temperature}℃` : ""}</p>}
                <p style={{ margin: "8px 0 0", fontWeight: 700, color: detail.result === "合格" ? "#065F46" : "#991B1B" }}>{detail.result === "合格" ? "✅ 合格" : "❌ 不合格"}</p>
              </div>
              {detail.items?.map((item: any) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span
                    style={{ fontSize: 16, cursor: "pointer", userSelect: "none" as const }}
                    onClick={() => toggleInspectionItem(item)}
                  >
                    {item.checked ? "✅" : "⬜"}
                  </span>
                  <span style={{ fontSize: 13 }}>{item.item_name}</span>
                  <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto" }}>{item.category}</span>
                </div>
              ))}
              {detail.notes && <div style={{ marginTop: 14, background: "#F9FAFB", borderRadius: 10, padding: 12 }}><p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>特記事項</p><p style={{ margin: "4px 0 0", fontSize: 14 }}>{detail.notes}</p></div>}
            </Modal>
          )}
        </div>
      )}
      {subTab === "maintenance" && <MaintenanceTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FLIGHTS TAB
// ═══════════════════════════════════════════════════════════
function FlightsTab() {
  const { data: projects } = useApi("/projects");
  const { data: drones } = useApi("/drones");
  const [flights, setFlights] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [editModal, setEditModal] = useState<any>(null);
  const [exportModal, setExportModal] = useState(false);
  const [exportDroneId, setExportDroneId] = useState("");
  const [exportNr, setExportNr] = useState("");
  const [error, setError] = useState(false);

  const [filterDroneId, setFilterDroneId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: checklists, reload: reloadChecklists } = useApi(
    detail ? `/checklists?flight_id=${detail.id}` : "/checklists",
    [detail?.id]
  );
  const projectMap = Object.fromEntries(projects.map((p: any) => [p.id, p]));
  const [editingChecklist, setEditingChecklist] = useState<Record<number, string>>({});

  async function search() {
    const params = new URLSearchParams();
    if (filterDroneId) params.set("drone_id", filterDroneId);
    if (filterDateFrom) params.set("date_from", filterDateFrom + "T00:00:00");
    if (filterDateTo) params.set("date_to", filterDateTo + "T23:59:59");
    if (filterStatus) params.set("status", filterStatus);
    try {
      const r = await fetch(`${API}/flights/search?${params}`);
      const data = await r.json();
      setFlights(Array.isArray(data) ? data : []); setSearched(true);
    } catch { setError(true); }
  }

  async function deleteFlight(f: any) {
    if (!confirm(`飛行 #${f.id}（${projectMap[f.project_id]?.name || ""}）を完全に削除します。\nこの操作は元に戻せません。続行しますか？`)) return;
    try {
      await api("DELETE", `/flights/${f.id}`);
      setFlights(flights.filter(x => x.id !== f.id));
      if (detail?.id === f.id) setDetail(null);
    } catch { alert("削除に失敗しました"); }
  }

  async function saveDetail(form: any) {
    try { await api("PUT", `/flights/${editModal.id}`, form); search(); setEditModal(null); }
    catch { alert("保存に失敗しました"); }
  }

  const [timeEditModal, setTimeEditModal] = useState<any>(null);
  const [timeForm, setTimeForm] = useState({ start_time: "", end_time: "" });

  function openTimeEdit(f: any) {
  // DBのnaive時刻はそのままスライスするだけでOK（UTC変換しない）
  const toLocal = (iso: string) => iso ? iso.slice(0, 16) : "";
  setTimeForm({ start_time: toLocal(f.start_time), end_time: toLocal(f.end_time) });
  setTimeEditModal(f);
}

  async function saveTime() {
  try {
    // datetime-localの値をそのまま送る（UTC変換しない）
    const toLocalISO = (val: string) => val ? val + ":00" : null;
    await api("PUT", `/flights/${timeEditModal.id}`, {
      start_time: timeForm.start_time ? timeForm.start_time + ":00" : null,
      end_time: timeForm.end_time ? timeForm.end_time + ":00" : null,
    });
    search(); setTimeEditModal(null);
  } catch { alert("保存に失敗しました"); }
}

  async function saveChecklistItem(item: any) {
    const newText = editingChecklist[item.id];
    if (newText === undefined) return;
    try {
      await api("PUT", `/checklists/${item.id}`, { item: newText });
      reloadChecklists();
      setEditingChecklist(prev => { const n = {...prev}; delete n[item.id]; return n; });
    } catch { alert("保存に失敗しました"); }
  }

  // ── チェックリストON/OFFトグル（Checklistモデル用）──
  async function toggleChecklist(item: any) {
    try {
      await api("PUT", `/checklists/${item.id}`, { checked: !item.checked });
      reloadChecklists();
    } catch { alert("更新に失敗しました"); }
  }

  function duration(f: any) {
    if (!f.start_time || !f.end_time) return "-";
    return `${Math.floor((new Date(f.end_time).getTime() - new Date(f.start_time).getTime()) / 60000)}分`;
  }

  async function downloadExcel() {
    const params = new URLSearchParams();
    if (exportDroneId) params.set("drone_id", exportDroneId);
    if (exportNr) params.set("nr", exportNr);
    const res = await fetch(`${API}/export/flights/excel?${params}`);
    if (!res.ok) { alert("出力に失敗しました"); return; }
    const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `飛行記録_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
    setExportModal(false);
  }

  return (
    <div style={{ padding: "0 20px 100px" }}>
      {error && <OfflineBanner />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 12px" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>飛行ログ</h2>
        <button onClick={() => setExportModal(true)} style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📥 EXCEL出力</button>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #E5E7EB", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 3 }}>機体</label>
            <select value={filterDroneId} onChange={e => setFilterDroneId(e.target.value)} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}>
              <option value="">全機体</option>
              {drones.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 3 }}>ステータス</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}>
              <option value="">すべて</option>
              <option value="done">完了</option>
              <option value="flying">飛行中</option>
              <option value="planned">予定</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 3 }}>開始日（From）</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 3 }}>終了日（To）</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const }} />
          </div>
        </div>
        <button onClick={search} style={{ width: "100%", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>🔍 検索する</button>
      </div>

      {!searched && <EmptyGuide icon="🔍" message="条件を指定して検索してください" sub="機体・日付・ステータスで絞り込みできます" />}
      {searched && flights.length === 0 && <EmptyGuide icon="🚁" message="該当する飛行ログがありません" />}
      {searched && flights.length > 0 && <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>{flights.length}件 見つかりました</p>}

      {flights.map((f: any) => (
        <div key={f.id} style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #E5E7EB", marginBottom: 12 }}>
          <div onClick={() => setDetail(f)} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{projectMap[f.project_id]?.name || `飛行 #${f.id}`}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
                {f.start_time ? new Date(f.start_time).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" }) : "未記録"}
                {f.status === "done" && ` · ${duration(f)}`}
              </p>
              {f.pilot_name && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>👤 {f.pilot_name}</p>}
              {f.takeoff_location && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>📍 {f.takeoff_location} → {f.landing_location || "?"}</p>}
            </div>
            <Badge status={f.status} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => openTimeEdit(f)} style={{ flex: 1, background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🕐 日時編集</button>
            {f.status === "done" && (
              <button onClick={() => setEditModal(f)} style={{ flex: 1, background: "#F0F9FF", color: "#0369A1", border: "1px solid #BAE6FD", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️ 記録入力</button>
            )}
            <button onClick={() => deleteFlight(f)} style={{ flex: 1, background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🗑️ 削除</button>
          </div>
        </div>
      ))}

      {timeEditModal && (
        <Modal title="🕐 日時編集" onClose={() => setTimeEditModal(null)}>
          <div style={{ background: "#FFF7ED", border: "1px solid #FDE68A", borderRadius: 10, padding: 10, marginBottom: 14, fontSize: 12, color: "#92400E" }}>
            ⚠️ 変更すると飛行時間の計算に影響します
          </div>
          <FInput label="開始日時" value={timeForm.start_time} onChange={(e: any) => setTimeForm({ ...timeForm, start_time: e.target.value })} type="datetime-local" />
          <FInput label="終了日時" value={timeForm.end_time} onChange={(e: any) => setTimeForm({ ...timeForm, end_time: e.target.value })} type="datetime-local" />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn bg="#F3F4F6" color="#111" onClick={() => setTimeEditModal(null)} style={{ flex: 1 }}>キャンセル</Btn>
            <Btn onClick={saveTime} style={{ flex: 2 }}>保存する</Btn>
          </div>
        </Modal>
      )}

      {exportModal && (
        <Modal title="📥 飛行記録 EXCEL出力" onClose={() => setExportModal(false)}>
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>国土交通省様式「無人航空機の飛行記録」をEXCELで出力します。</p>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>機体で絞り込み（任意）</label>
            <select value={exportDroneId} onChange={e => setExportDroneId(e.target.value)} style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }}>
              <option value="">全機体</option>
              {drones.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <FInput label="NR番号（任意）" value={exportNr} onChange={(e: any) => setExportNr(e.target.value)} placeholder="例：001" />
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#166534" }}>
            ✅ 完了済みの飛行記録のみ出力されます<br />✅ 飛行時間・総飛行時間は自動計算されます
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn bg="#F3F4F6" color="#111" onClick={() => setExportModal(false)} style={{ flex: 1 }}>キャンセル</Btn>
            <Btn bg="#16A34A" onClick={downloadExcel} style={{ flex: 2 }}>📥 ダウンロード</Btn>
          </div>
        </Modal>
      )}

      {editModal && <FlightDetailModal flight={editModal} onClose={() => setEditModal(null)} onSave={saveDetail} />}

      {detail && (
        <Modal title="飛行詳細" onClose={() => setDetail(null)}>
          <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>{projectMap[detail.project_id]?.name || `飛行 #${detail.id}`}</p>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <div><p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>開始</p><p style={{ margin: 0, fontSize: 13 }}>{detail.start_time ? new Date(detail.start_time).toLocaleString("ja-JP") : "-"}</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>終了</p><p style={{ margin: 0, fontSize: 13 }}>{detail.end_time ? new Date(detail.end_time).toLocaleString("ja-JP") : "-"}</p></div>
            </div>
            {detail.memo && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #E5E7EB" }}><p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>メモ</p><p style={{ margin: "4px 0 0", fontSize: 14 }}>{detail.memo}</p></div>}
          </div>

          {["pre", "post"].map(type => {
            const its = checklists.filter((c: any) => c.type === type);
            if (!its.length) return null;
            return (
              <div key={type} style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, color: "#6B7280", margin: "0 0 8px" }}>{type === "pre" ? "✈️ 飛行前" : "🛬 飛行後"}チェック</h4>
                {its.map((item: any) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <span
                      style={{ fontSize: 16, flexShrink: 0, cursor: "pointer", userSelect: "none" as const }}
                      onClick={() => toggleChecklist(item)}
                    >
                      {item.checked ? "✅" : "⬜"}
                    </span>
                    {editingChecklist[item.id] !== undefined ? (
                      <div style={{ flex: 1, display: "flex", gap: 6 }}>
                        <input value={editingChecklist[item.id]} onChange={e => setEditingChecklist({ ...editingChecklist, [item.id]: e.target.value })}
                          style={{ flex: 1, border: "1.5px solid #A5B4FC", borderRadius: 8, padding: "5px 8px", fontSize: 13, fontFamily: "inherit" }} />
                        <button onClick={() => saveChecklistItem(item)} style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>保存</button>
                        <button onClick={() => { const n = {...editingChecklist}; delete n[item.id]; setEditingChecklist(n); }} style={{ background: "#F3F4F6", border: "none", borderRadius: 6, padding: "5px 8px", fontSize: 12, cursor: "pointer" }}>×</button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: 13, flex: 1 }}>{item.item}</span>
                        <button onClick={() => setEditingChecklist({ ...editingChecklist, [item.id]: item.item })}
                          style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "#9CA3AF" }}>✏️</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════
const TABS = [
  { id: "home", icon: "🏠", label: "ホーム" },
  { id: "customers", icon: "👥", label: "顧客" },
  { id: "projects", icon: "📋", label: "案件" },
  { id: "flights", icon: "🚁", label: "飛行" },
  { id: "inspection", icon: "🔧", label: "点検" },
];

export default function App() {
  const [tab, setTab] = useState("home");
  const tabs: Record<string, React.ReactNode> = {
    home: <HomeTab onGoTo={setTab} />,
    customers: <CustomersTab />,
    projects: <ProjectsTab />,
    flights: <FlightsTab />,
    inspection: <InspectionTab />,
  };
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F9FAFB", fontFamily: "-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN',sans-serif" }}>
      <div style={{ paddingBottom: 80 }}>{tabs[tab]}</div>
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderTop: "1px solid #E5E7EB", display: "flex", zIndex: 50 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0", border: "none", background: "none", cursor: "pointer", color: tab === t.id ? "#3B82F6" : "#9CA3AF" }}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 400, marginTop: 2 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
