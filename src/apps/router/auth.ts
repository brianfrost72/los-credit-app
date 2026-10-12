export const isAuthenticated = (): boolean => {
	return Boolean(localStorage.getItem("_x_id_"));
};