document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const mobileSidebarToggle = document.getElementById("mobileSidebarToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const menuParents = document.querySelectorAll(".menu-parent");
    const normalMenus = document.querySelectorAll(".sidebar-menu-item:not(.menu-parent)");
    const submenuItems = document.querySelectorAll(".sidebar-submenu-item");

    function removeAllActive() {
        document.querySelectorAll(".sidebar-menu-item, .sidebar-submenu-item").forEach(function (item) {
            item.classList.remove("active");
        });
    }

    function normalizePath(pathname) {
        const path = pathname.replace(/\/+$/, "");
        return path || "/";
    }

    function setActiveMenuFromUrl() {
        const currentPath = normalizePath(window.location.pathname);
        let activeItem = null;
        document.querySelectorAll(".sidebar-menu-item:not(.menu-parent)[href], .sidebar-submenu-item[href]").forEach(function (item) {
            const href = item.getAttribute("href");
            if (!href || href === "#" || href.startsWith("javascript:")) return;
            const itemPath = normalizePath(new URL(href, window.location.href).pathname);
            if (itemPath === currentPath) activeItem = item;
        });
        if (!activeItem) return;
        removeAllActive();
        activeItem.classList.add("active");
        const submenu = activeItem.closest(".sidebar-submenu");
        if (submenu) {
            submenu.classList.add("open");
            const parent = document.querySelector('[data-submenu="' + submenu.id + '"]');
            parent?.classList.add("active", "open");
        }
    }

    function isMobile() {
        return window.innerWidth < 768;
    }

    function openMobileSidebar() {
        if (!sidebar) return;
        sidebar.classList.add("mobile-open");
        sidebarOverlay?.classList.add("active");
        if (mobileSidebarToggle) {
            mobileSidebarToggle.classList.add("active");
            mobileSidebarToggle.setAttribute("aria-expanded", "true");
            mobileSidebarToggle.setAttribute("aria-label", "Close sidebar");
            const icon = mobileSidebarToggle.querySelector("i");
            if (icon) icon.className = "fa-solid fa-xmark";
        }
        document.body.style.overflow = "hidden";
    }

    function closeMobileSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove("mobile-open");
        sidebarOverlay?.classList.remove("active");
        if (mobileSidebarToggle) {
            mobileSidebarToggle.classList.remove("active");
            mobileSidebarToggle.setAttribute("aria-expanded", "false");
            mobileSidebarToggle.setAttribute("aria-label", "Open sidebar");
            const icon = mobileSidebarToggle.querySelector("i");
            if (icon) icon.className = "fa-solid fa-bars";
        }
        document.body.style.overflow = "";
    }

    menuParents.forEach(function (parent) {
        parent.addEventListener("click", function (event) {
            event.preventDefault();
            const submenuId = this.getAttribute("data-submenu");
            const submenu = submenuId ? document.getElementById(submenuId) : null;
            if (!submenu) return;
            submenu.classList.toggle("open");
            this.classList.toggle("open");
        });
    });

    normalMenus.forEach(function (item) {
        item.addEventListener("click", function () {
            if (isMobile()) closeMobileSidebar();
        });
    });
    submenuItems.forEach(function (item) {
        item.addEventListener("click", function () {
            if (isMobile()) closeMobileSidebar();
        });
    });

    if (sidebar && sidebarToggle) {
        sidebarToggle.addEventListener("click", function () {
            sidebar.classList.toggle("collapsed");
            const isCollapsed = sidebar.classList.contains("collapsed");
            sidebarToggle.setAttribute("aria-expanded", (!isCollapsed).toString());
            sidebarToggle.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
            if (isCollapsed) {
                document.querySelectorAll(".sidebar-submenu.open, .menu-parent.open").forEach(function (item) {
                    item.classList.remove("open");
                });
            }
        });
    }
    mobileSidebarToggle?.addEventListener("click", function () {
        if (!sidebar) return;
        sidebar.classList.contains("mobile-open") ? closeMobileSidebar() : openMobileSidebar();
    });
    sidebarOverlay?.addEventListener("click", closeMobileSidebar);
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && sidebar?.classList.contains("mobile-open")) closeMobileSidebar();
    });
    window.addEventListener("resize", function () {
        if (!isMobile()) closeMobileSidebar();
    });
    setActiveMenuFromUrl();
});
