import React, {ReactNode, ReactElement, FunctionComponent, ReactComponentElement, Component} from 'react';
import { B } from "./binding";

interface BindingProps {
    children: ReactNode;
}

export const Binding: FunctionComponent<BindingProps> = ({ children }) => {
    return withDataBinding(<>{children}</>) as ReactElement<any, any> | null;
}

type DataBindingParam = ReactNode | ((...params: any[]) => ReactNode) ;

export function withDataBinding(param: DataBindingParam): ReactElement<any, any> | null | Component  {
    if (typeof param === "function") {
        return function BoundComponent(...params: any[]): ReactElement<any, any> | null {
            let component = (param as Function)(...params);
            if (typeof component !== "function") {
                return withDataBinding(component as ReactNode) as ReactElement<any, any> | null;
            }
            return null;
        } as unknown as Component;
    }
    return scan(param);

    function scan(element: ReactNode): ReactElement<any, any> | null {
        if (!element) return null;
        if (Array.isArray(element)) {
            return element.map(scanItem) as any;  // You may want to refine this cast.
        } else if (typeof element === "function") {
            return null;  // Functions are not handled, returning null. Adjust as needed.
        } else {
            return scanItem(element as ReactElement);
        }
    }

    function scanItem(child: ReactElement): ReactElement<any, any> {
        const {
            children, field, defaultValue, valueProp, changeProp, extract, transformIn, transformOut, target, blur, ...props
        } = child.props;

        const newChildren = scan(children);
        if (field) {
            return (
                <B
                    field={field}
                    defaultValue={defaultValue}
                    valueProp={valueProp}
                    changeProp={changeProp}
                    extract={extract}
                    transformIn={transformIn}
                    transformOut={transformOut}
                    blur={blur}
                    target={target}
                >
                    {{
                        $$typeof: Symbol.for("react.element"),
                        ...child,
                        props: { ...props, children: newChildren }
                    } as ReactElement}
                </B>
            );
        }

        return {
            $$typeof: Symbol.for("react.element"),
            ...child,
            props: { ...props, children: newChildren }
        } as ReactElement;
    }
}
