import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "./SortableHeader.module.scss";

const SortableHeader = ({ label, sortKey, sortConfig, onSort }) => {
  const active = sortConfig?.key === sortKey;
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}${
        active
          ? `, currently ${sortConfig.direction === "asc" ? "ascending" : "descending"}`
          : ""
      }`}
    >
      <span>{label}</span>
      {active &&
        (sortConfig.direction === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
    </button>
  );
};

export default SortableHeader;
