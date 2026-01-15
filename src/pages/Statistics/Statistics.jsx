import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Tooltip as RechartsTooltip,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import styles from "./Statistics.module.scss";

const BASE_URL = "http://localhost:8080";
const tokenFromStorage = () => localStorage.getItem("authToken");

// Legend (styled via CSS Module, only dynamic color stays inline)
const LegendBlock = ({ items }) => (
  <div className={styles.legend}>
    {items.map((it) => (
      <div key={it.key} className={styles.legendItem}>
        <span
          className={styles.legendSwatch}
          style={{ background: it.color }}
        />
        <span className={styles.legendLabel}>{it.label}</span>
      </div>
    ))}
  </div>
);

// Custom tooltip that lists count + project names for a slice
const SliceTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const names = Array.isArray(d.projectNames) ? d.projectNames : [];
  const MAX_SHOW = 10;
  const more = Math.max(0, names.length - MAX_SHOW);

  return (
    <div className={styles.tooltipBox}>
      <div className={styles.tooltipTitle}>{d.name}</div>
      <div className={styles.tooltipCount}>
        <strong>{d.value}</strong> project{d.value === 1 ? "" : "s"}
      </div>
      {names.length > 0 ? (
        <ul className={styles.tooltipProjects}>
          {names.slice(0, MAX_SHOW).map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : (
        <div className={styles.tooltipEmpty}>No projects listed.</div>
      )}
      {more > 0 && <div className={styles.tooltipMore}>+{more} more…</div>}
    </div>
  );
};

// Tooltip for bars (same UI pattern as SliceTooltip)
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const names = Array.isArray(d.projectNames) ? d.projectNames : [];
  const MAX_SHOW = 10;
  const more = Math.max(0, names.length - MAX_SHOW);

  return (
    <div className={styles.tooltipBox}>
      <div className={styles.tooltipTitle}>{label ?? d.name}</div>
      <div className={styles.tooltipCount}>
        <strong>{d.value}</strong> project{d.value === 1 ? "" : "s"}
      </div>

      {names.length > 0 ? (
        <ul className={styles.tooltipProjects}>
          {names.slice(0, MAX_SHOW).map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : (
        <div className={styles.tooltipEmpty}>No projects listed.</div>
      )}

      {more > 0 && <div className={styles.tooltipMore}>+{more} more…</div>}
    </div>
  );
};

const Statistics = () => {
  const [relations, setRelations] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [projects, setProjects] = useState([]); // ids-names (labels/tooltips)
  const [projectTypes, setProjectTypes] = useState([]); // active project types (names only)
  const [projectStatuses, setProjectStatuses] = useState([]); // active statuses (names only)
  const [projectsWithTypes, setProjectsWithTypes] = useState([]); // projects (for status/type values)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    const token = tokenFromStorage();
    const authHeaders = token
      ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        }
      : { "Content-Type": "application/json", Accept: "application/json" };

    const fetchJson = async (url, { optional = false } = {}) => {
      const res = await fetch(url, { signal: ac.signal, headers: authHeaders });

      if (res.status === 204) return [];

      if (!res.ok) {
        if (optional && (res.status === 404 || res.status === 403)) return null;
        throw new Error(`Fetch failed (${res.status}) for ${url}`);
      }

      return res.json();
    };

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [
          relRows,
          secRows,
          projRows,
          typeRows,
          statusRows,
          projActiveRows,
        ] = await Promise.all([
          fetchJson(`${BASE_URL}/api/project-sectors/active`),
          fetchJson(`${BASE_URL}/api/sectors/active`),
          fetchJson(`${BASE_URL}/api/projects/ids-names`),
          fetchJson(`${BASE_URL}/api/project-types/active`),
          fetchJson(`${BASE_URL}/api/project-statuses/active`, {
            optional: true,
          }),
          fetchJson(`${BASE_URL}/api/projects/active`, { optional: true }),
        ]);

        setRelations(Array.isArray(relRows) ? relRows : []);
        setSectors(Array.isArray(secRows) ? secRows : []);
        setProjects(Array.isArray(projRows) ? projRows : []);
        setProjectTypes(Array.isArray(typeRows) ? typeRows : []);
        setProjectStatuses(Array.isArray(statusRows) ? statusRows : []);
        setProjectsWithTypes(
          Array.isArray(projActiveRows) ? projActiveRows : []
        );
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  const COLORS = [
    "#3D85C6",
    "#CC4125",
    "#E69138",
    "#6AA84F",
    "#674EA7",
    "#45818E",
    "#A64D79",
    "#6D9EEB",
    "#F1C232",
    "#8E7CC3",
    "#3C78D8",
    "#C27BA0",
  ];

  // Sector id -> "CODE — Description"
  const sectorNameMap = useMemo(() => {
    const map = new Map();
    for (const s of sectors) {
      const code = s?.sectorCode;
      const desc = s?.sectorDescription;
      const label =
        [code, desc].filter(Boolean).join(" — ") || `Sector ${s?.id ?? ""}`;
      map.set(s.id, label);
    }
    return map;
  }, [sectors]);

  // Project id -> name
  const projectNameMap = useMemo(() => {
    const map = new Map();
    for (const p of projects) {
      const id = p?.id ?? p?.projectId;
      const name = p?.projectName ?? p?.name ?? `Project ${id ?? ""}`;
      if (id != null) map.set(Number(id), String(name));
    }
    return map;
  }, [projects]);

  const extractProjectId = (p) => {
    const id = p?.id ?? p?.projectId;
    return id == null ? null : Number(id);
  };

  // ================================
  // Sector pie (counts based on Sector input in main Project page)
  // ================================
  const pieData = useMemo(() => {
    const bySector = new Map();
    for (const row of relations) {
      const sectorId = row?.sectorId;
      const projectId = row?.projectId;
      if (sectorId == null) continue;

      let bucket = bySector.get(sectorId);
      if (!bucket) {
        bucket = { count: 0, projectIds: new Set() };
        bySector.set(sectorId, bucket);
      }
      bucket.count += 1;
      if (projectId != null) bucket.projectIds.add(Number(projectId));
    }

    return Array.from(bySector.entries()).map(([sectorId, info]) => {
      const name = sectorNameMap.get(sectorId) || `Sector ${sectorId}`;
      const projectNames = Array.from(info.projectIds)
        .map((pid) => projectNameMap.get(pid) || `Project ${pid}`)
        .sort((a, b) => a.localeCompare(b));
      return { name, sectorId, value: info.count, projectNames };
    });
  }, [relations, sectorNameMap, projectNameMap]);

  const total = useMemo(
    () => pieData.reduce((s, d) => s + d.value, 0),
    [pieData]
  );

  // ================================
  // Project type bar (counts based on Project Type input in main Project page)
  // ================================
  const projectTypeNameMap = useMemo(() => {
    const map = new Map();
    for (const t of projectTypes) {
      const id = t?.id ?? t?.projectTypeId;
      const name =
        t?.projectTypeName ?? t?.name ?? (id != null ? `Type ${id}` : "Type");
      if (id != null) map.set(Number(id), String(name));
    }
    return map;
  }, [projectTypes]);

  const extractProjectTypeId = (p) => {
    const raw =
      p?.projectTypeId ??
      p?.typeId ??
      p?.project_type_id ??
      p?.projectType?.id ??
      p?.projectType?.projectTypeId ??
      p?.projectType?.project_type_id ??
      p?.projectType?.project_typeId;

    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const barData = useMemo(() => {
    if (!Array.isArray(projectsWithTypes) || projectsWithTypes.length === 0)
      return [];

    const byType = new Map();

    for (const p of projectsWithTypes) {
      const pid = extractProjectId(p);
      const typeId = extractProjectTypeId(p);

      const key = typeId == null ? "__UNASSIGNED__" : String(typeId);

      let bucket = byType.get(key);
      if (!bucket) {
        bucket = { count: 0, projectIds: new Set() };
        byType.set(key, bucket);
      }

      bucket.count += 1;
      if (pid != null) bucket.projectIds.add(pid);
    }

    const rows = Array.from(byType.entries()).map(([key, info]) => {
      const isUnassigned = key === "__UNASSIGNED__";
      const typeId = isUnassigned ? null : Number(key);
      const name = isUnassigned
        ? "Unassigned"
        : projectTypeNameMap.get(typeId) || `Type ${typeId}`;

      const projectNames = Array.from(info.projectIds)
        .map((pid) => projectNameMap.get(pid) || `Project ${pid}`)
        .sort((a, b) => a.localeCompare(b));

      return { typeId, name, value: info.count, projectNames };
    });

    rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    return rows;
  }, [projectsWithTypes, projectTypeNameMap, projectNameMap]);

  const barHasTypeInfo = useMemo(() => {
    if (!Array.isArray(projectsWithTypes) || projectsWithTypes.length === 0)
      return false;
    return projectsWithTypes.some((p) => extractProjectTypeId(p) != null);
  }, [projectsWithTypes]);

  // ================================
  // Project status donut (counts based on Project Status input in main Project page)
  // ================================
  const projectStatusNameMap = useMemo(() => {
    const map = new Map();
    for (const s of projectStatuses) {
      const id = s?.id ?? s?.projectStatusId;
      const name =
        s?.statusName ?? s?.name ?? (id != null ? `Status ${id}` : "Status");
      if (id != null) map.set(Number(id), String(name));
    }
    return map;
  }, [projectStatuses]);

  const extractProjectStatusId = (p) => {
    const raw =
      p?.projectStatusId ??
      p?.statusId ??
      p?.project_status_id ??
      p?.projectStatus?.id ??
      p?.projectStatus?.projectStatusId ??
      p?.projectStatus?.project_status_id ??
      p?.projectStatus?.project_statusId;

    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const statusHasInfo = useMemo(() => {
    if (!Array.isArray(projectsWithTypes) || projectsWithTypes.length === 0)
      return false;
    return projectsWithTypes.some((p) => extractProjectStatusId(p) != null);
  }, [projectsWithTypes]);

  const statusData = useMemo(() => {
    if (!Array.isArray(projectsWithTypes) || projectsWithTypes.length === 0)
      return [];

    const byStatus = new Map();

    for (const p of projectsWithTypes) {
      const pid = extractProjectId(p);
      const sid = extractProjectStatusId(p);
      const key = sid == null ? "__UNASSIGNED__" : String(sid);

      let bucket = byStatus.get(key);
      if (!bucket) {
        bucket = { count: 0, projectIds: new Set() };
        byStatus.set(key, bucket);
      }

      bucket.count += 1;
      if (pid != null) bucket.projectIds.add(pid);
    }

    const rows = Array.from(byStatus.entries()).map(([key, info]) => {
      const isUnassigned = key === "__UNASSIGNED__";
      const statusId = isUnassigned ? null : Number(key);

      const name = isUnassigned
        ? "Unassigned"
        : projectStatusNameMap.get(statusId) || `Status ${statusId}`;

      const projectNames = Array.from(info.projectIds)
        .map((pid) => projectNameMap.get(pid) || `Project ${pid}`)
        .sort((a, b) => a.localeCompare(b));

      return { statusId, name, value: info.count, projectNames };
    });

    rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    return rows;
  }, [projectsWithTypes, projectStatusNameMap, projectNameMap]);

  const statusTotal = useMemo(
    () => statusData.reduce((s, d) => s + d.value, 0),
    [statusData]
  );

  const statusLegendItems = useMemo(
    () =>
      statusData.map((d, i) => ({
        key: d.statusId ?? `status-${i}`,
        color: COLORS[i % COLORS.length],
        label: d.name,
      })),
    [statusData]
  );

  // Sector legend items
  const legendItems = useMemo(
    () =>
      pieData.map((d, i) => ({
        key: d.sectorId,
        color: COLORS[i % COLORS.length],
        label: d.name,
      })),
    [pieData]
  );

  // ================================
  // Pie geometry (existing)
  // ================================
  const CHART_WIDTH = 1460;
  const OUTER_RADIUS = 185;
  const LABEL_OFFSET = 110;
  const POLE_EXTRA = 44;

  const TOP_GAP = LABEL_OFFSET + 36;
  const BOTTOM_GAP = 160;

  const CHART_HEIGHT =
    TOP_GAP + OUTER_RADIUS + (OUTER_RADIUS + LABEL_OFFSET) + BOTTOM_GAP;

  const CY = TOP_GAP + OUTER_RADIUS;

  const CONNECTOR_GAP = 14;
  const LABEL_DY = 12;
  const RADIAN = Math.PI / 180;

  const wrapLabel = (text) => {
    const LINE_LEN = 22;
    if (!text) return [""];
    if (text.length <= LINE_LEN) return [text];
    const candidates = [" — ", " - ", " "];
    for (const sep of candidates) {
      const idx = text.lastIndexOf(sep, LINE_LEN);
      if (idx > 10) return [text.slice(0, idx), text.slice(idx + sep.length)];
    }
    return [text.slice(0, LINE_LEN), text.slice(LINE_LEN)];
  };

  const renderLabel = ({ cx, cy, midAngle, outerRadius, name, value }) => {
    const verticalFactor = Math.abs(Math.sin(midAngle * RADIAN));
    const extra = POLE_EXTRA * verticalFactor;

    const sx =
      cx +
      (outerRadius + CONNECTOR_GAP + extra * 0.4) *
        Math.cos(-midAngle * RADIAN);
    const sy =
      cy +
      (outerRadius + CONNECTOR_GAP + extra * 0.4) *
        Math.sin(-midAngle * RADIAN);

    const radiusWithLabel = outerRadius + LABEL_OFFSET + extra;
    const ex = cx + radiusWithLabel * Math.cos(-midAngle * RADIAN);
    const ey = cy + radiusWithLabel * Math.sin(-midAngle * RADIAN);

    const textAnchor = ex > cx ? "start" : "end";
    const percent =
      total > 0 ? ` (${((value / total) * 100).toFixed(1)}%)` : "";

    const lines = wrapLabel(name);
    const first = lines[0] ?? "";
    const second = (lines[1] ?? "") + percent;

    return (
      <>
        <line
          x1={sx}
          y1={sy}
          x2={ex}
          y2={ey}
          className={styles.sliceConnector}
        />
        <text
          x={ex}
          y={ey}
          textAnchor={textAnchor}
          className={styles.sliceLabel}
        >
          <tspan dy={LABEL_DY}>{first}</tspan>
          {second && (
            <tspan x={ex} dy={14}>
              {second}
            </tspan>
          )}
        </text>
      </>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h2 className={styles.pageTitle}>Statistics</h2>
            <p className={styles.pageSubtitle}>
              Projects by sector, status, and type.
            </p>
          </div>

          <div className={styles.headerActions}>{/* future controls */}</div>
        </div>

        {loading && <div className={styles.loadingSkeleton} />}

        {!loading && error && <div className={styles.errorBanner}>{error}</div>}

        {!loading && !error && (
          <>
            {/* ========================= */}
            {/* Sector PIE */}
            {/* ========================= */}
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>Projects by sector</div>
              <div className={styles.sectionSubtitle}>
                Counts come from the <strong>Sector</strong> selection on the
                main Project page.
              </div>
            </div>

            {pieData.length === 0 ? (
              <div className={styles.emptyText}>
                No project–sector data found.
              </div>
            ) : (
              <>
                <div className={styles.chartRow}>
                  <PieChart
                    width={CHART_WIDTH}
                    height={CHART_HEIGHT}
                    margin={{ top: 8, right: 32, bottom: 0, left: 32 }}
                  >
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx={CHART_WIDTH / 2}
                      cy={CY}
                      outerRadius={OUTER_RADIUS}
                      label={renderLabel}
                      labelLine={false}
                      isAnimationActive
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.sectorId}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <RechartsTooltip content={<SliceTooltip />} />
                  </PieChart>
                </div>

                <div className={styles.chartLegendSpacer} />
                <LegendBlock items={legendItems} />
              </>
            )}

            {/* ========================= */}
            {/* Status DONUT */}
            {/* ========================= */}
            <div className={styles.sectionSpacer} />

            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                Projects by project status
              </div>
              <div className={styles.sectionSubtitle}>
                Counts come from the <strong>Project Status</strong> selection
                on the main Project page.
              </div>
            </div>

            {!statusHasInfo && (
              <div className={styles.infoBanner}>
                I couldn’t detect any project status on the project data.
                <br />
                Make sure each project has a Project Status selected on the main
                Project page.
              </div>
            )}

            {statusHasInfo && statusData.length === 0 && (
              <div className={styles.emptyText}>
                No project–status data found.
              </div>
            )}

            {statusHasInfo && statusData.length > 0 && (
              <>
                <div className={styles.donutCard}>
                  <div className={styles.donutChartWrap}>
                    <ResponsiveContainer width="100%" height={420}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={155}
                          innerRadius={95}
                          paddingAngle={2}
                          isAnimationActive
                        >
                          {statusData.map((entry, index) => (
                            <Cell
                              key={`status-${entry.statusId ?? entry.name}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>

                        {/* center label */}
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className={styles.donutCenterText}
                        >
                          <tspan className={styles.donutCenterValue}>
                            {statusTotal}
                          </tspan>
                          <tspan
                            x="50%"
                            dy="18"
                            className={styles.donutCenterSub}
                          >
                            projects
                          </tspan>
                        </text>

                        <RechartsTooltip content={<SliceTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={styles.chartLegendSpacer} />
                <LegendBlock items={statusLegendItems} />
              </>
            )}

            {/* ========================= */}
            {/* Project TYPE BAR */}
            {/* ========================= */}
            <div className={styles.sectionSpacer} />

            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                Projects by project type
              </div>
              <div className={styles.sectionSubtitle}>
                Counts come from the <strong>Project Type</strong> selection on
                the main Project page.
              </div>
            </div>

            {!barHasTypeInfo && (
              <div className={styles.infoBanner}>
                I couldn’t detect any project type on the project data.
                <br />
                Make sure each project has a Project Type selected on the main
                Project page.
              </div>
            )}

            {barHasTypeInfo && barData.length === 0 && (
              <div className={styles.emptyText}>
                No project–type data found.
              </div>
            )}

            {barHasTypeInfo && barData.length > 0 && (
              <div className={styles.barCard}>
                <div className={styles.barChartWrap}>
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart
                      data={barData}
                      margin={{ top: 16, right: 24, bottom: 70, left: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(0,0,0,0.08)"
                      />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={70}
                        tickFormatter={(v) =>
                          typeof v === "string" && v.length > 24
                            ? `${v.slice(0, 23)}…`
                            : v
                        }
                      />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip content={<BarTooltip />} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell
                            key={`bar-${entry.typeId ?? entry.name}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        <div className={styles.meta}>
          <span>relations: {relations.length}</span>
          <span>sectors: {sectors.length}</span>
          <span>slices: {pieData.length}</span>
          <span>project statuses: {projectStatuses.length}</span>
          <span>project types: {projectTypes.length}</span>
          <span>projects (ids-names): {projects.length}</span>
          <span>projects (active): {projectsWithTypes.length}</span>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
