import type { Route } from "./types";
import { isAuthenticated } from "./auth";

export const guard = (route: Route): string | null => {
	if (route.auth && !isAuthenticated()) {
		return "/";
	}

	if (route.guest && isAuthenticated()) {
		return "/dashboard";
	}

	return null;
};