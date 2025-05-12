import React, { useState, useEffect, useCallback } from "react";
import CostDetailItem from "./CostDetailItem";
import CreateNewCostDetail from "./CreateNewCostDetail";
import styles from "./CostDetail.module.scss";

const CostDetail = ({ budgetId }) => {
  const [costDetails, setCostDetails] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCostDetailId, setSelectedCostDetailId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  // Log budgetId prop on mount and changes
  useEffect(() => {
    console.log("CostDetail.js: Received budgetId:", budgetId);
  }, [budgetId]);

  const fetchCostDetails = useCallback(async () => {
    if (!budgetId) {
      console.log("CostDetail.js: No budgetId, skipping fetchCostDetails");
      setCostDetails([]);
      return;
    }
    const token = localStorage.getItem("authToken");
    const url = `http://localhost:8080/api/cost-details/by-budget/${budgetId}`;
    console.log(
      "CostDetail.js: Fetching cost details for budgetId:",
      budgetId,
      "URL:",
      url
    );
    console.log("CostDetail.js: Using token:", token ? "Present" : "Missing");
    console.log(
      "CostDetail.js: Retry attempt:",
      retryCount + 1,
      "of",
      maxRetries
    );
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("CostDetail.js: Fetch response status:", res.status);
      console.log("CostDetail.js: Response headers:", [
        ...res.headers.entries(),
      ]);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `HTTP error! Status: ${res.status}, Message: ${errorText}`
        );
      }
      const data = await res.json();
      console.log("CostDetail.js: Cost details fetched:", data);
      const normalized = Array.isArray(data) ? data : [];
      console.log("CostDetail.js: Normalized cost details:", normalized);
      setCostDetails(normalized);
      const selectedStillExists = normalized.some(
        (cd) => cd.costDetailId === selectedCostDetailId
      );
      if (!selectedStillExists) {
        console.log(
          "CostDetail.js: Clearing selectedCostDetailId - cost detail not found"
        );
        setSelectedCostDetailId(null);
      }
      // Reset retry count on successful fetch
      setRetryCount(0);
    } catch (err) {
      console.error(
        "CostDetail.js: Failed to fetch cost details:",
        err.message
      );
      if (retryCount < maxRetries) {
        console.log("CostDetail.js: Scheduling retry in", retryDelay, "ms");
        setTimeout(() => setRetryCount((prev) => prev + 1), retryDelay);
      } else {
        console.log("CostDetail.js: Max retries reached, giving up");
        setCostDetails([]);
      }
    }
  }, [budgetId, selectedCostDetailId, retryCount]);

  // Debounced fetch effect
  useEffect(() => {
    if (!budgetId) return;
    const debounceTimeout = setTimeout(() => {
      fetchCostDetails();
    }, 300); // 300ms debounce
    return () => clearTimeout(debounceTimeout);
  }, [budgetId, fetchCostDetails]);

  // Log costDetails and selectedCostDetailId changes
  useEffect(() => {
    console.log("CostDetail.js: costDetails updated:", costDetails);
    console.log("CostDetail.js: selectedCostDetailId:", selectedCostDetailId);
  }, [costDetails, selectedCostDetailId]);

  const handleNewCostDetail = (newCostDetail) => {
    console.log("CostDetail.js: New cost detail created:", newCostDetail);
    setCostDetails((prev) => [...prev, newCostDetail]);
    setSelectedCostDetailId(newCostDetail.costDetailId);
    setShowCreateForm(false);
  };

  // Log rendering of create form and cost detail list
  console.log("CostDetail.js: Rendering, showCreateForm:", showCreateForm);
  console.log(
    "CostDetail.js: Rendering, costDetails length:",
    costDetails.length
  );

  return (
    <div className={styles.container}>
      <button
        className={styles.createButton}
        onClick={() => {
          console.log("CostDetail.js: Opening create form");
          setShowCreateForm(true);
        }}
      >
        Create new cost detail for this budget
      </button>

      {showCreateForm && (
        <>
          {console.log("CostDetail.js: Rendering CreateNewCostDetail form")}
          <CreateNewCostDetail
            budgetId={budgetId}
            onClose={() => {
              console.log("CostDetail.js: Closing create form");
              setShowCreateForm(false);
            }}
            onCostDetailCreated={handleNewCostDetail}
          />
        </>
      )}

      <div className={styles.costDetailList}>
        {costDetails.length === 0 ? (
          <>
            {console.log("CostDetail.js: Rendering no cost details message")}
            <p>No cost details available for this budget.</p>
          </>
        ) : (
          <>
            {console.log("CostDetail.js: Rendering cost detail items")}
            {costDetails.map((costDetail) => (
              <CostDetailItem
                key={costDetail.costDetailId}
                costDetail={costDetail}
                isSelected={costDetail.costDetailId === selectedCostDetailId}
                onSelect={() => {
                  console.log(
                    "CostDetail.js: Selecting cost detail:",
                    costDetail.costDetailId
                  );
                  setSelectedCostDetailId(costDetail.costDetailId);
                }}
                onUpdated={fetchCostDetails}
                onDeleted={fetchCostDetails}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default CostDetail;
