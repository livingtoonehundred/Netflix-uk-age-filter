import * as React from "react"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`animate-pulse rounded-md bg-muted ${className}`}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"
