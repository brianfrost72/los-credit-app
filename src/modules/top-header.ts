const labels: Record<string, string> = {
    dashboard: "Dashboard",
    "collateral-appraisal": "Collateral Appraisal",
    "draft-appraisal": "Draft",
    "review-draft": "Review",
};
const navigableCrumbs = new Set(["dashboard", "draft-appraisal"]);

class TopHeader {
    public render(pathname: string = window.location.pathname): void {
        const breadcrumb = document.querySelector<HTMLElement>("[data-breadcrumbs]");
        if (!breadcrumb) return;

        const parts = pathname === "/dashboard/index"
            ? ["dashboard", "overview"]
            : pathname.split("/").filter(Boolean);
        breadcrumb.replaceChildren();
        if (parts.length === 0) parts.push("dashboard");
        if (parts.length === 1 && parts[0] === "dashboard") parts.push("overview");

        let path = "";
        parts.forEach((part, index) => {
            if (index > 0) {
                const separator = document.createElement("span");
                separator.className = "top-header__breadcrumb-separator";
                separator.setAttribute("aria-hidden", "true");
                separator.textContent = "/";
                breadcrumb.append(separator);
            }

            path += `/${part}`;
            const label = labels[part] ?? part.split(/[-_]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
            if (index === parts.length - 1) {
                const current = document.createElement("span");
                current.className = "top-header__breadcrumb-current";
                current.setAttribute("aria-current", "page");
                current.textContent = label;
                breadcrumb.append(current);
            } else if (navigableCrumbs.has(part)) {
                const link = document.createElement("a");
                link.href = path;
                link.dataset.route = "";
                link.textContent = label;
                breadcrumb.append(link);
            } else {
                const ancestor = document.createElement("span");
                ancestor.className = "top-header__breadcrumb-current";
                ancestor.textContent = label;
                breadcrumb.append(ancestor);
            }
        });
    }
}

export default new TopHeader();
