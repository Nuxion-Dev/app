import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    const [timeout, setTimeoutState] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (timeout)
            clearTimeout(timeout);

        const handler = setTimeout(() => setDebounced(value), delay);
        setTimeoutState(handler);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debounced;
}
