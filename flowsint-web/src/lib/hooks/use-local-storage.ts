import { Dispatch, SetStateAction, useEffect, useState } from 'react';

export default function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState(initialValue);
    const [firstLoadDone, setFirstLoadDone] = useState(false);

    useEffect(() => {
        const fromLocal = () => {
            if (typeof window === 'undefined') {
                return initialValue;
            }
            try {
                const item = window.localStorage.getItem(key);
                return item ? JSON.parse(item) as T : initialValue;
            } catch (error) {
                console.error(error);
                return initialValue;
            }
        };

        // Only set stored value if it hasn't been set yet (on initial load)
        if (!firstLoadDone) {
            setStoredValue(fromLocal());
            setFirstLoadDone(true);
        }
    }, [firstLoadDone, initialValue, key]); // Only run when first load is done, initialValue, or key change

    useEffect(() => {

        if (!firstLoadDone) return;

        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(storedValue));
            }
        } catch (error) {
            console.log(error);
        }
    }, [storedValue, firstLoadDone, key]); // Update localStorage when storedValue changes

    return [storedValue, setStoredValue];
}