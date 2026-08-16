import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ExcelJS from "exceljs";
import { ProjectContext } from "../../context/ProjectContext";
import { useAuth } from "../../context/AuthContext";
import RecipientRow from "./Recipient/Recipient";
import styles from "./Recipients.module.scss";
import { FiColumns, FiPlus, FiTrash2, FiDownload } from "react-icons/fi";

import { BASE_URL } from "../../config/api"; // adjust path if needed
import SortableHeader from "../../components/SortableHeader/SortableHeader";
import { sortRows, toSortableNumber } from "../../utils/tableSorting";
import { matchesNumberRange, matchesText } from "../../utils/tableSorting";
import ColumnFilter from "../../components/ColumnFilter/ColumnFilter";
import ClearFiltersButton from "../../components/ClearFiltersButton/ClearFiltersButton";
import { getSelectedProjectName } from "../../utils/projectDisplay";

const headerLabels = ["Actions", "Organization", "Payment Order", "Amount"];
const HEADER_SORT_KEYS = [null, "organization", "paymentOrderId", "amount"];

// ✅ add width for Amount column
const BASE_COL_WIDTHS = [
  130, // Actions
  260, // Organization
  170, // Payment Order
  140, // Amount
];

async function safeParseJsonResponse(res) {
  const raw = await res.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
//409 Conflict
//The request itself is understandable,
// but the current state of the resource does not allow the action.
function isLockedResponse(res, data) {
  const msg = (data?.message || "").toLowerCase();

  return (
    msg.includes("locked") ||
    msg.includes("booked") ||
    msg.includes("final") ||
    msg.includes("signature")
  );
}

function normalizeRecipient(r) {
  if (!r || typeof r !== "object") return null;

  const id = r.id ?? r.recipientId ?? r.recipient_id ?? null;

  const organizationId =
    r.organizationId ??
    r.organization_id ??
    r.organization?.id ??
    r.organization?.organizationId ??
    null;

  const paymentOrderId =
    r.paymentOrderId ??
    r.payment_order_id ??
    r.paymentOrder?.id ??
    r.paymentOrder?.paymentOrderId ??
    null;

  return {
    id,
    //organizationId, is shorthand for: organizationId: organizationId, etc
    //But for amount, we do not first create a variable called amount
    //works only when you already have a variable called organizationId.
    organizationId,
    paymentOrderId,
    amount: r.amount ?? 0,
    locked: Boolean(r.locked ?? r.isLocked ?? false),
  };
}

function Recipients() {
  const { selectedProjectId, projects } = useContext(ProjectContext);
  const { hasRole, hasAnyRole } = useAuth();
  const canManageRecipients = hasAnyRole("ADMIN", "FINANCE");
  const canBulkDeleteRecipients = hasRole("ADMIN");

  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  // Lazy initializer function.
  // React calls this once when the component first mounts
  // and uses the returned Set as the initial state.
  const [selectedRecipientIds, setSelectedRecipientIds] = useState(
    () => new Set(),
  );

  const [lockedRecipientIds, setLockedRecipientIds] = useState(() => new Set());
  const [lockedBanner, setLockedBanner] = useState("");
  const [exportingSelected, setExportingSelected] = useState(false);
  const [sortConfig, setSortConfig] = useState(null);
  const emptyFilters = () => ({organization:"",paymentOrderId:{min:"",max:""},amount:{min:"",max:""}});
  const [filters, setFilters] = useState(emptyFilters);
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(emptyFilters());

  // dropdown data
  const [poOptions, setPoOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);

  // UI
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true),
  );

  // errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { [rowId]: { fieldName: message } }

  const newRowRef = useRef(null);

  const toggleCol = (i) => {
    if (i === 0) return; // keep Actions visible
    setVisibleCols((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const authHeaders = useMemo(
    () =>
      token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" },
    [token],
  );

  // FETCH: recipients filtered by project
  const fetchRecipients = useCallback(
    async (projectId) => {
      if (!projectId) {
        setItems([]);
        setSelectedRecipientIds(new Set());
        setLockedRecipientIds(new Set());
        setLockedBanner("");
        return;
      }

      try {
        const res = await fetch(
          `${BASE_URL}/api/recipients/by-project/${projectId}`,
          { headers: authHeaders },
        );

        if (!res.ok) throw new Error(`Failed ${res.status}`);

        const data = await res.json();
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        //Each recipient is passed into your normalizeRecipient function.
        //.filter(Boolean) removes the null value.
        const normalized = arr.map(normalizeRecipient).filter(Boolean);

        //Store the normalized recipients
        //React schedules a re-render after this state update.
        setItems(normalized);

        //Extract the IDs of locked recipients
        //First: filter the locked recipients
        //Second: extract their IDs
        //Third: create a Set
        //Set is useful because checking whether an ID is locked is simple:
        //lockedRecipientIds.has(recipient.id)
        const lockedIds = new Set(
          normalized.filter((r) => r.locked).map((r) => r.id),
        );

        //Save the locked IDs in state
        setLockedRecipientIds(lockedIds);

        // Remove selected IDs that no longer exist after reload.
        //Create a set of selectable recipient IDs
        setSelectedRecipientIds((prev) => {
          /*
           * Selection is independent from editability.
           *
           * Locked recipients remain selectable so they can be exported and so
           * bulk delete can report them as skipped. Only IDs that no longer
           * exist are removed after a refresh.
           */
          const activeIds = new Set(normalized.map((r) => r.id));

          return new Set([...prev].filter((id) => activeIds.has(id)));
        });
      } catch (e) {
        console.error(e);
        setItems([]);
        setSelectedRecipientIds(new Set());
        setLockedRecipientIds(new Set());
      }
    },
    [authHeaders],
  );

  // FETCH: payment orders (dropdown) filtered by project
  const fetchPaymentOrders = useCallback(
    async (projectId) => {
      if (!projectId) {
        setPoOptions([]);
        return;
      }

      try {
        const res = await fetch(
          `${BASE_URL}/api/payment-orders/project/${projectId}`,
          { headers: authHeaders },
        );

        if (!res.ok) throw new Error(`Failed ${res.status}`);

        const data = await res.json();
        setPoOptions(Array.isArray(data) ? data : data ? [data] : []);
      } catch (e) {
        console.error(e);
        setPoOptions([]);
      }
    },
    [authHeaders],
  );

  // FETCH: organizations (ALL active options - not project-filtered)
  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/organizations/active/options`, {
        headers: authHeaders,
      });

      if (!res.ok) throw new Error(`Failed ${res.status}`);

      const data = await res.json();

      // Robust normalization: supports {id,label}, {organizationId,name},
      // {value:"123", label:"Org"}, etc.
      const normalized = (Array.isArray(data) ? data : []).map((o) => {
        const rawId =
          o?.id ??
          o?.organizationId ??
          o?.organization_id ??
          o?.orgId ??
          o?.value;

        const idNum = rawId === "" || rawId == null ? null : Number(rawId);
        const id = Number.isFinite(idNum) ? idNum : null;

        const label =
          o?.label ??
          o?.name ??
          o?.organizationName ??
          o?.organization_name ??
          (id != null ? `Org #${id}` : "");

        return { id, label };
      });

      setOrgOptions(normalized.filter((x) => x.id != null));
    } catch (e) {
      console.error(e);
      setOrgOptions([]);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchRecipients(selectedProjectId);
    fetchPaymentOrders(selectedProjectId);
    fetchOrganizations();

    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
    setColumnsOpen(false);
  }, [
    fetchRecipients,
    fetchPaymentOrders,
    fetchOrganizations,
    selectedProjectId,
  ]);

  useEffect(() => {
    if (editingId === "new" && newRowRef.current) {
      newRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [editingId]);

  const blankRecipient = {
    organizationId: "",
    paymentOrderId: "",
  };

  const startEdit = (row) => {
    if (!canManageRecipients) return;
    setEditingId(row?.id ?? null);
    setEditedValues((prev) => ({
      ...prev,
      [row.id]: {
        organizationId: row.organizationId ?? "",
        paymentOrderId: row.paymentOrderId ?? "",
      },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });

    setFormError("");
    setLockedBanner("");
  };

  const startCreate = () => {
    if (!canManageRecipients) return;
    setEditingId("new");
    setEditedValues((prev) => ({ ...prev, new: { ...blankRecipient } }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.new;
      return next;
    });

    setFormError("");
    setLockedBanner("");
  };

  const onChange = (field, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: typeof value === "string" && value.trim() === "" ? "" : value,
      },
    }));
  };

  const cancel = () => {
    const id = editingId;
    setEditingId(null);

    setEditedValues((prev) => {
      const next = { ...prev };
      delete next.new;
      if (id && next[id]) delete next[id];
      return next;
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.new;
      if (id && next[id]) delete next[id];
      return next;
    });

    setFormError("");
  };

  const save = async () => {
    if (!canManageRecipients) return;
    const id = editingId;
    const v = editedValues[id];
    if (!v) return;

    const isCreate = id === "new";

    const payload = {
      organizationId: v.organizationId !== "" ? Number(v.organizationId) : null,
      paymentOrderId: v.paymentOrderId !== "" ? Number(v.paymentOrderId) : null,
    };

    setFormError("");
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/recipients`
          : `${BASE_URL}/api/recipients/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        //tries to convert the response body into a JavaScript object.

        //Example:
        /*
            {
            "status": 409,
            "message": "This payment order is Booked and cannot be edited.",
            "fieldErrors": {
              "paymentOrderId": "Booked payment orders are read-only."
            }
          }
       
          safeParseJsonResponse should not crash if the backend returns:

            an empty response;
            plain text;
            malformed JSON;
            an HTML error page.
          */

        const data = await safeParseJsonResponse(res);

        //Check whether the backend returned field-specific errors
        //optional chaining operator
        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
        }

        if (isLockedResponse(res, data)) {
          const msg =
            data?.message ||
            "This payment order is Booked (locked). Existing recipients cannot be changed.";

          setLockedBanner(msg);
          setFormError("");
          await fetchRecipients(selectedProjectId);
          return;
        }

        setFormError(
          data?.message ||
            `Failed to ${isCreate ? "create" : "update"} recipient.`,
        );
        return;
      }

      await fetchRecipients(selectedProjectId);
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(
        e.message || `Failed to ${isCreate ? "create" : "update"} recipient.`,
      );
    }
  };

  const remove = async (id) => {
    if (!canManageRecipients) return;
    if (!id) return;
    if (!window.confirm("Delete this recipient?")) return;

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/recipients/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);

        if (isLockedResponse(res, data)) {
          const msg =
            data?.message ||
            "This payment order is Booked (locked). Existing recipients cannot be deleted.";

          setLockedBanner(msg);
          setFormError("");
          await fetchRecipients(selectedProjectId);
          return;
        }

        setFormError(data?.message || "Delete failed.");
        return;
      }

      setSelectedRecipientIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      await fetchRecipients(selectedProjectId);
    } catch (e) {
      console.error(e);
      setFormError("Delete failed.");
    }
  };

  const toggleSelectedRecipient = (id, checked) => {
    if (!id) return;

    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);

      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  };

  const toggleSelectAllVisible = (checked) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);

      selectableRecipients.forEach((r) => {
        if (checked) {
          next.add(r.id);
        } else {
          next.delete(r.id);
        }
      });

      return next;
    });
  };

  const removeSelected = async () => {
    if (!canBulkDeleteRecipients) return;
    const ids = [...selectedRecipientIds];

    if (ids.length === 0) return;

    if (
      !window.confirm(
        `Delete ${ids.length} selected recipient${ids.length === 1 ? "" : "s"}? Locked recipients will be skipped.`,
      )
    ) {
      return;
    }

    setFormError("");
    setLockedBanner("");

    try {
      const res = await fetch(`${BASE_URL}/api/recipients/bulk-delete`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ ids }),
      });

      const data = await safeParseJsonResponse(res);

      if (!res.ok) {
        throw new Error(
          data?.message || "Failed to delete selected recipients.",
        );
      }

      /*
       * Backend returns:
       *
       * {
       *   requestedCount,
       *   deletedCount,
       *   lockedRecipientIds,
       *   notFoundRecipientIds,
       *   message
       * }
       */
      const lockedIds = Array.isArray(data?.lockedRecipientIds)
        ? data.lockedRecipientIds
        : [];

      if (lockedIds.length > 0) {
        setLockedBanner(
          data?.message ||
            `Locked recipients were not deleted: ${lockedIds
              .map((id) => `Recipient #${id}`)
              .join(", ")}.`,
        );
      } else {
        setLockedBanner("");
      }

      setSelectedRecipientIds(new Set());
      await fetchRecipients(selectedProjectId);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to delete recipients.");
    }
  };

  // =========================
  // ✅ EXCEL EXPORT HELPERS
  // =========================

  const excelColors = {
    darkBlue: "FF1F4E78",
    lightBlue: "FFD9EAF7",
    lightGray: "FFF3F4F6",
    borderGray: "FFD1D5DB",
    white: "FFFFFFFF",
    text: "FF1F2937",
  };

  const sanitizeExcelFilename = (value, maxLength = 50) => {
    const cleaned = String(value || "recipients")
      .trim()
      .replace(/[<>:"/\\|?*\s]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, maxLength)
      .replace(/_+$/g, "");

    return cleaned || "recipients";
  };

  const sanitizeExcelText = (value) =>
    String(value ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
      .trim();

  const toExcelNumber = (value) => {
    if (value == null || value === "") return 0;

    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const getOrganizationLabel = (id) => {
    const organization = orgOptions.find(
      (item) => String(item.id) === String(id),
    );

    return (
      sanitizeExcelText(organization?.label) ||
      (id != null ? `Organization ${id}` : "Not specified")
    );
  };

  const getPaymentOrderForExport = (id) =>
    poOptions.find((item) => String(item.id) === String(id)) || null;

  const getPaymentOrderLabel = (id) => {
    if (id == null || id === "") return "Not specified";

    const paymentOrder = getPaymentOrderForExport(id);

    if (!paymentOrder) return `PO#${id}`;

    const description = sanitizeExcelText(
      paymentOrder.paymentOrderDescription ??
        paymentOrder.payment_order_description ??
        "",
    );

    return description
      ? `PO#${paymentOrder.id} — ${description}`
      : `PO#${paymentOrder.id}`;
  };

  const getPaymentOrderState = (recipient) => {
    const paymentOrder = getPaymentOrderForExport(recipient.paymentOrderId);

    return recipient.locked || paymentOrder?.locked
      ? "Booked / Locked"
      : "Editable";
  };

  const applyExcelBorder = (cell) => {
    cell.border = {
      top: {
        style: "thin",
        color: { argb: excelColors.borderGray },
      },
      left: {
        style: "thin",
        color: { argb: excelColors.borderGray },
      },
      bottom: {
        style: "thin",
        color: { argb: excelColors.borderGray },
      },
      right: {
        style: "thin",
        color: { argb: excelColors.borderGray },
      },
    };
  };

  const handleExportSelected = async () => {
    const selectedRecipients = items.filter(
      (recipient) =>
        recipient?.id != null && selectedRecipientIds.has(recipient.id),
    );

    if (selectedRecipients.length === 0) {
      setFormError("Please select at least one recipient before exporting.");
      return;
    }

    try {
      setExportingSelected(true);
      setFormError("");

      const projectsResponse = await fetch(
        `${BASE_URL}/api/projects/ids-names`,
        {
          headers: authHeaders,
        },
      );

      if (!projectsResponse.ok) {
        throw new Error("Failed to load project names for export.");
      }

      const projectsData = await projectsResponse.json();
      const projects = Array.isArray(projectsData) ? projectsData : [];

      const project = projects.find(
        (item) => String(item.id) === String(selectedProjectId),
      );

      const projectName =
        sanitizeExcelText(project?.projectName || project?.name) ||
        (selectedProjectId ? `Project ${selectedProjectId}` : "Not specified");

      const sortedRecipients = [...selectedRecipients].sort(
        (a, b) => Number(a.id || 0) - Number(b.id || 0),
      );

      const workbook = new ExcelJS.Workbook();

      workbook.creator = "Relief Projects";
      workbook.lastModifiedBy = "Relief Projects";
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.title = "Selected Recipients";
      workbook.subject = `Export of ${sortedRecipients.length} selected recipients`;

      const worksheet = workbook.addWorksheet("Selected Recipients", {
        views: [{ state: "frozen", ySplit: 4 }],
        properties: {
          defaultRowHeight: 20,
        },
        pageSetup: {
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          paperSize: 9,
        },
      });

      worksheet.columns = [
        { key: "recipientId", width: 15 },
        { key: "organization", width: 34 },
        { key: "paymentOrder", width: 46 },
        { key: "amount", width: 18 },
        { key: "state", width: 20 },
        { key: "project", width: 34 },
      ];

      worksheet.mergeCells("A1:F1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "Selected Recipients Report";
      titleCell.font = {
        bold: true,
        size: 18,
        color: { argb: excelColors.white },
      };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: excelColors.darkBlue },
      };
      titleCell.alignment = {
        vertical: "middle",
        horizontal: "left",
      };
      worksheet.getRow(1).height = 30;

      worksheet.mergeCells("A2:F2");
      worksheet.getCell("A2").value =
        `Project: ${projectName} | ` +
        `Selected recipients: ${sortedRecipients.length} | ` +
        `Exported: ${new Date().toLocaleString("sv-SE")}`;
      worksheet.getCell("A2").font = {
        italic: true,
        color: { argb: "FF6B7280" },
      };
      worksheet.getCell("A2").alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };

      worksheet.mergeCells("A3:F3");
      worksheet.getCell("A3").value =
        "Only checked recipients are included. Booked recipients can be exported but remain read-only.";
      worksheet.getCell("A3").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: excelColors.lightBlue },
      };
      worksheet.getCell("A3").font = {
        italic: true,
        color: { argb: excelColors.text },
      };
      worksheet.getCell("A3").alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };

      const headerRow = worksheet.getRow(4);
      headerRow.values = [
        "Recipient ID",
        "Organization",
        "Payment Order",
        "Computed Amount",
        "Recipient State",
        "Project",
      ];
      headerRow.height = 30;

      for (let column = 1; column <= 6; column += 1) {
        const cell = headerRow.getCell(column);

        cell.font = {
          bold: true,
          color: { argb: excelColors.white },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: excelColors.darkBlue },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };
        applyExcelBorder(cell);
      }

      let totalAmount = 0;

      sortedRecipients.forEach((recipient, index) => {
        const amount = toExcelNumber(recipient.amount);
        totalAmount += amount;

        const row = worksheet.addRow({
          recipientId: recipient.id,
          organization: getOrganizationLabel(recipient.organizationId),
          paymentOrder: getPaymentOrderLabel(recipient.paymentOrderId),
          amount,
          state: getPaymentOrderState(recipient),
          project: projectName,
        });

        row.getCell(4).numFmt = "#,##0.00";

        for (let column = 1; column <= 6; column += 1) {
          const cell = row.getCell(column);

          cell.alignment = {
            vertical: "top",
            horizontal: "left",
            wrapText: true,
          };
          applyExcelBorder(cell);

          if (index % 2 === 1) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: excelColors.lightGray },
            };
          }
        }
      });

      const totalRow = worksheet.addRow({
        recipientId: "TOTAL",
        organization: "",
        paymentOrder: "",
        amount: Number(totalAmount.toFixed(2)),
        state: "",
        project: "",
      });

      totalRow.getCell(4).numFmt = "#,##0.00";

      for (let column = 1; column <= 6; column += 1) {
        const cell = totalRow.getCell(column);

        cell.font = {
          bold: true,
          color: { argb: excelColors.text },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2F0D9" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };
        applyExcelBorder(cell);
      }

      worksheet.autoFilter = {
        from: "A4",
        to: "F4",
      };

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");

      const shortProjectName = sanitizeExcelFilename(projectName, 35);

      downloadLink.href = downloadUrl;
      downloadLink.download =
        `Recipients_${shortProjectName}_` +
        `${sortedRecipients.length}_selected.xlsx`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 0);
    } catch (error) {
      console.error("Failed to export selected recipients:", error);
      setFormError(
        error?.message || "Failed to export the selected recipients to Excel.",
      );
    } finally {
      setExportingSelected(false);
    }
  };

  const gridCols = useMemo(() => {
    const parts = BASE_COL_WIDTHS.map((w, i) =>
      visibleCols[i] ? `${w}px` : "0px",
    );
    return parts.join(" ");
  }, [visibleCols]);

  const organizationNames = useMemo(
    () =>
      new Map(
        orgOptions.map((organization) => [
          String(organization.id),
          organization.label || organization.name,
        ]),
      ),
    [orgOptions],
  );
  useEffect(() => setFilters(emptyFilters()), [selectedProjectId]);
  const filteredItems = useMemo(() => items.filter((r) =>
    matchesText(organizationNames.get(String(r.organizationId)), filters.organization) &&
    matchesNumberRange(r.paymentOrderId, filters.paymentOrderId) && matchesNumberRange(r.amount, filters.amount)
  ), [filters, items, organizationNames]);
  const displayedItems = useMemo(() => {
    if (!sortConfig) return filteredItems;
    const getters = {
      organization: (r) => r?.organizationId == null ? null : organizationNames.get(String(r.organizationId)) || `Organization ${r.organizationId}`,
      paymentOrderId: (r) => toSortableNumber(r?.paymentOrderId),
      amount: (r) => toSortableNumber(r?.amount),
    };
    return sortRows(filteredItems, getters[sortConfig.key], sortConfig.direction);
  }, [filteredItems, organizationNames, sortConfig]);
  const toggleSort = (key) => setSortConfig((current) => ({ key, direction: current?.key === key && current.direction === "asc" ? "desc" : "asc" }));

  const selectableRecipients = useMemo(
    /*
     * Locked recipients are selectable for Excel export and bulk delete.
     * Their edit and individual delete controls remain disabled.
     */
    () => displayedItems.filter((r) => r?.id != null),
    [displayedItems],
  );

  const selectedRecipientCount = selectedRecipientIds.size;

  const allVisibleSelected =
    selectableRecipients.length > 0 &&
    selectableRecipients.every((r) => selectedRecipientIds.has(r.id));

  const totalCount = items.length;

  const subtitle = selectedProjectId
    ? `${getSelectedProjectName(projects, selectedProjectId)} • ${totalCount} recipient${
        totalCount === 1 ? "" : "s"
      }`
    : "Select a project to see recipients.";

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h2 className={styles.pageTitle}>Recipients</h2>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          <div className={styles.headerActions}>
            {hasActiveFilters && <ClearFiltersButton onClick={() => setFilters(emptyFilters())} />}
            <button
              type="button"
              className={styles.exportInlineBtn}
              onClick={handleExportSelected}
              disabled={selectedRecipientCount === 0 || exportingSelected}
              title="Export selected recipients to Excel"
            >
              <FiDownload />
              {exportingSelected
                ? "Exporting..."
                : `Export selected${
                    selectedRecipientCount > 0
                      ? ` (${selectedRecipientCount})`
                      : ""
                  }`}
            </button>

            {canBulkDeleteRecipients && (
              <button
                type="button"
                className={styles.dangerInlineBtn}
                onClick={removeSelected}
                disabled={selectedRecipientCount === 0 || exportingSelected}
                title="Delete selected recipients"
              >
                <FiTrash2 />
                Delete selected{" "}
                {selectedRecipientCount > 0
                  ? `(${selectedRecipientCount})`
                  : ""}
              </button>
            )}

            <div className={styles.columnsBox}>
              <button
                className={styles.columnsBtn}
                onClick={() => setColumnsOpen((v) => !v)}
                title="Choose visible columns"
                type="button"
              >
                <FiColumns />
                Columns
              </button>

              {columnsOpen && (
                <div className={styles.columnsPanel}>
                  {headerLabels.map((h, i) => (
                    <label key={h} className={styles.colItem}>
                      <input
                        type="checkbox"
                        checked={visibleCols[i]}
                        disabled={i === 0}
                        onChange={() => toggleCol(i)}
                      />
                      <span>{h}</span>
                      {i === 0 && (
                        <em className={styles.lockNote}> (locked)</em>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {canManageRecipients && (
              <button
                className={styles.primaryBtn}
                onClick={startCreate}
                disabled={
                  !selectedProjectId || editingId === "new" || exportingSelected
                }
                title={
                  !selectedProjectId
                    ? "Select a project first"
                    : editingId === "new"
                      ? "Finish the current draft first"
                      : "Create new recipient"
                }
                type="button"
              >
                <FiPlus />
                New
              </button>
            )}
          </div>
        </div>
        {/*If lockedBanner is a non-empty string, the <div> is rendered.*/}
        {lockedBanner && (
          <div className={styles.errorBanner}>{lockedBanner}</div>
        )}
        {formError && <div className={styles.errorBanner}>{formError}</div>}

        <div className={styles.table} style={{ ["--rec-grid-cols"]: gridCols }}>
          <div className={`${styles.gridRow} ${styles.headerRow}`}>
            {headerLabels.map((h, i) => (
              <div
                key={h}
                className={`${styles.headerCell}
                  ${i === 0 ? styles.stickyColHeader : ""}
                  ${!visibleCols[i] ? styles.hiddenCol : ""}`}
              >
                {i === 0 ? (
                  <div className={styles.headerActionsCell}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      disabled={selectableRecipients.length === 0}
                      title="Select all visible recipients"
                      aria-label="Select all visible recipients"
                    />
                    <span>{h}</span>
                  </div>
                ) : (
                  <div className={styles.sortAndFilterHeader}><SortableHeader label={h} sortKey={HEADER_SORT_KEYS[i]} sortConfig={sortConfig} onSort={toggleSort} /><ColumnFilter label={h} type={HEADER_SORT_KEYS[i] === "organization" ? "text" : "number"} value={filters[HEADER_SORT_KEYS[i]]} onApply={(v)=>setFilters((c)=>({...c,[HEADER_SORT_KEYS[i]]:v}))} onClear={()=>setFilters((c)=>({...c,[HEADER_SORT_KEYS[i]]:emptyFilters()[HEADER_SORT_KEYS[i]]}))} /></div>
                )}
              </div>
            ))}
          </div>

          {!selectedProjectId ? (
            <p className={styles.noData}>
              Select a project to see its recipients.
            </p>
          ) : items.length === 0 ? (
            <p className={styles.noData}>No recipients for this project.</p>
          ) : (
            displayedItems.map((r, idx) => (
              <RecipientRow
                key={r.id}
                row={r}
                isEven={idx % 2 === 0}
                isEditing={editingId === r.id}
                editedValues={editedValues[r.id]}
                onEdit={() => startEdit(r)}
                onChange={onChange}
                onSave={save}
                onCancel={cancel}
                onDelete={remove}
                isSelected={selectedRecipientIds.has(r.id)}
                onSelectChange={toggleSelectedRecipient}
                selectionDisabled={editingId === r.id}
                locked={lockedRecipientIds.has(r.id)}
                poOptions={poOptions}
                orgOptions={orgOptions}
                visibleCols={visibleCols}
                fieldErrors={fieldErrors[r.id] || {}}
                canManage={canManageRecipients}
              />
            ))
          )}

          {editingId === "new" && (
            <RecipientRow
              row={{
                id: "new",
                organizationId: "",
                paymentOrderId: "",
                amount: 0,
              }}
              isEditing
              editedValues={editedValues.new}
              onChange={onChange}
              onSave={save}
              onCancel={cancel}
              onDelete={() => {}}
              isSelected={false}
              onSelectChange={() => {}}
              selectionDisabled
              poOptions={poOptions}
              orgOptions={orgOptions}
              visibleCols={visibleCols}
              isEven={false}
              fieldErrors={fieldErrors.new || {}}
              rowRef={newRowRef}
              locked={false}
              canManage={canManageRecipients}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Recipients;
