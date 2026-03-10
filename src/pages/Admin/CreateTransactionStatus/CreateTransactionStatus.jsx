import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateTransactionStatus";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

//never changed we copy it into state tranasctionStatusDetails once.
const intialTransactionStatusDetails = {
  transactionStatusName: "",
};

const validateTransactionStatusDetails = (values) => {
  const errors = {};

  const name = values.transactionStatusName?.tim() || "";

  if (!name) {
    errors.transactionStatusName =
      "Transaction status name is required (e.g. Payment made)";
  }

  return errors;
};

const CreateTransactionStatus = () => {
  const navigate = useNavigate();
  //we save the authFetch call and create new only if useNavigate changes
  const authFetch = useMemo(authFetch(useNavigate), [useNavigate]);

  //UI states
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldError, setFieldError] = useState({});

  //Form state
  const [transactionStatusDetails, setTransactionStatusDetails] = useState(
    intialTransactionStatusDetails,
  );
};
