import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Tooltip, Cell } from "recharts";
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

const Statistics = () => {
  const [relations, setRelations] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [projects, setProjects] = useState([]);
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

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [relRes, secRes, projRes] = await Promise.all([
          fetch(`${BASE_URL}/api/project-sectors/active`, {
            signal: ac.signal,
            headers: authHeaders,
          }),
          fetch(`${BASE_URL}/api/sectors/active`, {
            signal: ac.signal,
            headers: authHeaders,
          }),
          fetch(`${BASE_URL}/api/projects/ids-names`, {
            signal: ac.signal,
            headers: authHeaders,
          }),
        ]);

        if (!relRes.ok)
          throw new Error(`Project–sectors fetch failed: ${relRes.status}`);
        if (!secRes.ok)
          throw new Error(`Sectors fetch failed: ${secRes.status}`);
        if (!projRes.ok)
          throw new Error(`Projects fetch failed: ${projRes.status}`);

        const relRows = await relRes.json();
        const secRows = await secRes.json();
        const projRows = await projRes.json();

        setRelations(Array.isArray(relRows) ? relRows : []);
        setSectors(Array.isArray(secRows) ? secRows : []);
        setProjects(Array.isArray(projRows) ? projRows : []);
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  const COLORS = [
    "#3366CC",
    "#DC3912",
    "#FF9900",
    "#109618",
    "#990099",
    "#0099C6",
    "#DD4477",
    "#66AA00",
    "#B82E2E",
    "#316395",
    "#994499",
    "#22AA99",
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

  // ===== Chart geometry =====
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
    const verticalFactor = Math.abs(Math.sin(midAngle * RADIAN)); // 0 @ sides, 1 @ top/bottom
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

  const legendItems = useMemo(
    () =>
      pieData.map((d, i) => ({
        key: d.sectorId,
        color: COLORS[i % COLORS.length],
        label: d.name,
      })),
    [pieData]
  );

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>Projects by Sector</h2>
        <p className={styles.subtitle}>
          Distribution of projects across sectors (from Project–Sector
          relations).
        </p>

        {loading && <div className={styles.loadingSkeleton} />}

        {!loading && error && <div className={styles.errorText}>{error}</div>}

        {!loading && !error && pieData.length === 0 && (
          <div className={styles.emptyText}>No project–sector data found.</div>
        )}

        {!loading && !error && pieData.length > 0 && (
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

                <Tooltip content={<SliceTooltip />} />
              </PieChart>
            </div>

            <div className={styles.chartLegendSpacer} />

            <LegendBlock items={legendItems} />
          </>
        )}

        <div className={styles.meta}>
          <span>relations: {relations.length}</span>
          <span>sectors: {sectors.length}</span>
          <span>slices: {pieData.length}</span>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
