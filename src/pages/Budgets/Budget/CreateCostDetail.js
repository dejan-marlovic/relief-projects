import React, { useState, useEffect } from "react";

const BASE_URL = "http://localhost:8080";

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

  // 🔄 Fetch: Cost Types
  const fetchCostTypes = async (token) => {
    const res = await fetch(`${BASE_URL}/api/cost-types/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  };

  // 🔄 Fetch: Costs
  const fetchCosts = async (token) => {
    const res = await fetch(`${BASE_URL}/api/costs/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  };

  // 💾 POST: Create new cost detail
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

  // ⏳ On mount, fetch dropdown options
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
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <h4>Add New Cost Detail</h4>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <select
          name="costTypeId"
          value={form.costTypeId}
          onChange={handleNumberChange}
        >
          <option value="">Select Cost Type</option>
          {costTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.costTypeName}
            </option>
          ))}
        </select>

        <select name="costId" value={form.costId} onChange={handleNumberChange}>
          <option value="">Select Category</option>
          {costs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.costName}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="costDescription"
          placeholder="Description"
          value={form.costDescription}
          onChange={handleChange}
        />

        <input
          type="number"
          name="noOfUnits"
          placeholder="Units"
          value={form.noOfUnits}
          onChange={handleNumberChange}
        />

        <input
          type="number"
          name="unitPrice"
          placeholder="Unit Price"
          value={form.unitPrice}
          onChange={handleNumberChange}
        />

        <input
          type="number"
          name="frequencyMonths"
          placeholder="Frequency (months)"
          value={form.frequencyMonths}
          onChange={handleNumberChange}
        />

        <input
          type="number"
          name="percentageCharging"
          placeholder="% Charging"
          value={form.percentageCharging}
          onChange={handleNumberChange}
        />

        <button type="submit">Add Cost Detail</button>
      </div>
    </form>
  );
};

export default CreateCostDetail;
