import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiRefreshCw, FiSave, FiShield, FiUsers } from "react-icons/fi";

import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";
import styles from "./UserRoleManagement.module.scss";

const ROLE_ORDER = [
  "ADMIN",
  "PROJECT_MANAGER",
  "FINANCE",
  "APPROVER",
  "VIEWER",
];

const ROLE_SUMMARIES = {
  ADMIN: "Full administration, recovery, configuration, and operational access.",
  PROJECT_MANAGER:
    "Projects, relationships, organizations, documents, and operational coordination.",
  FINANCE:
    "Budgets, cost details, transactions, allocations, payment orders, lines, and recipients.",
  APPROVER:
    "Reviews operational data and manages signatures, approvals, and booking.",
  VIEWER: "Read-only operational access with selection, statistics, and exports.",
};

const ACCESS_MATRIX = [
  ["View operational data", "Full", "Read", "Read", "Read", "Read"],
  ["Projects", "Manage", "Create / update", "Read", "Read", "Read"],
  ["Project links & memos", "Manage", "Manage", "Read", "Read", "Read"],
  ["Organizations & addresses", "Manage", "Create / update", "Read", "Read", "Read"],
  ["Documents", "Manage", "Create / update", "Read", "Read", "Read"],
  ["Budgets & cost details", "Manage", "Read", "Create / update", "Read", "Read"],
  ["Transactions & allocations", "Manage", "Read", "Create / update", "Read", "Read"],
  ["Payment orders & lines", "Manage", "Read", "Create / update", "Read", "Read"],
  ["Signatures & approvals", "Manage", "Read", "Read", "Manage", "Read"],
  ["Book / finalize payments", "Yes", "No", "No", "Yes", "No"],
  ["Recipients", "Manage", "Read", "Create / update / delete", "Read", "Read"],
  ["Bank details", "Manage", "No access", "Create / update", "Read", "No access"],
  ["Statistics & exports", "Yes", "Yes", "Yes", "Yes", "Yes"],
  ["Users & roles", "Manage", "No", "No", "No", "No"],
  ["Master data", "Manage", "No", "No", "No", "No"],
  ["Delete / restore core records", "Manage", "No", "Limited", "Signatures", "No"],
  ["Branding & system settings", "Manage", "No", "No", "No", "No"],
];

const normalizeRole = (role) =>
  typeof role === "string" ? role : role?.name ?? role?.roleName ?? "";

const sortRoles = (roles) =>
  [...new Set((roles || []).map(normalizeRole).filter(Boolean))].sort(
    (a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b),
  );

const sameRoles = (left, right) =>
  JSON.stringify(sortRoles(left)) === JSON.stringify(sortRoles(right));

const UserRoleManagement = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [draftRoles, setDraftRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        authFetch(`${BASE_URL}/api/users/active`),
        authFetch(`${BASE_URL}/api/roles`),
      ]);

      const [usersData, rolesData] = await Promise.all([
        safeReadJson(usersResponse),
        safeReadJson(rolesResponse),
      ]);

      if (!usersResponse.ok) {
        throw new Error(usersData?.message || "Failed to load active users.");
      }
      if (!rolesResponse.ok) {
        throw new Error(rolesData?.message || "Failed to load roles.");
      }

      const nextUsers = Array.isArray(usersData) ? usersData : [];
      const nextRoles = (Array.isArray(rolesData) ? rolesData : [])
        .map((role) => ({
          id: role.id ?? role.roleId,
          name: role.name ?? role.roleName,
          description: role.description ?? role.roleDescription ?? "",
        }))
        .filter((role) => role.name)
        .sort(
          (a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name),
        );

      setUsers(nextUsers);
      setRoles(nextRoles);
      setDraftRoles(
        Object.fromEntries(
          nextUsers.map((user) => [user.id, sortRoles(user.roles)]),
        ),
      );
    } catch (requestError) {
      console.error("Failed to load user roles:", requestError);
      setUsers([]);
      setRoles([]);
      setDraftRoles({});
      setError(requestError.message || "Failed to load users and roles.");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const roleCounts = useMemo(
    () =>
      Object.fromEntries(
        roles.map((role) => [
          role.name,
          users.filter((user) =>
            sortRoles(user.roles).includes(role.name),
          ).length,
        ]),
      ),
    [roles, users],
  );

  const toggleRole = (userId, roleName) => {
    setError("");
    setSuccess("");
    setDraftRoles((current) => {
      const next = new Set(current[userId] || []);
      if (next.has(roleName)) next.delete(roleName);
      else next.add(roleName);
      return { ...current, [userId]: sortRoles([...next]) };
    });
  };

  const resetUser = (user) => {
    setDraftRoles((current) => ({
      ...current,
      [user.id]: sortRoles(user.roles),
    }));
    setError("");
    setSuccess("");
  };

  const saveUser = async (user) => {
    const nextRoles = sortRoles(draftRoles[user.id]);
    if (nextRoles.length === 0) {
      setError(`At least one role is required for ${user.username}.`);
      return;
    }

    setSavingUserId(user.id);
    setError("");
    setSuccess("");

    try {
      const response = await authFetch(
        `${BASE_URL}/api/users/${user.id}/roles`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: nextRoles }),
        },
      );
      const data = await safeReadJson(response);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update user roles.");
      }

      const savedRoles = sortRoles(data?.roles ?? nextRoles);
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, ...data, roles: savedRoles } : item,
        ),
      );
      setDraftRoles((current) => ({ ...current, [user.id]: savedRoles }));
      setSuccess(`Roles updated for ${user.username}.`);
    } catch (requestError) {
      console.error("Failed to update user roles:", requestError);
      setError(requestError.message || "Failed to update user roles.");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h3><FiUsers /> Users & role access</h3>
          <p>Review active users, assign one or more roles, and see what each role permits.</p>
        </div>
        <button type="button" onClick={loadData} disabled={loading || savingUserId !== null}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {success && <div className={styles.successBanner}>{success}</div>}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <strong>{users.length}</strong><span>Active users</span>
        </div>
        {roles.map((role) => (
          <div className={styles.summaryCard} key={role.name}>
            <strong>{roleCounts[role.name] || 0}</strong>
            <span>{role.name.replaceAll("_", " ")}</span>
          </div>
        ))}
      </div>

      <div className={styles.roleGuide}>
        {roles.map((role) => (
          <article key={role.name}>
            <div><FiShield /><strong>{role.name.replaceAll("_", " ")}</strong></div>
            <p>{role.description || ROLE_SUMMARIES[role.name]}</p>
          </article>
        ))}
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.userTable}>
          <thead>
            <tr>
              <th>User</th>
              {roles.map((role) => <th key={role.name}>{role.name.replaceAll("_", " ")}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={roles.length + 2}>Loading users and roles...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={roles.length + 2}>No active users found.</td></tr>
            ) : users.map((user) => {
              const dirty = !sameRoles(draftRoles[user.id], user.roles);
              return (
                <tr key={user.id} className={dirty ? styles.dirtyRow : ""}>
                  <td>
                    <strong>{user.username}</strong>
                    <span>{user.email || `User #${user.id}`}</span>
                  </td>
                  {roles.map((role) => (
                    <td key={role.name}>
                      <input
                        type="checkbox"
                        checked={(draftRoles[user.id] || []).includes(role.name)}
                        onChange={() => toggleRole(user.id, role.name)}
                        disabled={savingUserId !== null}
                        aria-label={`Assign ${role.name} to ${user.username}`}
                      />
                    </td>
                  ))}
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" onClick={() => saveUser(user)} disabled={!dirty || savingUserId !== null}>
                        <FiSave /> {savingUserId === user.id ? "Saving..." : "Save"}
                      </button>
                      <button type="button" className={styles.resetButton} onClick={() => resetUser(user)} disabled={!dirty || savingUserId !== null}>
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className={styles.safetyNote}>
        The backend prevents removing the ADMIN role from the final active administrator. Role changes take effect in newly issued JWTs, so the affected user should sign in again.
      </p>

      <div className={styles.matrixHeader}>
        <h3>Current access matrix</h3>
        <p>This reflects the authorization rules currently implemented in the backend and frontend.</p>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.matrixTable}>
          <thead><tr><th>Area</th>{ROLE_ORDER.map((role) => <th key={role}>{role.replaceAll("_", " ")}</th>)}</tr></thead>
          <tbody>
            {ACCESS_MATRIX.map(([area, ...access]) => (
              <tr key={area}><td>{area}</td>{access.map((value, index) => <td key={`${area}-${ROLE_ORDER[index]}`}>{value}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserRoleManagement;
