import { FiX } from "react-icons/fi";
import styles from "./ClearFiltersButton.module.scss";

const ClearFiltersButton = ({ onClick }) => (
  <button type="button" className={styles.button} onClick={onClick}>
    <FiX aria-hidden="true" />
    Clear filters
  </button>
);

export default ClearFiltersButton;
