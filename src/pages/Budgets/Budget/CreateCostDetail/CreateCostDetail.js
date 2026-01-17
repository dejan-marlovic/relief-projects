import React, { useState, useEffect } from "react";
import styles from "./CreateCostDetail.module.scss";

import { BASE_URL } from "../../../../config/api"; // adjust path if needed

const CreateCostDetail = ({ budgetId, onCreated = () => {} }) => {
  const [costTypes, setCostTypes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [form, setForm] = useState({
    costTypeId: "",
    costId: "",
    costDescription: "",
    noOfUnits: 1,
    unitPrice: 0,
    frequencyMonths: 1,
    percentageCharging: 0,
  });

  const fetchCostTypes = async (token) => {
    const res = await fetch(`${BASE_URL}/api/cost-types/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  };

  const fetchCosts = async (token) => {
    const res = await fetch(`${BASE_URL}/api/costs/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  };

  const createCostDetail = async (payload, token) => {
    const res = await fetch(`${BASE_URL}/api/cost-details`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to create cost detail");
    return await res.json();
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchOptions = async () => {
      try {
        const [types, costList] = await Promise.all([
          fetchCostTypes(token),
          fetchCosts(token),
        ]);
        setCostTypes(types);
        setCosts(costList);
      } catch (err) {
        console.error("Error fetching cost type/category options:", err);
      }
    };

    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("authToken");

    const {
      noOfUnits,
      unitPrice,
      frequencyMonths,
      percentageCharging,
      ...rest
    } = form;

    const rawTotal = noOfUnits * unitPrice * frequencyMonths;
    const chargedAmount = (rawTotal * percentageCharging) / 100;

    const fullPayload = {
      ...rest,
      noOfUnits,
      unitPrice,
      frequencyMonths,
      percentageCharging,
      budgetId,
      amountLocalCurrency: chargedAmount,
      amountReportingCurrency: chargedAmount,
      amountGBP: chargedAmount,
      amountEuro: chargedAmount,
    };

    try {
      await createCostDetail(fullPayload, token);
      onCreated?.();
      setForm({
        costTypeId: "",
        costId: "",
        costDescription: "",
        noOfUnits: 1,
        unitPrice: 0,
        frequencyMonths: 1,
        percentageCharging: 0,
      });
    } catch (error) {
      console.error("Error creating cost detail:", error);
      alert("Failed to create cost detail.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <h4 className={styles.formTitle}>Add New Cost Detail Row</h4>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="costTypeId">Cost Type</label>
          <select
            id="costTypeId"
            name="costTypeId"
            value={form.costTypeId}
            onChange={handleNumberChange}
            className={styles.select}
          >
            <option value="">Select Cost Type</option>
            {costTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.costTypeName}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="costId">Category</label>
          <select
            id="costId"
            name="costId"
            value={form.costId}
            onChange={handleNumberChange}
            className={styles.select}
          >
            <option value="">Select Category</option>
            {costs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.costName}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="costDescription">Description</label>
          <input
            id="costDescription"
            type="text"
            name="costDescription"
            value={form.costDescription}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="noOfUnits">Units</label>
          <input
            id="noOfUnits"
            type="number"
            name="noOfUnits"
            value={form.noOfUnits}
            onChange={handleNumberChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="unitPrice">Unit Price</label>
          <input
            id="unitPrice"
            type="number"
            name="unitPrice"
            value={form.unitPrice}
            onChange={handleNumberChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="frequencyMonths">Frequency (months)</label>
          <input
            id="frequencyMonths"
            type="number"
            name="frequencyMonths"
            value={form.frequencyMonths}
            onChange={handleNumberChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="percentageCharging">% Charging</label>
          <input
            id="percentageCharging"
            type="number"
            name="percentageCharging"
            value={form.percentageCharging}
            onChange={handleNumberChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label style={{ visibility: "hidden" }}>Submit</label>
          <button type="submit" className={styles.button}>
            Add Cost Detail
          </button>
        </div>
      </div>
    </form>
  );
};

export default CreateCostDetail;
