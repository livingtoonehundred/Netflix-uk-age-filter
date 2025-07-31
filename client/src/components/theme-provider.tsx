import * as React from "react"

export interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: "light" | "dark" | "system"
  storageKey?: string
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = "dark",
  storageKey = "theme" 
}) => {
  return <>{children}</>
}
