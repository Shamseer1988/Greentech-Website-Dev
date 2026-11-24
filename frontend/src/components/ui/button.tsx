import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// shadcn/ui button with Green Tech variants. Use buttonVariants() on links.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 border border-transparent text-center font-semibold transition-colors select-none disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        default: "bg-green-700 text-white hover:bg-green-800",
        rose: "bg-rose text-white hover:bg-rose-700",
        mint: "bg-mint text-deep hover:bg-mint/85",
        whatsapp: "bg-whatsapp text-white hover:bg-[#12703c]",
        white: "bg-white text-ink hover:bg-sage",
        outline: "border-field bg-white text-ink hover:border-green-700 hover:text-green-700",
        glass: "border-white/30 text-white hover:bg-white/10",
      },
      size: {
        sm: "min-h-11 rounded-md px-4 text-sm",
        default: "min-h-12 rounded-lg px-5 text-[15px]",
        lg: "min-h-13 rounded-xl px-6 text-base",
        icon: "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
