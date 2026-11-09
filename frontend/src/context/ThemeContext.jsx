
import React, {
  createContext,
  useContext,
  useState,
} from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarTheme, setSidebarTheme] = useState("maroon");
  const [isTopNav, setIsTopNav] = useState(false);

  const value = {
    isDarkMode,
    setIsDarkMode,
    sidebarTheme,
    setSidebarTheme,
    isTopNav,
    setIsTopNav,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside a ThemeProvider."
    );
  }

  return context;
}
