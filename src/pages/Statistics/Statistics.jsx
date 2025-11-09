// src/pages/Statistics/Statistics.jsx
import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Tooltip, Cell } from "recharts";

const BASE_URL = "http://localhost:8080";
const tokenFromStorage = () => localStorage.getItem("authToken");

// Simple external legend below the chart
const LegendBlock = ({ items }) => {
  return (
    <div
      style={{
        marginTop: 24,
        paddingTop: 6,
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
        justifyContent: "center",
        lineHeight: 1.2,
      }}
    >
      {items.map((it) => (
        <div
          key={it.key}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: it.color,
              display: "inline-block",
              flex: "0 0 auto",
            }}
          />
          <span style={{ fontSize: 14 }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
};

// Custom tooltip that lists count + project names for a slice
const SliceTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const names = Array.isArray(d.projectNames) ? d.projectNames : [];
  const MAX_SHOW = 10; // show up to 10 names, then "+N more"
  const more = Math.max(0, names.length - MAX_SHOW);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "10px 12px",
        maxWidth: 360,
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        lineHeight: 1.25,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.name}</div>
      <div style={{ marginBottom: 6 }}>
        <strong>{d.value}</strong> project{d.value === 1 ? "" : "s"}
      </div>
      {names.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {names.slice(0, MAX_SHOW).map((n) => (
            <li key={n} style={{ fontSize: 13, marginBottom: 2 }}>
              {n}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 13, color: "#666" }}>No projects listed.</div>
      )}
      {more > 0 && (
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          +{more} more…
        </div>
      )}
    </div>
  );
};

const Statistics = () => {
  const [relations, setRelations] = useState([]); // expects { sectorId, projectId, ... }
  const [sectors, setSectors] = useState([]); // SectorDTO[]
  const [projects, setProjects] = useState([]); // ProjectIdsNamesDTO[]
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

  // Build pie data with project names for each sector slice
  const pieData = useMemo(() => {
    const bySector = new Map(); // sectorId -> { count, projectIds:Set }
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
      return {
        name,
        sectorId,
        value: info.count,
        projectNames,
      };
    });
  }, [relations, sectorNameMap, projectNameMap]);

  const total = useMemo(
    () => pieData.reduce((s, d) => s + d.value, 0),
    [pieData]
  );

  // ==== Chart sizing + tuned labels ====
  const CHART_WIDTH = 1500;
  const CHART_HEIGHT = 680;
  const OUTER_RADIUS = 345;

  // move labels a tad closer so they’re less likely to hit the card edge
  const LABEL_OFFSET = 50; // was 56
  const CONNECTOR_GAP = 10;
  const LABEL_DY = 12;
  const RADIAN = Math.PI / 180;

  // simple word-wrap for long labels so they don't get visually cut
  const LINE_LEN = 24; // characters per line before wrapping

  const wrapLabel = (text) => {
    if (!text) return [""];
    if (text.length <= LINE_LEN) return [text];

    // prefer breaking at an em-dash/normal dash/space near LINE_LEN
    const candidates = [" — ", " - ", " "];
    for (const sep of candidates) {
      const idx = text.lastIndexOf(sep, LINE_LEN);
      if (idx > 10) {
        return [text.slice(0, idx), text.slice(idx + sep.length)];
      }
    }
    // fallback: hard break
    return [text.slice(0, LINE_LEN), text.slice(LINE_LEN)];
  };

  const renderLabel = ({ cx, cy, midAngle, outerRadius, name, value }) => {
    const sx =
      cx + (outerRadius + CONNECTOR_GAP) * Math.cos(-midAngle * RADIAN);
    const sy =
      cy + (outerRadius + CONNECTOR_GAP) * Math.sin(-midAngle * RADIAN);
    const ex = cx + (outerRadius + LABEL_OFFSET) * Math.cos(-midAngle * RADIAN);
    const ey = cy + (outerRadius + LABEL_OFFSET) * Math.sin(-midAngle * RADIAN);
    const textAnchor = ex > cx ? "start" : "end";
    const percent =
      total > 0 ? ` (${((value / total) * 100).toFixed(1)}%)` : "";

    const lines = wrapLabel(name);
    const first = lines[0] ?? "";
    const second = (lines[1] ?? "") + percent; // append % to last line

    return (
      <>
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#c7c7c7" />
        <text x={ex} y={ey} textAnchor={textAnchor} style={{ fontSize: 12 }}>
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

  // Wider outer card to give labels more breathing room
  const CONTAINER_MAX = 1360;

  return (
    <div style={{ padding: 16, width: "100%" }}>
      <div
        style={{
          maxWidth: CONTAINER_MAX,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 6px 22px rgba(0,0,0,0.08)",
          padding: 28,
          overflow: "visible", // allow SVG labels to spill if needed
        }}
      >
        <h2 style={{ fontSize: 28, margin: "4px 0 6px" }}>
          Projects by Sector
        </h2>
        <p style={{ color: "#666", margin: "0 0 18px" }}>
          Distribution of projects across sectors (from Project–Sector
          relations).
        </p>

        {loading && (
          <div
            style={{
              height: CHART_HEIGHT,
              background: "#f3f4f6",
              borderRadius: 8,
            }}
          />
        )}

        {!loading && error && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>
        )}

        {!loading && !error && pieData.length === 0 && (
          <div style={{ color: "#555", marginBottom: 12 }}>
            No project–sector data found.
          </div>
        )}

        {!loading && !error && pieData.length > 0 && (
          <>
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                overflow: "visible",
              }}
            >
              <PieChart
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
              >
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx={CHART_WIDTH / 2 - 10}
                  cy={CHART_HEIGHT / 2 - 6}
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

                {/* Custom tooltip shows project names as well */}
                <Tooltip content={<SliceTooltip />} />
              </PieChart>
            </div>

            <LegendBlock items={legendItems} />
          </>
        )}

        <div
          style={{
            marginTop: 14,
            fontSize: 12,
            color: "#777",
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span>relations: {relations.length}</span>
          <span>sectors: {sectors.length}</span>
          <span>slices: {pieData.length}</span>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
