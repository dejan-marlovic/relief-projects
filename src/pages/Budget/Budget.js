import React from "react";
import styles from "./Budget.module.scss";

const Budget = ({ budget }) => {
  return (
    <div className={styles.budgetContainer}>
      <div className={styles.formContainer}>
        <h3>Budget Details</h3>

        <div className={styles.fullWidthField}>
          <label>Budget Description:</label>
          <p>{budget.budgetDescription}</p>
        </div>

        <div className={`${styles.formItem} ${styles.narrowField}`}>
          <label>Budget Preparation Date:</label>
          <p>{budget.budgetPreparationDate?.slice(0, 16)}</p>
        </div>

        <div className={`${styles.formItem} ${styles.narrowField}`}>
          <label>Total Amount:</label>
          <p>{budget.totalAmount}</p>
        </div>

        {/* You can show more fields here if needed */}
      </div>
    </div>
  );
};

export default Budget;
