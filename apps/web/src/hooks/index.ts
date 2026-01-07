'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

// Hook for checking if user is authenticated
export function useAuth() {
    const router = useRouter();
    const { isAuthenticated, user, token, logout } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            if (!isAuthenticated || !token) {
                router.push('/auth/login');
            }
            setIsLoading(false);
        };

        checkAuth();
    }, [isAuthenticated, token, router]);

    return { isAuthenticated, user, isLoading, logout };
}

// Hook for role-based authorization
export function useAuthorize(allowedRoles: string[]) {
    const { user } = useAuthStore();
    const isAuthorized = user ? allowedRoles.includes(user.role) : false;

    return { isAuthorized, role: user?.role };
}

// Hook for debounced value
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Hook for local storage with SSR support
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    useEffect(() => {
        try {
            const item = localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
        } catch {
            // Ignore errors
        }
    }, [key]);

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch {
                // Ignore errors
            }
        },
        [key, storedValue]
    );

    return [storedValue, setValue];
}

// Hook for window size
export function useWindowSize() {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            setSize({ width: window.innerWidth, height: window.innerHeight });
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return size;
}

// Hook for media query
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);

        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
}

// Pre-defined media queries
export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
export const useIsTablet = () => useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)');

// Hook for click outside detection
export function useClickOutside<T extends HTMLElement>(
    callback: () => void
): React.RefObject<T> {
    const ref = useRef<T>(null);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [callback]);

    return ref;
}

// Hook for keyboard shortcuts
export function useKeyPress(
    targetKey: string,
    callback: () => void,
    options?: { ctrl?: boolean; alt?: boolean; shift?: boolean }
) {
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === targetKey) {
                const ctrlMatch = options?.ctrl ? event.ctrlKey || event.metaKey : true;
                const altMatch = options?.alt ? event.altKey : true;
                const shiftMatch = options?.shift ? event.shiftKey : true;

                if (ctrlMatch && altMatch && shiftMatch) {
                    event.preventDefault();
                    callback();
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [targetKey, callback, options]);
}

// Hook for copy to clipboard with feedback
export function useCopyToClipboard(): [boolean, (text: string) => Promise<void>] {
    const [copied, setCopied] = useState(false);

    const copy = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }, []);

    return [copied, copy];
}

// Hook for intersection observer
export function useIntersectionObserver(
    options?: IntersectionObserverInit
): [React.RefObject<HTMLDivElement>, boolean] {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsVisible(entry.isIntersecting);
        }, options);

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [options]);

    return [ref, isVisible];
}

// Hook for page title
export function usePageTitle(title: string) {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = `${title} | PharmaCare ERP`;
        return () => {
            document.title = previousTitle;
        };
    }, [title]);
}
