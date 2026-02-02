import React, { useState } from "react";
import { FiSave, FiX, FiBriefcase } from "react-icons/fi";
import styles from "./CreatePosition.module.scss";

//Calling setPositionName("abc") causes React to re-run the component function CreatePosition
const CreatePosition = () => {
  //setPositionName is a function React gives you to update postionName
  //useState(...) returns: [stateValue, setStateFunction]
  //After typing "Project Manager", it becomes: ["Project Manager", function setPositionName(...) { ... }]
  //You don’t call useState again manually — React keeps track of it across renders.
  const [positionName, setPositionName] = useState("");

  return (
    <div className={styles.projectContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>
              <FiBriefcase style={{ position: "relative", top: 2 }} /> Create
              Position
            </h3>
            <p className={styles.pageSubtitle}>
              Add a new position to your master data list.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button type="button" className={styles.saveButton}>
              <FiSave /> Create
            </button>
            <button type="button" className={styles.deleteButton}>
              <FiX /> Reset
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Core details</div>
            <div className={styles.cardMeta}>Required field</div>
          </div>

          <div className={styles.formGroup}>
            <label>Position Name</label>
            <input
              className={styles.textInput}
              placeholder="e.g. Project Manager"
              //The <input> does not own its own value.
              //React state (postionName) is the single source of truth for what’s shown in the input.
              //So the input displays whatever postionName currently is.
              value={positionName}
              //This line connects typing to state updates
              onChange={(e) => setPositionName(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.bottomActions}>
          <button type="button" className={styles.saveButton}>
            <FiSave /> Create position
          </button>
          <button type="button" className={styles.deleteButton}>
            <FiX /> Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePosition;
