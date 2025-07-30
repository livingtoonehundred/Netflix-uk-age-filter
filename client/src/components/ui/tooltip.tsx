import * as React from "react"

export interface TooltipProps {
  children: React.ReactNode
  content?: string
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content }) => {
  return <div title={content}>{children}</div>
}

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

export const TooltipTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

export const TooltipContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="tooltip-content">{children}</div>
}
