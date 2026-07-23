import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "relative inline-flex items-center justify-center shrink-0 cursor-pointer rounded-full transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:bg-accent/70",
        active: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        danger: "bg-destructive text-white hover:bg-destructive/90",
        ghost: "bg-transparent text-foreground hover:bg-accent",
      },
      size: {
        sm: "h-9 w-9",
        md: "h-11 w-11",
        lg: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, label, children, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  ),
);
IconButton.displayName = "IconButton";
