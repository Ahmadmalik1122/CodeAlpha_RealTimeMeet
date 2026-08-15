import { createContext } from "react";

// Plain context object lives in its own file (no JSX/components) so that
// react-refresh/only-export-components doesn't flag AuthContext.jsx, which
// exports the AuthProvider component only.
const AuthContext = createContext(null);

export default AuthContext;
