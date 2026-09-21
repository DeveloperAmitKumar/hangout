import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500",
        secondary:
          "bg-indigo-100 text-indigo-900 hover:bg-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-100 dark:hover:bg-indigo-500/25",
        outline:
          "border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
        ghost: "text-indigo-700 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-white/10",
        danger: "bg-rose-600 text-white shadow-lg shadow-rose-600/25 hover:bg-rose-500",
      },
      size: {
        md: "px-4 py-2.5",
        sm: "min-h-[40px] px-3 py-1.5 text-[13px]",
        icon: "h-11 w-11 p-0 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
