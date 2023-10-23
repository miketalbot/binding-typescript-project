import React, { createContext, useContext, ReactNode, ReactElement } from 'react';

// Define a generic type for the BoundContext
interface BoundContextType {
  [key: string]: any;
}

const BoundContext = createContext<BoundContextType>({});
const Also = Symbol('Also');

export class Cancel extends Error {
  constructor() {
    super();
    this.message = 'Cancel';
  }
}

/**
 * @template T The expected shape of the context.
 * @returns {T} The current value of the `BoundContext`.
 */
export function useBoundContext<T extends BoundContextType = BoundContextType>(): T {
  return useContext(BoundContext) as T;
}

interface BoundProps<T extends BoundContextType> extends BoundContextType {
  children: ReactNode | ((context: T) => ReactNode);
}

/**
 * @template T The expected shape of the new context, extending from BoundContextType.
 * @param {BoundProps<T>} props
 * @param {ReactNode} props.children - the children nodes for which the context will be set,
 * if a function then it is called with the current context
 */
export function Bound<T extends BoundContextType = BoundContextType>({ children, ...props }: BoundProps<T>): ReactElement {
  const context = useBoundContext<BoundContextType>();

  for (const [key, value] of Object.entries(props)) {
    if (value?.[Also]) {
      if (typeof context[key] === 'function') {
        props[key] = (...params: any[]) => {
          const a = value(...params);
          const b = context[key](...params);

          try {
            if (a?.then || b?.then) {
              return mergeAsyncResults(value[Also], a, b);
            } else {
              return value[Also](a, b);
            }
          } catch (e) {
            if (!(e instanceof Cancel)) {
              throw e;
            }
            return a;
          }
        };
      }
    }
  }

  const newContext = { ...context, ...props } as T;


  return typeof children === 'function' ? (
      <BoundContext.Provider value={newContext}>
          {children(newContext)}
          </BoundContext.Provider>
  ) : (
      <BoundContext.Provider value={newContext}>
          {children}
          </BoundContext.Provider>
  );

  async function mergeAsyncResults(mergeFunction: (a: any, b: any) => any, a: any, b: any) {
    const r1 = await a;
    const r2 = await b;
    return mergeFunction(r1, r2);
  }
}

interface AlsoFunction {
  (...args: any[]): any;
  [Also]: (a: any, b: any) => any;
}

/**
 * @param {(...args: any[]) => any} fn
 * @param {(a: any, b: any) => any} [merge=(a, b) => a]
 * @returns {AlsoFunction}
 */
export function also(fn: (...args: any[]) => any, merge: (a: any, b: any) => any = (a) => a): AlsoFunction {
  if (typeof fn !== 'function' || typeof merge !== 'function')
    throw new Error('also must be called with functions as parameters');
  (fn as AlsoFunction)[Also] = merge;
  return fn as AlsoFunction;
}
