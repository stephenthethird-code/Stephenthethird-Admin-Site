import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, require: requiredRole = "employee" }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole === "superadmin" && user.role !== "superadmin") {
    return <Navigate to="/admin/review" replace />;
  }

  return children;
}
