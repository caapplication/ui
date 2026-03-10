import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export function formatCurrencyINR(amount) {
	if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
	const formatter = new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		minimumFractionDigits: parseFloat(amount) % 1 === 0 ? 0 : 2,
		maximumFractionDigits: 2,
	});
	return formatter.format(amount);
}