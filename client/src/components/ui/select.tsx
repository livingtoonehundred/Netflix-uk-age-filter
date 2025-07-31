import * as React from "react"

export interface SelectProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
}

export const Select: React.FC<SelectProps> = ({ children, value, onValueChange, defaultValue }) => {
  return <div data-select-root>{children}</div>
}

export const SelectContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return <div className={`select-content ${className || ''}`}>{children}</div>
}

export const SelectItem: React.FC<{ children: React.ReactNode; value: string; className?: string }> = ({ children, value, className }) => {
  return <div className={`select-item ${className || ''}`} data-value={value}>{children}</div>
}

export const SelectTrigger: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return <button className={`select-trigger ${className || ''}`}>{children}</button>
}

export const SelectValue: React.FC<{ placeholder?: string; className?: string }> = ({ placeholder, className }) => {
  return <span className={`select-value ${className || ''}`}>{placeholder}</span>
}
