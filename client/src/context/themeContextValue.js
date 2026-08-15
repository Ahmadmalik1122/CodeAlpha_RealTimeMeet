import { createContext } from "react";

// Plain context object in its own JSX-free file so react-refresh/only-
// export-components doesn't flag ThemeContext.jsx, which exports the
// ThemeProvider component only (same pattern as authContextValue.js and
// audioOutputContextValue.js).
const ThemeContext = createContext(null);

export default ThemeContext;
