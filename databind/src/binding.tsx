import React, {FC, ReactElement, useCallback, useEffect, useMemo, useState, ComponentType} from "react";
import {useBoundContext} from "@accordingly/bound";
import {createEvent, EventObject} from "@accordingly/events";
import {useBoundValue} from "./useBoundValue";

export { EventObject }



/**
 * A symbol representing a specific state where a value should not be set.
 */
export const DontSetValue = Symbol("DontSetValue");

export type ComponentHandler = (props: Record<string, any>, settings: {field?: string, value?: any, valueProp?: string, changeProp?: string, target?: Record<string, any>, context?: Record<string, any>, refresh?: ()=>void }) => void;

/**
 * Event for broadcasting bound component properties.
 */
export const boundComponentProperties = createEvent<ComponentHandler, Record<string, any>>();

boundComponentProperties.on((props, { field }) => {
    props.label ??= stringToTitleCaseLabel(field ?? "");
});

/**
 * Binds specified properties to a component.
 *
 * @param component - The component to bind.
 * @param options - Options for binding.
 * @returns A BoundComponent with specified properties bound.
 */
export function bind(
    component: ReactElement,
    {
        extract = defaultExtractor,
        changeProp = "onChange",
        valueProp = "value",
        labelProp = "label"
    }: {
        extract?: Function,
        changeProp?: string,
        valueProp?: string,
        labelProp?: string
    } = {}
): FC<{ field: string, defaultValue?: string, [key: string]: any }> {
    return function BoundComponent({ field, defaultValue = "", ...props }) {
        const [value, setValue] = useBoundValue(field, defaultValue);
        if (labelProp) {
            props[labelProp] ??= stringToTitleCaseLabel(field);
        }
        return (
            <component.type
                {...component.props}
                {...props}
                {...{
                    [valueProp]: value,
                    [changeProp]: (...params: any[]) => {
                        const result = extract(...params);
                        if (result !== DontSetValue) setValue(result);
                    }
                }}
            />
        );
    };
}

type TransformFunction = (value: any)=>any;

type BindProps =  {
    blur?: boolean,
        field: string,
        defaultValue?: string,
        changeProp?: string,
        valueProp?: string,
        extract?: Function,
        transformIn?: TransformFunction,
        transformOut?: TransformFunction,
        target?: Record<string, any>,
        children: ReactElement
}

type DataBindProps<T extends ComponentType<any>> = {
    component: T;
} & BindProps & React.ComponentProps<T>;

export const DataBind = <T extends ComponentType<any>>({
                                                           component: Component,
                                                           blur,
                                                           field,
                                                           defaultValue = "",
                                                           changeProp = "onChange",
                                                           valueProp = "value",
                                                           extract = defaultExtractor,
                                                           transformIn = (v: any) => v,
                                                           transformOut = (v: any) => v,
                                                           target,
                                                           ...rest
                                                       }: DataBindProps<T>): ReactElement => {
    const memoDeps = useMemo(()=>JSON.stringify(rest), [rest])
    const children = useMemo(()=>{
        return <Component {...rest}/>
    }, [Component, memoDeps])
    return <Bind blur={blur} field={field} defaultValue={defaultValue} changeProp={changeProp} valueProp={valueProp} extract={extract} transformIn={transformIn} transformOut={transformOut} target={target}>
        {children}
    </Bind>;
};


/**
 * An alias for the bind function.
 */
export const B = Bind;

/**
 * A higher-order component that binds specified properties to a child component.
 *
 * @param props - The properties to bind.
 * @returns The child component with specified properties bound.
 */
export function Bind({
                         blur,
                         field,
                         defaultValue = "",
                         changeProp = "onChange",
                         valueProp = "value",
                         extract = defaultExtractor,
                         transformIn = (v: any) => v,
                         transformOut = (v: any) => v,
                         target,
                         children
                     }: BindProps) {
    const [, setId] = useState(0);
    const context = useBoundContext();
    const { target: boundTarget } = context;
    target ??= boundTarget;
    if ((children as any)?.$$typeof !== Symbol.for("react.element"))
        return <div>{field} Must be bound to a single component</div>;

    const fieldToUse = useMemo(() => {
        const result = field ?? children.props.field;
        delete children.props.field;
        return result;
    }, [children]);

    const [value, setValue] = useBoundValue(fieldToUse, defaultValue, target);
    const [current, setCurrent] = useState(transformIn(value));
    useEffect(updateCurrentValue, [value]);
    const handleBlur = useCallback(_handleBlur, [current]);
    const { onBlur } = children.props;

    const props = boundComponentProperties.raise(
        {
            ...children.props,
            onBlur: handleBlur,
            [valueProp]: current,
            [changeProp]: (...params: any[]) => {
                const result = extract(...params);
                setCurrentValue(result);
            }
        },
        {
            field,
            value: transformOut(current),
            target,
            context,
            valueProp,
            changeProp,
            refresh
        }
    );

    return {
        ...children,
        props
    };

    function setCurrentValue(v: any) {
        setCurrent(v);
        const transformed = transformOut(v);
        if (value === transformed) return;
        if (!blur) {
            setValue(transformed);
        }
    }

    function _handleBlur(...params: any[]) {
        if (onBlur) {
            onBlur(...params);
        }
        if (blur) {
            const transformed = transformOut(current);
            if (value === transformed) return;
            setValue(transformed);
        }
    }

    function updateCurrentValue() {
        setCurrent(transformIn(value));
    }

    function refresh() {
        setId((i) => i + 1);
    }
}

/**
 * Converts a string to title case format.
 *
 * @param inputString - The string to convert.
 * @returns The title-cased string.
 */
export function stringToTitleCaseLabel(inputString: string): string {
    // Split the input string by spaces and camelCase boundaries
    const words = inputString.split(/(?=[A-Z])|\s+/);

    // Capitalize the first letter of each word and join them
    return words
        .map((word) => {
            // Handle acronyms (e.g., "HTTP" or "XML")
            if (word === word.toUpperCase()) {
                return word;
            }

            // Capitalize the first letter of each word
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}

/**
 * Extracts a value from an event or a value.
 *
 * @param e - The event or value.
 * @param v - The value.
 * @returns The extracted value or DontSetValue symbol.
 */
export function defaultExtractor(e: any, v: any): any {
    if (v !== undefined)
        return v;
    if (e?.target?.value !== undefined)
        return e.target.value;
    if (!isReactEvent(e))
        return e;
    return DontSetValue;
}

/**
 * Checks if a value is a React event.
 *
 * @param value - The value to check.
 * @returns True if the value is a React event, false otherwise.
 */
export function isReactEvent(value: any): boolean {
    return (
        typeof value === "object" &&
        "target" in value &&
        "type" in value &&
        typeof value.preventDefault === "function"
    );
}
