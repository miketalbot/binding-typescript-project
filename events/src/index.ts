import {useLayoutEffect} from "react";

/**
 * A generic function type with any number of arguments and any return type.
 */
export type FunctionType = (...args: any[]) => any;
type ValueOf<T> = T[keyof T];
type FirstParameter<T extends FunctionType> = Parameters<T>[0];
type ValueOfFirstParameter<T extends FunctionType> = ValueOf<FirstParameter<T>>


/**
 * @template T extends FunctionType
 * @template D extends Record<string, any>
 * Defines the structure of the event object. This includes the function that will handle
 * the events, whose first parameter becomes the return value of raising events.  Events may
 * contain arbitrary data specified by the D template parameter, defaulting to a Record<string, any>
 */
export interface EventObject<T extends FunctionType = FunctionType, D extends Record<string, any> = Record<string, any>> {
    /**
     * Registers an event handler and returns a function to unregister it.
     * @param handler - The event handler to register.
     * @returns A function that when called, will unregister the handler.
     */
    on(handler: T): () => void;

    /**
     * Unregisters an event handler.
     * @param handler - The event handler to unregister.
     */
    off(handler: T): void;

    /**
     * Registers an event handler that will only be called once.
     * @param handler - The event handler to register.
     */
    once(handler: T): void;

    /**
     * Raises an event and calls all registered handlers.
     * @param args - The arguments to pass to the event handlers.
     * @returns The first argument passed.
     */
    raise(...args: Parameters<T>): FirstParameter<T>;

    /**
     * Asynchronously raises an event and calls all registered handlers.
     * @param args - The arguments to pass to the event handlers.
     * @returns A Promise resolving to the first argument passed.
     */
    raiseAsync(...args: Parameters<T>): Promise<FirstParameter<T>>;

    /**
     * Asynchronously raises an event and calls all registered handlers in order.
     * @param args - The arguments to pass to the event handlers.
     * @returns A Promise resolving to the first argument passed.
     */
    raiseAsyncSequential(...args: Parameters<T>): Promise<FirstParameter<T>>;


    /**
     * Raises an event after a short debounce, calling all registered handlers.
     * @param args - The arguments to pass to the event handlers.
     */
    raiseOnce(...args: Parameters<T>): void;

    /**
     * React hook to automatically register and unregister an event handler based on the provided dependencies.
     * @param handler - The event handler to register.
     * @param deps - Array of dependencies for the effect.
     * @param sortOrder - The sort order of the handler, defaults to 100
     */
    useEvent(handler: T, deps?: any[], sortOrder?: number): void;

    /**
     * Arbitrary data associated with the event, specified by generic type D which defaults to a record of string keys with any values.
     */
    data: D;
}




/**
 * @template T extends FunctionType
 * @template D extends Record<string, any>
 * Creates and manages a custom event system.
 * @returns An object containing methods to manage and raise events.
 */
export function createEvent<T extends FunctionType = FunctionType,
    D extends Record<string, any> = Record<string, any>>
        (extract: (returnValue: FirstParameter<T>) =>ValueOfFirstParameter<T> | FirstParameter<T> = (r)=>r): EventObject<T, D> {
    let handlers = new Set<T>();
    let modified = false;
    let sortedHandlers: T[] = []
    let timer: NodeJS.Timeout;

    return {
        on,
        off,
        once,
        raise,
        raiseAsync,
        raiseAsyncSequential,
        raiseOnce,
        useEvent,
        data: {} as D,
    };

    function useEvent(handler: T, deps: any[] = [], priority?: number) {
        sortOrder(handler, priority)
        useLayoutEffect(() => on(handler), deps);
    }

    function raiseOnce(...params: any[]) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            raise(...params);
        }, 20);
    }

    function on(handler: T): () => void {
        modified = true;
        handlers.add(handler);
        return () => off(handler);
    }

    function off(handler: T) {
        modified = true;
        handlers.delete(handler);
    }

    function once(handler: T): void {
        const wrapperHandler = ((...params: any[]) => {
            handler(...params);
            off();
        }) as unknown as T;

        const off = on(wrapperHandler);
    }

    function raise(...params: any[]): Parameters<T>[0] {
        prepareHandlers();
        sortedHandlers.forEach((handler) => handler(...params));
        return extract(params[0]);
    }

    async function raiseAsync(...params: any[]): Promise<Parameters<T>[0]> {
        await Promise.all(
            sortedHandlers.map((handler) => Promise.resolve(handler(...params))),
        );
        return extract(params[0]);
    }

    async function raiseAsyncSequential(...params: any[]): Promise<Parameters<T>[0]> {
        for (const handler of sortedHandlers) {
            await handler(...params)
        }
        return extract(params[0]);
    }

    function prepareHandlers() {
        if (!modified) return
        sortedHandlers = sortHandlers([...handlers])
        modified = false
    }
}

const sortOrders = new WeakMap()

function sortHandlers<T>(handlers: T[]) {
    return handlers.sort((a, b) => (sortOrders.get(a as Object) ?? 100) - (sortOrders.get(b as Object) ?? 100))
}

export function sortOrder(fn: FunctionType, sortOrder: number = 100) {
    sortOrders.set(fn as Object, sortOrder)
}
