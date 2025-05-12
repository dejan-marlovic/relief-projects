import React, { useEffect, useState, useContext } from "react";
import { ProjectContext } from "../../../context/ProjectContext";
import styles from "./CostDetail.module.scss";

const CostDetailItem = ({
  costDetail: initialCostDetail,
  isSelected,
  onSelect,
  onUpdated,
  onDeleted,
}) => {
  const { selectedProjectId } = useContext(ProjectContext);
  const [costDetail, setCostDetail] = useState(initialCostDetail || {});
  const [costTypes, setCostTypes] = useState([]);
  const [costs, setCosts] = useState([]);

  useEffect(() => {
    setCostDetail(initialCostDetail || {});
  }, [initialCostDetail]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const fetchData = async () => {
      try {
        const [costTypesRes, costsRes] = await Promise.all([
          fetch("http://localhost:8080/api/cost-types/active", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:8080/api/costs/active", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setCostTypes(await costTypesRes.json());
        setCosts(await costsRes.json());
      } catch (error) {
        console.error("Failed to fetch cost types or costs:", error);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCostDetail((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Warn for percentageCharging exceeding schema limit
    if (name === "percentageCharging" && value > 999.999) {
      console.warn(
        "Warning: percentageCharging exceeds DECIMAL(6,3) limit of 999.999. Value may be truncated in database."
      );
    }
  };

  const handleDelete = async () => {
    if (!costDetail.costDetailId) return;
    if (!window.confirm("Are you sure you want to delete this cost detail?"))
      return;
    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(
        `http://localhost:8080/api/cost-details/${costDetail.costDetailId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to delete cost detail.");
      alert("Cost detail deleted successfully.");
      if (onDeleted) onDeleted();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting cost detail.");
    }
  };

  const handleSave = async () => {
    if (!costDetail.costDetailId) return;
    const token = localStorage.getItem("authToken");
    const payload = {
      budgetId: costDetail.budgetId,
      projectId: selectedProjectId,
      costTypeId: costDetail.costTypeId,
      costId: costDetail.costId,
      costDescription: costDetail.costDescription,
      noOfUnits: parseInt(costDetail.noOfUnits),
      frequencyMonths: parseInt(costDetail.frequencyMonths),
      unitPrice: parseFloat(costDetail.unitPrice),
      percentageCharging: parseFloat(costDetail.percentageCharging),
    };

    try {
      const response = await fetch(
        `http://localhost:8080/api/cost-details/${costDetail.costDetailId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const responseData = await response.json();
      if (!response.ok)
        throw new Error(`Failed to update cost detail: ${response.status}`);
      alert("Cost detail updated successfully!");
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Update error:", err.message);
      alert("Error updating cost detail.");
    }
  };

  return (
    <div
      className={`${styles.costDetailContainer} ${
        isSelected ? styles.selected : ""
      }`}
      onClick={onSelect}
    >
      <div className={styles.formContainer}>
        <form className={styles.formRow}>
          <div className={styles.formItem}>
            <label>Desc:</label>
            <input
              type="text"
              name="costDescription"
              className={styles.textInput}
              value={costDetail.costDescription || ""}
              onChange={handleChange}
              maxLength="255"
            />
          </div>
          <div className={styles.formItem}>
            <label>Units:</label>
            <input
              type="number"
              name="noOfUnits"
              className={styles.numericInput}
              value={costDetail.noOfUnits || ""}
              onChange={handleChange}
              step="1"
              min="0"
            />
          </div>
          <div className={styles.formItem}>
            <label>Freq (Mo):</label>
            <input
              type="number"
              name="frequencyMonths"
              className={styles.numericInput}
              value={costDetail.frequencyMonths || ""}
              onChange={handleChange}
              step="1"
              min="0"
            />
          </div>
          <div className={styles.formItem}>
            <label>Price:</label>
            <input
              type="number"
              name="unitPrice"
              className={styles.numericInput}
              value={costDetail.unitPrice || ""}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
          </div>
          <div className={styles.formItem}>
            <label>% Charge:</label>
            <input
              type="number"
              name="percentageCharging"
              className={styles.numericInput}
              value={costDetail.percentageCharging || ""}
              onChange={handleChange}
              step="0.001"
              min="0"
            />
          </div>
          <div className={styles.formItem}>
            <label>Type:</label>
            <select
              name="costTypeId"
              className={styles.selectInput}
              value={costDetail.costTypeId || ""}
              onChange={handleChange}
            >
              <option value="">Select cost type</option>
              {costTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formItem}>
            <label>Cost:</label>
            <select
              name="costId"
              className={styles.selectInput}
              value={costDetail.costId || ""}
              onChange={handleChange}
            >
              <option value="">Select cost</option>
              {costs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formItem}>
            <label>Amt (Local):</label>
            <input
              type="number"
              className={styles.numericInput}
              value={costDetail.amountLocalCurrency || ""}
              step="0.001"
            />
          </div>
          <div className={styles.formItem}>
            <label>Amt (Report):</label>
            <input
              type="number"
              className={styles.numericInput}
              value={costDetail.amountReportingCurrency || ""}
              step="0.001"
            />
          </div>
          <div className={styles.formItem}>
            <label>Amt (GBP):</label>
            <input
              type="number"
              className={styles.numericInput}
              value={costDetail.amountGBP || ""}
              step="0.001"
            />
          </div>
          <div className={styles.formItem}>
            <label>Amt (Euro):</label>
            <input
              type="number"
              className={styles.numericInput}
              value={costDetail.amountEuro || ""}
              step="0.001"
            />
          </div>
          <div className={styles.buttonRow}>
            <button className={styles.saveButton} onClick={handleSave}>
              Save
            </button>
            <button className={styles.deleteButton} onClick={handleDelete}>
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(CostDetailItem);
