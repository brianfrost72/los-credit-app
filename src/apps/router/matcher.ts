import type { Route } from "./types";

export const matchRoute = (pathname: string, routes: Route[]): Route | null => {
	for (const route of routes) {
		const keys: string[] = [];
		const pattern = route.path.replace(
			/:([^/]+)/g,
			(_, key) => {
				keys.push(key);
				return "([^/]+)";
			}
		);

		const regex = new RegExp(`^${pattern}$`);
		const match = pathname.match(regex);

		if (!match) continue;

		const params: Record<string, string> = {};

		keys.forEach((key, index) => {
			params[key] = decodeURIComponent(match[index + 1]);
		});

		return {
			...route,
			params
		};
	}
	return null;
};