'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, useState } from 'react';
import { Eye, EyeOff, AlertCircle, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

// Form Input Component
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, leftIcon, rightIcon, className, type, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === 'password';

        return (
            <div className="w-full">
                {label && (
                    <label className="label">{label}</label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        type={isPassword && showPassword ? 'text' : type}
                        className={clsx(
                            'input',
                            leftIcon && 'pl-12',
                            (rightIcon || isPassword) && 'pr-12',
                            error && 'border-danger-500 focus:ring-danger-500',
                            className
                        )}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    )}
                    {rightIcon && !isPassword && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1 text-sm text-danger-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p className="mt-1 text-sm text-gray-500">{hint}</p>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';

// Textarea Component
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, hint, className, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="label">{label}</label>
                )}
                <textarea
                    ref={ref}
                    className={clsx(
                        'input min-h-[100px] resize-y',
                        error && 'border-danger-500 focus:ring-danger-500',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="mt-1 text-sm text-danger-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p className="mt-1 text-sm text-gray-500">{hint}</p>
                )}
            </div>
        );
    }
);
Textarea.displayName = 'Textarea';

// Select Component
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, className, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="label">{label}</label>
                )}
                <select
                    ref={ref}
                    className={clsx(
                        'input',
                        error && 'border-danger-500 focus:ring-danger-500',
                        className
                    )}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p className="mt-1 text-sm text-danger-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </p>
                )}
            </div>
        );
    }
);
Select.displayName = 'Select';

// Checkbox Component
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label: string;
    description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ label, description, className, ...props }, ref) => {
        return (
            <label className="flex items-start gap-3 cursor-pointer">
                <input
                    ref={ref}
                    type="checkbox"
                    className={clsx(
                        'mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500',
                        className
                    )}
                    {...props}
                />
                <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    {description && <p className="text-sm text-gray-500">{description}</p>}
                </div>
            </label>
        );
    }
);
Checkbox.displayName = 'Checkbox';

// Toggle/Switch Component
interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
    return (
        <label className={clsx('flex items-center justify-between', disabled && 'opacity-50 cursor-not-allowed')}>
            <div>
                {label && <p className="font-medium text-gray-900">{label}</p>}
                {description && <p className="text-sm text-gray-500">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={clsx(
                    'relative w-12 h-6 rounded-full transition-colors',
                    checked ? 'bg-primary-600' : 'bg-gray-300',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                )}
            >
                <span
                    className={clsx(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                        checked ? 'translate-x-7' : 'translate-x-1'
                    )}
                />
            </button>
        </label>
    );
}

// Search Input Component
interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onClear?: () => void;
}

export function SearchInput({ value, onChange, placeholder = 'ค้นหา...', onClear }: SearchInputProps) {
    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-12 pr-10 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
            <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {value && onClear && (
                <button
                    type="button"
                    onClick={onClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    loading,
    leftIcon,
    rightIcon,
    children,
    disabled,
    className,
    ...props
}: ButtonProps) {
    const variants = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'bg-danger-600 hover:bg-danger-700 text-white',
        ghost: 'hover:bg-gray-100 text-gray-700',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <button
            disabled={disabled || loading}
            className={clsx(
                'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all',
                variants[variant],
                sizes[size],
                (disabled || loading) && 'opacity-50 cursor-not-allowed',
                className
            )}
            {...props}
        >
            {loading && (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {!loading && leftIcon}
            {children}
            {rightIcon}
        </button>
    );
}

// Form field helper
export function FormField({
    children,
    error,
}: {
    children: React.ReactNode;
    error?: string;
}) {
    return (
        <div className="space-y-1">
            {children}
            {error && (
                <p className="text-sm text-danger-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </p>
            )}
        </div>
    );
}
