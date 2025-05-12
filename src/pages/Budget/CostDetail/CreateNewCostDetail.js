import React, { useState, useEffect, useContext } from "react";
import { ProjectContext } from "../../../context/ProjectContext";
import styles from "./CostDetail.module.scss";

const CreateNewCostDetail = ({ budgetId, onClose, onCostDetailCreated }) => {
  const { selectedProjectId } = useContext(ProjectContext);
  const [costDetail, setCostDetail] = useState({
    costDescription: "",
    noOfUnits: "",
    frequencyMonths: "",
    unitPrice: "",
    percentageCharging: "",
    costTypeId: "",
    costId: "",
  });
  const [costTypes, setCostTypes] = useState([]);
  const [costs, setCosts] = useState([]);

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
      } catch (err) {
        console.error("Error fetching cost types or costs:", err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCostDetail((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem("authToken");
    try {
      const payload = {
        budgetId,
        projectId: selectedProjectId,
        costTypeId: costDetail.costTypeId,
        costId: costDetail.costId,
        costDescription: costDetail.costDescription,
        noOfUnits: parseInt(costDetail.noOfUnits),
        frequencyMonths: parseInt(costDetail.frequencyMonths),
        unitPrice: parseFloat(costDetail.unitPrice),
        percentageCharging: parseFloat(costDetail.percentageCharging),
      };
      const response = await fetch("http://localhost:8080/api/cost-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create cost detail");
      const created = await response.json();
      onCostDetailCreated(created);
      onClose();
    } catch (err) {
      console.error("Create cost detail error:", err);
      alert("Error creating cost detail.");
    }
  };

  return (
    <div className={styles.costDetailContainer}>
      <div className={styles.formContainer}>
        <h3>Create New Cost Detail</h3>
        <form className={styles.formTwoColumn}>
          <div className={styles.formColumnLeft}>
            <div>
              <label>Description:</label>
              <textarea
                name="costDescription"
                className={styles.textareaInput}
                value={costDetail.costDescription}
                onChange={handleChange}
                placeholder="Cost Description"
              />
            </div>
            <div>
              <label>Number of Units:</label>
              <input
                type="number"
                name="noOfUnits"
                className={styles.textInput}
                value={costDetail.noOfUnits}
                onChange={handleChange}
                placeholder="Number of Units"
              />
            </div>
            <div>
              <label>Frequency (Months):</label>
              <input
                type="number"
                name="frequencyMonths"
                className={styles.textInput}
                value={costDetail.frequencyMonths}
                onChange={handleChange}
                placeholder="Frequency in Months"
              />
            </div>
            <div>
              <label>Unit Price:</label>
              <input
                type="number"
                name="unitPrice"
                className={styles.textInput}
                value={costDetail.unitPrice}
                onChange={handleChange}
                placeholder="Unit Price"
                step="0.01"
              />
            </div>
            <div>
              <label>Percentage Charging:</label>
              <input
                type="number"
                name="percentageCharging"
                className={styles.textInput}
                value={costDetail.percentageCharging}
                onChange={handleChange}
                placeholder="Percentage Charging"
                step="0.001"
              />
            </div>
            <div>
              <label>Cost Type:</label>
              <select
                name="costTypeId"
                className={styles.textInput}
                value={costDetail.costTypeId}
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
            <div>
              <label>Cost:</label>
              <select
                name="costId"
                className={styles.textInput}
                value={costDetail.costId}
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
            <div className={styles.buttonRow}>
              <button onClick={handleSave} className={styles.saveButton}>
                Create Cost Detail
              </button>
              <button onClick={onClose} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNewCostDetail;
