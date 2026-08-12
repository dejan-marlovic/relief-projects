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
import Transaction from "./Transaction/Transaction";
import styles from "./Transactions.module.scss";
import {
  FiAlertCircle,
  FiPlus,
  FiColumns,
  FiTrash2,
  FiDownload,
} from "react-icons/fi";

import { BASE_URL } from "../../config/api"; // adjust path if needed

const blankTx = {
  organizationId: "",
  projectId: "",
  budgetId: "",
  financierOrganizationId: "",
  transactionStatusId: "",
  appliedForAmount: "",
  firstShareAmount: "",
  approvedAmount: "",
  ownContribution: "",
  secondShareAmount: "",
  datePlanned: "",
  okStatus: "",
};

const headerLabels = [
  "Actions",
  "Tx ID", // ✅ NEW (read-only)
  "Org",
  "Project",
  "Budget",
  "Financier",
  "Status",
  "Applied Amt",
  "1st Share",
  "Approved Amt",
  "2nd Share",
  "Own Contrib",
  "Date Planned",
  "OK Status",
];

// Added one width for Tx ID
const BASE_COL_WIDTHS = [
  190, // Actions
  110, // ✅ Tx ID
  160, // Org
  220, // Project
  260, // Budget
  180, // Financier
  160, // Status
  120, // Applied Amt
  120, // 1st Share
  140, // Approved Amt
  120, // 2nd Share
  110, // Own Contrib
  170, // Date Planned
  100, // OK Status
];

const Transactions = ({ refreshTrigger }) => {
  const { selectedProjectId } = useContext(ProjectContext);
  const { hasRole, hasAnyRole } = useAuth();
  const canEditTransactions = hasAnyRole("ADMIN", "FINANCE");
  const canDeleteTransactions = hasRole("ADMIN");
  const canManageAllocations = hasAnyRole("ADMIN", "FINANCE");

  const [transactions, setTransactions] = useState([]);
  const [selectedTxIds, setSelectedTxIds] = useState(() => new Set());
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [expandedTxId, setExpandedTxId] = useState(null);
  const [exportingSelected, setExportingSelected] = useState(false);

  // dropdown data
  const [orgOptions, setOrgOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [budgetOptions, setBudgetOptions] = useState([]);
  const [costDetailOptions, setCostDetailOptions] = useState([]);

  // UI
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true),
  );

  // errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // refs
  const tableRef = useRef(null);
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

  const fetchTransactions = useCallback(
    async (projectId) => {
      if (!projectId) {
        setTransactions([]);
        setSelectedTxIds(new Set());
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/transactions/project/${projectId}`,
          { headers: authHeaders },
        );
        if (!res.ok)
          throw new Error(`Failed to fetch transactions (${res.status})`);

        const data = await res.json();
        const list = Array.isArray(data) ? data : data ? [data] : [];
        setTransactions(list);

        setSelectedTxIds((prev) => {
          const activeIds = new Set(list.map((tx) => tx.id));
          return new Set([...prev].filter((id) => activeIds.has(id)));
        });
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setTransactions([]);
      }
    },
    [authHeaders],
  );

  // dropdowns
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [orgRes, projRes, statRes] = await Promise.all([
          fetch(`${BASE_URL}/api/organizations/active/options`, {
            headers: authHeaders,
          }),
          fetch(`${BASE_URL}/api/projects/ids-names`, { headers: authHeaders }),
          fetch(`${BASE_URL}/api/transaction-statuses/active`, {
            headers: authHeaders,
          }),
        ]);

        if (cancelled) return;

        setOrgOptions(orgRes.ok ? await orgRes.json() : []);
        setProjectOptions(projRes.ok ? await projRes.json() : []);
        setStatusOptions(statRes.ok ? await statRes.json() : []);
      } catch (e) {
        if (!cancelled) {
          console.error("Error fetching dropdown options:", e);
          setOrgOptions([]);
          setProjectOptions([]);
          setStatusOptions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  useEffect(() => {
    fetchTransactions(selectedProjectId);
  }, [fetchTransactions, selectedProjectId, refreshTrigger]);

  useEffect(() => {
    if (editingId === "new" && newRowRef.current) {
      newRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [editingId]);

  // budgets + cost detail options
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!selectedProjectId) {
        setCostDetailOptions([]);
        setBudgetOptions([]);
        return;
      }
      try {
        const token = localStorage.getItem("authToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const bRes = await fetch(
          `${BASE_URL}/api/budgets/project/${selectedProjectId}`,
          { headers },
        );
        const budgets = bRes.ok ? await bRes.json() : [];
        const budgetList = Array.isArray(budgets) ? budgets : [];

        if (!cancelled) setBudgetOptions(budgetList);

        const all = [];
        for (const b of budgetList) {
          const cdRes = await fetch(
            `${BASE_URL}/api/cost-details/by-budget/${b.id}`,
            { headers },
          );
          if (!cdRes.ok) continue;
          const cds = await cdRes.json();
          if (Array.isArray(cds)) all.push(...cds);
        }

        if (!cancelled) setCostDetailOptions(all);
      } catch (e) {
        console.error("Failed to load budgets/cost detail options:", e);
        if (!cancelled) {
          setCostDetailOptions([]);
          setBudgetOptions([]);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const startEdit = (tx) => {
    if (!canEditTransactions) return;
    setEditingId(tx?.id ?? null);
    setExpandedTxId((cur) => (cur === tx.id ? null : cur));

    setEditedValues((prev) => ({
      ...prev,
      [tx.id]: {
        organizationId: tx.organizationId,
        projectId: tx.projectId,
        budgetId: tx.budgetId,
        financierOrganizationId: tx.financierOrganizationId,
        transactionStatusId: tx.transactionStatusId,
        appliedForAmount: tx.appliedForAmount,
        firstShareAmount: tx.firstShareAmount,
        approvedAmount: tx.approvedAmount,
        ownContribution: tx.ownContribution,
        secondShareAmount: tx.secondShareAmount,
        datePlanned: tx.datePlanned,
        okStatus: tx.okStatus,
      },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[tx.id];
      return next;
    });
    setFormError("");
  };

  const startCreate = () => {
    if (!canEditTransactions) return;
    setEditingId("new");
    setExpandedTxId(null);

    const autoBudgetId = budgetOptions.length === 1 ? budgetOptions[0].id : "";

    setEditedValues((prev) => ({
      ...prev,
      new: {
        ...blankTx,
        projectId: selectedProjectId || "",
        budgetId: autoBudgetId,
      },
    }));

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

  const save = async () => {
    if (!canEditTransactions) return;
    const id = editingId;
    const values = editedValues[id];
    if (!values) return;

    const isCreate = id === "new";
    const effectiveProjectId = isCreate
      ? values.projectId || selectedProjectId
      : (values.projectId ?? null);

    setFormError("");
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

    const payload = {
      organizationId: values.organizationId
        ? Number(values.organizationId)
        : null,
      projectId: effectiveProjectId ? Number(effectiveProjectId) : null,
      budgetId: values.budgetId ? Number(values.budgetId) : null,
      financierOrganizationId: values.financierOrganizationId
        ? Number(values.financierOrganizationId)
        : null,
      transactionStatusId: values.transactionStatusId
        ? Number(values.transactionStatusId)
        : null,
      appliedForAmount: values.appliedForAmount
        ? Number(values.appliedForAmount)
        : null,
      firstShareAmount: values.firstShareAmount
        ? Number(values.firstShareAmount)
        : null,
      approvedAmount: values.approvedAmount
        ? Number(values.approvedAmount)
        : null,
      ownContribution: values.ownContribution || null,
      secondShareAmount: values.secondShareAmount
        ? Number(values.secondShareAmount)
        : null,
      datePlanned: values.datePlanned || null,
      okStatus: values.okStatus || null,
    };

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/transactions`
          : `${BASE_URL}/api/transactions/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          // ignore
        }

        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
        }

        setFormError(
          data?.message ||
            `Failed to ${isCreate ? "create" : "update"} transaction.`,
        );
        return;
      }

      await fetchTransactions(selectedProjectId);
      cancel();
    } catch (err) {
      console.error(err);
      setFormError(
        err.message ||
          `Failed to ${isCreate ? "create" : "update"} transaction.`,
      );
    }
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

  const remove = async (id) => {
    if (!canDeleteTransactions) return;
    if (!id) return;
    if (!window.confirm("Delete this transaction?")) return;

    try {
      const res = await fetch(`${BASE_URL}/api/transactions/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to delete transaction");

      setSelectedTxIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      await fetchTransactions(selectedProjectId);
      setExpandedTxId((cur) => (cur === id ? null : cur));
    } catch (err) {
      console.error(err);
      alert("Failed to delete transaction.");
    }
  };

  const gridCols = useMemo(() => {
    const parts = BASE_COL_WIDTHS.map((w, i) =>
      visibleCols[i] ? `${w}px` : "0px",
    );
    return parts.join(" ");
  }, [visibleCols]);

  const selectedCount = selectedTxIds.size;

  const selectableTransactions = useMemo(
    () => transactions.filter((tx) => tx?.id != null),
    [transactions],
  );

  const allVisibleSelected =
    //prevents the select-all checkbox from being checked when the table is empty.
    selectableTransactions.length > 0 &&
    selectableTransactions.every((tx) => selectedTxIds.has(tx.id));

  const toggleSelected = (id, checked) => {
    if (!id) return;

    setSelectedTxIds((prev) => {
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
    setSelectedTxIds((prev) => {
      const next = new Set(prev);

      selectableTransactions.forEach((tx) => {
        if (checked) {
          next.add(tx.id);
        } else {
          next.delete(tx.id);
        }
      });

      return next;
    });
  };

  const removeSelected = async () => {
    if (!canDeleteTransactions) return;
    const ids = [...selectedTxIds];

    if (ids.length === 0) return;

    if (
      !window.confirm(
        `Delete ${ids.length} selected transaction${ids.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/transactions/bulk-delete`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        throw new Error(raw || "Failed to delete selected transactions.");
      }

      setSelectedTxIds(new Set());
      setExpandedTxId((cur) => (ids.includes(cur) ? null : cur));
      await fetchTransactions(selectedProjectId);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete selected transactions.");
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
     * Keep the downloaded file name short and safe for Windows.
     *
     * This helper:
     * - replaces invalid file-name characters and whitespace with "_";
     * - removes leading and trailing underscores;
     * - limits the resulting text to maxLength characters.
     */
    const cleaned = String(value || "transactions")
      .trim()
      .replace(/[<>:"/\\|?*\s]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, maxLength)
      .replace(/_+$/g, "");

    return cleaned || "transactions";
  };

  const sanitizeExcelText = (value) => {
    /*
     * XLSX worksheets are XML documents internally.
     *
     * Notes, descriptions or names copied from external systems can contain
     * invisible control characters that are not valid in XML 1.0. Excel then
     * reports that sheet1.xml is damaged and attempts to repair the workbook.
     *
     * Keep normal tabs, line breaks and carriage returns, but remove the
     * remaining invalid control characters.
     */
    return String(value ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
      .trim();
  };

  const toExcelNumber = (value) => {
    if (value == null || value === "") return 0;

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
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

  const getOrganizationName = (id) => {
    if (id == null || id === "") return "Not specified";

    const organization = orgOptions.find(
      (item) => String(item.id) === String(id),
    );

    return sanitizeExcelText(organization?.name) || `Organization ${id}`;
  };

  const getProjectName = (id) => {
    if (id == null || id === "") return "Not specified";

    const project = projectOptions.find(
      (item) => String(item.id) === String(id),
    );

    return (
      sanitizeExcelText(project?.projectName || project?.name) ||
      `Project ${id}`
    );
  };

  const getTransactionStatusName = (id) => {
    if (id == null || id === "") return "Not specified";

    const status = statusOptions.find((item) => String(item.id) === String(id));

    return (
      sanitizeExcelText(status?.transactionStatusName || status?.statusName) ||
      `Status ${id}`
    );
  };

  const getBudgetLabel = (id) => {
    if (id == null || id === "") return "Not specified";

    const matchingBudget = budgetOptions.find(
      (item) => String(item.id) === String(id),
    );

    if (!matchingBudget) return `Budget ${id}`;

    const description = sanitizeExcelText(
      matchingBudget.budgetDescription || matchingBudget.description || "",
    );

    return description
      ? `${matchingBudget.id} — ${description}`
      : `Budget ${matchingBudget.id}`;
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
    row.eachCell((cell) => {
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
    });

    row.height = 30;
  };

  const styleExcelDataRow = (row, index) => {
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

  const styleExcelTotalRow = (row) => {
    row.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: excelColors.text },
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: excelColors.paleGreen },
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };

      applyExcelBorder(cell);
    });
  };

  // 📊 Export only the rows currently selected with the transaction checkboxes.
  const handleExportSelected = async () => {
    const selectedTransactions = transactions.filter(
      (transaction) =>
        transaction?.id != null && selectedTxIds.has(transaction.id),
    );

    if (selectedTransactions.length === 0) {
      setFormError("Please select at least one transaction before exporting.");
      return;
    }

    try {
      setExportingSelected(true);
      setFormError("");

      /*
       * The selected transaction rows already contain the latest values loaded
       * by this component. Lookup lists are used to replace relationship IDs
       * with readable organization, project, budget and status names.
       */
      const sortedTransactions = [...selectedTransactions].sort((a, b) => {
        const dateA = a.datePlanned ? new Date(a.datePlanned).getTime() : 0;
        const dateB = b.datePlanned ? new Date(b.datePlanned).getTime() : 0;

        if (dateA !== dateB) return dateA - dateB;

        return Number(a.id || 0) - Number(b.id || 0);
      });

      /*
       * Fetch the latest saved allocations for every selected transaction.
       *
       * The result is stored in a Map:
       *
       * transaction ID -> allocation array
       *
       * Example:
       *
       * {
       *   12 => [
       *     {
       *       id: 4,
       *       transactionId: 12,
       *       costDetailId: 9,
       *       plannedAmount: 5000,
       *       note: "First planned payment"
       *     }
       *   ]
       * }
       */
      const allocationResponses = await Promise.all(
        sortedTransactions.map(async (transaction) => {
          const response = await fetch(
            `${BASE_URL}/api/cost-allocations/transaction/${transaction.id}`,
            {
              headers: authHeaders,
            },
          );

          if (!response.ok) {
            const raw = await response.text().catch(() => "");

            throw new Error(
              raw ||
                `Failed to load allocations for transaction ${transaction.id}.`,
            );
          }

          const data = await response.json().catch(() => []);

          return [
            transaction.id,
            Array.isArray(data) ? data : data ? [data] : [],
          ];
        }),
      );

      const allocationsByTransactionId = new Map(allocationResponses);

      /*
       * Resolve a cost-detail ID to the same readable label used by the
       * TransactionAllocations component.
       */
      const getCostDetailLabel = (costDetailId) => {
        const costDetail = costDetailOptions.find(
          (item) => Number(item.costDetailId) === Number(costDetailId),
        );

        const description = sanitizeExcelText(
          costDetail?.costDescription || "No description",
        );

        return costDetail
          ? `${description || "No description"} (CD#${costDetail.costDetailId})`
          : `Cost Detail #${costDetailId}`;
      };

      const workbook = new ExcelJS.Workbook();

      workbook.creator = "Relief Projects";
      workbook.lastModifiedBy = "Relief Projects";
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.title = "Selected Transactions";
      workbook.subject =
        `Export of ${sortedTransactions.length} selected transactions ` +
        "with allocations";

      const worksheet = workbook.addWorksheet("Selected Transactions", {
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

      /*
       * Excel outline settings.
       *
       * ExcelJS officially supports outlineLevelRow as a worksheet property.
       * The individual allocation rows receive outlineLevel = 1 below.
       *
       * Do not assign worksheet.properties.outlineProperties here. That is not
       * a supported property in ExcelJS 4.x and can generate malformed
       * sheet1.xml in Microsoft Excel.
       */
      worksheet.properties.outlineLevelRow = 1;

      worksheet.columns = [
        { key: "transactionId", width: 14 },
        { key: "organization", width: 28 },
        { key: "project", width: 32 },
        { key: "budget", width: 38 },
        { key: "financier", width: 28 },
        { key: "status", width: 22 },
        { key: "applied", width: 17 },
        { key: "firstShare", width: 17 },
        { key: "approved", width: 17 },
        { key: "secondShare", width: 17 },
        { key: "ownContribution", width: 17 },
        { key: "datePlanned", width: 22 },
        { key: "okStatus", width: 14 },
      ];

      worksheet.mergeCells("A1:M1");
      worksheet.getCell("A1").value = "Selected Transactions Report";
      styleExcelTitle(worksheet.getCell("A1"));
      worksheet.getRow(1).height = 30;

      const selectedProjectName = getProjectName(selectedProjectId);

      worksheet.mergeCells("A2:M2");
      worksheet.getCell("A2").value =
        `Project: ${selectedProjectName} | ` +
        `Selected transactions: ${sortedTransactions.length} | ` +
        `Exported: ${new Date().toLocaleString("sv-SE")}`;

      worksheet.getCell("A2").font = {
        italic: true,
        color: { argb: "FF6B7280" },
      };

      worksheet.getCell("A2").alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      worksheet.mergeCells("A3:M3");
      worksheet.getCell("A3").value =
        "Only selected transactions are exported. Allocation groups open collapsed. " +
        "Use Excel's outline controls to expand or collapse them.";

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

      worksheet.getRow(3).height = 34;

      const headerRow = worksheet.getRow(4);

      headerRow.values = [
        "Transaction ID",
        "Organization",
        "Project",
        "Budget",
        "Financier",
        "Status",
        "Applied Amount",
        "First Share",
        "Approved Amount",
        "Second Share",
        "Own Contribution",
        "Date Planned",
        "OK Status",
      ];

      styleExcelTableHeader(headerRow);

      const totals = {
        applied: 0,
        firstShare: 0,
        approved: 0,
        secondShare: 0,
        allocated: 0,
      };

      sortedTransactions.forEach((transaction, index) => {
        const transactionRow = worksheet.addRow({
          transactionId: transaction.id,
          organization: getOrganizationName(transaction.organizationId),
          project: getProjectName(transaction.projectId),
          budget: getBudgetLabel(transaction.budgetId),
          financier: getOrganizationName(transaction.financierOrganizationId),
          status: getTransactionStatusName(transaction.transactionStatusId),
          applied: toExcelNumber(transaction.appliedForAmount),
          firstShare: toExcelNumber(transaction.firstShareAmount),
          approved: toExcelNumber(transaction.approvedAmount),
          secondShare: toExcelNumber(transaction.secondShareAmount),
          ownContribution: transaction.ownContribution || "Not specified",
          datePlanned: formatExcelDate(transaction.datePlanned),
          okStatus: transaction.okStatus || "Not specified",
        });

        styleExcelDataRow(transactionRow, index);

        /*
         * Make the main transaction row visually stronger than its allocation
         * rows so the hierarchy remains clear when a group is expanded.
         */
        transactionRow.eachCell((cell) => {
          cell.font = {
            ...(cell.font || {}),
            bold: true,
          };
        });

        for (let column = 7; column <= 10; column += 1) {
          transactionRow.getCell(column).numFmt = "#,##0.00";
        }

        totals.applied += toExcelNumber(transaction.appliedForAmount);
        totals.firstShare += toExcelNumber(transaction.firstShareAmount);
        totals.approved += toExcelNumber(transaction.approvedAmount);
        totals.secondShare += toExcelNumber(transaction.secondShareAmount);

        const allocations =
          allocationsByTransactionId.get(transaction.id) || [];

        /*
         * Insert one collapsed Excel row group directly below the transaction.
         *
         * outlineLevel = 1 tells Excel that these rows belong to a nested group.
         * hidden = true makes the group collapsed when the workbook opens.
         *
         * Excel displays + / − controls in the row-number margin, allowing the
         * user to expand or collapse these rows similarly to the frontend.
         */
        const allocationHeaderRow = worksheet.addRow([]);

        allocationHeaderRow.outlineLevel = 1;

        /*
         * Hide the grouped allocation rows initially.
         *
         * Because these rows also have outlineLevel = 1, Excel treats them as
         * expandable detail rows and displays its outline controls in the row
         * margin. The transaction row remains visible as the summary row.
         */
        allocationHeaderRow.hidden = true;

        /*
         * Do not merge cells inside outlined rows.
         *
         * Some Excel versions repair worksheets that combine hidden outline
         * rows with several merged ranges. Ordinary cells are more robust and
         * preserve the same expandable hierarchy.
         */
        allocationHeaderRow.getCell(1).value = "Allocations";
        allocationHeaderRow.getCell(2).value = "Cost Detail";
        allocationHeaderRow.getCell(7).value = "Planned Amount";
        allocationHeaderRow.getCell(9).value = "Note";

        for (let column = 1; column <= 13; column += 1) {
          const cell = allocationHeaderRow.getCell(column);

          cell.font = {
            bold: true,
            color: { argb: excelColors.white },
          };

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: excelColors.mediumBlue },
          };

          cell.alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: true,
          };

          applyExcelBorder(cell);
        }

        if (allocations.length === 0) {
          const emptyAllocationRow = worksheet.addRow([]);

          emptyAllocationRow.outlineLevel = 1;
          emptyAllocationRow.hidden = true;

          emptyAllocationRow.getCell(1).value = "↳";
          emptyAllocationRow.getCell(2).value =
            "No allocations for this transaction.";

          for (let column = 1; column <= 13; column += 1) {
            const cell = emptyAllocationRow.getCell(column);

            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: excelColors.lightGray },
            };

            cell.font = {
              italic: true,
              color: { argb: "FF6B7280" },
            };

            cell.alignment = {
              vertical: "top",
              horizontal: "left",
              wrapText: true,
            };

            applyExcelBorder(cell);
          }
        } else {
          let transactionAllocatedTotal = 0;

          allocations.forEach((allocation, allocationIndex) => {
            const allocationRow = worksheet.addRow([]);

            allocationRow.outlineLevel = 1;
            allocationRow.hidden = true;

            const plannedAmount = toExcelNumber(allocation.plannedAmount);

            transactionAllocatedTotal += plannedAmount;
            totals.allocated += plannedAmount;

            allocationRow.getCell(1).value =
              allocation.id != null ? `A#${allocation.id}` : "↳";

            allocationRow.getCell(2).value = getCostDetailLabel(
              allocation.costDetailId,
            );

            allocationRow.getCell(7).value = plannedAmount;
            allocationRow.getCell(9).value =
              sanitizeExcelText(allocation.note) || "Not specified";

            allocationRow.getCell(7).numFmt = "#,##0.00";

            for (let column = 1; column <= 13; column += 1) {
              const cell = allocationRow.getCell(column);

              cell.alignment = {
                vertical: "top",
                horizontal: "left",
                wrapText: true,
              };

              applyExcelBorder(cell);

              if (allocationIndex % 2 === 1) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: excelColors.lightGray },
                };
              }
            }
          });

          const allocationTotalRow = worksheet.addRow([]);

          allocationTotalRow.outlineLevel = 1;
          allocationTotalRow.hidden = true;

          allocationTotalRow.getCell(1).value = "TOTAL";
          allocationTotalRow.getCell(2).value =
            `Allocated total for transaction ${transaction.id}`;

          allocationTotalRow.getCell(7).value = Number(
            transactionAllocatedTotal.toFixed(2),
          );

          allocationTotalRow.getCell(7).numFmt = "#,##0.00";

          allocationTotalRow.getCell(9).value = `Approved: ${toExcelNumber(
            transaction.approvedAmount,
          ).toFixed(2)} | Remaining: ${(
            toExcelNumber(transaction.approvedAmount) -
            transactionAllocatedTotal
          ).toFixed(2)}`;

          for (let column = 1; column <= 13; column += 1) {
            const cell = allocationTotalRow.getCell(column);

            cell.font = { bold: true };

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
        }
      });

      const totalRow = worksheet.addRow({
        transactionId: "TOTAL",
        organization: "",
        project: "",
        budget: "",
        financier: "",
        status: "",
        applied: Number(totals.applied.toFixed(2)),
        firstShare: Number(totals.firstShare.toFixed(2)),
        approved: Number(totals.approved.toFixed(2)),
        secondShare: Number(totals.secondShare.toFixed(2)),
        ownContribution: "",
        datePlanned: "",
        okStatus: "",
      });

      styleExcelTotalRow(totalRow);

      for (let column = 7; column <= 10; column += 1) {
        totalRow.getCell(column).numFmt = "#,##0.00";
      }

      /*
       * Add the allocation grand total as a separate summary line so it does
       * not overwrite any of the transaction amount columns.
       */
      const allocationGrandTotalRow = worksheet.addRow([]);

      allocationGrandTotalRow.getCell(1).value =
        "GRAND TOTAL — TRANSACTION ALLOCATIONS";

      allocationGrandTotalRow.getCell(7).value = Number(
        totals.allocated.toFixed(2),
      );

      allocationGrandTotalRow.getCell(7).numFmt = "#,##0.00";

      allocationGrandTotalRow.getCell(9).value =
        "Total planned amount across all exported allocation rows.";

      for (let column = 1; column <= 13; column += 1) {
        const cell = allocationGrandTotalRow.getCell(column);

        cell.font = {
          bold: true,
          color: { argb: excelColors.text },
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: excelColors.paleGreen },
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
        to: "M4",
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
        `Transactions_${shortProjectName}_` +
        `${sortedTransactions.length}_selected.xlsx`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      /*
       * Delay cleanup until the browser has started processing the download.
       */
      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 0);
    } catch (error) {
      console.error("Failed to export selected transactions:", error);

      setFormError(
        error?.message ||
          "Failed to export the selected transactions to Excel.",
      );
    } finally {
      setExportingSelected(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.headerText}>
            <div className={styles.cardTitle}>Transactions</div>
            <div className={styles.cardMeta}>
              View, edit and allocate planned amounts per transaction.
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.exportInlineBtn}
              onClick={handleExportSelected}
              disabled={selectedCount === 0 || exportingSelected}
              title="Export selected transactions to Excel"
            >
              <FiDownload />
              {exportingSelected
                ? "Exporting..."
                : `Export selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
            </button>

            {canDeleteTransactions && <button
              type="button"
              className={styles.dangerInlineBtn}
              onClick={removeSelected}
              disabled={selectedCount === 0 || exportingSelected}
              title="Delete selected transactions"
            >
              <FiTrash2></FiTrash2>
              Delete selected {selectedCount > 0 ? `(${selectedCount})` : ""}
            </button>}
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
            {canEditTransactions && <button
              type="button"
              className={styles.primaryInlineBtn}
              onClick={startCreate}
              disabled={!selectedProjectId || editingId === "new"}
              title="New Transaction"
            >
              <FiPlus />
              New
            </button>}
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        <div
          className={styles.table}
          style={{ ["--tx-grid-cols"]: gridCols }}
          ref={tableRef}
        >
          <div className={`${styles.gridRow} ${styles.headerRow}`}>
            {headerLabels.map((h, i) => (
              <div
                key={h}
                className={`${styles.headerCell} ${
                  i === 0 ? styles.stickyColHeader : ""
                } ${!visibleCols[i] ? styles.hiddenCol : ""} ${
                  i === 0 ? styles.actionsCol : ""
                }`}
              >
                {i === 0 ? (
                  <div className={styles.headerActionsCell}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      disabled={selectableTransactions.length === 0}
                      title="Select all visible transactions"
                      aria-label="Select all visible transactions"
                    />
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
              Select a project to see transactions.
            </p>
          ) : transactions.length === 0 ? (
            <p className={styles.noData}>No transactions for this project.</p>
          ) : (
            transactions.map((tx, idx) => (
              <Transaction
                key={tx.id}
                tx={tx}
                isEven={idx % 2 === 0}
                isEditing={editingId === tx.id}
                editedValues={editedValues[tx.id]}
                onEdit={() => startEdit(tx)}
                onChange={onChange}
                onSave={save}
                onCancel={cancel}
                onDelete={remove}
                isSelected={selectedTxIds.has(tx.id)}
                onSelectChange={toggleSelected}
                selectionDisabled={editingId === tx.id}
                organizations={orgOptions}
                projects={projectOptions}
                statuses={statusOptions}
                budgets={budgetOptions}
                visibleCols={visibleCols}
                fieldErrors={fieldErrors[tx.id] || {}}
                expanded={expandedTxId === tx.id}
                onToggleAllocations={() =>
                  setExpandedTxId((cur) => (cur === tx.id ? null : tx.id))
                }
                costDetailOptions={costDetailOptions}
                canEdit={canEditTransactions}
                canDelete={canDeleteTransactions}
                canManageAllocations={canManageAllocations}
              />
            ))
          )}

          {canEditTransactions && editingId === "new" && (
            <Transaction
              tx={{
                id: "new",
                ...blankTx,
                projectId: selectedProjectId || "",
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
              organizations={orgOptions}
              projects={projectOptions}
              statuses={statusOptions}
              budgets={budgetOptions}
              visibleCols={visibleCols}
              isEven={false}
              fieldErrors={fieldErrors.new || {}}
              rowRef={newRowRef}
              canEdit={canEditTransactions}
              canDelete={canDeleteTransactions}
              canManageAllocations={canManageAllocations}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
