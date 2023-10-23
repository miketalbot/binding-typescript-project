import {useCallback, useLayoutEffect, useState} from "react";
import {useBoundContext} from "@accordingly/bound";
import {useDeepTargetAndKey} from "./useDeepTargetAndKey";
import {handlers} from "./handlers";

/**
 * Hook to bind to a specific value within a nested object and provide
 * mechanisms to get and set its value.
 * This is useful for creating reactive bindings to specific properties within a complex object.
 * @template T The expected type of the bound value.
 * @param {string} path - The path to the desired value within the nested object.
 * @param {T} [defaultValue] - A default value to return if the desired value is not found.
 * @param {Record<string, any>} [target] - An optional target to use instead of the context target.
 * @returns {[T, (value: T | ((curr: T) => T)) => void]} A tuple containing the current value (or default value) and a function to set its value.
 */
export function useBoundValue<T = any>(path: string, defaultValue?: T, target?: Record<string, any>): [T, (value: T | ((curr: T) => T)) => void] {
    const [, setId] = useState(0);
    const {
        onChange = () => {
        }
    } = useBoundContext();
    const [activeTarget, key] = useDeepTargetAndKey(path, target);
    const setValue = useCallback(handleSetValue, [activeTarget, key]);

    useLayoutEffect(() => {
        const keyHandlers = (handlers[key] ??= []);
        keyHandlers.push(handleChange);

        return () => {
            keyHandlers.splice(keyHandlers.indexOf(handleChange), 1);
        };
    }, [activeTarget]);

    return [(activeTarget[key] ?? defaultValue) as T, setValue];

    function handleSetValue(value: T | ((curr: T) => T)) {
        if (typeof value === "function") {
            value = (value as (curr: T) => T)(activeTarget[key]);
        }

        if (activeTarget[key] === value) return;

        activeTarget[key] = value;

        const keyHandlers = handlers[key] ?? [];
        for (const handler of keyHandlers) {
            handler(activeTarget, value);
        }
        onChange(activeTarget, value);
    }

    function handleChange(changeTarget: Record<string, any>) {
        if (changeTarget !== activeTarget) return;
        setId(i => i + 1);
    }
}
