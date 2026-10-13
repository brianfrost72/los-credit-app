import type { Route } from "./types";

export const routes: Route[] = [
    {
        path: "/",
        title: "Sign in",
        layout: "auth_layout",
        guest: true,
        page: "auth/login",
    },
    {
        path: "/dashboard",
        title: "Dashboard",
        layout: "main_layout",
        page: "dashboard/index",
    },
    {
        path: "/dashboard/index",
        title: "Dashboard",
        layout: "main_layout",
        page: "dashboard/index",
    },
    {
        path: "/app-list",
        title: "Application List",
        layout: "main_layout",
        page: "dashboard/app-list",
    },
];
