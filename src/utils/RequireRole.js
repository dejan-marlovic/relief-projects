import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RequireRole = ({ role, children }) => {
  const location = useLocation();
  const { isLoading, user, hasRole } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!hasRole(role)) {
    return <Navigate to="/project" replace />;
  }

  return children;
};

export default RequireRole;
