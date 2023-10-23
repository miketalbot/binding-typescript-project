import React, { useEffect, useRef, useState, FC, ReactNode } from "react";
import * as yup from "yup";
import { boundComponentProperties } from "@accordingly/databind";
import { Bound } from "@accordingly/bound";
import { createEvent } from "@accordingly/events";

boundComponentProperties.on(addYupProperties);

interface YupProps {
    onYupStatusChange?: (...params: any[]) => void;
    children: ReactNode;
    [key: string]: any;
}

export const Yup: FC<YupProps> = ({ onYupStatusChange  = () => {}, children, ...props }) => {
    const [yupContext] = useState(createEvent);
    const lastResult = useRef<boolean | null>(null);

    yupContext.useEvent(change, [onYupStatusChange]);

    return (
        <Bound {...props} yupContext={yupContext}>
            {children}
        </Bound>
    );

    function change(): void {
        const isSet = !!Object.keys(yupContext.data).length;
        if (isSet !== lastResult.current) {
            lastResult.current = isSet;
            onYupStatusChange(isSet);
        }
    }
};

let yupId = 0;


function addYupProperties(
    properties:  Record<string, any>,
    {
        value,
        context,
    }: {
        value?: any;
        context?: Record<string, any>;
    }
): void {
    const [id] = useState(() => yupId++);
    context ??= {}
    const yupContext = (context.yupContext ??= createEvent());

    useEffect(() => {
        return () => {
            delete yupContext.data[id];
        };
    }, []);

    if (properties.yup) {
        const parsed = properties.yup
            .split(".")
            .map((part: string) => (!part.includes(")") ? `${part}()` : `${part}`))
            .join(".");

        const yupFn = new Function(
            "value",
            "yup",
            `return yup.${parsed}${
                properties.typeError
                    ? `.typeError("${properties.typeError}")`
                    : ""
            }.validateSync(value)`
        ) as (value: any, yupParam: typeof yup) => void;

        properties.error = false;
        properties.yupHelperText ??= "helperText";
        if (properties.yupHelperText) {
            properties[properties.yupHelperText] = undefined;
        }
        const wasSet = yupContext.data[id];
        delete yupContext.data[id];

        try {
            yupFn(value, yup);
            if (wasSet) {
                yupContext.raiseOnce();
            }
        } catch (e: any) {
            yupContext.data[id] = e;
            properties.error = true;
            if (properties.yupHelperText) {
                properties[properties.yupHelperText] = e.message;
            }
            if (!wasSet) {
                yupContext.raiseOnce();
            }
        }

        delete properties.yup;
    }
}
