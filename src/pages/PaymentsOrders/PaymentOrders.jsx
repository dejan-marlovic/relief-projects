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
import PaymentOrder from "./PaymentOrder/PaymentOrder";
import styles from "./PaymentOrders.module.scss";
import PaymentOrderLines from "./PaymentOrder/PaymentOrderLines/PaymentOrderLines";
import {
  FiPlus,
  FiColumns,
  FiAlertCircle,
  FiTrash2,
  FiDownload,
} from "react-icons/fi";

import { BASE_URL } from "../../config/api"; // adjust path if needed

const headerLabels = [
  "Actions",
  "PO ID",
  "Transaction",
  "Date",
  "Description",
  "Amount",
  "Message",
  "Pin Code",
];

// ✅ match number of columns above
const BASE_COL_WIDTHS = [
  190, // Actions
  110, // PO ID
  160, // Transaction
  180, // Date
  300, // Description
  140, // Amount
  200, // Message
  140, // Pin Code
];

const blankPO = {
  transactionId: "",
  paymentOrderDate: "",
  paymentOrderDescription: "",
  message: "",
  pinCode: "",
};

async function safeParseJsonResponse(res) {
  const raw = await res.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isLockedResponse(res, data) {
  if (res?.status === 409) return true;
  const msg = (data?.message || "").toLowerCase();
  return (
    msg.includes("locked") ||
    msg.includes("booked") ||
    msg.includes("final") ||
    msg.includes("signature")
  );
}

// Normalize in case backend returns paymentOrderId instead of id, etc.
function normalizePO(po) {
  if (!po || typeof po !== "object") return null;

  const id = po.id ?? po.paymentOrderId ?? po.payment_order_id ?? null;

  const transactionId =
    po.transactionId ??
    po.transaction_id ??
    po.transaction?.id ??
    po.transaction?.transactionId ??
    null;

  return {
    id,
    transactionId,
    paymentOrderDate: po.paymentOrderDate ?? po.payment_order_date ?? null,
    paymentOrderDescription:
      po.paymentOrderDescription ?? po.payment_order_description ?? "",
    // ✅ backend computed
    amount: po.amount ?? 0,
    message: po.message ?? "",
    pinCode: po.pinCode ?? po.pin_code ?? "",
    locked: Boolean(po.locked ?? po.isLocked ?? false),
  };
}

function PaymentOrders() {
  const { selectedProjectId, projects } = useContext(ProjectContext);
  const { hasRole, hasAnyRole } = useAuth();
  const canEditPaymentOrders = hasAnyRole("ADMIN", "FINANCE");
  const canDeletePaymentOrders = hasRole("ADMIN");
  const canManagePaymentOrderLines = hasAnyRole("ADMIN", "FINANCE");

  const [orders, setOrders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [txOptions, setTxOptions] = useState([]);

  // UI
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true),
  );

  // ✅ separate banners like PaymentOrderLines:
  // - lockedBanner = special "Booked (locked)" banner
  // - formError = other errors
  const [lockedBanner, setLockedBanner] = useState("");
  const [formError, setFormError] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});

  const [expandedPoId, setExpandedPoId] = useState(null);

  const [selectedPoIds, setSelectedPoIds] = useState(() => new Set());
  const [exportingSelected, setExportingSelected] = useState(false);

  const [orgOptions, setOrgOptions] = useState([]);
  const [costDetailOptions, setCostDetailOptions] = useState([]);

  // Track which POs are known locked (based on a 409 response)
  const [lockedPoIds, setLockedPoIds] = useState(() => new Set());

  const newRowRef = useRef(null);

  const toggleCol = (i) => {
    if (i === 0) return;
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

  const fetchOrders = useCallback(
    async (projectId) => {
      if (!projectId) {
        setOrders([]);
        setSelectedPoIds(new Set());
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/payment-orders/project/${projectId}`,
          { headers: authHeaders },
        );
        if (!res.ok) throw new Error(`Failed ${res.status}`);

        const data = await res.json();
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        const normalized = arr.map(normalizePO).filter(Boolean);
        setOrders(normalized);

        const lockedIds = new Set(
          normalized.filter((po) => po.locked).map((po) => po.id),
        );

        setLockedPoIds(lockedIds);

        setSelectedPoIds((prev) => {
          /*
           * Keep selected IDs that still exist in the refreshed result.
           * Locked payment orders remain selectable because selection is also
           * used for Excel export. The backend decides which selected orders
           * may actually be deleted.
           */
          const activeIds = new Set(normalized.map((po) => po.id));

          return new Set([...prev].filter((id) => activeIds.has(id)));
        });
      } catch (e) {
        console.error(e);
        setOrders([]);
        setSelectedPoIds(new Set());
      }
    },
    [authHeaders],
  );

  const fetchTxOptions = useCallback(
    async (projectId) => {
      if (!projectId) {
        setTxOptions([]);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/transactions/project/${projectId}`,
          { headers: authHeaders },
        );
        if (!res.ok) throw new Error(`Failed ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        setTxOptions(arr);
      } catch (e) {
        console.error(e);
        setTxOptions([]);
      }
    },
    [authHeaders],
  );

  const fetchOrgOptions = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/organizations/active/options`, {
        headers: authHeaders,
      });
      setOrgOptions(res.ok ? await res.json() : []);
    } catch {
      setOrgOptions([]);
    }
  }, [authHeaders]);

  const fetchCostDetailsForProject = useCallback(
    async (projectId) => {
      if (!projectId) {
        setCostDetailOptions([]);
        return;
      }
      try {
        const bRes = await fetch(
          `${BASE_URL}/api/budgets/project/${projectId}`,
          { headers: authHeaders },
        );
        const budgets = bRes.ok ? await bRes.json() : [];
        const list = Array.isArray(budgets) ? budgets : [];

        const all = [];
        for (const b of list) {
          const cdRes = await fetch(
            `${BASE_URL}/api/cost-details/by-budget/${b.id}`,
            { headers: authHeaders },
          );
          if (!cdRes.ok) continue;
          const cds = await cdRes.json();
          if (Array.isArray(cds)) all.push(...cds);
        }
        setCostDetailOptions(all);
      } catch {
        setCostDetailOptions([]);
      }
    },
    [authHeaders],
  );

  useEffect(() => {
    fetchOrders(selectedProjectId);
    fetchTxOptions(selectedProjectId);

    fetchOrgOptions();
    fetchCostDetailsForProject(selectedProjectId);

    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});

    // ✅ clear banners on project change
    setLockedBanner("");
    setFormError("");

    setExpandedPoId(null);
    setLockedPoIds(new Set());
  }, [
    fetchOrders,
    fetchTxOptions,
    fetchOrgOptions,
    fetchCostDetailsForProject,
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

  const startEdit = (po) => {
    if (!canEditPaymentOrders) return;
    setEditingId(po?.id ?? null);
    setEditedValues((prev) => ({
      ...prev,
      [po.id]: {
        transactionId: po.transactionId ?? "",
        paymentOrderDate: po.paymentOrderDate ?? "",
        paymentOrderDescription: po.paymentOrderDescription ?? "",
        message: po.message ?? "",
        pinCode: po.pinCode ?? "",
      },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[po.id];
      return next;
    });

    // when user starts editing, clear normal errors (keep lockedBanner if present)
    setFormError("");
  };

  const startCreate = () => {
    if (!canEditPaymentOrders) return;
    setEditingId("new");
    setEditedValues((prev) => ({ ...prev, new: { ...blankPO } }));

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

  const markLocked = (poId) => {
    if (!poId) return;
    setLockedPoIds((prev) => {
      const next = new Set(prev);
      next.add(poId);
      return next;
    });
  };

  const save = async () => {
    if (!canEditPaymentOrders) return;
    const id = editingId;
    const v = editedValues[id];
    if (!v) return;

    const isCreate = id === "new";

    const payload = {
      transactionId: v.transactionId !== "" ? Number(v.transactionId) : null,
      paymentOrderDate: v.paymentOrderDate || null,
      paymentOrderDescription: v.paymentOrderDescription || "",
      message: v.message || "",
      pinCode: v.pinCode || "",
    };

    setFormError("");
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/payment-orders`
          : `${BASE_URL}/api/payment-orders/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);

        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
        }

        const poLabel = !isCreate ? `PO#${id}` : "Payment order";

        const lockedMsgFallback =
          `${poLabel} is Booked (final signature) and is read-only. ` +
          `Undo/remove the Booked signature to make changes.`;

        if (!isCreate && isLockedResponse(res, data)) {
          const msg = data?.message || lockedMsgFallback;
          setLockedBanner(msg);
          markLocked(id);
          cancel();
          return;
        }

        const msg =
          data?.message ||
          `Failed to ${isCreate ? "create" : "update"} payment order.`;

        setFormError(msg);
        return;
      }

      // success -> clear banners
      setLockedBanner("");
      setFormError("");

      await fetchOrders(selectedProjectId);
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(
        e.message ||
          `Failed to ${
            editingId === "new" ? "create" : "update"
          } payment order.`,
      );
    }
  };

  const remove = async (id) => {
    if (!canDeletePaymentOrders) return;
    if (!id) return;
    if (!window.confirm("Delete this payment order?")) return;

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/payment-orders/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);

        const poLabel = `PO#${id}`;
        const lockedMsgFallback =
          `${poLabel} is Booked (final signature) and cannot be deleted. ` +
          `Undo/remove the Booked signature to delete it.`;

        if (isLockedResponse(res, data)) {
          setLockedBanner(data?.message || lockedMsgFallback);
          markLocked(id);
          return;
        }

        setFormError(data?.message || "Delete failed.");
        return;
      }

      // success -> clear banners
      setLockedBanner("");
      setFormError("");

      setSelectedPoIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      setExpandedPoId((cur) => (cur === id ? null : cur));

      await fetchOrders(selectedProjectId);
    } catch (e) {
      console.error(e);
      setFormError("Delete failed.");
    }
  };

  const gridCols = useMemo(() => {
    const parts = BASE_COL_WIDTHS.map((w, i) =>
      visibleCols[i] ? `${w}px` : "0px",
    );
    return parts.join(" ");
  }, [visibleCols]);

  const selectablePaymentOrders = useMemo(
    // All active payment orders with an ID are selectable, including locked ones.
    // Locked orders can be exported and may be sent to bulk delete, where the
    // backend safely skips them and reports which IDs were not deleted.
    () => orders.filter((po) => po?.id != null),
    [orders],
  );

  const selectedPoCount = [...selectedPoIds].filter((id) =>
    selectablePaymentOrders.some((po) => po.id === id),
  ).length;
  //creates a memoized calculated list.
  //create a list of payment orders that can be selected
  //This creates a constant variable.
  //Only recalculate this value when its dependencies change. (orders)

  //This creates a boolean.
  //Are all selectable payment orders currently selected?
  //It is usually used for the header “select all” checkbox.
  const allVisibleSelected =
    selectablePaymentOrders.length > 0 &&
    //Is this payment order selected?
    selectablePaymentOrders.every((po) => selectedPoIds.has(po.id));

  const toggleSelectedPo = (id, checked) => {
    if (!id) return;
    setSelectedPoIds((prev) => {
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
    setSelectedPoIds((prev) => {
      const next = new Set(prev);

      selectablePaymentOrders.forEach((po) => {
        if (checked) {
          next.add(po.id);
        } else {
          next.delete(po.id);
        }
      });
      return next;
    });
  };

  //This function will be called when the user clicks “Delete selected” button.
  const removeSelected = async () => {
    if (!canDeletePaymentOrders) return;
    const activeIds = new Set(selectablePaymentOrders.map((po) => po.id));
    const ids = [...selectedPoIds].filter((id) => activeIds.has(id));

    if (ids.length === 0) return;

    if (
      !window.confirm(
        `Delete ${ids.length} selected payment order${ids.length === 1 ? "" : "s"}? Locked payment orders will be kept.`,
      )
    ) {
      return;
    }

    setFormError("");
    setLockedBanner("");

    try {
      const res = await fetch(`${BASE_URL}/api/payment-orders/bulk-delete`, {
        method: "POST",
        headers: authHeaders,

        // { ids } is shorthand for { ids: ids }
        // JSON.stringify({ ids }) sends {"ids":[1,2,3]}
        body: JSON.stringify({ ids }),
      });

      const data = await safeParseJsonResponse(res);

      if (!res.ok) {
        throw new Error(
          data?.message || "Failed to remove selected payment orders",
        );
      }

      /*
       * The backend returns a structured result. Locked orders are not deleted,
       * but their IDs are listed in the response so the user understands why
       * fewer rows were removed than selected.
       */
      const lockedIds = Array.isArray(data?.lockedPaymentOrderIds)
        ? data.lockedPaymentOrderIds
        : [];

      if (lockedIds.length > 0) {
        setLockedBanner(
          data?.message ||
            `Locked payment orders were not deleted: ${lockedIds
              .map((id) => `PO#${id}`)
              .join(", ")}.`,
        );
      } else {
        setLockedBanner("");
      }

      if (
        Array.isArray(data?.notFoundPaymentOrderIds) &&
        data.notFoundPaymentOrderIds.length > 0
      ) {
        setFormError(
          `Payment orders not found: ${data.notFoundPaymentOrderIds
            .map((id) => `PO#${id}`)
            .join(", ")}.`,
        );
      }

      // Reload the latest payment orders from the backend.
      await fetchOrders(selectedProjectId);

      // Keep only locked orders selected after the delete attempt. This makes
      // it easy to export them or inspect them after the backend skipped them.
      setSelectedPoIds(new Set(lockedIds));

      // Close the lines panel if its payment order was successfully deleted.
      setExpandedPoId((cur) =>
        cur != null && !lockedIds.includes(cur) && ids.includes(cur)
          ? null
          : cur,
      );
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to delete selected payment orders");
    }
  };

  // =========================
  // EXCEL EXPORT HELPERS
  // =========================

  const excelColors = {
    darkBlue: "FF1F4E78",
    mediumBlue: "FF5B9BD5",
    lightBlue: "FFD9EAF7",
    lightGray: "FFF3F4F6",
    paleGreen: "FFE2F0D9",
    borderGray: "FFD1D5DB",
    white: "FFFFFFFF",
    text: "FF1F2937",
  };

  const sanitizeExcelFilename = (value, maxLength = 50) => {
    const cleaned = String(value || "payment_orders")
      .trim()
      .replace(/[<>:"/\\|?*\s]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, maxLength)
      .replace(/_+$/g, "");

    return cleaned || "payment_orders";
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

  const formatExcelDate = (value) => {
    if (!value) return "Not specified";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return sanitizeExcelText(value) || "Not specified";
    }
    return date.toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProjectName = (id) => {
    if (id == null || id === "") return "Not specified";
    const project = (Array.isArray(projects) ? projects : []).find(
      (item) => String(item.id) === String(id),
    );
    return (
      sanitizeExcelText(project?.projectName || project?.name) ||
      `Project ${id}`
    );
  };

  const getOrganizationName = (id) => {
    if (id == null || id === "") return "Not specified";
    const organization = orgOptions.find(
      (item) => String(item.id) === String(id),
    );
    return sanitizeExcelText(organization?.name) || `Organization ${id}`;
  };

  const getCostDetailLabel = (id) => {
    if (id == null || id === "") return "Not specified";
    const costDetail = costDetailOptions.find(
      (item) => Number(item.costDetailId) === Number(id),
    );
    const description = sanitizeExcelText(costDetail?.costDescription);
    return costDetail
      ? `${description || "No description"} (CD#${costDetail.costDetailId})`
      : `Cost Detail #${id}`;
  };

  const applyExcelBorder = (cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: excelColors.borderGray } },
      left: { style: "thin", color: { argb: excelColors.borderGray } },
      bottom: { style: "thin", color: { argb: excelColors.borderGray } },
      right: { style: "thin", color: { argb: excelColors.borderGray } },
    };
  };

  const styleExcelTitle = (cell) => {
    cell.font = { bold: true, size: 18, color: { argb: excelColors.white } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: excelColors.darkBlue },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  };

  const styleExcelHeader = (row) => {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: excelColors.white } };
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
    });
    row.height = 30;
  };

  const styleExcelRow = (row, index) => {
    row.eachCell((cell) => {
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
    });
  };

  const handleExportSelected = async () => {
    const selectedOrders = orders.filter(
      (po) => po?.id != null && selectedPoIds.has(po.id),
    );

    if (selectedOrders.length === 0) {
      setFormError(
        "Please select at least one payment order before exporting.",
      );
      return;
    }

    try {
      setExportingSelected(true);
      setFormError("");

      const sortedOrders = [...selectedOrders].sort((a, b) => {
        const dateA = a.paymentOrderDate
          ? new Date(a.paymentOrderDate).getTime()
          : 0;
        const dateB = b.paymentOrderDate
          ? new Date(b.paymentOrderDate).getTime()
          : 0;
        if (dateA !== dateB) return dateA - dateB;
        return Number(a.id || 0) - Number(b.id || 0);
      });

      /* Fetch the latest saved lines for every selected payment order. */
      const lineResponses = await Promise.all(
        sortedOrders.map(async (po) => {
          const response = await fetch(
            `${BASE_URL}/api/payment-order-lines/payment-order/${po.id}`,
            { headers: authHeaders },
          );

          if (!response.ok) {
            const data = await safeParseJsonResponse(response);
            throw new Error(
              data?.message || `Failed to load lines for PO#${po.id}.`,
            );
          }

          const data = await response.json().catch(() => []);
          return [po.id, Array.isArray(data) ? data : data ? [data] : []];
        }),
      );

      const linesByPaymentOrderId = new Map(lineResponses);
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Relief Projects";
      workbook.lastModifiedBy = "Relief Projects";
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.title = "Selected Payment Orders";
      workbook.subject = `Export of ${sortedOrders.length} selected payment orders with lines`;

      const worksheet = workbook.addWorksheet("Selected Payment Orders", {
        views: [{ state: "frozen", ySplit: 4 }],
        properties: { defaultRowHeight: 20 },
        pageSetup: {
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          paperSize: 9,
        },
      });

      /* Supported ExcelJS row grouping. */
      worksheet.properties.outlineLevelRow = 1;

      worksheet.columns = [
        { key: "paymentOrderId", width: 16 },
        { key: "transaction", width: 18 },
        { key: "date", width: 22 },
        { key: "description", width: 38 },
        { key: "amount", width: 18 },
        { key: "message", width: 32 },
        { key: "pinCode", width: 18 },
        { key: "status", width: 18 },
      ];

      worksheet.mergeCells("A1:H1");
      worksheet.getCell("A1").value = "Selected Payment Orders Report";
      styleExcelTitle(worksheet.getCell("A1"));
      worksheet.getRow(1).height = 30;

      const projectName = getProjectName(selectedProjectId);
      worksheet.mergeCells("A2:H2");
      worksheet.getCell("A2").value =
        `Project: ${projectName} | Selected payment orders: ${sortedOrders.length} | ` +
        `Exported: ${new Date().toLocaleString("sv-SE")}`;
      worksheet.getCell("A2").font = {
        italic: true,
        color: { argb: "FF6B7280" },
      };

      worksheet.mergeCells("A3:H3");
      worksheet.getCell("A3").value =
        "Payment-order lines are collapsed initially. Use Excel's outline controls to expand or collapse them.";
      worksheet.getCell("A3").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: excelColors.lightBlue },
      };
      worksheet.getCell("A3").alignment = { wrapText: true };

      const headerRow = worksheet.getRow(4);
      headerRow.values = [
        "Payment Order ID",
        "Header Transaction",
        "Date",
        "Description",
        "Amount",
        "Message",
        "Pin Code",
        "Status",
      ];
      styleExcelHeader(headerRow);

      let grandTotal = 0;

      sortedOrders.forEach((po, index) => {
        const poAmount = toExcelNumber(po.amount);
        grandTotal += poAmount;

        const orderRow = worksheet.addRow({
          paymentOrderId: `PO#${po.id}`,
          transaction:
            po.transactionId != null
              ? `TX#${po.transactionId}`
              : "Not specified",
          date: formatExcelDate(po.paymentOrderDate),
          description:
            sanitizeExcelText(po.paymentOrderDescription) || "Not specified",
          amount: poAmount,
          message: sanitizeExcelText(po.message) || "Not specified",
          pinCode: sanitizeExcelText(po.pinCode) || "Not specified",
          status: po.locked ? "Booked / Locked" : "Editable",
        });

        styleExcelRow(orderRow, index);
        orderRow.eachCell((cell) => {
          cell.font = { ...(cell.font || {}), bold: true };
        });
        orderRow.getCell(5).numFmt = "#,##0.00";

        const lines = linesByPaymentOrderId.get(po.id) || [];
        const lineHeader = worksheet.addRow([]);
        lineHeader.outlineLevel = 1;
        lineHeader.hidden = true;
        lineHeader.getCell(1).value = "Lines";
        lineHeader.getCell(2).value = "Transaction";
        lineHeader.getCell(3).value = "Organization";
        lineHeader.getCell(4).value = "Cost Detail";
        lineHeader.getCell(5).value = "Amount";
        lineHeader.getCell(6).value = "Memo";

        for (let column = 1; column <= 8; column += 1) {
          const cell = lineHeader.getCell(column);
          cell.font = { bold: true, color: { argb: excelColors.white } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: excelColors.mediumBlue },
          };
          cell.alignment = { wrapText: true };
          applyExcelBorder(cell);
        }

        let lineTotal = 0;

        if (lines.length === 0) {
          const emptyRow = worksheet.addRow([]);
          emptyRow.outlineLevel = 1;
          emptyRow.hidden = true;
          emptyRow.getCell(1).value = "↳";
          emptyRow.getCell(2).value = "No payment-order lines.";
          for (let column = 1; column <= 8; column += 1) {
            const cell = emptyRow.getCell(column);
            cell.font = { italic: true, color: { argb: "FF6B7280" } };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: excelColors.lightGray },
            };
            applyExcelBorder(cell);
          }
        } else {
          lines.forEach((line, lineIndex) => {
            const amount = toExcelNumber(line.amount);
            lineTotal += amount;

            const lineRow = worksheet.addRow([]);
            lineRow.outlineLevel = 1;
            lineRow.hidden = true;
            lineRow.getCell(1).value = line.id != null ? `L#${line.id}` : "↳";
            lineRow.getCell(2).value =
              line.transactionId != null
                ? `TX#${line.transactionId}`
                : po.transactionId != null
                  ? `TX#${po.transactionId} (header)`
                  : "Not specified";
            lineRow.getCell(3).value = getOrganizationName(line.organizationId);
            lineRow.getCell(4).value = getCostDetailLabel(line.costDetailId);
            lineRow.getCell(5).value = amount;
            lineRow.getCell(6).value =
              sanitizeExcelText(line.memo) || "Not specified";
            lineRow.getCell(5).numFmt = "#,##0.00";

            for (let column = 1; column <= 8; column += 1) {
              const cell = lineRow.getCell(column);
              cell.alignment = {
                vertical: "top",
                horizontal: "left",
                wrapText: true,
              };
              applyExcelBorder(cell);
              if (lineIndex % 2 === 1) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: excelColors.lightGray },
                };
              }
            }
          });

          const lineTotalRow = worksheet.addRow([]);
          lineTotalRow.outlineLevel = 1;
          lineTotalRow.hidden = true;
          lineTotalRow.getCell(1).value = "TOTAL";
          lineTotalRow.getCell(2).value = `Lines total for PO#${po.id}`;
          lineTotalRow.getCell(5).value = Number(lineTotal.toFixed(2));
          lineTotalRow.getCell(5).numFmt = "#,##0.00";
          lineTotalRow.getCell(6).value =
            `Header amount: ${poAmount.toFixed(2)} | Difference: ${(poAmount - lineTotal).toFixed(2)}`;

          for (let column = 1; column <= 8; column += 1) {
            const cell = lineTotalRow.getCell(column);
            cell.font = { bold: true };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: excelColors.paleGreen },
            };
            cell.alignment = { wrapText: true };
            applyExcelBorder(cell);
          }
        }
      });

      const totalRow = worksheet.addRow([]);
      totalRow.getCell(1).value = "GRAND TOTAL";
      totalRow.getCell(5).value = Number(grandTotal.toFixed(2));
      totalRow.getCell(5).numFmt = "#,##0.00";
      for (let column = 1; column <= 8; column += 1) {
        const cell = totalRow.getCell(column);
        cell.font = { bold: true, color: { argb: excelColors.text } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: excelColors.paleGreen },
        };
        applyExcelBorder(cell);
      }

      worksheet.autoFilter = { from: "A4", to: "H4" };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const shortProjectName = sanitizeExcelFilename(projectName, 35);
      link.href = downloadUrl;
      link.download =
        `Payment_Orders_${shortProjectName}_` +
        `${sortedOrders.length}_selected.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
    } catch (error) {
      console.error("Failed to export selected payment orders:", error);
      setFormError(
        error?.message ||
          "Failed to export the selected payment orders to Excel.",
      );
    } finally {
      setExportingSelected(false);
    }
  };

  const subtitle = selectedProjectId
    ? `${getProjectName(selectedProjectId)} • ${orders.length} order${
        orders.length === 1 ? "" : "s"
      }`
    : "Select a project to see payment orders";

  const lockedBannerText = lockedBanner && `${lockedBanner} (Editing disabled)`;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Payment Orders</h3>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.exportInlineBtn}
              onClick={handleExportSelected}
              disabled={selectedPoCount === 0 || exportingSelected}
              title="Export selected payment orders to Excel"
            >
              <FiDownload />
              {exportingSelected
                ? "Exporting..."
                : `Export selected${selectedPoCount > 0 ? ` (${selectedPoCount})` : ""}`}
            </button>

            {canDeletePaymentOrders && (
              <button
                type="button"
                className={styles.dangerInlineBtn}
                onClick={removeSelected}
                disabled={selectedPoCount === 0 || exportingSelected}
                title="Delete selected payment orders"
              >
                <FiTrash2 />
                Delete selected{" "}
                {selectedPoCount > 0 ? `(${selectedPoCount})` : ""}
              </button>
            )}
            <div className={styles.columnsBox}>
              <button
                type="button"
                className={styles.iconPillBtn}
                onClick={() => setColumnsOpen((v) => !v)}
                aria-label="Toggle columns"
                title="Columns"
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

            {canEditPaymentOrders && (
              <button
                className={styles.primaryBtn}
                onClick={startCreate}
                disabled={!selectedProjectId || editingId === "new"}
                title={
                  !selectedProjectId
                    ? "Select a project first"
                    : editingId === "new"
                      ? "Finish the current draft first"
                      : "Create new payment order"
                }
              >
                <FiPlus />
                New
              </button>
            )}
          </div>
        </div>

        {/* ✅ Locked banner (same style as PaymentOrderLines) */}
        {lockedBannerText && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{lockedBannerText}</span>
          </div>
        )}

        {/* Other errors */}
        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        <div className={styles.table} style={{ ["--po-grid-cols"]: gridCols }}>
          <div className={`${styles.gridRow} ${styles.headerRow}`}>
            {headerLabels.map((h, i) => (
              <div
                key={h}
                className={`${styles.headerCell}
                  ${i === 0 ? styles.stickyColHeader : ""}
                  ${!visibleCols[i] ? styles.hiddenCol : ""}
                  ${i === 0 ? styles.actionsCol : ""}`}
              >
                {i === 0 ? (
                  <div className={styles.headerActionsCell}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      disabled={selectablePaymentOrders.length === 0}
                      title="Select all visible payment orders"
                      aria-label="Select all visible payment orders"
                    ></input>
                    <span>{h}</span>
                  </div>
                ) : (
                  h
                )}
              </div>
            ))}
          </div>

          {!selectedProjectId ? (
            <p className={styles.noData}>
              Select a project to see its payment orders.
            </p>
          ) : orders.length === 0 ? (
            <p className={styles.noData}>No payment orders for this project.</p>
          ) : (
            orders.map((po, idx) => (
              <React.Fragment key={po.id}>
                <PaymentOrder
                  po={po}
                  locked={lockedPoIds.has(po.id)}
                  isEven={idx % 2 === 0}
                  isEditing={editingId === po.id}
                  editedValues={editedValues[po.id]}
                  onEdit={() => startEdit(po)}
                  onChange={onChange}
                  onSave={save}
                  onCancel={cancel}
                  onDelete={remove}
                  transactions={txOptions}
                  visibleCols={visibleCols}
                  fieldErrors={fieldErrors[po.id] || {}}
                  expanded={expandedPoId === po.id}
                  onToggleLines={() =>
                    setExpandedPoId((cur) => (cur === po.id ? null : po.id))
                  }
                  isSelected={selectedPoIds.has(po.id)}
                  onSelectChange={toggleSelectedPo}
                  selectionDisabled={editingId === po.id}
                  canEdit={canEditPaymentOrders}
                  canDelete={canDeletePaymentOrders}
                />

                {expandedPoId === po.id && (
                  <div className={styles.linesPanel}>
                    <PaymentOrderLines
                      paymentOrderId={po.id}
                      txOptions={txOptions}
                      orgOptions={orgOptions}
                      costDetailOptions={costDetailOptions}
                      canManage={canManagePaymentOrderLines}
                    />
                  </div>
                )}
              </React.Fragment>
            ))
          )}

          {editingId === "new" && (
            <PaymentOrder
              po={{ id: "new", ...blankPO, amount: 0 }}
              isEditing
              editedValues={editedValues.new}
              onChange={onChange}
              onSave={save}
              onCancel={cancel}
              onDelete={() => {}}
              transactions={txOptions}
              visibleCols={visibleCols}
              isEven={false}
              fieldErrors={fieldErrors.new || {}}
              rowRef={newRowRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentOrders;
