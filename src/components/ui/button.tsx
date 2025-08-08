import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary: "bg-blue-600 text-white hover:bg-blue-600/90",
      secondary:
        "bg-gray-100 dark:bg-gray-900 text-foreground hover:bg-gray-200/60 dark:hover:bg-gray-800",
      ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900",
    };
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
