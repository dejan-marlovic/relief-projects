import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BASE_URL } from "../config/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("authToken");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("authToken");

    if (!token || token === "null" || token === "undefined") {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        clearAuth();
        return null;
      }

      if (!response.ok) {
        throw new Error(`Unable to load current user (${response.status})`);
      }

      const currentUser = await response.json();
      setUser(currentUser);
      return currentUser;
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    refreshUser().catch((error) => {
      console.error("Unable to restore authenticated user:", error);
    });
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, roles: user?.roles ?? [], isLoading, refreshUser, clearAuth }),
    [user, isLoading, refreshUser, clearAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
