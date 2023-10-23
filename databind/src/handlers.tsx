type Handler = (changeTarget: Record<string, any>, value: any) => void;
export const handlers: {
    [key: string]: Handler[]
} = {};
