import * as React from "react"
import { cn } from "cn"

function Switch({
  className,
  checked,
  onCheckedChange,
  ...props
}: { checked?: boolean; onCheckedChange?(v: boolean): void } & React.ComponentProps<"span">) {
  const [internalState, setInternalState] = React.useState(false)
  const isControlled = checked !== undefined
  
  return (
    <span
      data-slot="switch"
      role="switch"
      aria-checked={checked ?? internalState}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        (checked ?? internalState) ? "bg-primary" : "bg-input",
        className
      )}
      onClick={() => {
        if (isControlled && onCheckedChange) {
          onCheckedChange(!checked!)
        } else {
          setInternalState((prev) => !prev)
        }
      }}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          (checked ?? internalState) ? "translate-x-4" : "translate-x-0"
        )}
      />
    </span>
  )
}

export { Switch }
