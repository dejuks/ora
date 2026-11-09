import { Navigate } from "react-router-dom";
/** Name, email and password live on the shared account page. */
export default function AccountRedirect() { return <Navigate to="/account" replace />; }
