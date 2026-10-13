type Breadcrumb = {
    label: string;
    href?: string;
};

type NotificationFilter = "all" | "unread" | "mentions";

const breadcrumbsByPath: Record<string, Breadcrumb[]> = {
    "/dashboard": [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Overview" },
    ],
    "/dashboard/index": [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Overview" },
    ],
    "/app-list": [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Loan Applications" },
        { label: "Application Lists" },
    ],
};

class TopHeader {
    private listeners: AbortController | null = null;
    private closeTimer: number | null = null;

    public mount(pathname: string = window.location.pathname): void {
        this.listeners?.abort();
        if (this.closeTimer !== null) window.clearTimeout(this.closeTimer);
        this.closeTimer = null;
        this.listeners = new AbortController();
        this.render(pathname);
        this.bindNotifications(this.listeners.signal);
    }

    public render(pathname: string = window.location.pathname): void {
        const breadcrumb = document.querySelector<HTMLElement>("[data-breadcrumbs]");
        if (!breadcrumb) return;

        const normalizedPath = pathname.replace(/\/+$/, "") || "/";
        const crumbs = breadcrumbsByPath[normalizedPath] ?? this.createFallbackBreadcrumbs(normalizedPath);
        breadcrumb.replaceChildren();

        crumbs.forEach((crumb, index) => {
            if (index > 0) {
                const separator = document.createElement("span");
                separator.className = "top-header__breadcrumb-separator";
                separator.setAttribute("aria-hidden", "true");
                separator.textContent = "/";
                breadcrumb.append(separator);
            }

            if (crumb.href && index < crumbs.length - 1) {
                const link = document.createElement("a");
                link.href = crumb.href;
                link.dataset.route = "";
                link.textContent = crumb.label;
                breadcrumb.append(link);
                return;
            }

            const current = document.createElement("span");
            current.className = "top-header__breadcrumb-current";
            current.textContent = crumb.label;
            if (index === crumbs.length - 1) current.setAttribute("aria-current", "page");
            breadcrumb.append(current);
        });
    }

    public unmount(): void {
        this.listeners?.abort();
        this.listeners = null;
        if (this.closeTimer !== null) window.clearTimeout(this.closeTimer);
        this.closeTimer = null;
    }

    private createFallbackBreadcrumbs(pathname: string): Breadcrumb[] {
        const parts = pathname.split("/").filter(Boolean);
        if (parts.length === 0) return [{ label: "Dashboard", href: "/dashboard" }, { label: "Overview" }];

        const label = (value: string): string => value
            .split(/[-_]/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

        return parts.map((part, index) => ({
            label: label(part),
            href: index < parts.length - 1 ? `/${parts.slice(0, index + 1).join("/")}` : undefined,
        }));
    }

    private bindNotifications(signal: AbortSignal): void {
        const trigger = document.getElementById("notificationTrigger");
        const modal = document.getElementById("notificationModal");
        if (!(trigger instanceof HTMLButtonElement) || !(modal instanceof HTMLElement)) return;

        const backdrop = modal.querySelector<HTMLButtonElement>(".notification-modal__backdrop");
        const drawer = modal.querySelector<HTMLElement>(".notification-drawer");
        const tabs = Array.from(modal.querySelectorAll<HTMLButtonElement>("[data-notification-filter]"));
        const items = Array.from(modal.querySelectorAll<HTMLElement>(".notification-item"));
        const markRead = document.getElementById("notificationMarkRead") as HTMLButtonElement | null;
        const headerBadge = document.getElementById("notificationHeaderBadge");
        const unreadBadge = document.getElementById("notificationUnreadBadge");
        const emptyState = document.getElementById("notificationEmpty");
        const animationDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420;
        let activeFilter: NotificationFilter = "all";

        const getUnreadCount = (): number => items.filter((item) => item.classList.contains("is-unread")).length;

        const syncUnreadUI = (): void => {
            const count = getUnreadCount();
            if (headerBadge) {
                headerBadge.textContent = String(count);
                headerBadge.hidden = count === 0;
            }
            if (unreadBadge) {
                unreadBadge.textContent = `${count} unread`;
                unreadBadge.classList.toggle("is-empty", count === 0);
            }
            if (markRead) markRead.disabled = count === 0;
        };

        const applyFilter = (filter: NotificationFilter): void => {
            activeFilter = filter;
            let visibleCount = 0;
            items.forEach((item) => {
                const visible = filter === "all"
                    || (filter === "unread" && item.classList.contains("is-unread"))
                    || (filter === "mentions" && item.dataset.notificationType === "mention");
                item.hidden = !visible;
                if (visible) visibleCount += 1;
            });
            if (emptyState) emptyState.hidden = visibleCount !== 0;
        };

        const open = (): void => {
            if (this.closeTimer !== null) window.clearTimeout(this.closeTimer);
            this.closeTimer = null;
            modal.hidden = false;
            document.body.classList.add("notification-drawer-open");
            trigger.setAttribute("aria-expanded", "true");
            requestAnimationFrame(() => requestAnimationFrame(() => {
                modal.classList.add("is-open");
                drawer?.focus({ preventScroll: true });
            }));
        };

        const close = (): void => {
            modal.classList.remove("is-open");
            document.body.classList.remove("notification-drawer-open");
            trigger.setAttribute("aria-expanded", "false");
            this.closeTimer = window.setTimeout(() => {
                if (!modal.classList.contains("is-open")) {
                    modal.hidden = true;
                    trigger.focus({ preventScroll: true });
                }
            }, animationDuration);
        };

        trigger.addEventListener("click", () => {
            if (modal.hidden || !modal.classList.contains("is-open")) open();
            else close();
        }, { signal });
        backdrop?.addEventListener("click", close, { signal });

        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Escape" && !modal.hidden) {
                close();
                return;
            }
            if (event.key !== "Tab" || modal.hidden || !drawer) return;

            const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(
                'button:not([disabled]):not([hidden]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            )).filter((element) => !element.closest("[hidden]"));
            if (focusable.length === 0) {
                event.preventDefault();
                drawer.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }, { signal });

        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                const filter = tab.dataset.notificationFilter as NotificationFilter;
                tabs.forEach((item) => {
                    const selected = item === tab;
                    item.classList.toggle("is-active", selected);
                    item.setAttribute("aria-selected", String(selected));
                });
                applyFilter(filter);
            }, { signal });
        });

        markRead?.addEventListener("click", () => {
            items.forEach((item) => item.classList.remove("is-unread"));
            syncUnreadUI();
            applyFilter(activeFilter);
        }, { signal });

        items.forEach((item) => {
            item.querySelector<HTMLButtonElement>(".notification-item__action")?.addEventListener("click", () => {
                item.classList.remove("is-unread");
                syncUnreadUI();
                applyFilter(activeFilter);
            }, { signal });
        });

        syncUnreadUI();
        applyFilter(activeFilter);
    }
}

export default new TopHeader();
