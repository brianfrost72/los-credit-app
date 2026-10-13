class DesktopSidebar {
    private listeners: AbortController | null = null;
    private readonly collapsedKey = "aggre.sidebar.collapsed";

    public mount(pathname: string = window.location.pathname): void {
        this.listeners?.abort();
        this.listeners = new AbortController();
        const { signal } = this.listeners;
        const sidebar = document.getElementById("sidebar");
        if (!sidebar) return;

        const sidebarToggle = document.getElementById("sidebarToggle") as HTMLButtonElement | null;
        const mobileToggle = document.getElementById("mobileSidebarToggle") as HTMLButtonElement | null;
        const overlay = document.getElementById("sidebarOverlay");

        try {
            const collapsed = window.localStorage.getItem(this.collapsedKey) === "true";
            sidebar.classList.toggle("collapsed", collapsed);
            sidebarToggle?.setAttribute("aria-expanded", String(!collapsed));
        } catch {
            // Keep sidebar behavior available when browser storage is blocked.
        }

        const closeMobile = (): void => {
            sidebar.classList.remove("mobile-open");
            overlay?.classList.remove("active");
            mobileToggle?.classList.remove("active");
            mobileToggle?.setAttribute("aria-expanded", "false");
            mobileToggle?.setAttribute("aria-label", "Open sidebar");
            const icon = mobileToggle?.querySelector("i");
            if (icon) icon.className = "fa-solid fa-bars";
            document.body.style.overflow = "";
        };

        const openMobile = (): void => {
            sidebar.classList.add("mobile-open");
            overlay?.classList.add("active");
            mobileToggle?.classList.add("active");
            mobileToggle?.setAttribute("aria-expanded", "true");
            mobileToggle?.setAttribute("aria-label", "Close sidebar");
            const icon = mobileToggle?.querySelector("i");
            if (icon) icon.className = "fa-solid fa-xmark";
            document.body.style.overflow = "hidden";
        };

        sidebar.querySelectorAll<HTMLAnchorElement>(".menu-parent").forEach((parent) => {
            parent.addEventListener("click", (event) => {
                event.preventDefault();
                const submenuId = parent.dataset.submenu;
                const submenu = submenuId ? document.getElementById(submenuId) : null;
                if (!submenu) return;
                const expanded = submenu.classList.toggle("open");
                parent.classList.toggle("open", expanded);
                parent.setAttribute("aria-expanded", String(expanded));
            }, { signal });
        });

        sidebar.querySelectorAll<HTMLAnchorElement>(".sidebar-menu-item:not(.menu-parent), .sidebar-submenu-item").forEach((link) => {
            link.addEventListener("click", () => {
                if (this.isMobile()) closeMobile();
            }, { signal });
        });

        sidebarToggle?.addEventListener("click", () => {
            const collapsed = sidebar.classList.toggle("collapsed");
            sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
            sidebarToggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
            try {
                window.localStorage.setItem(this.collapsedKey, String(collapsed));
            } catch {
                // The current collapsed state remains active for this page.
            }
            if (collapsed) {
                sidebar.querySelectorAll(".sidebar-submenu.open, .menu-parent.open").forEach((item) => {
                    item.classList.remove("open");
                });
                sidebar.querySelectorAll<HTMLAnchorElement>(".menu-parent").forEach((parent) => {
                    parent.setAttribute("aria-expanded", "false");
                });
            }
        }, { signal });

        mobileToggle?.addEventListener("click", () => {
            if (sidebar.classList.contains("mobile-open")) closeMobile();
            else openMobile();
        }, { signal });
        overlay?.addEventListener("click", closeMobile, { signal });
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Escape" && sidebar.classList.contains("mobile-open")) closeMobile();
        }, { signal });
        window.addEventListener("resize", () => {
            if (!this.isMobile()) closeMobile();
        }, { signal });

        this.render(pathname);
    }

    public render(pathname: string = window.location.pathname): void {
        const sidebar = document.getElementById("sidebar");
        if (!sidebar) return;

        const normalize = (path: string): string => {
            const normalized = path.replace(/\/+$/, "");
            return normalized || "/";
        };
        const currentPath = normalize(pathname);
        const links = Array.from(sidebar.querySelectorAll<HTMLAnchorElement>(
            ".sidebar-menu-item:not(.menu-parent)[href], .sidebar-submenu-item[href]",
        ));

        sidebar.querySelectorAll(".sidebar-menu-item, .sidebar-submenu-item").forEach((item) => {
            item.classList.remove("active");
        });
        sidebar.querySelectorAll<HTMLElement>(".sidebar-submenu.open, .menu-parent.open").forEach((item) => {
            item.classList.remove("open");
        });
        sidebar.querySelectorAll<HTMLAnchorElement>(".menu-parent").forEach((parent) => {
            parent.setAttribute("aria-expanded", "false");
        });

        const activeLink = links.find((link) => {
            const href = link.getAttribute("href");
            if (!href || href === "#") return false;
            const itemPath = normalize(new URL(href, window.location.href).pathname);
            return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
        });

        if (!activeLink) return;
        activeLink.classList.add("active");

        const submenu = activeLink.closest<HTMLElement>(".sidebar-submenu");
        if (!submenu) return;
        submenu.classList.add("open");
        const parent = sidebar.querySelector<HTMLAnchorElement>(`[data-submenu="${submenu.id}"]`);
        parent?.classList.add("open");
        parent?.setAttribute("aria-expanded", "true");
    }

    public unmount(): void {
        this.listeners?.abort();
        this.listeners = null;
    }

    private isMobile(): boolean {
        return window.matchMedia("(max-width: 1024px)").matches;
    }
}

export default new DesktopSidebar();
