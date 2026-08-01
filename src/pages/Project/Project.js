// Project.jsx
import React, { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";

import styles from "./Project.module.scss";
import Memos from "../Project/Memos/Memos.jsx";

import { ProjectContext } from "../../context/ProjectContext";

// ✅ Use ImageZoomModal again
import ImageZoomModal from "./ImageZoomModal/ImageZoomModal.jsx";

import {
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiSave,
  FiPlus,
  FiUploadCloud,
  FiImage,
  FiAlertCircle,
  FiDownload,
} from "react-icons/fi";

import { BASE_URL, ASSETS_URL } from "../../config/api";
const coverImagePath = `${ASSETS_URL}/images/projects/`;

// ✅ caption delimiter (must match backend)
const CAPTION_DELIM = "|||";

const Project = () => {
  const navigate = useNavigate();

  const excelColors = {
    darkBlue: "1F4E78",
    mediumBlue: "5B9BD5",
    lightBlue: "D9EAF7",
    lightGray: "F3F4F6",
    borderGray: "D1D5DB",
    white: "FFFFFF",
    text: "1F2937",
  };

  const safeExcelValue = (value) => {
    if (value == null || value === undefined || value === "") {
      return "Not specified";
    }
    return value;
  };

  const formatExcelDate = (value) => {
    //checks whether value is falsy.
    if (!value) return "Not specified";

    const date = new Date(value);

    //date.getTime() returns the date as the number of milliseconds since January 1, 1970.
    //valid date example: 1785141000000
    //invalid date example: new Date("hello").getTime() retuns NaN not a number
    //formatExcelDate("Unknown date") returns  Unknown date
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    //If the date is valid, it is formatted as a readable string.
    return date.toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sanitizeExcelFilename = (value) => {
    const cleaned = String(value || "project")
      .trim()
      //character class: [<>:"/\\|?*]
      .replace(/[<>:"/\\|?*\s]+/g, "_")
      .replace(/^_+|_+$/g, "");

    return cleaned || "project";
  };

  //cell is an object provided by ExcelJS. It represents one Excel cell.
  /*
  we are doing this: 
      const fontSettings = {
      bold: true,
      size: 18,
      color: {
        argb: excelColors.white,
      },
    };

    cell.font = fontSettings;
  */
  //receives one ExcelJS cell object: cell
  /*
  Example:
  const titleCell = worksheet.getCell("A1");
  applyTitleStyle(titleCell);


  How the title will look

The title cell will look approximately like this:

┌────────────────────────────────────────┐
│ PROJECT REPORT                         │
└────────────────────────────────────────┘

  With:

  dark-blue background;
  white text;
  bold font;
  18-point font;
  left alignment;
  vertical centering.
  */
  const applyTitleStyle = (cell) => {
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

  /*
  How the section heading will look

Approximately:

  ┌────────────────────────────────────────┐
  │ Project Information                    │
  └────────────────────────────────────────┘

  With:

  medium-blue background;
  white bold text;
  12-point font;
  left alignment;
  vertical centering.
  */
  const applySectionStyle = (cell) => {
    cell.font = {
      bold: true,
      size: 12,
      color: { argb: excelColors.white },
    };

    //sets the background fill of the cell.
    //fill should be one solid color rather than stripes, dots, gradients, or another pattern
    //fgColor means foreground color.
    //With a solid pattern, this is effectively the cell background color.
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: excelColors.mediumBlue },
    };

    //This controls how the text is positioned inside the cell.
    cell.alignment = {
      vertical: "middle",
      horizontal: "left",
    };
  };

  //This creates a helper that styles an entire Excel row rather than one cell.
  /*
    const headerRow = worksheet.addRow([
    "Name",
    "Status",
    "Amount",
    "Created",
  ]);

  applyTableHeaderStyle(headerRow);

  Each header cell gets a solid dark-blue background.

  So the entire header row appears as one dark-blue band.

  How the table header will look

Approximately:

  ┌──────────────┬──────────────┬──────────────┐
  │ Name         │ Status       │ Amount       │
  └──────────────┴──────────────┴──────────────┘

  With:

  dark-blue background;
  white bold text;
  left alignment;
  vertical centering;
  wrapped long headings;
  thin gray borders around every cell
  */
  const applyTableHeaderStyle = (row) => {
    //row.eachCell() is an ExcelJS method.
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
    });
  };

  const applyDataRowStyle = (row, index) => {
    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "top",
        horizontal: "left",
        wrapText: true,
      };

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

      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: excelColors.lightGray },
        };
      }
    });
  };

  //takes in id and returns readable status
  const getProjectStatusLabel = (id) => {
    const status = (projectStatuses || []).find(
      (item) => String(item.id) === String(id),
    );

    return status?.statusName || (id ? `Status ${id}` : "Not specified");
  };

  const getProjectTypeLabel = (id) => {
    const type = (projectTypes || []).find(
      (item) => String(item.id) === String(id),
    );

    return type?.projectTypeName || (id ? `Type ${id}` : "Not specified");
  };

  const getAddressLabel = (id) => {
    const address = (addresses || []).find(
      (item) => String(item.id) === String(id),
    );

    if (!address) {
      return id ? `Address ${id}` : "Not specified";
    }

    const cityLine = [address.postalCode, address.city, address.state]
      //.filter(Boolean) removes empty values such as:  state: ""
      .filter(Boolean)
      .join(" ");

    return [address.street, cityLine, address.country]
      .filter(Boolean)
      .join(", ");
  };

  const getParentProjectLabel = (id) => {
    if (!id) return "Not specified";

    const allProjects = [
      ...(Array.isArray(projects) ? projects : []),
      ...(Array.isArray(availableParentProjects)
        ? availableParentProjects
        : []),
    ];

    const parentProject = allProjects.find(
      (project) => String(project.id) === String(id),
    );

    if (!parentProject) return `Project ${id}`;

    const parentCode = parentProject.projectCode || "";
    const parentName = parentProject.projectName || parentProject.name || "";
    const parentLabel = [parentCode, parentName].filter(Boolean).join(" — ");

    return parentLabel || `Project ${id}`;
  };

  const addWorksheetTitle = (worksheet, title, subtitle, lastColumn) => {
    //lastColumn combines into one large cell, example: A1  B1  C1  D1  E1  F1  G1  H1. From A to H:
    // worksheet.mergeCells("A1:H1");
    //lastColumn = The final column across which the title should stretch.
    /*
           A       B       C       D       E       F       G       H
    ┌───────────────────────────────────────────────────────────────┐
1   │                       Project Report                          │
    ├───────────────────────────────────────────────────────────────┤
2   │ Generated on 31 July 2026                                    │
    ├───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┤
3   │ A3    │ B3    │ C3    │ D3    │ E3    │ F3    │ G3    │ H3    │
    └───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┘
    */
    worksheet.mergeCells(`A1:${lastColumn}1`);

    //Because A1:H1 has been merged, the title appears across that entire merged area.
    worksheet.getCell("A1").value = title;

    applyTitleStyle(worksheet.getCell("A1"));

    //getRow(1) retrieves the ExcelJS row object for row 1.
    worksheet.getRow(1).height = 28;

    //same for: A2  B2  C2  D2  E2  F2  G2  H2
    worksheet.mergeCells(`A2:${lastColumn}2`);

    //Because A2:H2 is merged, the value appears across the merged subtitle area.
    worksheet.getCell("A2").value = subtitle;

    worksheet.getCell("A2").font = {
      italic: true,
      color: { argb: "6B7280" },
    };

    worksheet.getCell("A2").alignment = {
      vertical: "middle",
      horizontal: "left",
    };

    /*
    That creates a visual hierarchy:

    Larger row for the main title
    Smaller row for the subtitle
    */
    worksheet.getRow(2).height = 22;
  };

  const handleExportProject = async () => {
    if (!projectDetails?.id) {
      setFormError("Please select a project before exporting.");
      return;
    }

    try {
      setExportingProject(true);
      setFormError("");

      // The workbook represents the entire Excel file.
      const workbook = new ExcelJS.Workbook();

      // Workbook metadata.
      workbook.creator = "Relief Projects";
      workbook.lastModifiedBy = "Relief Projects";

      // Sets the workbook's creation date to the current date and time.
      workbook.created = new Date();

      // Sets the workbook's last-modified date to the current date and time.
      workbook.modified = new Date();

      workbook.title = projectDetails.projectName || "Project Export";

      workbook.subject = `Project export: ${projectDetails.projectName || ""}`;

      // =====================================================
      // SHEET 1: COMPLETE PROJECT REPORT
      // =====================================================

      // Adds a worksheet to the workbook. Its Excel tab is named
      // "Complete Project Report".
      //
      // workbook
      // └── reportSheet
      //     └── "Complete Project Report"
      //
      // ExcelJS allows worksheet configuration to be passed as the
      // second argument to addWorksheet().
      const reportSheet = workbook.addWorksheet("Complete Project Report", {
        // The views property controls how the worksheet is displayed
        // when it is opened.
        views: [
          {
            // Frozen rows remain visible while the user scrolls.
            state: "frozen",

            // Freeze the first two rows:
            // Rows 1 and 2 remain visible.
            // Rows 3 onward scroll normally.
            ySplit: 2,
          },
        ],

        properties: {
          // Give worksheet rows a default height of 20.
          defaultRowHeight: 20,
        },

        // Print and page configuration. This controls how the worksheet
        // is laid out when printed or viewed in print-related modes.
        pageSetup: {
          // Portrait is taller than it is wide.
          orientation: "portrait",

          // Enable fit-to-page printing so Excel scales the sheet using
          // the width and height limits below.
          fitToPage: true,

          // Fit all columns onto one printed page horizontally.
          // Width: one page. Height: as many pages as necessary.
          fitToWidth: 1,

          // Allow the worksheet to use as many vertical pages as needed.
          fitToHeight: 0,

          // ExcelJS paper-size code 9 represents A4 paper.
          paperSize: 9,
        },
      });

      /*
       * At this point, reportSheet is a newly created ExcelJS worksheet with:
       * - the name "Complete Project Report";
       * - two frozen rows;
       * - a default row height of 20;
       * - portrait A4 printing;
       * - fit-to-page settings.
       */

      // Each object in this array describes one worksheet column.
      // Because there are four objects, columns A through D are configured.
      reportSheet.columns = [
        // Column A: narrow column. The key is a programmatic identifier
        // that can be used when adding object-based rows.
        { key: "columnA", width: 8 },

        // The second object represents Excel column B.
        { key: "columnB", width: 31 },

        // Column C is the widest of the four columns.
        { key: "columnC", width: 42 },

        // Column D has a medium width.
        { key: "columnD", width: 26 },
      ];

      /*
       * ExcelJS matches object properties to the configured column keys:
       *
       * reportSheet.addRow({
       *   columnA: "1",
       *   columnB: "Project Name",
       *   columnC: projectDetails.projectName,
       *   columnD: "Active",
       * });
       *
       * columnA -> Excel column A
       * columnB -> Excel column B
       * columnC -> Excel column C
       * columnD -> Excel column D
       *
       * Column widths:
       * A: 8, B: 31, C: 42, D: 26
       */

      addWorksheetTitle(
        reportSheet,
        projectDetails.projectName || "Project Report",
        `Project code: ${
          projectDetails.projectCode || "Not specified"
        } | Exported: ${new Date().toLocaleString("sv-SE")}`,
        "D",
      );

      // Start at row 4 because:
      // Row 1: title
      // Row 2: subtitle
      // Row 3: spacing
      // Row 4: first report section
      let currentRow = 4;

      // Adds a full-width section heading at the current row.
      // This inner helper can directly access reportSheet and currentRow
      // from the surrounding handleExportProject function.
      const addReportSection = (sectionName) => {
        reportSheet.mergeCells(`A${currentRow}:D${currentRow}`);

        const cell = reportSheet.getCell(`A${currentRow}`);

        cell.value = sectionName;
        applySectionStyle(cell);

        reportSheet.getRow(currentRow).height = 22;

        // Move the row pointer down so the next item is written
        // to the following row.
        currentRow += 1;
      };

      // Adds one label/value row. Column A contains the label, while
      // columns B through D are merged into one wider value area.
      const addReportField = (label, value) => {
        reportSheet.mergeCells(`B${currentRow}:D${currentRow}`);

        const labelCell = reportSheet.getCell(`A${currentRow}`);

        const valueCell = reportSheet.getCell(`B${currentRow}`);

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

        [labelCell, valueCell].forEach((cell) => {
          cell.alignment = {
            vertical: "top",
            horizontal: "left",
            wrapText: true,
          };

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
        });

        currentRow += 1;
      };

      // Adds a table at the current row, styles its header and data rows,
      // and leaves one blank row after the table.
      const addReportTable = (headers, rows) => {
        const headerRow = reportSheet.getRow(currentRow);

        headers.forEach((header, index) => {
          headerRow.getCell(index + 1).value = header;
        });

        applyTableHeaderStyle(headerRow);
        currentRow += 1;

        rows.forEach((values, index) => {
          const row = reportSheet.getRow(currentRow);

          values.forEach((value, cellIndex) => {
            row.getCell(cellIndex + 1).value = safeExcelValue(value);
          });

          applyDataRowStyle(row, index);
          currentRow += 1;
        });

        currentRow += 1;
      };

      // ------------------------
      // Basic information
      // ------------------------

      addReportSection("Basic Information");

      addReportField("Project ID", projectDetails.id);
      addReportField("Project Code", projectDetails.projectCode);

      addReportField("Reference Number", projectDetails.refProjectNo);

      addReportField("Project Name", projectDetails.projectName);

      addReportField("Funding Source", projectDetails.fundingSource);

      addReportField(
        "Project Status",
        getProjectStatusLabel(projectDetails.projectStatusId),
      );

      addReportField(
        "Project Type",
        getProjectTypeLabel(projectDetails.projectTypeId),
      );

      addReportField(
        "Parent Project",
        getParentProjectLabel(projectDetails.partOfId),
      );

      addReportField("Address", getAddressLabel(projectDetails.addressId));

      addReportField("Approved", projectDetails.approved);

      // ------------------------
      // Dates
      // ------------------------

      addReportSection("Project Period");

      addReportField(
        "Project Date",
        formatExcelDate(projectDetails.projectDate),
      );

      addReportField(
        "Project Start",
        formatExcelDate(projectDetails.projectStart),
      );

      addReportField("Project End", formatExcelDate(projectDetails.projectEnd));

      addReportField(
        "Revised Start",
        formatExcelDate(projectDetails.projectStartRev),
      );

      addReportField(
        "Revised End",
        formatExcelDate(projectDetails.projectEndRev),
      );

      addReportField("Period in Months", projectDetails.projectPeriodMonths);

      // ------------------------
      // Costs
      // ------------------------

      addReportSection("Support Costs");

      addReportField(
        "FO Support Cost",
        projectDetails.foSupportCostPercent !== null &&
          projectDetails.foSupportCostPercent !== undefined
          ? `${projectDetails.foSupportCostPercent}%`
          : null,
      );

      addReportField(
        "Own organization Support Cost",
        projectDetails.irwSupportCostPercent !== null &&
          projectDetails.irwSupportCostPercent !== undefined
          ? `${projectDetails.irwSupportCostPercent}%`
          : null,
      );

      // ------------------------
      // Description
      // ------------------------

      addReportSection("Project Description");

      const descriptionRow = currentRow;

      addReportField("Description", projectDetails.projectDescription);

      reportSheet.getRow(descriptionRow).height = 80;

      /*
       * PIN code is deliberately excluded because downloaded
       * spreadsheets can be forwarded or stored outside the system.
       *
       * Uncomment this when you explicitly want it included:
       */
      // addReportField("PIN Code", projectDetails.pinCode);

      // ------------------------
      // Sectors in main report
      // ------------------------

      addReportSection("Sectors");

      const reportSectorRows =
        selectedSectorIds.length > 0
          ? selectedSectorIds.map((sectorId, index) => [
              index + 1,
              getSectorLabel(sectorId),
              sectorId,
              "",
            ])
          : [["", "No sectors assigned", "", ""]];

      addReportTable(["Number", "Sector", "Sector ID", ""], reportSectorRows);

      // ------------------------
      // Organizations in report
      // ------------------------

      addReportSection("Related Organizations");

      const reportOrganizationRows =
        projectOrganizations.length > 0
          ? projectOrganizations.map((organization, index) => [
              index + 1,
              getOrgLabel(organization.organizationId),
              getOrgStatusLabel(organization.organizationStatusId),
              organization.organizationId,
            ])
          : [["", "No related organizations", "", ""]];

      addReportTable(
        ["Number", "Organization", "Organization Status", "Organization ID"],
        reportOrganizationRows,
      );

      // ------------------------
      // Participants in report
      // ------------------------

      addReportSection("Project Participants");

      const reportParticipantRows =
        projectParticipants.length > 0
          ? projectParticipants.map((participant, index) => [
              index + 1,
              getEmployeeLabel(participant.employeeId),
              getPositionLabel(participant.positionId),
              participant.employeeId,
            ])
          : [["", "No participants added", "", ""]];

      addReportTable(
        ["Number", "Participant", "Position", "Employee ID"],
        reportParticipantRows,
      );

      // ------------------------
      // Images in report
      // ------------------------

      addReportSection("Project Images");

      const reportImageRows =
        imageNames.length > 0
          ? imageNames.map((filename, index) => [
              index + 1,
              filename,
              imageCaptions[index] || "",
              `${coverImagePath}${filename}`,
            ])
          : [["", "No project images", "", ""]];

      const imageHeaderRow = reportSheet.getRow(currentRow);

      ["Number", "Filename", "Caption", "Image URL"].forEach(
        (header, index) => {
          imageHeaderRow.getCell(index + 1).value = header;
        },
      );

      applyTableHeaderStyle(imageHeaderRow);
      currentRow += 1;

      reportImageRows.forEach((values, index) => {
        const row = reportSheet.getRow(currentRow);

        values.forEach((value, cellIndex) => {
          row.getCell(cellIndex + 1).value = safeExcelValue(value);
        });

        const imageUrl = values[3];

        if (imageUrl) {
          const urlCell = row.getCell(4);

          urlCell.value = {
            text: imageUrl,
            hyperlink: imageUrl,
          };

          urlCell.font = {
            color: { argb: "0563C1" },
            underline: true,
          };
        }

        applyDataRowStyle(row, index);

        /*
         * applyDataRowStyle sets the standard font, so we restore
         * hyperlink styling after applying the row style.
         */
        if (imageUrl) {
          row.getCell(4).font = {
            color: { argb: "0563C1" },
            underline: true,
          };
        }

        currentRow += 1;
      });

      // =====================================================
      // SHEET 2: SECTORS
      // =====================================================

      const sectorSheet = workbook.addWorksheet("Sectors", {
        views: [
          {
            state: "frozen",
            ySplit: 3,
          },
        ],
      });

      sectorSheet.columns = [
        { key: "number", width: 12 },
        { key: "sector", width: 55 },
        { key: "sectorId", width: 18 },
      ];

      addWorksheetTitle(
        sectorSheet,
        "Project Sectors",
        projectDetails.projectName || "",
        "C",
      );

      const sectorHeader = sectorSheet.getRow(3);

      sectorHeader.values = ["Number", "Sector", "Sector ID"];

      applyTableHeaderStyle(sectorHeader);

      const sectorRows =
        selectedSectorIds.length > 0
          ? selectedSectorIds.map((sectorId, index) => ({
              number: index + 1,
              sector: getSectorLabel(sectorId),
              sectorId,
            }))
          : [
              {
                number: "",
                sector: "No sectors assigned",
                sectorId: "",
              },
            ];

      sectorRows.forEach((sector, index) => {
        const row = sectorSheet.addRow(sector);
        applyDataRowStyle(row, index);
      });

      sectorSheet.autoFilter = {
        from: "A3",
        to: "C3",
      };

      // =====================================================
      // SHEET 3: ORGANIZATIONS
      // =====================================================

      const organizationSheet = workbook.addWorksheet("Organizations", {
        views: [
          {
            state: "frozen",
            ySplit: 3,
          },
        ],
      });

      organizationSheet.columns = [
        { key: "number", width: 12 },
        { key: "organization", width: 45 },
        { key: "status", width: 30 },
        { key: "organizationId", width: 20 },
      ];

      addWorksheetTitle(
        organizationSheet,
        "Related Organizations",
        projectDetails.projectName || "",
        "D",
      );

      const organizationHeader = organizationSheet.getRow(3);

      organizationHeader.values = [
        "Number",
        "Organization",
        "Status",
        "Organization ID",
      ];

      applyTableHeaderStyle(organizationHeader);

      const organizationRows =
        projectOrganizations.length > 0
          ? projectOrganizations.map((organization, index) => ({
              number: index + 1,
              organization: getOrgLabel(organization.organizationId),
              status: getOrgStatusLabel(organization.organizationStatusId),
              organizationId: organization.organizationId,
            }))
          : [
              {
                number: "",
                organization: "No related organizations",
                status: "",
                organizationId: "",
              },
            ];

      organizationRows.forEach((organization, index) => {
        const row = organizationSheet.addRow(organization);

        applyDataRowStyle(row, index);
      });

      organizationSheet.autoFilter = {
        from: "A3",
        to: "D3",
      };

      // =====================================================
      // SHEET 4: PARTICIPANTS
      // =====================================================

      const participantSheet = workbook.addWorksheet("Participants", {
        views: [
          {
            state: "frozen",
            ySplit: 3,
          },
        ],
      });

      participantSheet.columns = [
        { key: "number", width: 12 },
        { key: "participant", width: 42 },
        { key: "position", width: 34 },
        { key: "employeeId", width: 18 },
      ];

      addWorksheetTitle(
        participantSheet,
        "Project Participants",
        projectDetails.projectName || "",
        "D",
      );

      const participantHeader = participantSheet.getRow(3);

      participantHeader.values = [
        "Number",
        "Participant",
        "Position",
        "Employee ID",
      ];

      applyTableHeaderStyle(participantHeader);

      const participantRows =
        projectParticipants.length > 0
          ? projectParticipants.map((participant, index) => ({
              number: index + 1,
              participant: getEmployeeLabel(participant.employeeId),
              position: getPositionLabel(participant.positionId),
              employeeId: participant.employeeId,
            }))
          : [
              {
                number: "",
                participant: "No participants added",
                position: "",
                employeeId: "",
              },
            ];

      participantRows.forEach((participant, index) => {
        const row = participantSheet.addRow(participant);

        applyDataRowStyle(row, index);
      });

      participantSheet.autoFilter = {
        from: "A3",
        to: "D3",
      };

      // =====================================================
      // GENERATE THE FILE
      // =====================================================

      // Convert the in-memory ExcelJS workbook into an XLSX buffer.
      const buffer = await workbook.xlsx.writeBuffer();

      // Wrap the generated buffer in a browser Blob with the correct
      // MIME type for an .xlsx file.
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Create a temporary browser URL pointing to the Blob.
      const downloadUrl = URL.createObjectURL(blob);

      // Create a temporary HTML anchor element that will start
      // the download when clicked.
      const downloadLink = document.createElement("a");

      // Use the project code first. Fall back to the project ID,
      // and finally to the generic word "project".
      const projectCode =
        projectDetails.projectCode || projectDetails.id || "project";

      const projectName = projectDetails.projectName || "project";

      downloadLink.href = downloadUrl;

      // Create a safe filename by removing or replacing characters
      // that are invalid in file names.
      downloadLink.download =
        `${sanitizeExcelFilename(projectCode)}_` +
        `${sanitizeExcelFilename(projectName)}.xlsx`;

      // Add the temporary link to the page, click it programmatically,
      // and remove it again.
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      // Release the temporary Blob URL because it is no longer needed.
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to export project:", error);

      setFormError("Failed to export the selected project to Excel.");
    } finally {
      // This runs whether the export succeeds or fails.
      setExportingProject(false);
    }
  };

  //Helper: fetch with auth + automatic 401 handling
  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("authToken");

    const mergedOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const res = await fetch(url, mergedOptions);

    if (res.status === 401) {
      localStorage.removeItem("authToken");
      navigate("/login");
      throw new Error("Unauthorized - redirecting to login");
    }

    return res;
  };

  // ✅ Safe JSON reader: handles 204 / empty body without crashing
  const safeReadJson = async (res) => {
    if (!res) return null;
    if (res.status === 204) return null;

    const text = await res.text().catch(() => "");
    if (!text || !text.trim()) return null;

    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn("safeReadJson: failed to parse JSON:", e);
      return null;
    }
  };

  const { selectedProjectId, setSelectedProjectId, projects, setProjects } =
    useContext(ProjectContext);

  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportingProject, setExportingProject] = useState(false);

  const [projectStatuses, setProjectStatuses] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [availableParentProjects, setAvailableParentProjects] = useState([]);

  // ✅ Sector-related state
  const [sectorOptions, setSectorOptions] = useState([]);
  const [selectedSectorIds, setSelectedSectorIds] = useState([]);
  const [currentProjectSectorLinks, setCurrentProjectSectorLinks] = useState(
    [],
  );

  // ✅ Cover image upload state
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // ✅ Slideshow state (for multiple images)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ✅ Related organizations state
  const [allOrganizationOptions, setAllOrganizationOptions] = useState([]);
  const [projectOrgOptions, setProjectOrgOptions] = useState([]);
  const [orgStatusOptions, setOrgStatusOptions] = useState([]);
  const [projectOrganizations, setProjectOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedOrgStatusId, setSelectedOrgStatusId] = useState("");

  // ✅ Participants (employee_project) state
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [positionOptions, setPositionOptions] = useState([]); // for displaying labels only
  const [projectParticipants, setProjectParticipants] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [participantError, setParticipantError] = useState("");

  // ✅ form-level + field-level error state
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const getFieldError = (fieldName) => fieldErrors?.[fieldName];
  const hasError = (fieldName) => Boolean(fieldErrors?.[fieldName]);

  const inputClass = (fieldName) =>
    `${styles.textInput} ${hasError(fieldName) ? styles.inputError : ""}`;

  // =========================
  // ✅ CAPTION SYNC HELPERS
  // =========================
  const parseCaptions = (raw) => {
    if (raw == null) return [];
    const str = String(raw);
    if (!str.length) return [];
    return str.split(CAPTION_DELIM).map((s) => s ?? "");
  };

  const buildCaptionString = (arr) => (arr || []).join(CAPTION_DELIM);

  const parseImages = (project) => {
    const raw = project?.projectCoverImage;
    return raw
      ? String(raw)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  };

  const normalizeProjectCaptions = (project) => {
    if (!project) return project;

    const imgs = parseImages(project);
    const caps = parseCaptions(project.projectCoverImageCaption);

    while (caps.length < imgs.length) caps.push("");
    if (caps.length > imgs.length) caps.length = imgs.length;

    return {
      ...project,
      projectCoverImageCaption: buildCaptionString(caps),
    };
  };

  // 🔍 Derive image list from comma-separated string
  const imageNames = useMemo(() => {
    return projectDetails?.projectCoverImage
      ? projectDetails.projectCoverImage
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  }, [projectDetails?.projectCoverImage]);

  // ✅ Captions array derived from delimiter-string (kept in sync with imageNames)
  const imageCaptions = useMemo(() => {
    const caps = parseCaptions(projectDetails?.projectCoverImageCaption);
    const len = imageNames.length;

    const next = Array.from({ length: len }, (_, i) => caps[i] ?? "");
    return next;
  }, [projectDetails?.projectCoverImageCaption, imageNames.length]);

  // ✅ Update caption for a specific image index (writes back to delimiter-string)
  const setCaptionAtIndex = (idx, captionText) => {
    setProjectDetails((prev) => {
      if (!prev) return prev;

      const imgs = parseImages(prev);
      const caps = parseCaptions(prev.projectCoverImageCaption);

      while (caps.length < imgs.length) caps.push("");
      if (caps.length > imgs.length) caps.length = imgs.length;

      if (imgs.length === 0) return prev;

      const safeIdx = Math.max(0, Math.min(idx, imgs.length - 1));
      caps[safeIdx] = captionText ?? "";

      return {
        ...prev,
        projectCoverImageCaption: buildCaptionString(caps),
      };
    });
  };

  // ✅ Zoom modal state + helpers (gallery-aware)
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);

  const openZoomByIndex = (idx) => {
    if (!imageNames?.length) return;
    const safeIdx = Math.max(0, Math.min(idx, imageNames.length - 1));
    setZoomIndex(safeIdx);
    setZoomOpen(true);
  };

  const openZoomByName = (filename) => {
    if (!filename) return;
    const idx = imageNames.findIndex((n) => n === filename);
    openZoomByIndex(idx >= 0 ? idx : 0);
  };

  const closeZoom = () => setZoomOpen(false);

  // keep slideshow in sync when navigating inside modal
  const handleZoomChangeIndex = (nextIdx) => {
    setZoomIndex(nextIdx);
    setCurrentImageIndex(nextIdx);
  };

  // Reset slideshow index when image list changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [projectDetails?.projectCoverImage]);

  // Fetch full project details from backend when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        setFormError("");
        setFieldErrors({});

        const response = await authFetch(
          `${BASE_URL}/api/projects/${selectedProjectId}`,
          { headers: { "Content-Type": "application/json" } },
        );

        if (!response.ok) throw new Error("Failed to fetch project details");
        const projectDetailsData = await response.json();

        // ✅ normalize captions length to match images
        setProjectDetails(normalizeProjectCaptions(projectDetailsData));
      } catch (error) {
        console.error("Error fetching project details:", error);
        setFormError("Failed to load project details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  // Fetch sectors list
  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/sectors/active`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch sectors");
        const data = await res.json();
        setSectorOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching sectors:", e);
        setSectorOptions([]);
      }
    };
    fetchSectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch existing project-sector links
  useEffect(() => {
    if (!selectedProjectId) {
      setCurrentProjectSectorLinks([]);
      setSelectedSectorIds([]);
      return;
    }
    const fetchProjectSectors = async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/project-sectors/active`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch project-sector links");
        const links = await res.json();
        const byProject = (Array.isArray(links) ? links : []).filter(
          (ps) => String(ps.projectId) === String(selectedProjectId),
        );
        setCurrentProjectSectorLinks(byProject);
        setSelectedSectorIds(byProject.map((ps) => String(ps.sectorId)));
      } catch (e) {
        console.error("Error fetching project sectors:", e);
        setCurrentProjectSectorLinks([]);
        setSelectedSectorIds([]);
      }
    };
    fetchProjectSectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  useEffect(() => {
    const fetchProjectStatuses = async () => {
      try {
        const response = await authFetch(
          `${BASE_URL}/api/project-statuses/active`,
          { headers: { "Content-Type": "application/json" } },
        );

        if (!response.ok) throw new Error("Failed to fetch project statuses");
        const statuses = await response.json();
        setProjectStatuses(statuses);
      } catch (error) {
        console.error("Error fetching project statuses:", error);
      }
    };

    fetchProjectStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchAvailableParentProjects = async () => {
      try {
        const response = await authFetch(`${BASE_URL}/api/projects/ids-names`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to fetch project list");
        const allProjects = await response.json();

        const filteredProjects = allProjects.filter(
          (p) => p.id.toString() !== selectedProjectId,
        );

        setAvailableParentProjects(filteredProjects);
      } catch (error) {
        console.error("Error fetching parent projects:", error);
      }
    };

    fetchAvailableParentProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  useEffect(() => {
    const fetchTypesAndAddresses = async () => {
      try {
        const [typeRes, addressRes] = await Promise.all([
          authFetch(`${BASE_URL}/api/project-types/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/addresses/active`, {
            headers: { "Content-Type": "application/json" },
          }),
        ]);

        if (!typeRes.ok) throw new Error("Failed to fetch project types");
        if (!addressRes.ok) throw new Error("Failed to fetch addresses");

        const typesData = await typeRes.json();
        const addressesData = await addressRes.json();

        setProjectTypes(typesData);
        setAddresses(addressesData);
      } catch (error) {
        console.error("Error fetching types or addresses:", error);
      }
    };

    fetchTypesAndAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ fetch all org options (safe for 204 too)
  useEffect(() => {
    const fetchAllOrgOptions = async () => {
      try {
        const res = await authFetch(
          `${BASE_URL}/api/organizations/active/options`,
          { headers: { "Content-Type": "application/json" } },
        );

        const data = await safeReadJson(res);
        setAllOrganizationOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching all organization options:", e);
        setAllOrganizationOptions([]);
      }
    };
    fetchAllOrgOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ fetch organization statuses
  useEffect(() => {
    const fetchOrgStatuses = async () => {
      try {
        const res = await authFetch(
          `${BASE_URL}/api/organization-statuses/active`,
          { headers: { "Content-Type": "application/json" } },
        );
        if (!res.ok) throw new Error("Failed to fetch organization statuses");
        const data = await res.json();
        setOrgStatusOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching org statuses:", e);
        setOrgStatusOptions([]);
      }
    };
    fetchOrgStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ project-aware org options + project_organization rows
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectOrgOptions([]);
      setProjectOrganizations([]);
      setSelectedOrgId("");
      setSelectedOrgStatusId("");
      return;
    }

    const loadProjectOrgOptions = async (projectId) => {
      try {
        const res = await authFetch(
          `${BASE_URL}/api/organizations/by-project/${projectId}/options`,
          { headers: { "Content-Type": "application/json" } },
        );

        if (!res.ok) {
          setProjectOrgOptions(allOrganizationOptions);
          return;
        }

        const data = await safeReadJson(res);
        const arr = Array.isArray(data) ? data : [];
        setProjectOrgOptions(arr.length > 0 ? arr : allOrganizationOptions);
      } catch (e) {
        console.error("Error fetching project-aware org options:", e);
        setProjectOrgOptions(allOrganizationOptions);
      }
    };

    const loadProjectOrganizations = async (projectId) => {
      try {
        const res = await authFetch(
          `${BASE_URL}/api/project-organizations/active`,
          { headers: { "Content-Type": "application/json" } },
        );
        if (!res.ok) throw new Error("Failed to fetch project organizations");
        const data = await res.json();
        const byProject = (Array.isArray(data) ? data : []).filter(
          (po) => String(po.projectId) === String(projectId),
        );
        setProjectOrganizations(byProject);
      } catch (e) {
        console.error("Error fetching project organizations:", e);
        setProjectOrganizations([]);
      }
    };

    loadProjectOrgOptions(selectedProjectId);
    loadProjectOrganizations(selectedProjectId);
    setSelectedOrgId("");
    setSelectedOrgStatusId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, allOrganizationOptions]);

  // ✅ Participants: load employees + positions once (positions only used for label)
  useEffect(() => {
    const loadEmployeesAndPositions = async () => {
      try {
        const [empRes, posRes] = await Promise.all([
          authFetch(`${BASE_URL}/api/employees/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/positions/active`, {
            headers: { "Content-Type": "application/json" },
          }),
        ]);

        const empData = await safeReadJson(empRes);
        const posData = await safeReadJson(posRes);

        setEmployeeOptions(Array.isArray(empData) ? empData : []);
        setPositionOptions(Array.isArray(posData) ? posData : []);
      } catch (e) {
        console.error("Error fetching employees/positions:", e);
        setEmployeeOptions([]);
        setPositionOptions([]);
      }
    };

    loadEmployeesAndPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Participants: load project participants whenever project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectParticipants([]);
      setSelectedEmployeeId("");
      setParticipantError("");
      return;
    }

    const loadParticipants = async (projectId) => {
      try {
        setParticipantError("");
        const res = await authFetch(
          `${BASE_URL}/api/employee-projects/active`,
          {
            headers: { "Content-Type": "application/json" },
          },
        );

        const data = await safeReadJson(res);
        const all = Array.isArray(data) ? data : [];
        const byProject = all.filter(
          (ep) => String(ep.projectId) === String(projectId),
        );
        setProjectParticipants(byProject);
      } catch (e) {
        console.error("Error loading project participants:", e);
        setProjectParticipants([]);
      }
    };

    loadParticipants(selectedProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const handleProjectInputChange = (e) => {
    const { name, value } = e.target;
    setProjectDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ Upload cover image via FormData (appends on backend)
  const uploadCoverImage = async (file) => {
    if (!file || !projectDetails?.id) return;

    setUploadError("");
    setUploadingCover(true);

    try {
      const token = localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${BASE_URL}/api/projects/${projectDetails.id}/cover-image`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        },
      );

      if (response.status === 401) {
        localStorage.removeItem("authToken");
        navigate("/login");
        throw new Error("Unauthorized - redirecting to login");
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to upload cover image");
      }

      const updatedProject = await response.json();

      // ✅ normalize captions length to match images
      const normalized = normalizeProjectCaptions(updatedProject);
      setProjectDetails(normalized);

      setProjects((prev) =>
        prev.map((p) =>
          p.id === normalized.id
            ? { ...p, projectName: normalized.projectName }
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCoverDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadCoverImage(file);
  };

  const handleCoverDragOver = (e) => e.preventDefault();

  const handleCoverFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadCoverImage(file);
  };

  // ✅ Delete image + preserve captions even if backend wipes them
  const handleDeleteImage = async (filename) => {
    if (!projectDetails?.id) return;
    if (!window.confirm(`Delete image "${filename}" from this project?`))
      return;

    // snapshot current mapping: filename -> caption (by index)
    const prevImages = parseImages(projectDetails);
    const prevCaps = parseCaptions(projectDetails.projectCoverImageCaption);
    const captionByName = new Map(
      prevImages.map((img, i) => [img, prevCaps[i] ?? ""]),
    );

    try {
      const response = await authFetch(
        `${BASE_URL}/api/projects/${
          projectDetails.id
        }/cover-image/${encodeURIComponent(filename)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to delete image");
      }

      const updatedProjectRaw = await response.json();
      const updatedImages = parseImages(updatedProjectRaw);

      // rebuild captions for remaining images using old mapping
      const rebuiltCaps = updatedImages.map(
        (img) => captionByName.get(img) ?? "",
      );
      const rebuiltCaptionString = buildCaptionString(rebuiltCaps);

      const backendCaps = parseCaptions(
        updatedProjectRaw?.projectCoverImageCaption,
      );

      // If backend wiped or shortened captions, override with rebuilt
      const backendLooksBad =
        !updatedProjectRaw?.projectCoverImageCaption ||
        (updatedImages.length > 0 && backendCaps.length === 0) ||
        backendCaps.length < updatedImages.length;

      let finalProject = backendLooksBad
        ? {
            ...updatedProjectRaw,
            projectCoverImageCaption: rebuiltCaptionString,
          }
        : normalizeProjectCaptions(updatedProjectRaw);

      // ✅ NEW: persist rebuilt captions back to backend if it wiped them
      if (backendLooksBad) {
        try {
          const persistRes = await authFetch(
            `${BASE_URL}/api/projects/${finalProject.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(finalProject),
            },
          );

          if (persistRes.ok) {
            const persisted = await safeReadJson(persistRes);
            if (persisted) finalProject = normalizeProjectCaptions(persisted);
          } else {
            const msg = await persistRes.text().catch(() => "");
            console.warn("Caption persist after delete failed:", msg);
          }
        } catch (e) {
          console.warn("Caption persist after delete threw:", e);
        }
      }

      setProjectDetails(finalProject);

      // keep indices in bounds
      setCurrentImageIndex((prevIdx) => {
        if (updatedImages.length === 0) return 0;
        return Math.min(prevIdx, updatedImages.length - 1);
      });

      setZoomIndex((prevIdx) => {
        if (updatedImages.length === 0) return 0;
        return Math.min(prevIdx, updatedImages.length - 1);
      });

      setProjects((prev) =>
        prev.map((p) =>
          p.id === finalProject.id
            ? { ...p, projectName: finalProject.projectName }
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
      alert(err.message || "Error deleting image.");
    }
  };

  const handleToggleSector = (sectorIdStr, checked) => {
    setSelectedSectorIds((prev) => {
      if (checked)
        return prev.includes(sectorIdStr) ? prev : [...prev, sectorIdStr];
      return prev.filter((id) => id !== sectorIdStr);
    });
  };

  const handleRemoveSectorClick = async (sectorId) => {
    const link = currentProjectSectorLinks.find(
      (l) => String(l.sectorId) === String(sectorId),
    );

    if (!link) {
      setSelectedSectorIds((prev) =>
        prev.filter((id) => String(id) !== String(sectorId)),
      );
      return;
    }

    if (!window.confirm("Remove this sector from the project?")) return;

    try {
      const res = await authFetch(
        `${BASE_URL}/api/project-sectors/${link.id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Failed to delete sector link");

      setCurrentProjectSectorLinks((prev) =>
        prev.filter((l) => l.id !== link.id),
      );
      setSelectedSectorIds((prev) =>
        prev.filter((id) => String(id) !== String(sectorId)),
      );
    } catch (e) {
      console.error(e);
      alert("Failed to delete sector link.");
    }
  };

  const handleAddProjectOrganization = async () => {
    if (!projectDetails?.id) return alert("No project is selected.");
    if (!selectedOrgId || !selectedOrgStatusId)
      return alert("Please select both organization and status.");

    try {
      const res = await authFetch(`${BASE_URL}/api/project-organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectDetails.id),
          organizationId: Number(selectedOrgId),
          organizationStatusId: Number(selectedOrgStatusId),
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to add organization to project.");
      }

      const projectId = projectDetails.id;

      const reloadPO = await authFetch(
        `${BASE_URL}/api/project-organizations/active`,
        { headers: { "Content-Type": "application/json" } },
      );
      if (reloadPO.ok) {
        const data = await reloadPO.json();
        const byProject = (Array.isArray(data) ? data : []).filter(
          (po) => String(po.projectId) === String(projectId),
        );
        setProjectOrganizations(byProject);
      }

      setSelectedOrgId("");
      setSelectedOrgStatusId("");
    } catch (e) {
      console.error(e);
      alert(e.message || "Error adding organization to project.");
    }
  };

  const handleDeleteProjectOrganization = async (projectOrgId) => {
    if (!window.confirm("Remove this organization from the project?")) return;

    try {
      const res = await authFetch(
        `${BASE_URL}/api/project-organizations/${projectOrgId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete project organization.");

      setProjectOrganizations((prev) =>
        prev.filter((po) => po.id !== projectOrgId),
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "Error deleting project organization.");
    }
  };

  // ✅ Participants: helper to get employee's position id from EmployeeDTO
  const getEmployeePositionId = (employeeId) => {
    const e = (employeeOptions || []).find(
      (x) => String(x.id) === String(employeeId),
    );
    if (!e) return null;

    // supports either "positionId" OR "position: { id }"
    const pid =
      e.positionId || (e.position && e.position.id) || e.position_id || null;

    return pid ? Number(pid) : null;
  };

  // ✅ Participants: add / delete (role auto from employee)
  const handleAddParticipant = async () => {
    if (!projectDetails?.id) {
      setParticipantError("No project is selected.");
      return;
    }
    if (!selectedEmployeeId) {
      setParticipantError("Please select an employee.");
      return;
    }

    const positionId = getEmployeePositionId(selectedEmployeeId);
    if (!positionId) {
      setParticipantError(
        "Could not find this employee's positionId. Make sure EmployeeDTO includes positionId (or position.id).",
      );
      return;
    }

    try {
      setParticipantError("");

      const res = await authFetch(`${BASE_URL}/api/employee-projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectDetails.id),
          employeeId: Number(selectedEmployeeId),
          positionId: Number(positionId),
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to add participant.");
      }

      // reload participants for this project
      const reload = await authFetch(
        `${BASE_URL}/api/employee-projects/active`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await safeReadJson(reload);
      const all = Array.isArray(data) ? data : [];
      const byProject = all.filter(
        (ep) => String(ep.projectId) === String(projectDetails.id),
      );
      setProjectParticipants(byProject);

      setSelectedEmployeeId("");
    } catch (e) {
      console.error(e);
      setParticipantError(e.message || "Error adding participant.");
    }
  };

  const handleDeleteParticipant = async (participantId) => {
    if (!window.confirm("Remove this participant from the project?")) return;

    try {
      const res = await authFetch(
        `${BASE_URL}/api/employee-projects/${participantId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to remove participant.");
      }

      setProjectParticipants((prev) =>
        prev.filter((p) => p.id !== participantId),
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "Error deleting participant.");
    }
  };

  const autoResize = (textarea) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;

    try {
      const response = await authFetch(
        `${BASE_URL}/api/projects/${projectDetails.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) throw new Error("Failed to delete project");

      alert("Project deleted successfully!");

      const updatedProjects = projects.filter(
        (p) => p.id !== projectDetails.id,
      );
      setProjects(updatedProjects);

      if (updatedProjects.length > 0) {
        setSelectedProjectId(updatedProjects[0].id.toString());
      } else {
        setSelectedProjectId("");
      }

      setProjectDetails(null);
      setSelectedSectorIds([]);
      setCurrentProjectSectorLinks([]);
      setProjectOrganizations([]);
      setProjectParticipants([]);
      setFormError("");
      setFieldErrors({});
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting project.");
    }
  };

  const syncProjectSectors = async (projectId) => {
    const currentBySectorId = new Map(
      currentProjectSectorLinks.map((l) => [String(l.sectorId), l]),
    );

    const selectedSet = new Set(selectedSectorIds.map(String));

    const toAdd = [...selectedSet].filter(
      (sid) => !currentBySectorId.has(String(sid)),
    );
    const toRemove = currentProjectSectorLinks.filter(
      (l) => !selectedSet.has(String(l.sectorId)),
    );

    for (const sid of toAdd) {
      try {
        const res = await authFetch(`${BASE_URL}/api/project-sectors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: Number(projectId),
            sectorId: Number(sid),
          }),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(`Failed to link sector ${sid}. ${msg}`);
        }
      } catch (e) {
        console.error(e);
        alert(e.message || "Failed to add sector link.");
      }
    }

    for (const link of toRemove) {
      try {
        const res = await authFetch(
          `${BASE_URL}/api/project-sectors/${link.id}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Failed to delete sector link");
      } catch (e) {
        console.error(e);
        alert("Failed to delete sector link.");
      }
    }

    try {
      const res = await authFetch(`${BASE_URL}/api/project-sectors/active`, {
        headers: { "Content-Type": "application/json" },
      });
      const links = res.ok ? await res.json() : [];
      const byProject = (Array.isArray(links) ? links : []).filter(
        (ps) => String(ps.projectId) === String(projectId),
      );
      setCurrentProjectSectorLinks(byProject);
      setSelectedSectorIds(byProject.map((ps) => String(ps.sectorId)));
    } catch (e) {
      console.error("Failed to refresh project sectors after sync:", e);
    }
  };

  const handleSave = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const response = await authFetch(
        `${BASE_URL}/api/projects/${projectDetails.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectDetails),
        },
      );

      const text = await response.text();

      if (!response.ok) {
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn("Failed to parse backend error JSON:", parseErr);
        }

        if (data) {
          if (data.fieldErrors) setFieldErrors(data.fieldErrors);
          setFormError(
            data.message || "There was a problem updating the project.",
          );
        } else {
          setFormError("There was a problem updating the project.");
        }
        return;
      }

      const updatedProject = text ? JSON.parse(text) : null;

      if (updatedProject) {
        // ✅ normalize captions length to match images
        setProjectDetails(normalizeProjectCaptions(updatedProject));

        setProjects((prevProjects) =>
          prevProjects.map((proj) =>
            proj.id === updatedProject.id
              ? { ...proj, projectName: updatedProject.projectName }
              : proj,
          ),
        );
      }

      await syncProjectSectors(projectDetails.id);

      setFormError("");
      setFieldErrors({});
      alert("Project updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      setFormError("Unexpected error while updating project.");
    }
  };

  const getSectorLabel = (id) => {
    const s = sectorOptions.find(
      (x) => String(x.id ?? x.sectorId ?? x.sector_id) === String(id),
    );
    return (
      s?.sectorDescription ||
      s?.sector_description ||
      s?.sectorCode ||
      s?.sector_code ||
      `Sector ${id}`
    );
  };

  const getOrgLabel = (id) => {
    const o = allOrganizationOptions.find(
      (opt) => String(opt.id ?? opt.organizationId) === String(id),
    );
    return (
      o?.name ||
      o?.organizationName ||
      o?.organization_name ||
      `Organization ${id}`
    );
  };

  const getOrgStatusLabel = (id) => {
    const s = orgStatusOptions.find(
      (opt) =>
        String(
          opt.id ?? opt.organizationStatusId ?? opt.organization_status_id,
        ) === String(id),
    );
    return (
      s?.organizationStatusName ||
      s?.organization_status_name ||
      s?.statusName ||
      `Status ${id}`
    );
  };

  // ✅ Babel-safe label builder
  const getEmployeeLabel = (id) => {
    const e = (employeeOptions || []).find((x) => String(x.id) === String(id));
    if (!e) return `Employee ${id}`;

    const fullName = `${e.firstName || ""} ${e.lastName || ""}`.trim();

    return (
      e.employeeName ||
      e.fullName ||
      e.name ||
      (fullName ? fullName : "") ||
      e.email ||
      `Employee ${id}`
    );
  };

  const getPositionLabel = (id) => {
    const p = (positionOptions || []).find((x) => String(x.id) === String(id));
    if (!p) return `Role ${id}`;
    return p.positionName || p.name || p.title || `Role ${id}`;
  };

  // ✅ org dropdown options based on "only hide when ALL statuses are used"
  const selectableOrgOptions = useMemo(() => {
    const allOrgs = Array.isArray(allOrganizationOptions)
      ? allOrganizationOptions
      : [];

    const allStatusIds = (
      Array.isArray(orgStatusOptions) ? orgStatusOptions : []
    )
      .map((s) =>
        String(s.id ?? s.organizationStatusId ?? s.organization_status_id),
      )
      .filter(Boolean);

    if (allStatusIds.length === 0) return allOrgs;

    const allStatusSet = new Set(allStatusIds);

    const usedByOrg = new Map();
    (Array.isArray(projectOrganizations) ? projectOrganizations : []).forEach(
      (po) => {
        const orgId = String(po.organizationId);
        const statusId = String(po.organizationStatusId);
        if (!orgId || !statusId) return;

        if (!usedByOrg.has(orgId)) usedByOrg.set(orgId, new Set());
        usedByOrg.get(orgId).add(statusId);
      },
    );

    return allOrgs.filter((o) => {
      const orgId = String(o.id ?? o.organizationId);
      const usedSet = usedByOrg.get(orgId);
      if (!usedSet) return true;

      for (const sid of allStatusSet) {
        if (!usedSet.has(sid)) return true;
      }
      return false;
    });
  }, [allOrganizationOptions, orgStatusOptions, projectOrganizations]);

  // ✅ employee dropdown options — remove already-added employees
  const selectableEmployeeOptions = useMemo(() => {
    const all = Array.isArray(employeeOptions) ? employeeOptions : [];
    const used = new Set(
      (Array.isArray(projectParticipants) ? projectParticipants : []).map((p) =>
        String(p.employeeId),
      ),
    );
    return all.filter((e) => !used.has(String(e.id)));
  }, [employeeOptions, projectParticipants]);

  const hasProject = Boolean(projectDetails);

  // compute selected employee’s role label for UI hint
  const selectedEmployeeRoleLabel = useMemo(() => {
    if (!selectedEmployeeId) return "";
    const pid = getEmployeePositionId(selectedEmployeeId);
    return pid ? getPositionLabel(pid) : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId, positionOptions]);

  return (
    <div className={styles.projectContainer}>
      {!hasProject && (
        <div className={styles.emptyState}>
          <FiImage />
          <div>
            <h3 style={{ margin: 0 }}>No project selected</h3>
            <p style={{ margin: 0, color: "#666" }}>
              Select a project from the dropdown to view details.
            </p>
          </div>
        </div>
      )}

      {projectDetails && (
        <div className={styles.formContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderText}>
              <h3 className={styles.pageTitle}>Project Details</h3>
              <p className={styles.pageSubtitle}>
                Update project info, sectors, images, organizations, and
                participants.
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                onClick={handleExportProject}
                className={styles.exportButton}
                disabled={loading || exportingProject || !projectDetails}
              >
                <FiDownload />
                {exportingProject ? "Exporting..." : "Export to Excel"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={styles.saveButton}
                disabled={loading}
              >
                <FiSave />
                Save
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={loading}
              >
                <FiTrash2 />
                Delete
              </button>
            </div>
          </div>

          {formError && (
            <div className={styles.errorBanner}>
              <FiAlertCircle />
              <span>{formError}</span>
            </div>
          )}

          {Object.keys(fieldErrors).length > 0 && (
            <div className={styles.errorList}>
              <ul>
                {Object.entries(fieldErrors).map(([field, message]) => (
                  <li key={field}>
                    <strong>{field}</strong>: {message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.imageAndFormWrapper}>
            {/* Left: media card */}
            <aside className={styles.mediaColumn}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Cover & Notes</div>
                  <div className={styles.cardMeta}>
                    {imageNames.length > 0
                      ? `${imageNames.length} image(s)`
                      : "No images"}
                  </div>
                </div>

                {/* ✅ MOVED HERE: Upload block above the cover image */}
                <div className={styles.sectionRowStack}>
                  <div className={styles.sectionTitle}>
                    <FiUploadCloud />
                    <span>Cover image upload</span>
                  </div>

                  <div
                    onDrop={handleCoverDrop}
                    onDragOver={handleCoverDragOver}
                    className={styles.dropzone}
                    onClick={() =>
                      document.getElementById("coverImageFileInput")?.click()
                    }
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.dropzoneText}>
                      {uploadingCover ? (
                        <strong>Uploading…</strong>
                      ) : (
                        <>
                          <strong>Drag & drop</strong> or click to select an
                          image
                        </>
                      )}
                      <div className={styles.dropzoneHint}>
                        PNG, JPG, WEBP • recommended wide image
                      </div>
                    </div>
                  </div>

                  <input
                    id="coverImageFileInput"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleCoverFileInput}
                  />

                  {uploadError && (
                    <div className={styles.inlineError}>{uploadError}</div>
                  )}
                </div>

                <div className={styles.divider} />

                {imageNames.length > 0 ? (
                  <>
                    <div className={styles.imageShell}>
                      <img
                        src={`${coverImagePath}${imageNames[currentImageIndex]}`}
                        alt="Project Cover"
                        className={styles.coverImage}
                        style={{ cursor: "zoom-in" }}
                        onClick={() => openZoomByIndex(currentImageIndex)}
                        title="Click to open"
                      />

                      {imageNames.length > 1 && (
                        <div className={styles.galleryControls}>
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentImageIndex((prev) =>
                                prev === 0 ? imageNames.length - 1 : prev - 1,
                              )
                            }
                            aria-label="Previous image"
                            className={`${styles.actionBtn} ${styles.iconOnlyBtn}`}
                            title="Previous image"
                          >
                            <FiChevronLeft />
                          </button>

                          <span className={styles.galleryCount}>
                            {currentImageIndex + 1} / {imageNames.length}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setCurrentImageIndex((prev) =>
                                prev === imageNames.length - 1 ? 0 : prev + 1,
                              )
                            }
                            aria-label="Next image"
                            className={`${styles.actionBtn} ${styles.iconOnlyBtn}`}
                            title="Next image"
                          >
                            <FiChevronRight />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ✅ Caption editor (saved when clicking Save) */}
                    <div style={{ marginTop: 12 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: 6,
                          fontSize: 13,
                        }}
                      >
                        Caption (current image)
                      </div>

                      <textarea
                        value={imageCaptions[currentImageIndex] || ""}
                        onChange={(e) =>
                          setCaptionAtIndex(currentImageIndex, e.target.value)
                        }
                        placeholder="Write a caption for this image..."
                        className={styles.textareaInput}
                        style={{ minHeight: 64 }}
                      />

                      <div
                        style={{ fontSize: 12, color: "#666", marginTop: 6 }}
                      >
                        Captions are saved when you click <strong>Save</strong>.
                      </div>
                    </div>

                    <div className={styles.imageList}>
                      <div className={styles.imageListTitle}>
                        <strong>Images</strong>
                      </div>
                      <ul className={styles.cleanList}>
                        {imageNames.map((name) => (
                          <li key={name} className={styles.imageRow}>
                            <span
                              className={styles.filename}
                              style={{ cursor: "zoom-in" }}
                              onClick={() => openZoomByName(name)}
                              title="Click to open"
                            >
                              {name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(name)}
                              className={`${styles.actionBtn} ${styles.actionBtnDanger} ${styles.iconOnlyBtn}`}
                              aria-label={`Delete image ${name}`}
                              title={`Delete image ${name}`}
                            >
                              <FiTrash2 />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className={styles.noMedia}>
                    <FiImage />
                    <div>
                      <div style={{ fontWeight: 600 }}>No cover image yet</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Upload one above to show a slideshow here.
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.divider} />

                <div className={styles.memosWrap}>
                  <Memos />
                </div>
              </div>
            </aside>

            {/* Right: form */}
            <section className={styles.formContent}>
              {loading ? (
                <div className={styles.skeletonWrap}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                </div>
              ) : (
                <form>
                  {/* Description */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>Description</div>
                      <div className={styles.cardMeta}>Overview</div>
                    </div>

                    <div className={styles.fullWidthField}>
                      <label>Project Description:</label>
                      <textarea
                        name="projectDescription"
                        value={projectDetails.projectDescription || ""}
                        onChange={(e) => {
                          handleProjectInputChange(e);
                          autoResize(e.target);
                        }}
                        ref={(el) => el && autoResize(el)}
                        className={styles.textareaInput}
                        placeholder="Write a short summary of the project..."
                      />
                    </div>
                  </div>

                  <div className={styles.grid}>
                    {/* Left column card */}
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>Core details</div>
                        <div className={styles.cardMeta}>
                          Name, codes & costs
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Project Name:</label>
                        <input
                          type="text"
                          name="projectName"
                          value={projectDetails.projectName || ""}
                          onChange={handleProjectInputChange}
                          className={inputClass("projectName")}
                        />
                        {getFieldError("projectName") && (
                          <div className={styles.fieldError}>
                            {getFieldError("projectName")}
                          </div>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label>Project Code:</label>
                        <input
                          type="text"
                          name="projectCode"
                          value={projectDetails.projectCode || ""}
                          onChange={handleProjectInputChange}
                          className={inputClass("projectCode")}
                        />
                        {getFieldError("projectCode") && (
                          <div className={styles.fieldError}>
                            {getFieldError("projectCode")}
                          </div>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label>Reference No:</label>
                        <input
                          type="text"
                          name="refProjectNo"
                          value={projectDetails.refProjectNo || ""}
                          onChange={handleProjectInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Pin Code:</label>
                        <input
                          type="text"
                          name="pinCode"
                          value={projectDetails.pinCode || ""}
                          onChange={handleProjectInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      <div className={styles.row2}>
                        <div className={styles.formGroup}>
                          <label>FO Support Cost (%):</label>
                          <input
                            type="number"
                            step="0.01"
                            name="foSupportCostPercent"
                            value={projectDetails.foSupportCostPercent || ""}
                            onChange={handleProjectInputChange}
                            className={styles.textInput}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label>Own Support Cost (%):</label>
                          <input
                            type="number"
                            step="0.01"
                            name="irwSupportCostPercent"
                            value={projectDetails.irwSupportCostPercent || ""}
                            onChange={handleProjectInputChange}
                            className={styles.textInput}
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Approved:</label>
                        <select
                          name="approved"
                          value={projectDetails.approved || ""}
                          onChange={handleProjectInputChange}
                          className={inputClass("approved")}
                        >
                          <option value="">Select...</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        {getFieldError("approved") && (
                          <div className={styles.fieldError}>
                            {getFieldError("approved")}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right column card */}
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>Schedule & type</div>
                        <div className={styles.cardMeta}>
                          Status, dates, address
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Project Status:</label>
                        <select
                          name="projectStatusId"
                          value={projectDetails.projectStatusId || ""}
                          onChange={handleProjectInputChange}
                          className={inputClass("projectStatusId")}
                        >
                          <option value="">Select status</option>
                          {projectStatuses.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.statusName}
                            </option>
                          ))}
                        </select>
                        {getFieldError("projectStatusId") && (
                          <div className={styles.fieldError}>
                            {getFieldError("projectStatusId")}
                          </div>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label>Project Type:</label>
                        <select
                          name="projectTypeId"
                          value={projectDetails.projectTypeId || ""}
                          onChange={handleProjectInputChange}
                          className={inputClass("projectTypeId")}
                        >
                          <option value="">Select type</option>
                          {projectTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.projectTypeName}
                            </option>
                          ))}
                        </select>
                        {getFieldError("projectTypeId") && (
                          <div className={styles.fieldError}>
                            {getFieldError("projectTypeId")}
                          </div>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label>Address:</label>
                        <select
                          name="addressId"
                          value={projectDetails.addressId || ""}
                          onChange={handleProjectInputChange}
                          className={styles.textInput}
                        >
                          <option value="">Select address</option>
                          {addresses.map((address) => (
                            <option key={address.id} value={address.id}>
                              {address.street || ""}, {address.city || ""},{" "}
                              {address.country}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.row2}>
                        <div className={styles.formGroup}>
                          <label>Project Period (Months):</label>
                          <input
                            type="number"
                            name="projectPeriodMonths"
                            value={projectDetails.projectPeriodMonths || ""}
                            onChange={handleProjectInputChange}
                            className={styles.textInput}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label>Part Of Project:</label>
                          <select
                            name="partOfId"
                            value={projectDetails.partOfId || ""}
                            onChange={handleProjectInputChange}
                            className={styles.textInput}
                          >
                            <option value="">Select parent project</option>
                            {availableParentProjects.map((proj) => (
                              <option key={proj.id} value={proj.id}>
                                {proj.projectName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className={styles.row2}>
                        <div className={styles.formGroup}>
                          <label>Project Date:</label>
                          <input
                            type="datetime-local"
                            name="projectDate"
                            value={
                              projectDetails.projectDate
                                ? projectDetails.projectDate.slice(0, 16)
                                : ""
                            }
                            onChange={handleProjectInputChange}
                            className={inputClass("projectDate")}
                          />
                          {getFieldError("projectDate") && (
                            <div className={styles.fieldError}>
                              {getFieldError("projectDate")}
                            </div>
                          )}
                        </div>

                        <div className={styles.formGroup}>
                          <label>Project Start:</label>
                          <input
                            type="datetime-local"
                            name="projectStart"
                            value={
                              projectDetails.projectStart
                                ? projectDetails.projectStart.slice(0, 16)
                                : ""
                            }
                            onChange={handleProjectInputChange}
                            className={inputClass("projectStart")}
                          />
                          {getFieldError("projectStart") && (
                            <div className={styles.fieldError}>
                              {getFieldError("projectStart")}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.row2}>
                        <div className={styles.formGroup}>
                          <label>Project End:</label>
                          <input
                            type="datetime-local"
                            name="projectEnd"
                            value={
                              projectDetails.projectEnd
                                ? projectDetails.projectEnd.slice(0, 16)
                                : ""
                            }
                            onChange={handleProjectInputChange}
                            className={inputClass("projectEnd")}
                          />
                          {getFieldError("projectEnd") && (
                            <div className={styles.fieldError}>
                              {getFieldError("projectEnd")}
                            </div>
                          )}
                        </div>

                        <div className={styles.formGroup}>
                          <label>Project Start (Revised):</label>
                          <input
                            type="datetime-local"
                            name="projectStartRev"
                            value={
                              projectDetails.projectStartRev
                                ? projectDetails.projectStartRev.slice(0, 16)
                                : ""
                            }
                            onChange={handleProjectInputChange}
                            className={styles.textInput}
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Project End (Revised):</label>
                        <input
                          type="datetime-local"
                          name="projectEndRev"
                          value={
                            projectDetails.projectEndRev
                              ? projectDetails.projectEndRev.slice(0, 16)
                              : ""
                          }
                          onChange={handleProjectInputChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    {/* Links card (includes participants UI) */}
                    <div
                      className={styles.card}
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>Project Links</div>
                        <div className={styles.cardMeta}>
                          Sectors, organizations, participants
                        </div>
                      </div>

                      <div className={styles.split}>
                        {/* Sectors */}
                        <div>
                          <div className={styles.sectionTitle}>
                            <span style={{ fontWeight: 700 }}>Sectors</span>
                            <span className={styles.sectionHint}>
                              Click checkbox to add; click pill “x” to remove
                              immediately
                            </span>
                          </div>

                          <div className={styles.scrollBox}>
                            {sectorOptions.length === 0 ? (
                              <div className={styles.mutedText}>
                                No sectors available
                              </div>
                            ) : (
                              sectorOptions.map((s) => {
                                const idStr = String(
                                  s.id ?? s.sectorId ?? s.sector_id,
                                );
                                const label =
                                  s.sectorDescription ||
                                  s.sector_description ||
                                  s.sectorCode ||
                                  s.sector_code ||
                                  `Sector ${idStr}`;
                                const checked =
                                  selectedSectorIds.includes(idStr);

                                return (
                                  <label
                                    key={idStr}
                                    className={styles.checkboxRow}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        handleToggleSector(
                                          idStr,
                                          e.target.checked,
                                        )
                                      }
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>

                          <div style={{ marginTop: 8 }}>
                            {selectedSectorIds.length > 0 ? (
                              selectedSectorIds.map((sid) => (
                                <span key={sid} className={styles.pill}>
                                  <span>{getSectorLabel(sid)}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSectorClick(sid)}
                                    aria-label={`Remove sector ${getSectorLabel(
                                      sid,
                                    )}`}
                                    title="Remove sector"
                                    className={styles.pillRemoveBtn}
                                  >
                                    <FiX />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className={styles.mutedText}>
                                No sectors assigned
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Organizations */}
                        <div>
                          <div className={styles.sectionTitle}>
                            <span style={{ fontWeight: 700 }}>
                              Related Organizations
                            </span>
                            <span className={styles.sectionHint}>
                              Add an organization with a status
                            </span>
                          </div>

                          <div className={styles.scrollBox}>
                            {projectOrganizations.length === 0 ? (
                              <span className={styles.mutedText}>
                                No related organizations
                              </span>
                            ) : (
                              <ul className={styles.cleanList}>
                                {projectOrganizations.map((po) => (
                                  <li key={po.id} className={styles.orgRow}>
                                    <div className={styles.orgText}>
                                      <div className={styles.orgName}>
                                        {getOrgLabel(po.organizationId)}
                                      </div>
                                      <div className={styles.orgStatus}>
                                        {getOrgStatusLabel(
                                          po.organizationStatusId,
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteProjectOrganization(po.id)
                                      }
                                      className={`${styles.actionBtn} ${styles.actionBtnDanger} ${styles.iconOnlyBtn}`}
                                      aria-label="Remove organization from project"
                                      title="Remove organization"
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className={styles.addRow}>
                            <select
                              value={selectedOrgId}
                              onChange={(e) => setSelectedOrgId(e.target.value)}
                              className={styles.textInput}
                            >
                              <option value="">Select organization</option>
                              {selectableOrgOptions.map((o) => (
                                <option
                                  key={o.id ?? o.organizationId}
                                  value={o.id ?? o.organizationId}
                                >
                                  {o.name ||
                                    o.organizationName ||
                                    o.organization_name}
                                </option>
                              ))}
                            </select>

                            <select
                              value={selectedOrgStatusId}
                              onChange={(e) =>
                                setSelectedOrgStatusId(e.target.value)
                              }
                              className={styles.textInput}
                            >
                              <option value="">Select status</option>
                              {orgStatusOptions.map((s) => (
                                <option
                                  key={
                                    s.id ??
                                    s.organizationStatusId ??
                                    s.organization_status_id
                                  }
                                  value={
                                    s.id ??
                                    s.organizationStatusId ??
                                    s.organization_status_id
                                  }
                                >
                                  {s.organizationStatusName ||
                                    s.organization_status_name ||
                                    s.statusName}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={handleAddProjectOrganization}
                              className={styles.primaryInlineBtn}
                            >
                              <FiPlus />
                              Add
                            </button>
                          </div>

                          <div className={styles.mutedNote}>
                            An organization stays available until it has been
                            linked with every possible status for this project.
                          </div>
                        </div>
                      </div>

                      {/* Participants */}
                      <div style={{ marginTop: "1rem" }}>
                        <div className={styles.sectionTitle}>
                          <span style={{ fontWeight: 700 }}>
                            Project Participants
                          </span>
                          <span className={styles.sectionHint}>
                            Select employee; role is fetched from employee
                            record
                          </span>
                        </div>

                        <div className={styles.scrollBox}>
                          {projectParticipants.length === 0 ? (
                            <span className={styles.mutedText}>
                              No participants added
                            </span>
                          ) : (
                            <ul className={styles.cleanList}>
                              {projectParticipants.map((p) => (
                                <li key={p.id} className={styles.orgRow}>
                                  <div className={styles.orgText}>
                                    <div className={styles.orgName}>
                                      {getEmployeeLabel(p.employeeId)}
                                    </div>
                                    <div className={styles.orgStatus}>
                                      {getPositionLabel(p.positionId)}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteParticipant(p.id)
                                    }
                                    className={`${styles.actionBtn} ${styles.actionBtnDanger} ${styles.iconOnlyBtn}`}
                                    aria-label="Remove participant from project"
                                    title="Remove participant"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div
                          className={styles.addRow}
                          style={{ marginTop: 10 }}
                        >
                          <select
                            value={selectedEmployeeId}
                            onChange={(e) =>
                              setSelectedEmployeeId(e.target.value)
                            }
                            className={styles.textInput}
                          >
                            <option value="">Select employee</option>
                            {selectableEmployeeOptions.map((e) => {
                              const fullName = `${e.firstName || ""} ${
                                e.lastName || ""
                              }`.trim();
                              const label =
                                e.employeeName ||
                                e.fullName ||
                                e.name ||
                                (fullName ? fullName : "") ||
                                e.email ||
                                `Employee ${e.id}`;

                              return (
                                <option key={e.id} value={e.id}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>

                          <div
                            className={styles.textInput}
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            {selectedEmployeeId
                              ? selectedEmployeeRoleLabel || "Role not found"
                              : "Role: (select employee)"}
                          </div>

                          <button
                            type="button"
                            onClick={handleAddParticipant}
                            className={styles.primaryInlineBtn}
                          >
                            <FiPlus />
                            Add
                          </button>
                        </div>

                        {participantError && (
                          <div
                            className={styles.inlineError}
                            style={{ marginTop: 8 }}
                          >
                            {participantError}
                          </div>
                        )}

                        <div className={styles.mutedNote}>
                          Employees already added to this project are hidden
                          from the dropdown.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom actions */}
                  <div className={styles.bottomActions}>
                    <button
                      type="button"
                      onClick={handleSave}
                      className={styles.saveButton}
                      disabled={loading}
                    >
                      <FiSave />
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className={styles.deleteButton}
                      disabled={loading}
                    >
                      <FiTrash2 />
                      Delete project
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ✅ Modal mount */}
      <ImageZoomModal
        open={zoomOpen}
        images={imageNames}
        captions={imageCaptions}
        index={zoomIndex}
        basePath={coverImagePath}
        onClose={closeZoom}
        onChangeIndex={handleZoomChangeIndex}
      />
    </div>
  );
};

export default Project;
