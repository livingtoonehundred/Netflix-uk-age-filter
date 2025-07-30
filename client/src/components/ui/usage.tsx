import * as React from "react"

export interface UsageProps {
  children?: React.ReactNode
  className?: string
}

export const Usage: React.FC<UsageProps> = ({ children, className, ...props }) => {
  return <div className={className} {...props}>{children}</div>
}
