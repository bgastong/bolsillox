import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function themeProvider({ children }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  });

  function toggleTheme() {
    setTheme((currentTheme) => {
      return currentTheme === "light" ? "dark" : "light";
    });
  }
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );

  export function useTheme() {
    const context = useContext(ThemeContext);
  }

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
