import ActionButton from "../ActionButton/ActionButton";
import { FiX } from "react-icons/fi";
import styles from "./ClearFiltersButton.module.scss";

const ClearFiltersButton = ({ onClick }) => (
  <ActionButton type="button" className={styles.button} onClick={onClick}>
    <FiX aria-hidden="true" />
    Clear filters
  </ActionButton>
);

export default ClearFiltersButton;
