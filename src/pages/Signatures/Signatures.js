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
import SignatureRow from "./Signature/Signature";
import styles from "./Signatures.module.scss";
import { FiPlus, FiColumns, FiTrash2, FiDownload } from "react-icons/fi";

import { BASE_URL } from "../../config/api"; // adjust path if needed

const headerLabels = [
  "Actions",
  "Status",
  "Employee",
  "Payment Order",
  "Signature",
  "Date",
];

const BASE_COL_WIDTHS = [
  110, // Actions
  160, // Status
  200, // Employee
  170, // Payment Order
  260, // Signature
  200, // Date
];

// ---- helpers ----
async function safeParseJsonResponse(res) {
  const raw = await res.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Normalize signature DTO coming from backend.
 * Handles common variations: id/signatureId, paymentOrderId/paymentOrder etc.
 */
function normalizeSignature(s) {
  if (!s || typeof s !== "object") return null;

  const id = s.id ?? s.signatureId ?? s.signature_id ?? null;

  const signatureStatusId =
    s.signatureStatusId ??
    s.signature_status_id ??
    s.signatureStatus?.id ??
    s.signatureStatus?.signatureStatusId ??
    null;

  const employeeId =
    s.employeeId ??
    s.employee_id ??
    s.employee?.id ??
    s.employee?.employeeId ??
    null;

  const paymentOrderId =
    s.paymentOrderId ??
    s.payment_order_id ??
    s.paymentOrder?.id ??
    s.paymentOrder?.paymentOrderId ??
    null;

  return {
    id,
    signatureStatusId,
    employeeId,
    paymentOrderId,
    signature: s.signature ?? "",
    signatureDate: s.signatureDate ?? s.signature_date ?? null,
  };
}

function Signatures() {
  const { selectedProjectId } = useContext(ProjectContext);

  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  //React allows a lazy initializer function
  //runs only when the component is first created.
  //So React says: I will call this function once to get the initial state.
  //function version is preferred when creating the initial value has some
  //cost or when you want to avoid recreating it unnecessarily on every render.
  const [selectedSignatureIds, setSelectedSignatureIds] = useState(
    () => new Set(),
  );

  const [exportingSelected, setExportingSelected] = useState(false);

  // dropdown data
  const [poOptions, setPoOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // UI
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true),
  );

  // errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { [rowId]: { fieldName: message } }

  // ref for new row (scroll-into-view)
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

  const fetchSignatures = useCallback(
    async (projectId) => {
      if (!projectId) {
        setItems([]);
        //Clear selection when no project is selected
        setSelectedSignatureIds(new Set());
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/signatures/by-project/${projectId}`,
          { headers: authHeaders },
        );
        if (!res.ok) throw new Error(`Failed ${res.status}`);

        //reads the JSON response from your backend
        const data = await res.json();
        //makes sure we always work with an array.
        //If data is one object, wrap it in an array:
        /*
        if data is already an array:
              use data

          else if data exists:
              wrap it in an array

          else:
              use an empty array
        */
        const arr = Array.isArray(data) ? data : data ? [data] : [];

        //converts every backend signature into the frontend shape we want.
        //same as: .filter((item) => Boolean(item))
        //It keeps only values that are “truthy” and removes values that are “falsy”.
        //This runs normalizeSignature on every item in the array.

        /*
        1. convert every backend object into your frontend format
        2. remove any invalid results such as null or undefined
        */
        const normalized = arr.map(normalizeSignature).filter(Boolean);

        //This updates the visible signature table/list with the fresh data.
        //Stores the cleaned array in React state, so your table/list shows
        // only valid normalized signatures.
        setItems(normalized);

        //This removes selected IDs that no longer exist after reload.
        setSelectedSignatureIds((prev) => {
          //This creates a Set containing only the IDs that exist in the newly loaded data.
          //gives: [1, 2, 3]
          const activeIds = new Set(normalized.map((s) => s.id));

          //This is the actual cleanup
          //This keeps only IDs that still exist in the new data
          return new Set([...prev].filter((id) => activeIds.has(id)));
        });
      } catch (e) {
        console.error(e);
        setItems([]);
      }
    },
    [authHeaders],
  );

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
        const arr = Array.isArray(data) ? data : data ? [data] : [];

        const normalized = arr
          .map((po) => ({
            id: po.id ?? po.paymentOrderId ?? po.payment_order_id,
            paymentOrderDescription:
              po.paymentOrderDescription ?? po.payment_order_description ?? "",
            paymentOrderDate:
              po.paymentOrderDate ?? po.payment_order_date ?? null,
            amount: po.amount ?? 0,
            locked: Boolean(po.locked ?? po.isLocked ?? false),
          }))
          .filter((x) => x.id != null);

        setPoOptions(normalized);
      } catch (e) {
        console.error(e);
        setPoOptions([]);
      }
    },
    [authHeaders],
  );

  const fetchSignatureStatuses = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/signature-statuses/active`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed ${res.status}`);
      const data = await res.json();

      const normalized = (Array.isArray(data) ? data : []).map((s) => ({
        id: s.id ?? s.signatureStatusId ?? s.signature_status_id,
        label:
          s.signatureStatusName ??
          s.signature_status_name ??
          s.name ??
          s.statusName ??
          `Status #${s.id ?? s.signatureStatusId ?? s.signature_status_id}`,
      }));

      setStatusOptions(normalized.filter((x) => x.id != null));
    } catch (e) {
      console.error(e);
      setStatusOptions([]);
    }
  }, [authHeaders]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/employees/active`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed ${res.status}`);
      const data = await res.json();

      const normalized = (Array.isArray(data) ? data : []).map((e) => ({
        id: e.id ?? e.employeeId ?? e.employee_id,
        label:
          [e.firstName ?? e.first_name, e.lastName ?? e.last_name]
            .filter(Boolean)
            .join(" ") || `Employee #${e.id ?? e.employeeId ?? e.employee_id}`,
      }));

      setEmployeeOptions(normalized.filter((x) => x.id != null));
    } catch (e) {
      console.error(e);
      setEmployeeOptions([]);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchSignatures(selectedProjectId);
    fetchPaymentOrders(selectedProjectId);
    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
  }, [fetchSignatures, fetchPaymentOrders, selectedProjectId]);

  useEffect(() => {
    fetchSignatureStatuses();
    fetchEmployees();
  }, [fetchSignatureStatuses, fetchEmployees]);

  useEffect(() => {
    if (editingId === "new" && newRowRef.current) {
      newRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [editingId]);

  const blankSignature = {
    signatureStatusId: "",
    employeeId: "",
    paymentOrderId: "",
    signature: "",
    signatureDate: "",
  };

  const startEdit = (row) => {
    setEditingId(row?.id ?? null);
    setEditedValues((prev) => ({
      ...prev,
      [row.id]: {
        signatureStatusId:
          row.signatureStatusId != null ? String(row.signatureStatusId) : "",
        employeeId: row.employeeId != null ? String(row.employeeId) : "",
        paymentOrderId:
          row.paymentOrderId != null ? String(row.paymentOrderId) : "",
        signature: row.signature ?? "",
        signatureDate: row.signatureDate ?? "",
      },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setFormError("");
  };

  const startCreate = () => {
    setEditingId("new");
    setEditedValues((prev) => ({ ...prev, new: { ...blankSignature } }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.new;
      return next;
    });
    setFormError("");
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

  const validateClientSide = (rowId, v) => {
    const fe = {};
    if (!v.signatureStatusId) fe.signatureStatusId = "Status is required.";
    if (!v.employeeId) fe.employeeId = "Employee is required.";
    if (!v.paymentOrderId) fe.paymentOrderId = "Payment order is required.";
    if (!v.signature || !String(v.signature).trim())
      fe.signature = "Signature is required.";

    if (Object.keys(fe).length > 0) {
      setFieldErrors((prev) => ({ ...prev, [rowId]: fe }));
      setFormError("Please fix the highlighted fields.");
      return false;
    }
    return true;
  };

  const save = async () => {
    const id = editingId;
    const v = editedValues[id];
    if (!v) return;

    const isCreate = id === "new";

    setFormError("");
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

    if (!validateClientSide(id, v)) return;

    const payload = {
      signatureStatusId: Number(v.signatureStatusId),
      employeeId: Number(v.employeeId),
      paymentOrderId: Number(v.paymentOrderId),
      signature: String(v.signature || "").trim(),
      signatureDate: v.signatureDate ? v.signatureDate : null,
    };

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/signatures`
          : `${BASE_URL}/api/signatures/${id}`,
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

        const msg =
          data?.message ||
          (res.status === 409
            ? "Conflict: this item is locked."
            : `Failed to ${isCreate ? "create" : "update"} signature.`);

        setFormError(msg);
        return;
      }

      await fetchSignatures(selectedProjectId);
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(
        e.message || `Failed to ${isCreate ? "create" : "update"} signature.`,
      );
    }
  };

  /*
  If one row checkbox is checked, add that row ID to selectedSignatureIds.
  If it is unchecked, remove that row ID from selectedSignatureIds.
  */
  const toggleSelectedSignature = (id, checked) => {
    if (!id) return;

    setSelectedSignatureIds((prev) => {
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
    setSelectedSignatureIds((prev) => {
      const next = new Set(prev);

      selectableSignatures.forEach((s) => {
        if (checked) {
          next.add(s.id);
        } else {
          next.delete(s.id);
        }
      });
      return next;
    });
  };

  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this signature?")) return;

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/signatures/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        const msg =
          data?.message ||
          (res.status === 409
            ? "Conflict: this item is locked."
            : "Delete failed.");
        setFormError(msg);
        return;
      }

      setSelectedSignatureIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      await fetchSignatures(selectedProjectId);
    } catch (e) {
      console.error(e);
      setFormError("Delete failed.");
    }
  };

  const removeSelected = async () => {
    const ids = [...selectedSignatureIds];

    if (ids.length === 0) return;

    if (
      !window.confirm(
        //comma is just a trailing comma from formatting
        `Delete ${ids.length} selected signature${ids.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/signatures/bulk-delete`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        throw new Error(
          data?.message || "Failed to delete selected signatures.",
        );
      }
      setSelectedSignatureIds(new Set());
      await fetchSignatures(selectedProjectId);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to delete selected signatures.");
    }
  };

  // =========================
  // ✅ EXCEL EXPORT HELPERS
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
    /*
     * Keep generated file names short and safe for Windows.
     */
    const cleaned = String(value || "signatures")
      .trim()
      .replace(/[<>:"/\\|?*\s]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, maxLength)
      .replace(/_+$/g, "");

    return cleaned || "signatures";
  };

  const sanitizeExcelText = (value) => {
    /*
     * XLSX worksheets contain XML internally. Remove control characters that
     * XML 1.0 does not allow, while preserving ordinary tabs and line breaks.
     */
    return String(value ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
      .trim();
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

  const getStatusLabel = (id) => {
    const status = statusOptions.find((item) => String(item.id) === String(id));

    return (
      sanitizeExcelText(status?.label) ||
      (id != null ? `Status ${id}` : "Not specified")
    );
  };

  const getEmployeeLabel = (id) => {
    const employee = employeeOptions.find(
      (item) => String(item.id) === String(id),
    );

    return (
      sanitizeExcelText(employee?.label) ||
      (id != null ? `Employee ${id}` : "Not specified")
    );
  };

  const getPaymentOrderExportLabel = (id) => {
    if (id == null || id === "") return "Not specified";

    const paymentOrder = poOptions.find(
      (item) => String(item.id) === String(id),
    );

    if (!paymentOrder) return `PO#${id}`;

    const description = sanitizeExcelText(paymentOrder.paymentOrderDescription);

    return description
      ? `PO#${paymentOrder.id} — ${description}`
      : `PO#${paymentOrder.id}`;
  };

  const getPaymentOrderLockLabel = (id) => {
    const paymentOrder = poOptions.find(
      (item) => String(item.id) === String(id),
    );

    return paymentOrder?.locked ? "Booked / Locked" : "Editable";
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

  const styleExcelTitle = (cell) => {
    cell.font = {
      bold: true,
      size: 18,
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
    };
  };

  const styleExcelTableHeader = (row) => {
    for (let column = 1; column <= 8; column += 1) {
      const cell = row.getCell(column);

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

    row.height = 30;
  };

  const styleExcelDataRow = (row, index) => {
    for (let column = 1; column <= 8; column += 1) {
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
  };

  // 📊 Export only the signature rows selected with the checkboxes.
  const handleExportSelected = async () => {
    const selectedSignatures = items.filter(
      (signature) =>
        signature?.id != null && selectedSignatureIds.has(signature.id),
    );

    if (selectedSignatures.length === 0) {
      setFormError("Please select at least one signature before exporting.");
      return;
    }

    try {
      setExportingSelected(true);
      setFormError("");

      /*
       * Fetch the lightweight project list at export time so the workbook can
       * show a readable project name instead of only the selected project ID.
       */
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

      const matchingProject = projects.find(
        (project) => String(project.id) === String(selectedProjectId),
      );

      const selectedProjectName =
        sanitizeExcelText(
          matchingProject?.projectName || matchingProject?.name,
        ) ||
        (selectedProjectId ? `Project ${selectedProjectId}` : "Not specified");

      /*
       * Sort signatures chronologically. Signatures without a valid date are
       * placed first and then ordered by signature ID.
       */
      const sortedSignatures = [...selectedSignatures].sort((a, b) => {
        const dateA = a.signatureDate ? new Date(a.signatureDate).getTime() : 0;

        const dateB = b.signatureDate ? new Date(b.signatureDate).getTime() : 0;

        const safeDateA = Number.isFinite(dateA) ? dateA : 0;
        const safeDateB = Number.isFinite(dateB) ? dateB : 0;

        if (safeDateA !== safeDateB) return safeDateA - safeDateB;

        return Number(a.id || 0) - Number(b.id || 0);
      });

      const workbook = new ExcelJS.Workbook();

      workbook.creator = "Relief Projects";
      workbook.lastModifiedBy = "Relief Projects";
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.title = "Selected Signatures";
      workbook.subject = `Export of ${sortedSignatures.length} selected signatures`;

      const worksheet = workbook.addWorksheet("Selected Signatures", {
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
        { key: "signatureId", width: 14 },
        { key: "status", width: 22 },
        { key: "employee", width: 30 },
        { key: "paymentOrder", width: 42 },
        { key: "paymentOrderState", width: 20 },
        { key: "signature", width: 34 },
        { key: "signatureDate", width: 23 },
        { key: "project", width: 32 },
      ];

      worksheet.mergeCells("A1:H1");
      worksheet.getCell("A1").value = "Selected Signatures Report";
      styleExcelTitle(worksheet.getCell("A1"));
      worksheet.getRow(1).height = 30;

      worksheet.mergeCells("A2:H2");
      worksheet.getCell("A2").value =
        `Project: ${selectedProjectName} | ` +
        `Selected signatures: ${sortedSignatures.length} | ` +
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

      worksheet.mergeCells("A3:H3");
      worksheet.getCell("A3").value =
        "Only signature rows selected with the checkboxes are included.";

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
        "Signature ID",
        "Status",
        "Employee",
        "Payment Order",
        "Payment Order State",
        "Signature",
        "Signature Date",
        "Project",
      ];

      styleExcelTableHeader(headerRow);

      sortedSignatures.forEach((signature, index) => {
        const row = worksheet.addRow({
          signatureId: signature.id,
          status: getStatusLabel(signature.signatureStatusId),
          employee: getEmployeeLabel(signature.employeeId),
          paymentOrder: getPaymentOrderExportLabel(signature.paymentOrderId),
          paymentOrderState: getPaymentOrderLockLabel(signature.paymentOrderId),
          signature: sanitizeExcelText(signature.signature) || "Not specified",
          signatureDate: formatExcelDate(signature.signatureDate),
          project: selectedProjectName,
        });

        styleExcelDataRow(row, index);
      });

      worksheet.autoFilter = {
        from: "A4",
        to: "H4",
      };

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");

      const shortProjectName = sanitizeExcelFilename(selectedProjectName, 35);

      downloadLink.href = downloadUrl;
      downloadLink.download =
        `Signatures_${shortProjectName}_` +
        `${sortedSignatures.length}_selected.xlsx`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      /*
       * Delay URL cleanup until the browser has started the download.
       */
      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 0);
    } catch (error) {
      console.error("Failed to export selected signatures:", error);

      setFormError(
        error?.message || "Failed to export the selected signatures to Excel.",
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

  const selectableSignatures = useMemo(
    () => items.filter((s) => s?.id != null),
    [items],
  );

  const selectedSignatureCount = selectedSignatureIds.size;

  //Create a boolean variable.
  //The value will be used for something like a “select all” checkbox
  //Only say all visible rows are selected if there is at least one visible selectable row.
  //Is this signature’s ID inside the selected IDs set?
  //There is at least one selectable signature, and every selectable
  //signature’s ID exists in the selected IDs set.
  //From all loaded signatures, keep only rows that have a real ID and can be selected.
  const allVisibleSelected =
    selectableSignatures.length > 0 &&
    selectableSignatures.every((s) => selectedSignatureIds.has(s.id));

  const subtitle = selectedProjectId
    ? `Project #${selectedProjectId} • ${items.length} signature${
        items.length === 1 ? "" : "s"
      }`
    : "Select a project to see signatures";

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Signatures</h3>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.exportInlineBtn}
              onClick={handleExportSelected}
              disabled={selectedSignatureCount === 0 || exportingSelected}
              title="Export selected signatures to Excel"
            >
              <FiDownload />
              {exportingSelected
                ? "Exporting..."
                : `Export selected${
                    selectedSignatureCount > 0
                      ? ` (${selectedSignatureCount})`
                      : ""
                  }`}
            </button>

            <button
              type="button"
              className={styles.dangerInlineBtn}
              onClick={removeSelected}
              disabled={selectedSignatureCount === 0 || exportingSelected}
              title="Delete selected signatures"
            >
              <FiTrash2 />
              Delete selected{" "}
              {selectedSignatureCount > 0 ? `(${selectedSignatureCount})` : ""}
            </button>
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
                    : "Create new signature"
              }
              type="button"
            >
              <FiPlus />
              New
            </button>
          </div>
        </div>

        {formError && <div className={styles.errorBanner}>{formError}</div>}

        <div className={styles.table} style={{ ["--sig-grid-cols"]: gridCols }}>
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
                      disabled={selectableSignatures.length === 0}
                      title="Select all visible signatures"
                      aria-label="Select all visible signatures"
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
              Select a project to see its signatures.
            </p>
          ) : items.length === 0 ? (
            <p className={styles.noData}>No signatures for this project.</p>
          ) : (
            items.map((s, idx) => (
              <SignatureRow
                key={s.id}
                row={s}
                isEven={idx % 2 === 0}
                isEditing={editingId === s.id}
                editedValues={editedValues[s.id]}
                onEdit={() => startEdit(s)}
                onChange={onChange}
                onSave={save}
                onCancel={cancel}
                onDelete={remove}
                isSelected={selectedSignatureIds.has(s.id)}
                onSelectChange={toggleSelectedSignature}
                selectionDisabled={editingId === s.id}
                poOptions={poOptions}
                statusOptions={statusOptions}
                employeeOptions={employeeOptions}
                visibleCols={visibleCols}
                fieldErrors={fieldErrors[s.id] || {}}
              />
            ))
          )}

          {editingId === "new" && (
            <SignatureRow
              row={{
                id: "new",
                signatureStatusId: "",
                employeeId: "",
                paymentOrderId: "",
                signature: "",
                signatureDate: "",
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
              statusOptions={statusOptions}
              employeeOptions={employeeOptions}
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

export default Signatures;
