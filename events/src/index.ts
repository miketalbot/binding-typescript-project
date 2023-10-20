import { useLayoutEffect } from "react";

interface EventObject {
  /** Registers an event handler. */
  on(handler: Function): () => void;
  /** Unregisters an event handler. */
  off(handler: Function): void;
  /** Registers an event handler that will only be called once. */
  once(handler: Function): void;
  /** Raises an event and calls all registered handlers. */
  raise(...params: any[]): any;
  /** Asynchronously raises an event and calls all registered handlers. */
  raiseAsync(...params: any[]): Promise<any>;
  /** Raises an event after a short debounce. */
  raiseOnce(...params: any[]): void;
  /** React hook to automatically register and unregister an event handler. */
  useEvent(handler: Function, deps?: any[]): void;
  /** Arbitrary data associated with the event. */
  data: { [key: string]: any };
}

/**
 * Creates and manages a custom event system.
 * @returns An object containing methods to manage and raise events.
 */
export function createEvent(): EventObject {
  let handlers = new Set<Function>();
  let timer: NodeJS.Timeout;

  return {
    on,
    off,
    once,
    raise,
    raiseAsync,
    raiseOnce,
    useEvent,
    data: {},
  };

  function useEvent(handler: Function, deps: any[] = []) {
    useLayoutEffect(() => on(handler), deps);
  }

  function raiseOnce(...params: any[]) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      raise(...params);
    }, 20);
  }

  function on(handler: Function): () => void {
    handlers.add(handler);
    return () => off(handler);
  }

  function off(handler: Function) {
    handlers.delete(handler);
  }

  function once(handler: Function) {
    const off = on((...params: any[]) => {
      handler(...params);
      off();
    });
  }

  function raise(...params: any[]): any {
    handlers.forEach((handler) => handler(...params));
    return params[0];
  }

  async function raiseAsync(...params: any[]): Promise<any> {
    await Promise.all(
      [...handlers].map((handler) => Promise.resolve(handler(...params))),
    );
    return params[0];
  }
}
