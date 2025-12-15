import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef, // ✅ NEW
  useState,
} from "react";
import { ProjectContext } from "../../../context/ProjectContext";
import styles from "./Memos.module.scss";
import projectStyles from "../Project.module.scss"; // ← reuse Project form styles
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

const BASE_URL = "http://localhost:8080";

// Text getter
const getText = (m = {}) =>
  m.message ?? m.text ?? m.content ?? m.body ?? m.memoText ?? "";

// Date helpers
const fmtDate = (d) => {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString();
  } catch {
    return String(d);
  }
};
const todayStr = () => new Date().toISOString().slice(0, 10);

// Avoid mixing ?? with || by picking the first non-null/undefined
const firstDefined = (...vals) =>
  vals.find((v) => v !== null && v !== undefined);

// Label helpers
const empLabel = (e = {}) =>
  [e.firstName ?? e.first_name ?? "", e.lastName ?? e.last_name ?? ""]
    .join(" ")
    .trim() ||
  e.email ||
  `Emp #${e.id}`;

const posLabel = (p = {}) =>
  p.positionName ?? p.position_name ?? p.name ?? `Position #${p.id}`;

export default function Memos() {
  const { selectedProjectId } = useContext(ProjectContext);

  // state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState({}); // { [id|'new']: { text, positionId, employeeId, memoDate } }
  const [editingId, setEditingId] = useState(null);

  // ✅ NEW: ref for new memo textarea
  const newMemoTextareaRef = useRef(null);

  // dropdown data
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);

  // quick lookup maps for readable meta
  const empMap = useMemo(() => {
    const m = {};
    for (const e of employees) m[String(e.id)] = e;
    return m;
  }, [employees]);

  const posMap = useMemo(() => {
    const m = {};
    for (const p of positions) m[String(p.id)] = p;
    return m;
  }, [positions]);

  const employeeNameById = (id) => {
    if (id == null) return "";
    const e = empMap[String(id)];
    return e ? empLabel(e) : `Emp #${id}`;
  };

  const positionNameById = (id) => {
    if (id == null) return "";
    const p = posMap[String(id)];
    return p ? posLabel(p) : `Pos #${id}`;
  };

  // auth headers
  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // Load active memos and filter by project
  const fetchMemos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/memos/active`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed ${res.status}`);
      const data = await res.json();
      const all = Array.isArray(data) ? data : data ? [data] : [];
      const filtered = selectedProjectId
        ? all.filter((m) => String(m.projectId) === String(selectedProjectId))
        : all;
      setItems(filtered);
    } catch (e) {
      console.error(e);
      setError("Failed to load memos.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, selectedProjectId]);

  // Load employees + positions only
  const fetchDropdowns = useCallback(async () => {
    try {
      const [empRes, posRes] = await Promise.all([
        fetch(`${BASE_URL}/api/employees/active`, { headers: authHeaders }),
        fetch(`${BASE_URL}/api/positions/active`, { headers: authHeaders }),
      ]);
      if (empRes.ok) setEmployees((await empRes.json()) || []);
      if (posRes.ok) setPositions((await posRes.json()) || []);
    } catch (e) {
      console.error("Dropdown fetch error:", e);
    }
  }, [authHeaders]);

  useEffect(() => {
    setEditingId(null);
    setDrafts({});
    fetchMemos();
    fetchDropdowns();
  }, [fetchMemos, fetchDropdowns]);

  // ✅ NEW: focus the new memo textarea when creating
  useEffect(() => {
    if (editingId === "new") {
      // wait until the textarea renders
      requestAnimationFrame(() => {
        const el = newMemoTextareaRef.current;
        if (el) {
          el.focus();
          // Optional: ensure cursor at end
          const len = el.value?.length ?? 0;
          try {
            el.setSelectionRange(len, len);
          } catch {
            // ignore (some browsers may throw)
          }
        }
      });
    }
  }, [editingId]);

  // UI handlers
  const startCreate = () => {
    if (!selectedProjectId) return;
    setEditingId("new");
    setDrafts((prev) => ({
      ...prev,
      new: {
        text: "",
        positionId: firstDefined(positions[0]?.id, 1),
        employeeId: firstDefined(employees[0]?.id, 1),
        memoDate: todayStr(),
      },
    }));
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setDrafts((prev) => ({
      ...prev,
      [m.id]: {
        text: getText(m),
        positionId: firstDefined(m.positionId, positions[0]?.id, 1),
        employeeId: firstDefined(m.employeeId, employees[0]?.id, 1),
        memoDate: firstDefined(m.memoDate, todayStr()),
      },
    }));
  };

  const cancel = () => {
    const id = editingId;
    setEditingId(null);
    setDrafts((prev) => {
      const next = { ...prev };
      if (id && next[id]) delete next[id];
      return next;
    });
  };

  const handleChange = (val) => {
    setDrafts((prev) => ({
      ...prev,
      [editingId]: { ...(prev[editingId] || {}), text: val },
    }));
  };

  const handleField = (field, val) => {
    setDrafts((prev) => ({
      ...prev,
      [editingId]: { ...(prev[editingId] || {}), [field]: val },
    }));
  };

  const save = async () => {
    const id = editingId;
    if (id == null) return;

    const draft = drafts[id] || {};
    const message = draft.text ?? "";
    const isCreate = id === "new";

    // Use the currently selected project ID from context
    const projectIdNum = Number(selectedProjectId) || null;

    const found = !isCreate ? items.find((x) => x.id === id) : null;

    const payload = {
      message,
      positionId: firstDefined(draft.positionId, found?.positionId, null),
      projectId: projectIdNum,
      employeeId: firstDefined(draft.employeeId, found?.employeeId, null),
      memoDate: firstDefined(draft.memoDate, found?.memoDate, todayStr()),
    };

    if (!projectIdNum) {
      alert("Please select a project before saving a memo.");
      return;
    }

    try {
      const res = await fetch(
        isCreate ? `${BASE_URL}/api/memos` : `${BASE_URL}/api/memos/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(`${isCreate ? "Create" : "Update"} failed`);
      await fetchMemos();
      cancel();
    } catch (e) {
      console.error(e);
      alert(`${isCreate ? "Create" : "Save"} failed.`);
    }
  };

  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this memo?")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/memos/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchMemos();
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  // Reusable selects — now styled like Project form
  const PositionSelect = ({ value, onChange }) => (
    <select
      className={`${projectStyles.textInput} ${styles.smallInput}`}
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value) || null)}
    >
      {positions.length === 0 && <option value="">(no positions)</option>}
      {positions.map((p) => (
        <option key={p.id} value={p.id}>
          {posLabel(p)}
        </option>
      ))}
    </select>
  );

  const EmployeeSelect = ({ value, onChange }) => (
    <select
      className={`${projectStyles.textInput} ${styles.smallInput}`}
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value) || null)}
    >
      {employees.length === 0 && <option value="">(no employees)</option>}
      {employees.map((e) => (
        <option key={e.id} value={e.id}>
          {empLabel(e)}
        </option>
      ))}
    </select>
  );

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h4>Memos</h4>
        <button
          className={styles.addBtn}
          onClick={startCreate}
          disabled={!selectedProjectId || editingId === "new"}
          title={
            !selectedProjectId
              ? "Select a project first"
              : editingId === "new"
              ? "Finish the current draft first"
              : "Create new memo"
          }
        >
          + New Memo
        </button>
      </div>

      {loading && <p className={styles.note}>Loading…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {(items || []).map((m) => (
        <div key={m.id} className={styles.memoCard}>
          {editingId === m.id ? (
            <>
              <textarea
                className={styles.textarea}
                value={drafts[m.id]?.text ?? getText(m)}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Write memo…"
              />

              <div className={styles.inlineForm}>
                <label>
                  Position
                  <PositionSelect
                    value={drafts[m.id]?.positionId}
                    onChange={(v) => handleField("positionId", v)}
                  />
                </label>
                <label>
                  Employee
                  <EmployeeSelect
                    value={drafts[m.id]?.employeeId}
                    onChange={(v) => handleField("employeeId", v)}
                  />
                </label>
                <label>
                  Memo Date
                  <input
                    type="date"
                    className={`${projectStyles.textInput} ${styles.smallInput}`}
                    value={drafts[m.id]?.memoDate ?? todayStr()}
                    onChange={(e) => handleField("memoDate", e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  onClick={save}
                  title="Save"
                >
                  <FiSave />
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.danger}`}
                  onClick={cancel}
                  title="Cancel"
                >
                  <FiX />
                </button>
              </div>
            </>
          ) : (
            <>
              <pre className={styles.memoText}>{getText(m) || "(empty)"}</pre>
              <div className={styles.meta}>
                {m.memoDate && <span>{fmtDate(m.memoDate)}</span>}
                {m.employeeId && (
                  <span> • {employeeNameById(m.employeeId)}</span>
                )}
                {m.positionId && (
                  <span> • {positionNameById(m.positionId)}</span>
                )}
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => startEdit(m)}
                  title="Edit"
                >
                  <FiEdit />
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.danger}`}
                  onClick={() => remove(m.id)}
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {editingId === "new" && (
        <div className={styles.memoCard}>
          <textarea
            ref={newMemoTextareaRef} // ✅ NEW: focus target
            className={styles.textarea}
            value={drafts["new"]?.text ?? ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="New memo…"
          />

          <div className={styles.inlineForm}>
            <label>
              Position
              <PositionSelect
                value={drafts["new"]?.positionId}
                onChange={(v) => handleField("positionId", v)}
              />
            </label>
            <label>
              Employee
              <EmployeeSelect
                value={drafts["new"]?.employeeId}
                onChange={(v) => handleField("employeeId", v)}
              />
            </label>
            <label>
              Memo Date
              <input
                type="date"
                className={`${projectStyles.textInput} ${styles.smallInput}`}
                value={drafts["new"]?.memoDate ?? todayStr()}
                onChange={(e) => handleField("memoDate", e.target.value)}
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={save} title="Create">
              <FiSave />
            </button>
            <button
              className={`${styles.actionBtn} ${styles.danger}`}
              onClick={cancel}
              title="Cancel"
            >
              <FiX />
            </button>
          </div>
        </div>
      )}

      {!loading && items.length === 0 && editingId !== "new" && (
        <p className={styles.note}>No memos for this project yet.</p>
      )}
    </div>
  );
}
