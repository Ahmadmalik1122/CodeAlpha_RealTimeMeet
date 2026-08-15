import { createContext } from "react";

// Plain context object lives in its own file (no JSX/components) so that
// react-refresh/only-export-components doesn't flag ToastContext.jsx, which
// exports the ToastProvider component only. Mirrors context/authContextValue.js.
const ToastContext = createContext(null);

export default ToastContext;
