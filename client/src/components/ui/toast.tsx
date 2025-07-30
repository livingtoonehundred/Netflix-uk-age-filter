import * as React from "react"

export interface ToastProps {
  id?: string
  title?: string
  description?: string
  action?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const Toast: React.FC<ToastProps & { children?: React.ReactNode }> = ({ children, ...props }) => {
  return <div {...props}>{children}</div>
}

export const ToastAction: React.FC<React.HTMLAttributes<HTMLButtonElement>> = (props) => {
  return <button {...props} />
}

export const ToastClose: React.FC<React.HTMLAttributes<HTMLButtonElement>> = (props) => {
  return <button {...props} />
}

export const ToastDescription: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  return <div {...props} />
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

export const ToastTitle: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  return <div {...props} />
}

export const ToastViewport: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  return <div {...props} />
}
