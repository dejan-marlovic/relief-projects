import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit, FiLink, FiPlus, FiSave, FiStar, FiX } from "react-icons/fi";
import { BASE_URL } from "../../../config/api";
import styles from "./AddressDetails.module.scss";

const blankAddress = {
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

async function safeParseJsonResponse(response) {
  const raw = await response.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const formatAddressLabel = (address) =>
  [address?.street, address?.city, address?.state, address?.postalCode, address?.country]
    .filter(Boolean)
    .join(", ");

const AddressDetails = ({ organizationId, canManage = false }) => {
  const [associations, setAssociations] = useState([]);
  const [addressOptions, setAddressOptions] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busyAction, setBusyAction] = useState("");

  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const authHeaders = useMemo(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    }),
    [token]
  );

  const load = useCallback(async () => {
    if (!organizationId) return;
    setFormError("");

    try {
      const [linkedResponse, optionsResponse] = await Promise.all([
        fetch(`${BASE_URL}/api/organizations/${organizationId}/addresses`, {
          headers: authHeaders,
        }),
        fetch(`${BASE_URL}/api/addresses/active`, { headers: authHeaders }),
      ]);

      if (!linkedResponse.ok) {
        throw new Error("Failed to load addresses for this organization.");
      }

      const linked = await linkedResponse.json();
      const options = optionsResponse.ok ? await optionsResponse.json() : [];
      setAssociations(Array.isArray(linked) ? linked : []);
      setAddressOptions(Array.isArray(options) ? options : options ? [options] : []);
      setSelectedAddressId("");
    } catch (error) {
      console.error(error);
      setFormError(error.message || "Failed to load addresses for this organization.");
    }
  }, [authHeaders, organizationId]);

  useEffect(() => {
    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
    load();
  }, [load]);

  const linkedIds = useMemo(
    () => new Set(associations.map((association) => String(association.addressId))),
    [associations]
  );
  const availableOptions = addressOptions.filter(
    (address) => !linkedIds.has(String(address.id))
  );

  const startEdit = (address) => {
    if (!canManage) return;
    setEditingId(address.id);
    setEditedValues({
      [address.id]: {
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        postalCode: address.postalCode || "",
        country: address.country || "",
      },
    });
    setFieldErrors({});
    setFormError("");
  };

  const startCreate = () => {
    if (!canManage) return;
    setEditingId("new");
    setEditedValues({ new: { ...blankAddress } });
    setFieldErrors({});
    setFormError("");
  };

  const cancel = () => {
    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
  };

  const onChange = (field, value) => {
    setEditedValues((current) => ({
      ...current,
      [editingId]: { ...current[editingId], [field]: value },
    }));
  };

  const request = async (url, options, fallbackMessage) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await safeParseJsonResponse(response);
      const error = new Error(data?.message || fallbackMessage);
      error.fieldErrors = data?.fieldErrors;
      throw error;
    }
    return response;
  };

  const save = async () => {
    if (!canManage || !editingId) return;
    const rowKey = editingId;
    const values = editedValues[rowKey];
    if (!values) return;

    setBusyAction(`save-${rowKey}`);
    setFormError("");
    setFieldErrors({});

    try {
      const body = JSON.stringify({
        ...(rowKey === "new" ? {} : { id: rowKey }),
        street: values.street || "",
        city: values.city || "",
        state: values.state || null,
        postalCode: values.postalCode || null,
        country: values.country || null,
      });

      if (rowKey === "new") {
        await request(
          `${BASE_URL}/api/organizations/${organizationId}/addresses`,
          { method: "POST", headers: authHeaders, body },
          "Failed to create and link address."
        );
      } else {
        await request(
          `${BASE_URL}/api/addresses/${rowKey}`,
          { method: "PUT", headers: authHeaders, body },
          "Failed to update address."
        );
      }

      cancel();
      await load();
    } catch (error) {
      console.error(error);
      if (error.fieldErrors) setFieldErrors({ [rowKey]: error.fieldErrors });
      setFormError(error.message || "Failed to save address.");
    } finally {
      setBusyAction("");
    }
  };

  const addExisting = async () => {
    if (!canManage || !selectedAddressId) return;
    setBusyAction("link");
    setFormError("");
    try {
      await request(
        `${BASE_URL}/api/organizations/${organizationId}/addresses/${selectedAddressId}`,
        { method: "POST", headers: authHeaders },
        "Failed to link address."
      );
      await load();
    } catch (error) {
      console.error(error);
      setFormError(error.message || "Failed to link address.");
    } finally {
      setBusyAction("");
    }
  };

  const makePrimary = async (addressId) => {
    if (!canManage) return;
    setBusyAction(`primary-${addressId}`);
    setFormError("");
    try {
      await request(
        `${BASE_URL}/api/organizations/${organizationId}/addresses/${addressId}/primary`,
        { method: "PUT", headers: authHeaders },
        "Failed to make address primary."
      );
      await load();
    } catch (error) {
      console.error(error);
      setFormError(error.message || "Failed to make address primary.");
    } finally {
      setBusyAction("");
    }
  };

  const unlink = async (addressId) => {
    if (!canManage) return;
    if (!window.confirm("Remove this address from the organization? The address record will remain available.")) return;
    setBusyAction(`unlink-${addressId}`);
    setFormError("");
    try {
      await request(
        `${BASE_URL}/api/organizations/${organizationId}/addresses/${addressId}`,
        { method: "DELETE", headers: authHeaders },
        "Failed to remove address from organization."
      );
      await load();
    } catch (error) {
      console.error(error);
      setFormError(error.message || "Failed to remove address from organization.");
    } finally {
      setBusyAction("");
    }
  };

  const getFieldError = (rowKey, field) => fieldErrors?.[rowKey]?.[field];
  const inputClassFor = (rowKey, field) =>
    `${styles.input} ${getFieldError(rowKey, field) ? styles.inputError : ""}`;

  const renderField = (rowKey, address, field, placeholder) => {
    const editing = String(editingId) === String(rowKey);
    if (!editing) return address?.[field] || "-";
    return <>
      <input
        className={inputClassFor(rowKey, field)}
        type="text"
        value={editedValues[rowKey]?.[field] ?? ""}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
      />
      {getFieldError(rowKey, field) && (
        <div className={styles.fieldError}>{getFieldError(rowKey, field)}</div>
      )}
    </>;
  };

  const renderRow = (association, isNew = false) => {
    const address = isNew ? blankAddress : association.address;
    const rowKey = isNew ? "new" : address.id;
    const editing = String(editingId) === String(rowKey);
    const primary = !isNew && association.primary;
    const disabled = Boolean(busyAction);

    return (
      <div key={rowKey} className={`${styles.gridRow} ${styles.dataRow} ${styles.hoverable} ${primary ? styles.primaryRow : ""}`}>
        <div className={`${styles.cell} ${styles.stickyCol}`}>
          {editing ? (
            <div className={styles.actions}>
              <button type="button" className={styles.iconCircleBtn} onClick={save} disabled={disabled} title="Save" aria-label={`Save address ${rowKey}`}><FiSave /></button>
              <button type="button" className={styles.dangerIconBtn} onClick={cancel} disabled={disabled} title="Cancel" aria-label={`Cancel address ${rowKey}`}><FiX /></button>
            </div>
          ) : (
            <div className={styles.actions}>
              {canManage && <button type="button" className={styles.iconCircleBtn} onClick={() => startEdit(address)} disabled={Boolean(editingId) || disabled} title="Edit address" aria-label={`Edit address ${address.id}`}><FiEdit /></button>}
              {canManage && !primary && <button type="button" className={styles.iconCircleBtn} onClick={() => makePrimary(address.id)} disabled={Boolean(editingId) || disabled} title="Make primary" aria-label={`Make address ${address.id} primary`}><FiStar /></button>}
              {canManage && <button type="button" className={styles.unlinkBtn} onClick={() => unlink(address.id)} disabled={associations.length <= 1 || Boolean(editingId) || disabled} title={associations.length <= 1 ? "An organization must keep one address" : "Remove from organization"} aria-label={`Remove address ${address.id} from organization`}><FiLink /></button>}
            </div>
          )}
        </div>
        <div className={styles.cell}>{primary ? <span className={styles.primaryBadge}><FiStar /> Primary</span> : isNew ? "New" : "Additional"}</div>
        <div className={styles.cell}>{renderField(rowKey, address, "street", "Street")}</div>
        <div className={styles.cell}>{renderField(rowKey, address, "city", "City")}</div>
        <div className={styles.cell}>{renderField(rowKey, address, "state", "State")}</div>
        <div className={styles.cell}>{renderField(rowKey, address, "postalCode", "Postal code")}</div>
        <div className={styles.cell}>{renderField(rowKey, address, "country", "Country")}</div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Addresses for organization #{organizationId}</div>
          <div className={styles.subtitle}>{associations.length} linked address{associations.length === 1 ? "" : "es"}</div>
        </div>

        {canManage && (
          <div className={styles.headerRight}>
            <select className={styles.select} value={selectedAddressId} onChange={(event) => setSelectedAddressId(event.target.value)} disabled={!availableOptions.length || Boolean(editingId) || Boolean(busyAction)} aria-label="Existing address">
              <option value="">Add an existing address…</option>
              {availableOptions.map((address) => <option key={address.id} value={address.id}>#{address.id} — {formatAddressLabel(address)}</option>)}
            </select>
            <button type="button" className={styles.secondaryBtn} onClick={addExisting} disabled={!selectedAddressId || Boolean(editingId) || Boolean(busyAction)}><FiLink /> Add existing</button>
            <button type="button" className={styles.primaryBtn} onClick={startCreate} disabled={Boolean(editingId) || Boolean(busyAction)}><FiPlus /> New Address</button>
          </div>
        )}
      </div>

      {formError && <div className={styles.errorBanner} role="alert">{formError}</div>}
      {!associations.length && editingId !== "new" && <p className={styles.noData}>No active addresses linked to this organization.</p>}

      <div className={styles.table}>
        <div className={`${styles.gridRow} ${styles.headerRow}`}>
          <div className={`${styles.headerCell} ${styles.stickyColHeader}`}>Actions</div>
          <div className={styles.headerCell}>Type</div>
          <div className={styles.headerCell}>Street</div>
          <div className={styles.headerCell}>City</div>
          <div className={styles.headerCell}>State</div>
          <div className={styles.headerCell}>Postal</div>
          <div className={styles.headerCell}>Country</div>
        </div>
        {associations.map((association) => renderRow(association))}
        {editingId === "new" && renderRow(null, true)}
      </div>
    </div>
  );
};

export default AddressDetails;
