import * as React from "react"

export interface MotionProps {
  children: React.ReactNode
  className?: string
  initial?: any
  animate?: any
  exit?: any
  transition?: any
}

export const Motion: React.FC<MotionProps> = ({ children, className, ...props }) => {
  return <div className={className} {...props}>{children}</div>
}
