import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RequireRole = ({ role, roles, children }) => {
  const location = useLocation();
  const { isLoading, user, hasAnyRole } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const requiredRoles = roles ?? [role];

  if (!hasAnyRole(...requiredRoles)) {
    return <Navigate to="/project" replace />;
  }

  return children;
};

export default RequireRole;
