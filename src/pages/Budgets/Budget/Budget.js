import React, { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import styles from "./Budget.module.scss";
import CostDetails from "./CostDetails/CostDetails";

// ✅ Icons (same style as Project)
import { FiSave, FiTrash2, FiAlertCircle, FiDownload } from "react-icons/fi";

import { BASE_URL } from "../../../config/api"; // adjust path if needed
import { useAuth } from "../../../context/AuthContext";

const Budget = ({ budget: initialBudget, onUpdate, onDelete }) => {
  const { hasRole, hasAnyRole } = useAuth();
  const canEditBudget = hasAnyRole("ADMIN", "FINANCE");
  const canDeleteBudget = hasRole("ADMIN");
  const formatDate = (dateString) =>
    dateString ? dateString.slice(0, 16) : "";

  const [budget, setBudget] = useState(initialBudget || {});
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [refreshCostDetailsTrigger, setRefreshCostDetailsTrigger] = useState(0);

  const [loading, setLoading] = useState(false);
  const [exportingBudget, setExportingBudget] = useState(false);

  // 🔴 form-level + field-level errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { fieldName: "Message" }

  const triggerRefreshCostDetails = () =>
    setRefreshCostDetailsTrigger((prev) => prev + 1);

  // 🔎 helper: find currency name by id
  const getCurrencyNameById = (id) => {
    if (!id || !currencies || currencies.length === 0) return "";
    const numericId = typeof id === "string" ? Number(id) : id;
    return currencies.find((c) => c.id === numericId)?.name || "";
  };

  const findCurrencyIdByName = (name) => {
    if (!name || !currencies || currencies.length === 0) return null;
    return currencies.find(
      (c) => (c.name || "").toUpperCase() === name.toUpperCase(),
    )?.id;
  };

  // 💱 format: "1 USD → 10.50 SEK"
  const formatRateLabel = (r) => {
    const baseName = getCurrencyNameById(r.baseCurrencyId) || r.baseCurrencyId;
    const quoteName =
      getCurrencyNameById(r.quoteCurrencyId) || r.quoteCurrencyId;
    return `1 ${baseName} → ${r.rate} ${quoteName}`;
  };

  // Filter rates for a specific currency pair
  const filterRatesForPair = (baseCurrencyId, quoteCurrencyId) => {
    if (!baseCurrencyId || !quoteCurrencyId || !exchangeRates.length) return [];
    const baseNum =
      typeof baseCurrencyId === "string"
        ? Number(baseCurrencyId)
        : baseCurrencyId;
    const quoteNum =
      typeof quoteCurrencyId === "string"
        ? Number(quoteCurrencyId)
        : quoteCurrencyId;

    return exchangeRates.filter(
      (r) => r.baseCurrencyId === baseNum && r.quoteCurrencyId === quoteNum,
    );
  };

  // 🔄 Fetch: Currencies
  const fetchCurrencies = async (token) => {
    const response = await fetch(`${BASE_URL}/api/currencies/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  };

  // 🔄 Fetch: Exchange Rates
  const fetchExchangeRates = async (token) => {
    const response = await fetch(`${BASE_URL}/api/exchange-rates/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  };

  // ✅ Fetch both currencies and rates in parallel on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchFormData = async () => {
      try {
        const [currenciesData, exchangeRatesData] = await Promise.all([
          fetchCurrencies(token),
          fetchExchangeRates(token),
        ]);
        setCurrencies(Array.isArray(currenciesData) ? currenciesData : []);
        setExchangeRates(
          Array.isArray(exchangeRatesData) ? exchangeRatesData : [],
        );
      } catch (error) {
        console.error("Failed to fetch currency or exchange rate data", error);
        setCurrencies([]);
        setExchangeRates([]);
      }
    };

    fetchFormData();
  }, []);

  // 🔧 Field error helpers
  const getFieldError = (fieldName) => fieldErrors?.[fieldName];
  const hasError = (fieldName) => Boolean(fieldErrors?.[fieldName]);

  const inputClass = (fieldName) =>
    `${styles.textInput} ${hasError(fieldName) ? styles.inputError : ""}`;

  // Names for fixed reporting currencies (for display only)
  const sekName = getCurrencyNameById(budget.reportingCurrencySekId) || "SEK";
  const eurName = getCurrencyNameById(budget.reportingCurrencyEurId) || "EUR";

  // IDs of special currencies
  const gbpCurrencyId = findCurrencyIdByName("GBP");

  // Rate lists for each dropdown
  const localToGbpRates =
    budget.localCurrencyId && gbpCurrencyId
      ? filterRatesForPair(budget.localCurrencyId, gbpCurrencyId)
      : [];

  const localToSekRates =
    budget.localCurrencyId && budget.reportingCurrencySekId
      ? filterRatesForPair(
          budget.localCurrencyId,
          budget.reportingCurrencySekId,
        )
      : [];

  const localToEurRates =
    budget.localCurrencyId && budget.reportingCurrencyEurId
      ? filterRatesForPair(
          budget.localCurrencyId,
          budget.reportingCurrencyEurId,
        )
      : [];

  // =========================
  // ✅ EXCEL EXPORT HELPERS
  // =========================

  const excelColors = {
    darkBlue: "FF1F4E78",
    mediumBlue: "FF5B9BD5",
    lightBlue: "FFD9EAF7",
    lightGray: "FFF3F4F6",
    paleGreen: "FFE2F0D9",
    paleYellow: "FFFFF2CC",
    borderGray: "FFD1D5DB",
    white: "FFFFFFFF",
    text: "FF1F2937",
  };

  const safeExcelValue = (value) => {
    if (value == null || value === "") return "Not specified";
    return value;
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
      return String(value);
    }

    return date.toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sanitizeExcelFilename = (value, maxLength = 50) => {
    /*
     * Windows has limits for both the file name and the complete file path.
     * A long budget description can therefore make the generated Excel file
     * difficult or impossible to open after it has been downloaded.
     *
     * This helper:
     * - replaces invalid file-name characters and whitespace with "_";
     * - removes leading and trailing underscores;
     * - limits the resulting text to maxLength characters;
     * - removes underscores left at the end after truncation.
     */
    const cleaned = String(value || "budget")
      .trim()
      .replace(/[<>:"/\\|?*\s]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, maxLength)
      .replace(/_+$/g, "");

    return cleaned || "budget";
  };

  const getExchangeRateById = (id) => {
    if (!id || !Array.isArray(exchangeRates)) return null;

    const numericId = typeof id === "string" ? Number(id) : id;

    return (
      exchangeRates.find((rate) => Number(rate.id) === Number(numericId)) ||
      null
    );
  };

  const getExchangeRateValueById = (id) => {
    const rateObject = getExchangeRateById(id);

    if (!rateObject || rateObject.rate == null) return null;

    const numericRate = Number(rateObject.rate);
    return Number.isFinite(numericRate) ? numericRate : null;
  };

  const getExportRateLabel = (id) => {
    const rateObject = getExchangeRateById(id);

    if (!rateObject) return "Not specified";

    return formatRateLabel(rateObject);
  };

  /*
   * This uses the same calculation as CostDetails:
   *
   * base  = number of units × unit price
   * gross = base × (1 + percentage charged / 100)
   *
   * The local amount is gross.
   * SEK, GBP and EUR are gross multiplied by the exchange rates
   * selected in the budget header.
   */
  const computeExportAmounts = (row) => {
    const noOfUnits = toExcelNumber(row.noOfUnits);
    const unitPrice = toExcelNumber(row.unitPrice);
    const percentageCharging = toExcelNumber(row.percentageCharging);

    const base = noOfUnits * unitPrice;
    const gross = base * (1 + percentageCharging / 100);

    const rateSek = getExchangeRateValueById(budget.reportingExchangeRateSekId);

    const rateEur = getExchangeRateValueById(budget.reportingExchangeRateEurId);

    const rateGbp = getExchangeRateValueById(budget.localExchangeRateToGbpId);

    return {
      ...row,
      amountLocalCurrency: gross === 0 ? 0 : Number(gross.toFixed(3)),
      amountReportingCurrency:
        gross !== 0 && rateSek ? Number((gross * rateSek).toFixed(3)) : 0,
      amountGBP:
        gross !== 0 && rateGbp ? Number((gross * rateGbp).toFixed(3)) : 0,
      amountEuro:
        gross !== 0 && rateEur ? Number((gross * rateEur).toFixed(3)) : 0,
    };
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

  const styleExcelSection = (cell) => {
    cell.font = {
      bold: true,
      size: 12,
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

  const styleExcelTotalRow = (row, fillColor) => {
    row.eachCell((cell) => {
      cell.font = { bold: true };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };

      applyExcelBorder(cell);
    });
  };

  // 📊 Export this budget and all its saved cost details to Excel.
  const handleExportBudget = async () => {
    if (!budget?.id) {
      setFormError("Please select a budget before exporting.");
      return;
    }

    try {
      setExportingBudget(true);
      setFormError("");

      const token = localStorage.getItem("authToken");

      if (!token) {
        throw new Error("Authentication token is missing.");
      }

      /*
       * Fetch the latest saved records at export time.
       * This makes the workbook reflect the database rather than a cost-detail
       * row that may still be open and unsaved in the browser.
       */
      const [
        costDetailsResponse,
        costTypesResponse,
        costsResponse,
        projectsResponse,
      ] = await Promise.all([
        fetch(`${BASE_URL}/api/cost-details/by-budget/${budget.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/cost-types/active`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/costs/active`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        /*
         * Fetch the lightweight project list so the exported budget can show
         * the readable project name instead of only the project ID.
         */
        fetch(`${BASE_URL}/api/projects/ids-names`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!costDetailsResponse.ok) {
        throw new Error("Failed to load cost details for export.");
      }

      if (!costTypesResponse.ok) {
        throw new Error("Failed to load cost types for export.");
      }

      if (!costsResponse.ok) {
        throw new Error("Failed to load cost categories for export.");
      }

      if (!projectsResponse.ok) {
        throw new Error("Failed to load project names for export.");
      }

      const [costDetailsData, costTypesData, costsData, projectsData] =
        await Promise.all([
          costDetailsResponse.json(),
          costTypesResponse.json(),
          costsResponse.json(),
          projectsResponse.json(),
        ]);

      const savedCostDetails = Array.isArray(costDetailsData)
        ? costDetailsData
        : [];

      const exportCostTypes = Array.isArray(costTypesData) ? costTypesData : [];

      const exportCosts = Array.isArray(costsData) ? costsData : [];

      const exportProjects = Array.isArray(projectsData) ? projectsData : [];

      /*
       * Resolve the budget's project ID to the readable project name.
       *
       * The ids-names endpoint normally returns objects shaped like:
       *
       * {
       *   id,
       *   projectName
       * }
       *
       * A fallback containing the ID is kept in case the project cannot be
       * found, for example if it was archived or removed from the active list.
       */
      const matchingProject = exportProjects.find(
        (project) => String(project.id) === String(budget.projectId),
      );

      const projectName =
        matchingProject?.projectName ||
        matchingProject?.name ||
        (budget.projectId ? `Project ${budget.projectId}` : "Not specified");

      const computedCostDetails = savedCostDetails.map(computeExportAmounts);

      const getCostTypeName = (id) =>
        exportCostTypes.find((type) => Number(type.id) === Number(id))
          ?.costTypeName || `Unknown Type ${id ?? ""}`.trim();

      const getCostCategoryName = (id) =>
        exportCosts.find((cost) => Number(cost.id) === Number(id))?.costName ||
        `Unknown Category ${id ?? ""}`.trim();

      /*
       * Group rows in the same hierarchy used by CostDetails:
       *
       * Cost type
       *   └── Cost category
       *         └── Cost-detail rows
       */
      const groupedCostDetails = {};

      computedCostDetails.forEach((costDetail) => {
        const typeId = String(costDetail.costTypeId ?? "unknown");
        const categoryId = String(costDetail.costId ?? "unknown");

        if (!groupedCostDetails[typeId]) {
          groupedCostDetails[typeId] = {};
        }

        if (!groupedCostDetails[typeId][categoryId]) {
          groupedCostDetails[typeId][categoryId] = [];
        }

        groupedCostDetails[typeId][categoryId].push(costDetail);
      });

      const workbook = new ExcelJS.Workbook();

      workbook.creator = "Relief Projects";
      workbook.lastModifiedBy = "Relief Projects";
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.title = `Budget ${budget.id}`;
      workbook.subject = `Budget export for budget ${budget.id}`;

      const worksheet = workbook.addWorksheet("Budget Report", {
        views: [{ state: "frozen", ySplit: 2 }],
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
        { key: "description", width: 34 },
        { key: "type", width: 22 },
        { key: "category", width: 25 },
        { key: "units", width: 13 },
        { key: "unitPrice", width: 15 },
        { key: "percentage", width: 14 },
        { key: "local", width: 17 },
        { key: "sek", width: 17 },
        { key: "gbp", width: 17 },
        { key: "eur", width: 17 },
      ];

      worksheet.mergeCells("A1:J1");
      worksheet.getCell("A1").value = `Budget ${budget.id} Report`;
      styleExcelTitle(worksheet.getCell("A1"));
      worksheet.getRow(1).height = 30;

      worksheet.mergeCells("A2:J2");
      worksheet.getCell("A2").value =
        `Exported: ${new Date().toLocaleString("sv-SE")} | ` +
        `Project: ${projectName}`;

      worksheet.getCell("A2").font = {
        italic: true,
        color: { argb: "FF6B7280" },
      };

      worksheet.getCell("A2").alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      let currentRow = 4;

      /*
       * Adds one field to the wide, landscape-style budget header.
       *
       * The label occupies a merged range on one row and the value occupies
       * the same merged columns directly underneath it.
       *
       * Example with startColumn 1 and endColumn 2:
       *
       * A5:B5  Budget ID
       * A6:B6  12
       */
      const addLandscapeHeaderField = (
        label,
        value,
        labelRow,
        valueRow,
        startColumn,
        endColumn,
      ) => {
        worksheet.mergeCells(labelRow, startColumn, labelRow, endColumn);
        worksheet.mergeCells(valueRow, startColumn, valueRow, endColumn);

        const labelCell = worksheet.getCell(labelRow, startColumn);
        const valueCell = worksheet.getCell(valueRow, startColumn);

        labelCell.value = label;
        valueCell.value = safeExcelValue(value);

        labelCell.font = {
          bold: true,
          color: { argb: excelColors.text },
        };

        labelCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: excelColors.lightBlue },
        };

        labelCell.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };

        valueCell.alignment = {
          vertical: "top",
          horizontal: "left",
          wrapText: true,
        };

        applyExcelBorder(labelCell);
        applyExcelBorder(valueCell);
      };

      worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "Budget Header";
      styleExcelSection(worksheet.getCell(`A${currentRow}`));
      currentRow += 1;

      /*
       * LANDSCAPE HEADER — FIRST BAND
       *
       * Five fields are placed across the full worksheet width.
       * Each field uses two columns:
       *
       * A:B | C:D | E:F | G:H | I:J
       */
      const firstLabelRow = currentRow;
      const firstValueRow = currentRow + 1;

      addLandscapeHeaderField(
        "Budget ID",
        budget.id,
        firstLabelRow,
        firstValueRow,
        1,
        2,
      );

      addLandscapeHeaderField(
        "Project Name",
        projectName,
        firstLabelRow,
        firstValueRow,
        3,
        4,
      );

      addLandscapeHeaderField(
        "Preparation Date",
        formatExcelDate(budget.budgetPreparationDate),
        firstLabelRow,
        firstValueRow,
        5,
        6,
      );

      addLandscapeHeaderField(
        "Budget Total",
        toExcelNumber(budget.totalAmount),
        firstLabelRow,
        firstValueRow,
        7,
        8,
      );

      addLandscapeHeaderField(
        "Local Currency",
        getCurrencyNameById(budget.localCurrencyId),
        firstLabelRow,
        firstValueRow,
        9,
        10,
      );

      // Budget Total starts in G on the value row.
      worksheet.getCell(firstValueRow, 7).numFmt = "#,##0.000";

      worksheet.getRow(firstLabelRow).height = 24;
      worksheet.getRow(firstValueRow).height = 30;

      currentRow += 3;

      /*
       * LANDSCAPE HEADER — SECOND BAND
       *
       * The description receives extra width, while the three exchange-rate
       * fields are displayed beside it across the same landscape header.
       *
       * A:D | E:F | G:H | I:J
       */
      const secondLabelRow = currentRow;
      const secondValueRow = currentRow + 1;

      addLandscapeHeaderField(
        "Description",
        budget.budgetDescription,
        secondLabelRow,
        secondValueRow,
        1,
        4,
      );

      addLandscapeHeaderField(
        "Local → GBP",
        getExportRateLabel(budget.localExchangeRateToGbpId),
        secondLabelRow,
        secondValueRow,
        5,
        6,
      );

      addLandscapeHeaderField(
        "Local → SEK",
        getExportRateLabel(budget.reportingExchangeRateSekId),
        secondLabelRow,
        secondValueRow,
        7,
        8,
      );

      addLandscapeHeaderField(
        "Local → EUR",
        getExportRateLabel(budget.reportingExchangeRateEurId),
        secondLabelRow,
        secondValueRow,
        9,
        10,
      );

      worksheet.getRow(secondLabelRow).height = 24;
      worksheet.getRow(secondValueRow).height = 48;

      currentRow += 3;

      worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "Cost Details";
      styleExcelSection(worksheet.getCell(`A${currentRow}`));
      currentRow += 1;

      const columnHeaders = [
        "Description",
        "Type",
        "Category",
        "Units",
        "Unit Price",
        "% Charged",
        "Local",
        "SEK",
        "GBP",
        "EUR",
      ];

      const amountKeys = [
        "amountLocalCurrency",
        "amountReportingCurrency",
        "amountGBP",
        "amountEuro",
      ];

      const grandTotals = {
        local: 0,
        sek: 0,
        gbp: 0,
        eur: 0,
      };

      const sortedTypeEntries = Object.entries(groupedCostDetails).sort(
        ([typeIdA], [typeIdB]) =>
          getCostTypeName(typeIdA).localeCompare(getCostTypeName(typeIdB)),
      );

      if (sortedTypeEntries.length === 0) {
        worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value =
          "There are no cost details for this budget.";

        worksheet.getCell(`A${currentRow}`).font = {
          italic: true,
          color: { argb: "FF6B7280" },
        };

        worksheet.getCell(`A${currentRow}`).alignment = {
          vertical: "middle",
          horizontal: "left",
        };
      } else {
        sortedTypeEntries.forEach(([typeId, categoryGroups]) => {
          const typeName = getCostTypeName(typeId);

          worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
          const typeCell = worksheet.getCell(`A${currentRow}`);
          typeCell.value = typeName;
          typeCell.font = {
            bold: true,
            size: 13,
            color: { argb: excelColors.white },
          };
          typeCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" },
          };
          typeCell.alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          currentRow += 1;

          const typeTotals = {
            local: 0,
            sek: 0,
            gbp: 0,
            eur: 0,
          };

          const sortedCategoryEntries = Object.entries(categoryGroups).sort(
            ([categoryIdA], [categoryIdB]) =>
              getCostCategoryName(categoryIdA).localeCompare(
                getCostCategoryName(categoryIdB),
              ),
          );

          sortedCategoryEntries.forEach(([categoryId, categoryItems]) => {
            const categoryName = getCostCategoryName(categoryId);

            worksheet.mergeCells(`A${currentRow}:J${currentRow}`);

            const categoryCell = worksheet.getCell(`A${currentRow}`);

            categoryCell.value = categoryName;
            categoryCell.font = {
              bold: true,
              size: 11,
              color: { argb: excelColors.text },
            };

            categoryCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: excelColors.lightBlue },
            };

            categoryCell.alignment = {
              vertical: "middle",
              horizontal: "left",
            };

            currentRow += 1;

            const headerRow = worksheet.getRow(currentRow);

            columnHeaders.forEach((header, index) => {
              headerRow.getCell(index + 1).value = header;
            });

            styleExcelTableHeader(headerRow);
            currentRow += 1;

            const categoryTotals = {
              local: 0,
              sek: 0,
              gbp: 0,
              eur: 0,
            };

            categoryItems.forEach((item, index) => {
              const row = worksheet.getRow(currentRow);

              row.values = [
                safeExcelValue(item.costDescription),
                typeName,
                categoryName,
                toExcelNumber(item.noOfUnits),
                toExcelNumber(item.unitPrice),
                toExcelNumber(item.percentageCharging),
                toExcelNumber(item.amountLocalCurrency),
                toExcelNumber(item.amountReportingCurrency),
                toExcelNumber(item.amountGBP),
                toExcelNumber(item.amountEuro),
              ];

              styleExcelDataRow(row, index);

              /*
               * Numeric columns:
               * D = units, E = unit price, F = percentage,
               * G:J = calculated amounts.
               */
              for (let column = 4; column <= 10; column += 1) {
                row.getCell(column).numFmt = "#,##0.000";
              }

              row.getCell(6).numFmt = '0.000"%"';

              categoryTotals.local += toExcelNumber(item[amountKeys[0]]);
              categoryTotals.sek += toExcelNumber(item[amountKeys[1]]);
              categoryTotals.gbp += toExcelNumber(item[amountKeys[2]]);
              categoryTotals.eur += toExcelNumber(item[amountKeys[3]]);

              currentRow += 1;
            });

            const categoryTotalRow = worksheet.getRow(currentRow);

            categoryTotalRow.values = [
              `Total (Category): ${categoryName}`,
              "",
              "",
              "",
              "",
              "",
              Number(categoryTotals.local.toFixed(3)),
              Number(categoryTotals.sek.toFixed(3)),
              Number(categoryTotals.gbp.toFixed(3)),
              Number(categoryTotals.eur.toFixed(3)),
            ];

            styleExcelTotalRow(categoryTotalRow, excelColors.paleYellow);

            for (let column = 7; column <= 10; column += 1) {
              categoryTotalRow.getCell(column).numFmt = "#,##0.000";
            }

            typeTotals.local += categoryTotals.local;
            typeTotals.sek += categoryTotals.sek;
            typeTotals.gbp += categoryTotals.gbp;
            typeTotals.eur += categoryTotals.eur;

            grandTotals.local += categoryTotals.local;
            grandTotals.sek += categoryTotals.sek;
            grandTotals.gbp += categoryTotals.gbp;
            grandTotals.eur += categoryTotals.eur;

            currentRow += 2;
          });

          const typeTotalRow = worksheet.getRow(currentRow);

          typeTotalRow.values = [
            `Total (Type): ${typeName}`,
            "",
            "",
            "",
            "",
            "",
            Number(typeTotals.local.toFixed(3)),
            Number(typeTotals.sek.toFixed(3)),
            Number(typeTotals.gbp.toFixed(3)),
            Number(typeTotals.eur.toFixed(3)),
          ];

          styleExcelTotalRow(typeTotalRow, excelColors.paleGreen);

          for (let column = 7; column <= 10; column += 1) {
            typeTotalRow.getCell(column).numFmt = "#,##0.000";
          }

          currentRow += 2;
        });

        const grandTotalRow = worksheet.getRow(currentRow);

        grandTotalRow.values = [
          "Grand Total",
          "",
          "",
          "",
          "",
          "",
          Number(grandTotals.local.toFixed(3)),
          Number(grandTotals.sek.toFixed(3)),
          Number(grandTotals.gbp.toFixed(3)),
          Number(grandTotals.eur.toFixed(3)),
        ];

        styleExcelTotalRow(grandTotalRow, excelColors.mediumBlue);

        grandTotalRow.eachCell((cell) => {
          cell.font = {
            bold: true,
            color: { argb: excelColors.white },
          };
        });

        for (let column = 7; column <= 10; column += 1) {
          grandTotalRow.getCell(column).numFmt = "#,##0.000";
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");

      /*
       * Keep the downloaded file name intentionally short.
       *
       * Example:
       * Budget_12_Emergency_Food_Assistance.xlsx
       *
       * The budget ID is always included. The description is optional and is
       * shortened to 40 characters so a long description cannot create an
       * excessively long Windows file path.
       */
      const shortBudgetDescription = sanitizeExcelFilename(
        budget.budgetDescription || "",
        40,
      );

      const filenameParts = [
        `Budget_${budget.id}`,
        shortBudgetDescription !== "budget" ? shortBudgetDescription : "",
      ].filter(Boolean);

      downloadLink.href = downloadUrl;
      downloadLink.download = `${filenameParts.join("_")}.xlsx`;

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
      console.error("Failed to export budget:", error);
      setFormError(
        error?.message || "Failed to export the selected budget to Excel.",
      );
    } finally {
      setExportingBudget(false);
    }
  };

  // 💾 Save/Update Budget
  const handleSave = async () => {
    if (!canEditBudget) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      // ❗ Frontend validation
      const newFieldErrors = {};

      if (
        budget.totalAmount === "" ||
        budget.totalAmount == null ||
        Number(budget.totalAmount) <= 0
      ) {
        newFieldErrors.totalAmount = "Total amount must be greater than zero.";
      }

      if (!budget.localCurrencyId) {
        newFieldErrors.localCurrencyId = "Local currency is required.";
      }

      const validLocalToGbpIds = new Set(
        localToGbpRates.map((r) => Number(r.id)),
      );
      const validLocalToSekIds = new Set(
        localToSekRates.map((r) => Number(r.id)),
      );
      const validLocalToEurIds = new Set(
        localToEurRates.map((r) => Number(r.id)),
      );

      const localToGbpIdNum =
        budget.localExchangeRateToGbpId == null ||
        budget.localExchangeRateToGbpId === ""
          ? null
          : Number(budget.localExchangeRateToGbpId);

      const sekRateIdNum =
        budget.reportingExchangeRateSekId == null ||
        budget.reportingExchangeRateSekId === ""
          ? null
          : Number(budget.reportingExchangeRateSekId);

      const eurRateIdNum =
        budget.reportingExchangeRateEurId == null ||
        budget.reportingExchangeRateEurId === ""
          ? null
          : Number(budget.reportingExchangeRateEurId);

      if (!localToGbpIdNum || !validLocalToGbpIds.has(localToGbpIdNum)) {
        newFieldErrors.localExchangeRateToGbpId =
          "Local → GBP exchange rate is required for the selected local currency.";
      }

      if (!sekRateIdNum || !validLocalToSekIds.has(sekRateIdNum)) {
        newFieldErrors.reportingExchangeRateSekId =
          "SEK exchange rate is required for the selected local currency.";
      }

      if (!eurRateIdNum || !validLocalToEurIds.has(eurRateIdNum)) {
        newFieldErrors.reportingExchangeRateEurId =
          "EUR exchange rate is required for the selected local currency.";
      }

      if (Object.keys(newFieldErrors).length > 0) {
        setFieldErrors(newFieldErrors);
        setFormError("Please correct the highlighted fields and try again.");
        return;
      }

      setFormError("");
      setFieldErrors({});

      const payload = {
        id: budget.id,
        projectId: budget.projectId,
        budgetDescription: budget.budgetDescription ?? "",
        budgetPreparationDate: budget.budgetPreparationDate ?? null,
        totalAmount:
          budget.totalAmount === "" || budget.totalAmount == null
            ? null
            : Number(budget.totalAmount),

        localCurrencyId:
          budget.localCurrencyId === "" || budget.localCurrencyId == null
            ? null
            : Number(budget.localCurrencyId),

        reportingCurrencySekId:
          budget.reportingCurrencySekId === "" ||
          budget.reportingCurrencySekId == null
            ? null
            : Number(budget.reportingCurrencySekId),

        reportingCurrencyEurId:
          budget.reportingCurrencyEurId === "" ||
          budget.reportingCurrencyEurId == null
            ? null
            : Number(budget.reportingCurrencyEurId),

        localExchangeRateToGbpId: localToGbpIdNum,
        reportingExchangeRateSekId: sekRateIdNum,
        reportingExchangeRateEurId: eurRateIdNum,
      };

      const response = await fetch(`${BASE_URL}/api/budgets/${budget.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let data = null;
        const text = await response.text().catch(() => "");

        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn("Failed to parse budget error JSON:", parseErr);
        }

        if (data) {
          if (data.fieldErrors) setFieldErrors(data.fieldErrors);
          setFormError(
            data.message || "There was a problem updating the budget.",
          );
        } else {
          setFormError("There was a problem updating the budget.");
        }
        return;
      }

      const updated = await response.json();
      setBudget(updated);
      onUpdate?.(updated);

      const freshRates = await fetchExchangeRates(token);
      setExchangeRates(Array.isArray(freshRates) ? freshRates : []);
      triggerRefreshCostDetails();

      setFormError("");
      setFieldErrors({});
      alert("Budget updated successfully!");
    } catch (error) {
      console.error("Error updating budget:", error);
      setFormError("Unexpected error while saving budget.");
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Delete Budget
  const handleDelete = async () => {
    if (!canDeleteBudget) return;
    if (!window.confirm("Are you sure you want to delete this budget?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${BASE_URL}/api/budgets/${budget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete budget");

      alert("Budget deleted successfully!");
      onDelete?.(budget.id);
      setBudget({});
    } catch (error) {
      console.error("Error deleting budget:", error);
      alert("Error deleting budget.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const numericFields = [
      "totalAmount",
      "localCurrencyId",
      "localExchangeRateToGbpId",
      "reportingCurrencySekId",
      "reportingCurrencyEurId",
      "reportingExchangeRateSekId",
      "reportingExchangeRateEurId",
    ];

    const castValue = numericFields.includes(name)
      ? value === ""
        ? ""
        : Number(value)
      : value;

    if (name === "localCurrencyId") {
      setBudget((prev) => ({
        ...prev,
        localCurrencyId: castValue,
        localExchangeRateToGbpId: "",
        reportingExchangeRateSekId: "",
        reportingExchangeRateEurId: "",
      }));

      setFieldErrors((prev) => ({
        ...prev,
        localExchangeRateToGbpId: undefined,
        reportingExchangeRateSekId: undefined,
        reportingExchangeRateEurId: undefined,
      }));
      return;
    }

    setBudget((prev) => ({ ...prev, [name]: castValue }));
  };

  const hasBudget = Boolean(budget?.id);

  return (
    <div className={styles.budgetContainer}>
      {!hasBudget && (
        <div className={styles.emptyState}>
          <FiAlertCircle />
          <div>
            <h3 style={{ margin: 0 }}>No budget selected</h3>
            <p style={{ margin: 0, color: "#666" }}>
              Create a budget to manage currencies and exchange rates.
            </p>
          </div>
        </div>
      )}

      {hasBudget && (
        <div className={styles.formContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderText}>
              <h3 className={styles.pageTitle}>Budget Details</h3>
              <p className={styles.pageSubtitle}>
                Update description, totals, currencies, and exchange rates.
              </p>
            </div>

            {/* ✅ Removed duplicate Save/Delete buttons from the top header */}
          </div>

          {formError && (
            <div className={styles.errorBanner}>
              <FiAlertCircle />
              <span>{formError}</span>
            </div>
          )}

          {loading ? (
            <div className={styles.skeletonWrap}>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineShort} />
            </div>
          ) : (
            <>
              <fieldset
                disabled={!canEditBudget}
                style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
              >
              <div className={styles.grid}>
                {/* Left card */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>Summary</div>
                    <div className={styles.cardMeta}>Description & totals</div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Description:</label>
                    <textarea
                      name="budgetDescription"
                      className={styles.textareaInput}
                      value={budget.budgetDescription || ""}
                      onChange={handleChange}
                      placeholder="Write a short note about this budget..."
                    />
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.formGroup}>
                      <label>Preparation Date:</label>
                      <input
                        type="datetime-local"
                        name="budgetPreparationDate"
                        className={styles.textInput}
                        value={formatDate(budget.budgetPreparationDate)}
                        onChange={handleChange}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Total Amount:</label>
                      <input
                        type="number"
                        name="totalAmount"
                        className={inputClass("totalAmount")}
                        value={budget.totalAmount || ""}
                        onChange={handleChange}
                      />
                      {getFieldError("totalAmount") && (
                        <div className={styles.fieldError}>
                          {getFieldError("totalAmount")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right card */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>Currencies & rates</div>
                    <div className={styles.cardMeta}>Local + reporting</div>
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.formGroup}>
                      <label>Local Currency:</label>
                      <select
                        name="localCurrencyId"
                        className={inputClass("localCurrencyId")}
                        value={budget.localCurrencyId || ""}
                        onChange={handleChange}
                      >
                        <option value="">Select currency</option>
                        {currencies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {getFieldError("localCurrencyId") && (
                        <div className={styles.fieldError}>
                          {getFieldError("localCurrencyId")}
                        </div>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label>Local → GBP Rate:</label>
                      <select
                        name="localExchangeRateToGbpId"
                        className={inputClass("localExchangeRateToGbpId")}
                        value={budget.localExchangeRateToGbpId || ""}
                        onChange={handleChange}
                      >
                        <option value="">Select rate</option>
                        {localToGbpRates.map((r) => (
                          <option key={r.id} value={r.id}>
                            {formatRateLabel(r)}
                          </option>
                        ))}
                      </select>
                      {getFieldError("localExchangeRateToGbpId") && (
                        <div className={styles.fieldError}>
                          {getFieldError("localExchangeRateToGbpId")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.formGroup}>
                      <label>Reporting currency (SEK):</label>
                      <input
                        type="text"
                        className={styles.textInput}
                        value={sekName}
                        readOnly
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>SEK Exchange Rate (Local → SEK):</label>
                      <select
                        name="reportingExchangeRateSekId"
                        className={inputClass("reportingExchangeRateSekId")}
                        value={budget.reportingExchangeRateSekId || ""}
                        onChange={handleChange}
                      >
                        <option value="">Select rate</option>
                        {localToSekRates.map((r) => (
                          <option key={r.id} value={r.id}>
                            {formatRateLabel(r)}
                          </option>
                        ))}
                      </select>
                      {getFieldError("reportingExchangeRateSekId") && (
                        <div className={styles.fieldError}>
                          {getFieldError("reportingExchangeRateSekId")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.formGroup}>
                      <label>Reporting currency (EUR):</label>
                      <input
                        type="text"
                        className={styles.textInput}
                        value={eurName}
                        readOnly
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>EUR Exchange Rate (Local → EUR):</label>
                      <select
                        name="reportingExchangeRateEurId"
                        className={inputClass("reportingExchangeRateEurId")}
                        value={budget.reportingExchangeRateEurId || ""}
                        onChange={handleChange}
                      >
                        <option value="">Select rate</option>
                        {localToEurRates.map((r) => (
                          <option key={r.id} value={r.id}>
                            {formatRateLabel(r)}
                          </option>
                        ))}
                      </select>
                      {getFieldError("reportingExchangeRateEurId") && (
                        <div className={styles.fieldError}>
                          {getFieldError("reportingExchangeRateEurId")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </fieldset>

              <div className={styles.bottomActions}>
                <button
                  type="button"
                  onClick={handleExportBudget}
                  className={styles.exportButton}
                  disabled={loading || exportingBudget}
                >
                  <FiDownload />
                  {exportingBudget ? "Exporting..." : "Export to Excel"}
                </button>

                {canEditBudget && <button
                  type="button"
                  onClick={handleSave}
                  className={styles.saveButton}
                  disabled={loading || exportingBudget}
                >
                  <FiSave />
                  Save changes
                </button>}
                {canDeleteBudget && <button
                  type="button"
                  onClick={handleDelete}
                  className={styles.deleteButton}
                  disabled={loading || exportingBudget}
                >
                  <FiTrash2 />
                  Delete budget
                </button>}
              </div>
            </>
          )}
        </div>
      )}

      {budget?.id && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Cost details</div>
            <div className={styles.cardMeta}>Breakdown</div>
          </div>

          <CostDetails
            budgetId={budget.id}
            refreshTrigger={refreshCostDetailsTrigger}
            budget={budget}
            exchangeRates={exchangeRates}
          />
        </div>
      )}
    </div>
  );
};

export default Budget;
