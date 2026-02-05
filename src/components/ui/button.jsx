import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import React from 'react';

const buttonVariants = cva(
	'inline-flex items-center justify-center rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
	{
		variants: {
			variant: {
				default: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-glow-primary',
				destructive:
					'bg-red-500 text-destructive-foreground shadow-lg hover:bg-red-600',
				approve:
					'!bg-green-600 text-white shadow-lg hover:!bg-green-700 !border-none',
				reject:
					'!bg-red-600 text-white shadow-lg hover:!bg-red-700 !border-none',
				outline:
					'border border-white/30 bg-white/10 hover:bg-white/20 text-white',
				secondary:
					'bg-white/10 text-secondary-foreground hover:bg-white/20',
				ghost: 'hover:bg-white/10 text-gray-300 hover:text-white',
				link: 'text-primary underline-offset-4 hover:underline',
			},
			size: {
				default: 'h-11 px-6 py-2',
				sm: 'h-9 rounded-md px-4',
				lg: 'h-12 rounded-lg px-8 text-base',
				icon: 'h-10 w-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

/**
 * Button component with tooltip support.
 * Pass a `tooltip` prop to show a tooltip on hover.
 * Example: <Button tooltip="Delete">...</Button>
 */
const Button = React.forwardRef(
	({ className, variant, size, asChild = false, tooltip, ...props }, ref) => {
		const Comp = asChild ? Slot : 'button';
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				title={tooltip}
				{...props}
			/>
		);
	}
);
Button.displayName = 'Button';

export { Button, buttonVariants };
