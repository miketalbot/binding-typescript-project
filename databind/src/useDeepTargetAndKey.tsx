import {useBoundContext} from "@accordingly/bound";
import {useMemo} from "react";

/**
 * Hook to traverse a nested object and retrieve a reference to a deep target and its key.
 * This is useful for working with nested objects and wanting to bind to a deeply nested value.
 * @template T The expected type of the target object.
 * @param {string} key - A dot-separated string representing the path to the deep value.
 * @param {T} [activeTarget] - An optional target to use instead of the context target.
 * @returns {[T, string]} A tuple containing the deep target object and the final key to access the value.
 */
export function useDeepTargetAndKey<T extends Record<string, any> = Record<string, any>>(key: string, activeTarget?: T): [T, string] {
    let {target} = useBoundContext();
    activeTarget ??= target as T;

    return useMemo(getTargetAndKey, [activeTarget, key]);

    function getTargetAndKey(): [T, string] {
        const parts = key.split(".").reverse();
        while (parts.length > 1) {
            const subKey = parts.pop()!;
            if (activeTarget && !activeTarget?.[subKey]) {
                (activeTarget as Record<string, any>)[subKey] = {} as T;
            }
            if (activeTarget) {
                activeTarget = activeTarget[subKey] as T;
            }
        }
        return [activeTarget as T, parts.pop()!];
    }
}
