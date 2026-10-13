export interface Route {
    path: string;
    title: string;
    layout: string;
    page: string;
    params?: Record<string, string>;
    guest?: boolean;
    auth?: boolean;
    style?: () => void | Promise<void>;
}
