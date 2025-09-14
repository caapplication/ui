import React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-yellow-500/20 text-yellow-300",
        secondary:
          "border-transparent bg-blue-500/20 text-blue-300",
        destructive:
          "border-transparent bg-red-500/20 text-red-300",
        success:
          "border-transparent bg-green-500/20 text-green-300",
        warning:
          "border-transparent bg-orange-500/20 text-orange-300",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }