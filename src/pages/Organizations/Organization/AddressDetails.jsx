// src/pages/Organizations/Organization/AddressDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import styles from "./AddressDetails.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX, FiPlus } from "react-icons/fi";

const BASE_URL = "http://localhost:8080";

const blankAddress = {
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

async function safeParseJsonResponse(res) {
  const raw = await res.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const formatAddressLabel = (a) => {
  if (!a) return "";
  const parts = [a.street, a.city, a.state, a.postalCode, a.country].filter(
    Boolean
  );
  return parts.join(", ");
};

const AddressDetails = ({ organizationId }) => {
  const [org, setOrg] = useState(null); // OrganizationDTO
  const [address, setAddress] = useState(null); // AddressDTO
  const [addressOptions, setAddressOptions] = useState([]); // active addresses

  const [switchToId, setSwitchToId] = useState("");

  const [editingId, setEditingId] = useState(null); // address.id or "new"
  const [editedValues, setEditedValues] = useState({});

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { [rowKey]: { fieldName: msg } }

  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const authHeaders = useMemo(
    () =>
      token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" },
    [token]
  );

  const load = async () => {
    if (!organizationId) return;

    setFormError("");

    try {
      // org (to know current addressId)
      const orgRes = await fetch(
        `${BASE_URL}/api/organizations/${organizationId}`,
        { headers: authHeaders }
      );
      if (!orgRes.ok) throw new Error("Failed to load organization");
      const orgDto = await orgRes.json();
      setOrg(orgDto);

      // address options
      const optionsRes = await fetch(`${BASE_URL}/api/addresses/active`, {
        headers: authHeaders,
      });
      const options = optionsRes.ok ? await optionsRes.json() : [];
      setAddressOptions(
        Array.isArray(options) ? options : options ? [options] : []
      );

      // current address
      if (orgDto?.addressId) {
        const addrRes = await fetch(
          `${BASE_URL}/api/addresses/${orgDto.addressId}`,
          { headers: authHeaders }
        );
        if (addrRes.ok) {
          setAddress(await addrRes.json());
        } else {
          setAddress(null);
        }
      } else {
        setAddress(null);
      }

      setSwitchToId("");
    } catch (e) {
      console.error(e);
      setFormError(
        e.message || "Failed to load address for this organization."
      );
    }
  };

  useEffect(() => {
    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const startEdit = () => {
    if (!address?.id) return;
    const id = address.id;

    setEditingId(id);
    setEditedValues((prev) => ({
      ...prev,
      [id]: {
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        postalCode: address.postalCode || "",
        country: address.country || "",
      },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFormError("");
  };

  const startCreate = () => {
    setEditingId("new");
    setEditedValues((prev) => ({ ...prev, new: { ...blankAddress } }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.new;
      return next;
    });
    setFormError("");
  };

  const onChange = (field, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: value,
      },
    }));
  };

  const cancel = () => {
    const id = editingId;
    setEditingId(null);

    setEditedValues((prev) => {
      const next = { ...prev };
      delete next.new;
      if (id && next[id]) delete next[id];
      return next;
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.new;
      if (id && next[id]) delete next[id];
      return next;
    });

    setFormError("");
  };

  // ✅ Uses the NEW backend endpoint
  const assignAddressToOrg = async (addressId) => {
    const res = await fetch(
      `${BASE_URL}/api/organizations/${organizationId}/address/${addressId}`,
      { method: "PUT", headers: authHeaders }
    );

    if (!res.ok) {
      const data = await safeParseJsonResponse(res);
      throw new Error(
        data?.message || `Failed to assign address (${res.status}).`
      );
    }
  };

  const save = async () => {
    const id = editingId;
    const values = editedValues[id];
    if (!values) return;

    setFormError("");
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

    try {
      if (id === "new") {
        // create new address then assign it
        const createRes = await fetch(`${BASE_URL}/api/addresses`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            street: values.street || "",
            city: values.city || "",
            state: values.state || null,
            postalCode: values.postalCode || null,
            country: values.country || null,
          }),
        });

        if (!createRes.ok) {
          const data = await safeParseJsonResponse(createRes);
          if (data?.fieldErrors) {
            setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
          }
          throw new Error(data?.message || "Failed to create address.");
        }

        const created = await createRes.json();
        if (!created?.id)
          throw new Error("Address created but no id returned.");

        await assignAddressToOrg(created.id);

        await load();
        cancel();
        return;
      }

      // update existing address fields
      const updateRes = await fetch(`${BASE_URL}/api/addresses/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          id,
          street: values.street || "",
          city: values.city || "",
          state: values.state || null,
          postalCode: values.postalCode || null,
          country: values.country || null,
        }),
      });

      if (!updateRes.ok) {
        const data = await safeParseJsonResponse(updateRes);
        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
        }
        throw new Error(data?.message || "Failed to update address.");
      }

      await load();
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to save address.");
    }
  };

  const remove = async () => {
    if (!address?.id) return;
    if (
      !window.confirm(
        "Delete this address? (Organizations/projects may be reassigned to default address)"
      )
    )
      return;

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/addresses/${address.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        throw new Error(data?.message || "Failed to delete address.");
      }

      await load();
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to delete address.");
    }
  };

  const doSwitch = async () => {
    if (!switchToId) return;
    setFormError("");
    try {
      await assignAddressToOrg(switchToId);
      await load();
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to switch address.");
    }
  };

  const getRowFieldError = (rowKey, name) =>
    fieldErrors?.[rowKey] ? fieldErrors[rowKey][name] : undefined;

  const hasRowError = (rowKey, name) => Boolean(getRowFieldError(rowKey, name));

  const inputClassFor = (rowKey, name) =>
    `${styles.input} ${hasRowError(rowKey, name) ? styles.inputError : ""}`;

  const FieldError = ({ rowKey, name }) => {
    const msg = getRowFieldError(rowKey, name);
    return msg ? <div className={styles.fieldError}>{msg}</div> : null;
  };

  const isEditingCurrent =
    editingId && address?.id && String(editingId) === String(address.id);
  const ev = editedValues[editingId] || {};

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          Address for organization #{organizationId}
        </div>

        <div className={styles.headerRight}>
          <select
            className={styles.select}
            value={switchToId}
            onChange={(e) => setSwitchToId(e.target.value)}
            disabled={!addressOptions?.length || editingId === "new"}
            title="Switch to an existing address"
          >
            <option value="">Switch to existing address…</option>
            {addressOptions.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} — {formatAddressLabel(a)}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={doSwitch}
            disabled={
              !switchToId ||
              String(switchToId) === String(org?.addressId) ||
              editingId === "new"
            }
            title="Assign selected address to this organization"
          >
            Assign
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={startCreate}
            disabled={editingId === "new"}
          >
            <FiPlus /> New Address
          </button>
        </div>
      </div>

      {formError && <div className={styles.errorBanner}>{formError}</div>}

      {!address && editingId !== "new" && (
        <p className={styles.noData}>
          No address loaded for this organization.
        </p>
      )}

      <div className={styles.table}>
        <div className={`${styles.gridRow} ${styles.headerRow}`}>
          <div className={`${styles.headerCell} ${styles.stickyColHeader}`}>
            Actions
          </div>
          <div className={styles.headerCell}>Street</div>
          <div className={styles.headerCell}>City</div>
          <div className={styles.headerCell}>State</div>
          <div className={styles.headerCell}>Postal</div>
          <div className={styles.headerCell}>Country</div>
        </div>

        {address?.id && (
          <div
            className={`${styles.gridRow} ${styles.dataRow} ${styles.hoverable}`}
          >
            <div className={`${styles.cell} ${styles.stickyCol}`}>
              {isEditingCurrent ? (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.iconCircleBtn}
                    onClick={save}
                    title="Save"
                    aria-label="Save"
                  >
                    <FiSave />
                  </button>
                  <button
                    type="button"
                    className={styles.dangerIconBtn}
                    onClick={cancel}
                    title="Cancel"
                    aria-label="Cancel"
                  >
                    <FiX />
                  </button>
                </div>
              ) : (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.iconCircleBtn}
                    onClick={startEdit}
                    title="Edit"
                    aria-label="Edit"
                    disabled={editingId === "new"}
                  >
                    <FiEdit />
                  </button>
                  <button
                    type="button"
                    className={styles.dangerIconBtn}
                    onClick={remove}
                    title="Delete"
                    aria-label="Delete"
                    disabled={editingId === "new"}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              )}
            </div>

            <div className={styles.cell}>
              {isEditingCurrent ? (
                <>
                  <input
                    className={inputClassFor(address.id, "street")}
                    type="text"
                    value={ev.street ?? address.street ?? ""}
                    onChange={(e) => onChange("street", e.target.value)}
                  />
                  <FieldError rowKey={address.id} name="street" />
                </>
              ) : (
                address.street || "-"
              )}
            </div>

            <div className={styles.cell}>
              {isEditingCurrent ? (
                <>
                  <input
                    className={inputClassFor(address.id, "city")}
                    type="text"
                    value={ev.city ?? address.city ?? ""}
                    onChange={(e) => onChange("city", e.target.value)}
                  />
                  <FieldError rowKey={address.id} name="city" />
                </>
              ) : (
                address.city || "-"
              )}
            </div>

            <div className={styles.cell}>
              {isEditingCurrent ? (
                <>
                  <input
                    className={inputClassFor(address.id, "state")}
                    type="text"
                    value={ev.state ?? address.state ?? ""}
                    onChange={(e) => onChange("state", e.target.value)}
                  />
                  <FieldError rowKey={address.id} name="state" />
                </>
              ) : (
                address.state || "-"
              )}
            </div>

            <div className={styles.cell}>
              {isEditingCurrent ? (
                <>
                  <input
                    className={inputClassFor(address.id, "postalCode")}
                    type="text"
                    value={ev.postalCode ?? address.postalCode ?? ""}
                    onChange={(e) => onChange("postalCode", e.target.value)}
                  />
                  <FieldError rowKey={address.id} name="postalCode" />
                </>
              ) : (
                address.postalCode || "-"
              )}
            </div>

            <div className={styles.cell}>
              {isEditingCurrent ? (
                <>
                  <input
                    className={inputClassFor(address.id, "country")}
                    type="text"
                    value={ev.country ?? address.country ?? ""}
                    onChange={(e) => onChange("country", e.target.value)}
                  />
                  <FieldError rowKey={address.id} name="country" />
                </>
              ) : (
                address.country || "-"
              )}
            </div>
          </div>
        )}

        {editingId === "new" && (
          <div
            className={`${styles.gridRow} ${styles.dataRow} ${styles.hoverable}`}
          >
            <div className={`${styles.cell} ${styles.stickyCol}`}>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.iconCircleBtn}
                  onClick={save}
                  title="Save"
                  aria-label="Save"
                >
                  <FiSave />
                </button>
                <button
                  type="button"
                  className={styles.dangerIconBtn}
                  onClick={cancel}
                  title="Cancel"
                  aria-label="Cancel"
                >
                  <FiX />
                </button>
              </div>
            </div>

            <div className={styles.cell}>
              <input
                className={inputClassFor("new", "street")}
                type="text"
                value={editedValues.new?.street ?? ""}
                onChange={(e) => onChange("street", e.target.value)}
                placeholder="Street"
              />
              <FieldError rowKey="new" name="street" />
            </div>

            <div className={styles.cell}>
              <input
                className={inputClassFor("new", "city")}
                type="text"
                value={editedValues.new?.city ?? ""}
                onChange={(e) => onChange("city", e.target.value)}
                placeholder="City"
              />
              <FieldError rowKey="new" name="city" />
            </div>

            <div className={styles.cell}>
              <input
                className={inputClassFor("new", "state")}
                type="text"
                value={editedValues.new?.state ?? ""}
                onChange={(e) => onChange("state", e.target.value)}
                placeholder="State"
              />
              <FieldError rowKey="new" name="state" />
            </div>

            <div className={styles.cell}>
              <input
                className={inputClassFor("new", "postalCode")}
                type="text"
                value={editedValues.new?.postalCode ?? ""}
                onChange={(e) => onChange("postalCode", e.target.value)}
                placeholder="Postal code"
              />
              <FieldError rowKey="new" name="postalCode" />
            </div>

            <div className={styles.cell}>
              <input
                className={inputClassFor("new", "country")}
                type="text"
                value={editedValues.new?.country ?? ""}
                onChange={(e) => onChange("country", e.target.value)}
                placeholder="Country"
              />
              <FieldError rowKey="new" name="country" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressDetails;
