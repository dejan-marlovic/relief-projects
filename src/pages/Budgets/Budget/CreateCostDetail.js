import React, { useState, useEffect } from "react";

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

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchOptions = async () => {
      try {
        const [typesRes, costsRes] = await Promise.all([
          fetch("http://localhost:8080/api/cost-types/active", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:8080/api/costs/active", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const types = await typesRes.json();
        const costList = await costsRes.json();

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
      const response = await fetch("http://localhost:8080/api/cost-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fullPayload),
      });

      if (!response.ok) throw new Error("Failed to create cost detail");

      await response.json(); // You could remove this if you don't use it anymore
      onCreated?.();
      // Reset form
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
