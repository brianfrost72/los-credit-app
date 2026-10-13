// @ts-nocheck

// ***************************************


interface ApplicationListFilters {
    keyword: string;
    status: string;
    branch: string;
    marketing: string;
    borrower: string;
    sla: string;
    date: string;
    amountMin: number | null;
    amountMax: number | null;
}


class ApplicationListController {
    private listeners: AbortController | null = null;
    private currentPage = 1;

    public mount(): void {
        const table = document.querySelector<HTMLTableElement>(".app-list-filterbar ~ .panel .data-table");
        const filterbar = document.querySelector<HTMLElement>(".app-list-filterbar");
        if (!table || !filterbar) return;

        table.dataset.viteReady = "true";
        this.listeners?.abort();
        this.listeners = new AbortController();
        const { signal } = this.listeners;
        const inputs = Array.from(filterbar.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select"));
        const search = document.querySelector<HTMLInputElement>(".top-header__search-input");
        const applyButton = filterbar.querySelector<HTMLButtonElement>(".app-list-filter__apply");
        const clearButton = filterbar.querySelector<HTMLButtonElement>(".app-list-filter__clear");
        const rowLimit = document.querySelector<HTMLSelectElement>("#appListRows");
        const selectAll = table.querySelector<HTMLInputElement>("thead .app-list-checkbox");

        const apply = (): void => {
            this.currentPage = 1;
            this.render(table, this.readFilters(filterbar, search), Number(rowLimit?.value || 12));
        };

        applyButton?.addEventListener("click", apply, { signal });
        inputs.forEach((input) => input.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Enter") apply();
        }, { signal }));
        search?.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                event.preventDefault();
                apply();
            }
        }, { signal });
        rowLimit?.addEventListener("change", apply, { signal });
        clearButton?.addEventListener("click", () => {
            filterbar.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
                input.value = "";
            });
            filterbar.querySelectorAll<HTMLSelectElement>("select").forEach((select) => {
                select.selectedIndex = 0;
            });
            if (search) search.value = "";
            apply();
        }, { signal });
        selectAll?.addEventListener("change", () => {
            table.querySelectorAll<HTMLInputElement>("tbody .app-list-checkbox").forEach((checkbox) => {
                checkbox.checked = selectAll.checked;
            });
        }, { signal });
        table.addEventListener("change", (event: Event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || !target.matches("tbody .app-list-checkbox")) return;
            const checkboxes = Array.from(table.querySelectorAll<HTMLInputElement>("tbody .app-list-checkbox"));
            if (selectAll) selectAll.checked = checkboxes.length > 0 && checkboxes.every((checkbox) => checkbox.checked);
        }, { signal });
        document.querySelectorAll<HTMLButtonElement>(".table-pagination__button").forEach((button) => {
            button.addEventListener("click", () => {
                if (button.hasAttribute("aria-label")) {
                    this.currentPage += button.getAttribute("aria-label")?.toLowerCase().includes("previous") ? -1 : 1;
                } else {
                    const page = Number(button.textContent?.trim());
                    if (Number.isInteger(page)) this.currentPage = page;
                }
                this.currentPage = Math.max(1, this.currentPage);
                this.render(table, this.readFilters(filterbar, search), Number(rowLimit?.value || 12));
            }, { signal });
        });

        apply();
    }

    public unmount(): void {
        this.listeners?.abort();
        this.listeners = null;
    }

    private readFilters(filterbar: HTMLElement, search: HTMLInputElement | null): ApplicationListFilters {
        const value = (selector: string): string => filterbar.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.value.trim().toLowerCase() ?? "";
        const amounts = Array.from(filterbar.querySelectorAll<HTMLInputElement>(".app-list-filter__amount input"));
        const parseAmount = (input?: HTMLInputElement): number | null => {
            if (!input?.value.trim()) return null;
            const amount = Number(input.value);
            return Number.isFinite(amount) ? amount : null;
        };
        return {
            keyword: (search?.value || value("#filterKeyword")).toLowerCase(),
            status: value("#filterStatus"),
            branch: value("#filterBranch"),
            marketing: value("#filterMarketing"),
            borrower: value("#filterBorrower"),
            sla: value("#filterSla"),
            date: value("#filterDate"),
            amountMin: parseAmount(amounts[0]),
            amountMax: parseAmount(amounts[1]),
        };
    }

    private render(table: HTMLTableElement, filters: ApplicationListFilters, pageSize: number): void {
        const rows = Array.from(table.tBodies[0]?.rows ?? []);
        const matches = rows.filter((row) => this.matches(row, filters));
        const totalPages = Math.max(1, Math.ceil(matches.length / Math.max(1, pageSize)));
        this.currentPage = Math.min(this.currentPage, totalPages);
        const visibleRows = new Set(matches.slice((this.currentPage - 1) * pageSize, this.currentPage * pageSize));
        rows.forEach((row) => { row.hidden = !visibleRows.has(row); });

        const range = document.querySelector<HTMLElement>(".table-footer__range");
        if (range) {
            const first = matches.length ? (this.currentPage - 1) * pageSize + 1 : 0;
            range.textContent = `${first}Ã¢â‚¬â€œ${Math.min(this.currentPage * pageSize, matches.length)} of ${matches.length} applications`;
        }
        document.querySelectorAll<HTMLButtonElement>(".table-pagination__button").forEach((button) => {
            const page = Number(button.textContent?.trim());
            if (!Number.isInteger(page)) return;
            button.classList.toggle("active", page === this.currentPage);
            button.setAttribute("aria-current", page === this.currentPage ? "page" : "false");
        });
    }

    private matches(row: HTMLTableRowElement, filters: ApplicationListFilters): boolean {
        const cells = Array.from(row.cells).map((cell) => cell.textContent?.trim().toLowerCase() ?? "");
        const searchText = cells.join(" ");
        const valueAt = (index: number): string => cells[index] ?? "";
        const status = row.querySelector<HTMLElement>(".app-list-status")?.textContent?.trim().toLowerCase() ?? "";
        const sla = row.querySelector<HTMLElement>(".app-list-sla")?.textContent?.trim().toLowerCase() ?? "";
        const amount = Number(valueAt(7).replace(/[^\d]/g, "")) || 0;
        const date = valueAt(2);
        const now = new Date();
        const matchesDate = filters.date === "" || filters.date.startsWith("all") ||
            (filters.date === "today" && date.includes(now.toISOString().slice(0, 10))) ||
            (filters.date === "this week" && date.includes(now.getFullYear().toString())) ||
            (filters.date === "this month" && date.includes(now.toISOString().slice(0, 7)));

        return (!filters.keyword || searchText.includes(filters.keyword)) &&
            (!filters.status || filters.status === "all" || status.includes(filters.status)) &&
            (!filters.branch || filters.branch.startsWith("all") || valueAt(5).includes(filters.branch)) &&
            (!filters.marketing || filters.marketing.startsWith("all") || valueAt(6).includes(filters.marketing)) &&
            (!filters.borrower || filters.borrower.startsWith("all") || valueAt(4).includes(filters.borrower)) &&
            (!filters.sla || filters.sla === "all" || sla.includes(filters.sla)) &&
            matchesDate && (filters.amountMin === null || amount >= filters.amountMin) &&
            (filters.amountMax === null || amount <= filters.amountMax);
    }
}

const applicationList = new ApplicationListController();

// Shared drag-to-resize behavior for user-facing data tables.
(function () {
    const tableSelector = [
        ".table-wrap table",
        ".priority-tasks__table-wrap table",
        ".sla-table-wrap table",
        ".recent-applications__table-wrap table",
    ].join(",");
    const minColumnWidth = 64;

    function initializeResizableTables() {
        document
            .querySelectorAll(tableSelector)
            .forEach(function (table, tableIndex) {
                const headerRow = table.tHead && table.tHead.rows[0];
                if (!headerRow || table.dataset.resizableReady === "true")
                    return;

                const headers = Array.from(headerRow.cells);
                if (
                    headers.length < 2 ||
                    headers.some(function (header) {
                        return header.colSpan > 1;
                    })
                )
                    return;

                table.dataset.resizableReady = "true";
                const pageKey =
                    "table-column-widths:" +
                    window.location.pathname +
                    ":" +
                    tableIndex;
                let savedWidths = {};
                try {
                    savedWidths = JSON.parse(
                        window.localStorage.getItem(pageKey) || "{}",
                    );
                } catch (error) {
                    savedWidths = {};
                }

                const columns = document.createElement("colgroup");
                const widths = headers.map(function (header, index) {
                    const savedWidth = Number(savedWidths[index]);
                    return Number.isFinite(savedWidth) &&
                        savedWidth >= minColumnWidth
                        ? savedWidth
                        : Math.max(
                              minColumnWidth,
                              Math.round(header.getBoundingClientRect().width),
                          );
                });

                widths.forEach(function (width) {
                    const column = document.createElement("col");
                    column.style.width = width + "px";
                    columns.appendChild(column);
                });
                table.insertBefore(columns, table.firstChild);
                table.style.tableLayout = "fixed";

                function applyWidths() {
                    const totalWidth = widths.reduce(function (sum, width) {
                        return sum + width;
                    }, 0);
                    Array.from(columns.children).forEach(
                        function (column, index) {
                            column.style.width = widths[index] + "px";
                        },
                    );
                    table.style.width = totalWidth + "px";
                }

                headers.forEach(function (header, index) {
                    header.classList.add("table-resizable-header");
                    const handle = document.createElement("span");
                    handle.className = "table-column-resizer";
                    handle.setAttribute("role", "separator");
                    handle.setAttribute("aria-orientation", "vertical");
                    handle.setAttribute(
                        "aria-label",
                        "Resize " + header.textContent.trim() + " column",
                    );
                    handle.setAttribute("tabindex", "0");
                    header.appendChild(handle);

                    function resizeBy(delta) {
                        const nextWidth = Math.max(
                            minColumnWidth,
                            widths[index] + delta,
                        );
                        widths[index] = nextWidth;
                        applyWidths();
                        try {
                            window.localStorage.setItem(
                                pageKey,
                                JSON.stringify(widths),
                            );
                        } catch (error) {
                            // Keep resizing available when browser storage is disabled.
                        }
                    }

                    handle.addEventListener("pointerdown", function (event) {
                        event.preventDefault();
                        handle.classList.add("is-dragging");
                        handle.setPointerCapture(event.pointerId);
                        let previousX = event.clientX;

                        function onPointerMove(moveEvent) {
                            resizeBy(moveEvent.clientX - previousX);
                            previousX = moveEvent.clientX;
                        }

                        function onPointerEnd() {
                            handle.classList.remove("is-dragging");
                            handle.removeEventListener(
                                "pointermove",
                                onPointerMove,
                            );
                            handle.removeEventListener(
                                "pointerup",
                                onPointerEnd,
                            );
                            handle.removeEventListener(
                                "pointercancel",
                                onPointerEnd,
                            );
                        }

                        handle.addEventListener("pointermove", onPointerMove);
                        handle.addEventListener("pointerup", onPointerEnd);
                        handle.addEventListener("pointercancel", onPointerEnd);
                    });

                    handle.addEventListener("keydown", function (event) {
                        if (
                            event.key !== "ArrowLeft" &&
                            event.key !== "ArrowRight"
                        )
                            return;
                        event.preventDefault();
                        resizeBy(event.key === "ArrowRight" ? 12 : -12);
                    });
                });

                applyWidths();
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeResizableTables,
        );
    } else {
        initializeResizableTables();
    }
})();

// ***************************************
// * APPLICATION TYPE
// ***************************************

(function () {
    const applicationTypeInputs = document.querySelectorAll(
        'input[name="application_type"]',
    );

    const existingFacilitySection = document.getElementById(
        "existingFacilityParameters",
    );

    if (!applicationTypeInputs.length || !existingFacilitySection) {
        return;
    }

    function syncApplicationType() {
        let selectedType = "new";

        applicationTypeInputs.forEach(function (input) {
            const option = input.closest(".new-app-option");

            if (input.checked) {
                selectedType = input.value;
            }

            if (option) {
                option.classList.toggle("is-selected", input.checked);
            }
        });

        // -----------------------------------
        // Existing Facility
        // -----------------------------------

        const isExisting = selectedType === "existing";

        existingFacilitySection.hidden = !isExisting;

        // Accessibility

        existingFacilitySection.setAttribute(
            "aria-hidden",
            isExisting ? "false" : "true",
        );

        // Automatically bring section
        // into view after opening.

        if (isExisting) {
            window.setTimeout(function () {
                existingFacilitySection.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
            }, 80);
        }
    }

    applicationTypeInputs.forEach(function (input) {
        input.addEventListener("change", syncApplicationType);
    });

    syncApplicationType();
})();

// ***************************************
// * BORROWER TYPE -> BORROWER DATA FORM
// ***************************************

(function () {
    const borrowerTypeInputs = Array.from(
        document.querySelectorAll('input[name="borrower_type"]'),
    );
    const individualForm = document.getElementById("borrowerIndividualForm");
    const businessForm = document.getElementById("borrowerBusinessForm");
    const typeBadge = document.getElementById("borrowerTypeBadge");

    if (!borrowerTypeInputs.length || !individualForm || !businessForm) {
        return;
    }

    function setPanelEnabled(panel, enabled) {
        panel
            .querySelectorAll("input, select, textarea, button")
            .forEach(function (control) {
                control.disabled = !enabled;
            });
    }

    function syncBorrowerType() {
        const checked = borrowerTypeInputs.find(function (input) {
            return input.checked;
        });

        const borrowerType = checked ? checked.value : "business";
        const isIndividual = borrowerType === "individual";

        borrowerTypeInputs.forEach(function (input) {
            const option = input.closest(".new-app-option");
            if (option) {
                option.classList.toggle("is-selected", input.checked);
            }
        });

        individualForm.hidden = !isIndividual;
        businessForm.hidden = isIndividual;

        setPanelEnabled(individualForm, isIndividual);
        setPanelEnabled(businessForm, !isIndividual);

        if (typeBadge) {
            typeBadge.textContent = isIndividual
                ? "Individual"
                : "Business Entity";
        }

        document.documentElement.dataset.borrowerType = borrowerType;
    }

    borrowerTypeInputs.forEach(function (input) {
        input.addEventListener("change", syncBorrowerType);
    });

    syncBorrowerType();

    // OCR integration hook. Call this with the JSON returned by your
    // OCR backend after document processing, for example:
    // applyBorrowerOcrData({ nik: '...', full_name: '...' });
    window.applyBorrowerOcrData = function (ocrData) {
        if (!ocrData || typeof ocrData !== "object") {
            return;
        }

        document
            .querySelectorAll("#borrowerData [data-ocr-field]")
            .forEach(function (field) {
                const key = field.dataset.ocrField;

                if (
                    !key ||
                    ocrData[key] === undefined ||
                    ocrData[key] === null
                ) {
                    return;
                }

                field.value = String(ocrData[key]);
                field.classList.add("is-ocr-filled");
                field.dispatchEvent(new Event("change", { bubbles: true }));
            });
    };

    // Address helper: Individual domicile = KTP address
    const sameAsKtp = document.getElementById("individualSameAsKtp");
    const ktpAddress = document.getElementById("individualKtpAddress");
    const domicileAddress = document.getElementById(
        "individualDomicileAddress",
    );

    if (sameAsKtp && ktpAddress && domicileAddress) {
        function syncKtpAddress() {
            if (sameAsKtp.checked) {
                domicileAddress.value = ktpAddress.value;
                domicileAddress.readOnly = true;
            } else {
                domicileAddress.readOnly = false;
            }
        }

        sameAsKtp.addEventListener("change", syncKtpAddress);
        ktpAddress.addEventListener("input", syncKtpAddress);
        syncKtpAddress();
    }

    // Address helper: Business domicile = NIB address
    const sameAsNib = document.getElementById("businessSameAsNib");
    const nibAddress = document.getElementById("businessNibAddress");
    const businessDomicile = document.getElementById("businessDomicileAddress");

    if (sameAsNib && nibAddress && businessDomicile) {
        function syncNibAddress() {
            if (sameAsNib.checked) {
                businessDomicile.value = nibAddress.value;
                businessDomicile.readOnly = true;
            } else {
                businessDomicile.readOnly = false;
            }
        }

        sameAsNib.addEventListener("change", syncNibAddress);
        nibAddress.addEventListener("input", syncNibAddress);
        syncNibAddress();
    }

    // Individual emergency phone must be different from borrower phone.
    const borrowerPhone = document.getElementById("individualPhone");
    const emergencyPhone = document.getElementById("individualEmergencyPhone");

    if (borrowerPhone && emergencyPhone) {
        function validateEmergencyPhone() {
            const same =
                borrowerPhone.value &&
                emergencyPhone.value &&
                borrowerPhone.value === emergencyPhone.value;
            emergencyPhone.setCustomValidity(
                same
                    ? "Emergency contact number must be different from borrower mobile number."
                    : "",
            );
        }

        borrowerPhone.addEventListener("input", validateEmergencyPhone);
        emergencyPhone.addEventListener("input", validateEmergencyPhone);
    }

    // Individual borrower minimum age = 21 years.
    const birthDate = document.getElementById("individualBirthDate");
    if (birthDate) {
        const today = new Date();
        const maxBirthDate = new Date(
            today.getFullYear() - 21,
            today.getMonth(),
            today.getDate(),
        );
        const yyyy = maxBirthDate.getFullYear();
        const mm = String(maxBirthDate.getMonth() + 1).padStart(2, "0");
        const dd = String(maxBirthDate.getDate()).padStart(2, "0");
        birthDate.max = yyyy + "-" + mm + "-" + dd;
    }

    // Ministry of Law establishment decree is required only for PT.
    const legalForm = document.getElementById("businessLegalForm");
    const establishmentDecree = document.getElementById(
        "businessSkEstablishment",
    );

    if (legalForm && establishmentDecree) {
        function syncPtRequirement() {
            establishmentDecree.required = legalForm.value === "PT";
        }

        legalForm.addEventListener("change", syncPtRequirement);
        syncPtRequirement();
    }
})();

// ***************************************
// * NEW APPLICATION MULTI STEP WIZARD
// ***************************************

(function () {
    const progress = document.getElementById("newAppProgress");

    const progressScroll = document.getElementById("newAppProgressScroll");

    const pagesContainer = document.getElementById("newAppPages");

    // Script hanya berjalan di halaman new-app
    if (!progress || !progressScroll || !pagesContainer) {
        return;
    }

    const steps = Array.from(
        progress.querySelectorAll(".new-app-progress-step"),
    );

    const pages = Array.from(pagesContainer.querySelectorAll(".new-app-page"));

    const lines = Array.from(
        progress.querySelectorAll(".new-app-progress-line"),
    );

    const defaultHash = "#applicationData";

    const validHashes = pages.map(function (page) {
        return "#" + page.id;
    });

    // =====================================
    // SHOW PAGE
    // =====================================

    function showPage(hash, updateUrl = true) {
        // Jika hash tidak valid, kembali ke step 1
        if (!validHashes.includes(hash)) {
            hash = defaultHash;
        }

        const targetPage = document.querySelector(hash);

        if (!targetPage) {
            return;
        }

        const currentStep = Number(targetPage.dataset.step);

        // =================================
        // HIDE / SHOW PAGE
        // =================================

        pages.forEach(function (page) {
            const isActive = page === targetPage;

            page.hidden = !isActive;

            page.classList.toggle("is-active", isActive);
        });

        // =================================
        // UPDATE PROGRESS STEP
        // =================================

        steps.forEach(function (step) {
            const stepNumber = Number(step.dataset.step);

            const isActive = stepNumber === currentStep;

            const isCompleted = stepNumber < currentStep;

            step.classList.toggle("is-active", isActive);

            step.classList.toggle("is-completed", isCompleted);

            if (isActive) {
                step.setAttribute("aria-current", "step");
            } else {
                step.removeAttribute("aria-current");
            }
        });

        // =================================
        // UPDATE CONNECTOR LINE
        // =================================

        lines.forEach(function (line, index) {
            line.classList.toggle("is-completed", index < currentStep - 1);
        });

        // =================================
        // UPDATE URL
        // =================================

        if (updateUrl && window.location.hash !== hash) {
            history.pushState(
                {
                    step: currentStep,
                },
                "",
                hash,
            );
        }

        // =================================
        // KEEP ACTIVE STEP VISIBLE
        // =================================

        const activeStep = steps.find(function (step) {
            return Number(step.dataset.step) === currentStep;
        });

        if (activeStep) {
            activeStep.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
            });
        }

        // =================================
        // MOVE CONTENT TO TOP
        // =================================

        window.scrollTo({
            top:
                pagesContainer.getBoundingClientRect().top +
                window.scrollY -
                90,

            behavior: "smooth",
        });

        window.dispatchEvent(
            new CustomEvent("newapp:page-change", {
                detail: { hash: hash, currentStep: currentStep },
            }),
        );
    }

    // =====================================
    // PROGRESS BAR CLICK
    // =====================================

    steps.forEach(function (step) {
        step.addEventListener("click", function (event) {
            event.preventDefault();

            const hash = step.getAttribute("href");

            if (!validHashes.includes(hash)) {
                return;
            }

            showPage(hash, true);
        });
    });

    // =====================================
    // PREVIOUS / NEXT BUTTONS
    // =====================================

    pagesContainer.addEventListener("click", function (event) {
        const link = event.target.closest('a[href^="#"]');

        if (!link) {
            return;
        }

        const hash = link.getAttribute("href");

        if (!validHashes.includes(hash)) {
            return;
        }

        event.preventDefault();

        showPage(hash, true);
    });

    // =====================================
    // BROWSER BACK / FORWARD
    // =====================================

    window.addEventListener("popstate", function () {
        showPage(window.location.hash || defaultHash, false);
    });

    // =====================================
    // INITIAL LOAD
    // =====================================

    const initialHash = validHashes.includes(window.location.hash)
        ? window.location.hash
        : defaultHash;

    showPage(initialHash, false);
})();

// ***************************************
// * DOCUMENT CHECKLIST + MULTI UPLOAD
// * Dynamic BRD document requirements
// ***************************************
(function () {
    const root = document.getElementById("docUploadGroups");
    const modal = document.getElementById("docPreviewModal");
    const modalImage = document.getElementById("docPreviewImage");
    const modalTitle = document.getElementById("docPreviewTitle");
    const message = document.getElementById("docUploadMessage");

    if (!root) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const MAX_OWNER_SETS = 3;
    const state = Object.create(null);
    const inputMap = Object.create(null);

    const manualRepeatCounts = {
        collateralOwner: 0,
        collateral: 1,
    };

    function getCheckedValue(name, fallback) {
        const input = document.querySelector(
            'input[name="' + name + '"]:checked',
        );
        return input ? input.value : fallback || "";
    }

    function getContext() {
        const borrowerType = getCheckedValue("borrower_type", "business");
        const maritalStatus =
            document.getElementById("individualMaritalStatus")?.value || "";
        const legalForm =
            document.getElementById("businessLegalForm")?.value || "";
        const employmentStatus =
            document.getElementById("employmentStatus")?.value || "";
        const collateralStatus = getCheckedValue(
            "collateral_status",
            "on_hand",
        );

        const collateralRows = Array.from(
            document.querySelectorAll("[data-collateral-row]"),
        );
        const ownerRows = Array.from(
            document.querySelectorAll("[data-collateral-owner-row]"),
        );

        const collateralImbStatuses = collateralRows.map(function (row) {
            return (
                row.querySelector('[data-collateral-field="imb_status"]')
                    ?.value || ""
            );
        });

        const ownerMaritalStatuses = ownerRows.map(function (row) {
            return (
                row.querySelector('[data-owner-field="marital_status"]')
                    ?.value || ""
            );
        });

        manualRepeatCounts.collateral = Math.max(
            1,
            manualRepeatCounts.collateral,
            collateralRows.length,
        );

        manualRepeatCounts.collateralOwner = Math.min(
            MAX_OWNER_SETS,
            Math.max(manualRepeatCounts.collateralOwner, ownerRows.length),
        );

        return {
            borrowerType,
            maritalStatus,
            legalForm,
            employmentStatus,
            collateralStatus,
            collateralCount: manualRepeatCounts.collateral,
            collateralOwnerCount: manualRepeatCounts.collateralOwner,
            collateralImbStatuses,
            ownerMaritalStatuses,
        };
    }

    function required() {
        return "required";
    }
    function optional() {
        return "optional";
    }
    function conditional() {
        return "conditional";
    }

    const categories = [
        {
            key: "formsConsent",
            title: "Forms & Consent",
            icon: "fa-regular fa-file-lines",
            description:
                "Core application and consent documents required for every application.",
            show: function () {
                return true;
            },
            documents: [
                {
                    key: "signed_credit_application",
                    label: "Signed Credit Application Form",
                    multi: false,
                    status: required,
                    note: "Required for all applications.",
                },
                {
                    key: "slik_consent",
                    label: "SLIK Check & Personal Data Processing Consent",
                    multi: false,
                    status: required,
                    note: "Required for every subject that will be checked.",
                },
            ],
        },
        {
            key: "individualBorrower",
            title: "Individual Borrower Documents",
            icon: "fa-regular fa-id-card",
            description:
                "Identity and supporting documents for an Individual borrower.",
            show: function (ctx) {
                return ctx.borrowerType === "individual";
            },
            documents: [
                {
                    key: "ktp",
                    label: "ID Card (KTP)",
                    multi: false,
                    status: required,
                },
                {
                    key: "family_card",
                    label: "Family Card (Kartu Keluarga)",
                    multi: false,
                    status: required,
                },
                {
                    key: "npwp",
                    label: "Personal NPWP",
                    multi: false,
                    status: required,
                },
                {
                    key: "marital_document",
                    label: "Marriage Certificate / Divorce Decree / Death Certificate",
                    multi: false,
                    status: function (ctx) {
                        if (!ctx.maritalStatus) return conditional();
                        return ctx.maritalStatus === "single"
                            ? "hidden"
                            : required();
                    },
                    note: "Required according to marital status, except when Single.",
                },
                {
                    key: "selfie_ktp",
                    label: "Selfie with ID Card",
                    multi: false,
                    status: required,
                },
                {
                    key: "other_support",
                    label: "Other Supporting Documents",
                    multi: true,
                    status: optional,
                },
            ],
        },
        {
            key: "spouse",
            title: "Spouse Documents",
            icon: "fa-solid fa-people-roof",
            description:
                "Displayed for an Individual borrower when marital status is Married.",
            show: function (ctx) {
                return (
                    ctx.borrowerType === "individual" &&
                    (!ctx.maritalStatus || ctx.maritalStatus === "married")
                );
            },
            categoryStatus: function (ctx) {
                return ctx.maritalStatus === "married"
                    ? "required"
                    : "conditional";
            },
            documents: [
                {
                    key: "spouse_ktp",
                    label: "Spouse ID Card (KTP)",
                    multi: false,
                    status: function (ctx) {
                        return ctx.maritalStatus === "married"
                            ? required()
                            : conditional();
                    },
                },
                {
                    key: "spouse_npwp",
                    label: "Spouse NPWP",
                    multi: false,
                    status: optional,
                },
                {
                    key: "spouse_selfie",
                    label: "Spouse Selfie with ID Card",
                    multi: false,
                    status: function (ctx) {
                        return ctx.maritalStatus === "married"
                            ? required()
                            : conditional();
                    },
                },
                {
                    key: "spouse_other_support",
                    label: "Other Spouse Supporting Documents",
                    multi: true,
                    status: optional,
                    note: "Family Card and marriage certificate only need to be uploaded once under borrower documents.",
                },
            ],
        },
        {
            key: "collateralOwner",
            title: "Collateral Owner Documents",
            icon: "fa-regular fa-address-card",
            description:
                "Create one document set for each additional collateral owner. Maximum 3 owners.",
            show: function () {
                return true;
            },
            repeat: true,
            repeatCount: function (ctx) {
                return ctx.collateralOwnerCount;
            },
            maxRepeat: MAX_OWNER_SETS,
            addLabel: "Add Collateral Owner Documents",
            emptyText:
                "No additional collateral owner document set has been added.",
            documents: [
                {
                    key: "owner_ktp",
                    label: "Owner ID Card (KTP)",
                    multi: false,
                    status: required,
                },
                {
                    key: "owner_family_card",
                    label: "Owner Family Card",
                    multi: false,
                    status: required,
                },
                {
                    key: "owner_npwp",
                    label: "Owner NPWP",
                    multi: false,
                    status: optional,
                },
                {
                    key: "owner_marital_document",
                    label: "Owner Marriage Certificate / Divorce Decree",
                    multi: false,
                    status: function (ctx, repeatIndex) {
                        const value =
                            ctx.ownerMaritalStatuses[repeatIndex] || "";
                        if (!value) return conditional();
                        return value === "single" ? "hidden" : required();
                    },
                    note: "Required according to the collateral owner marital status.",
                },
                {
                    key: "owner_selfie",
                    label: "Owner Selfie with ID Card",
                    multi: false,
                    status: required,
                },
                {
                    key: "owner_spouse_ktp",
                    label: "Collateral Owner Spouse ID Card",
                    multi: false,
                    status: function (ctx, repeatIndex) {
                        const value =
                            ctx.ownerMaritalStatuses[repeatIndex] || "";
                        if (!value) return conditional();
                        return value === "married" ? required() : "hidden";
                    },
                    note: "Required when the collateral owner is Married.",
                },
                {
                    key: "owner_other_support",
                    label: "Other Owner Supporting Documents",
                    multi: true,
                    status: optional,
                },
            ],
        },
        {
            key: "collateral",
            title: "Collateral Documents",
            icon: "fa-solid fa-building-shield",
            description:
                "Documents are maintained per collateral. Add another set for additional collateral.",
            show: function () {
                return true;
            },
            repeat: true,
            repeatCount: function (ctx) {
                return ctx.collateralCount;
            },
            addLabel: "Add Collateral Document Set",
            documents: [
                {
                    key: "certificate",
                    label: "Certificate (SHM / SHGB / SHMSRS)",
                    multi: true,
                    status: required,
                },
                {
                    key: "imb_pbg",
                    label: "IMB / PBG",
                    multi: true,
                    status: function (ctx, repeatIndex) {
                        const value =
                            ctx.collateralImbStatuses[repeatIndex] || "";
                        if (!value) return conditional();
                        return value === "available" ? required() : "hidden";
                    },
                    note: "Required when IMB / PBG is available.",
                },
                {
                    key: "pbb_current",
                    label: "Current Year PBB",
                    multi: false,
                    status: required,
                },
                {
                    key: "pbb_minus_1",
                    label: "PBB Ã¢â‚¬â€œ Previous Year",
                    multi: false,
                    status: required,
                },
                {
                    key: "pbb_minus_2",
                    label: "PBB Ã¢â‚¬â€œ Two Years Ago",
                    multi: false,
                    status: required,
                },
                {
                    key: "pbb_payment",
                    label: "PBB Payment Proof",
                    multi: true,
                    status: optional,
                    note: "Proposed supporting document.",
                },
                {
                    key: "collateral_photo",
                    label: "Collateral Photos (Marketing)",
                    multi: true,
                    status: optional,
                    note: "Proposed supporting document.",
                },
                {
                    key: "collateral_other_support",
                    label: "Other Collateral Supporting Documents",
                    multi: true,
                    status: optional,
                },
            ],
        },
        {
            key: "businessLegality",
            title: "Business Legality",
            icon: "fa-solid fa-scale-balanced",
            description:
                "For Business Entity borrowers or Individual borrowers who are Business Owners.",
            show: function (ctx) {
                return (
                    ctx.borrowerType === "business" ||
                    ctx.employmentStatus === "business_owner"
                );
            },
            documents: [
                {
                    key: "business_nib",
                    label: "NIB",
                    multi: true,
                    status: required,
                },
                {
                    key: "business_npwp",
                    label: "Business NPWP",
                    multi: true,
                    status: required,
                },
                {
                    key: "establishment_deed",
                    label: "Deed of Establishment",
                    multi: true,
                    status: function (ctx) {
                        return ctx.borrowerType === "business"
                            ? required()
                            : conditional();
                    },
                    note: "Required for Business Entity borrowers.",
                },
                {
                    key: "amendment_deed",
                    label: "Latest / Other Amendment Deed",
                    multi: true,
                    status: optional,
                },
                {
                    key: "sk_establishment",
                    label: "Ministry of Law Establishment Decree",
                    multi: true,
                    status: function (ctx) {
                        if (ctx.legalForm === "PT") return required();
                        return ctx.borrowerType === "business" && !ctx.legalForm
                            ? conditional()
                            : optional();
                    },
                    note: "Required when the legal form is PT.",
                },
                {
                    key: "sk_amendment",
                    label: "Latest Ministry of Law Amendment Decree",
                    multi: true,
                    status: optional,
                },
                {
                    key: "management_ktp",
                    label: "Management ID Cards",
                    multi: true,
                    status: function (ctx) {
                        return ctx.borrowerType === "business"
                            ? required()
                            : conditional();
                    },
                    note: "Required for Business Entity borrowers.",
                },
                {
                    key: "business_other_support",
                    label: "Other Business Supporting Documents",
                    multi: true,
                    status: optional,
                },
            ],
        },
        {
            key: "repayment",
            title: "Repayment Documents",
            icon: "fa-regular fa-credit-card",
            description:
                "Financial capacity and repayment-source supporting documents.",
            show: function () {
                return true;
            },
            documents: [
                {
                    key: "bank_statement",
                    label: "Bank Statements (minimum last 3 months)",
                    multi: true,
                    status: required,
                    note: "Minimum period follows the applicable master configuration.",
                },
                {
                    key: "financial_statement",
                    label: "Financial Statements",
                    multi: true,
                    status: function (ctx) {
                        return ctx.borrowerType === "business"
                            ? required()
                            : conditional();
                    },
                    note: "Required for Business Entity borrowers.",
                },
                {
                    key: "invoice_po_rab",
                    label: "Invoice / PO / Receipt / RAB",
                    multi: true,
                    status: conditional,
                    note: "Required when repayment source is Project / Business.",
                },
                {
                    key: "salary_slip",
                    label: "Salary Slips (last 3 months)",
                    multi: true,
                    status: function (ctx) {
                        const employee =
                            ctx.employmentStatus === "permanent_employee" ||
                            ctx.employmentStatus === "contract_employee";
                        if (employee) return required();
                        return ctx.borrowerType === "individual" &&
                            !ctx.employmentStatus
                            ? conditional()
                            : "hidden";
                    },
                    note: "Required for employee borrowers.",
                },
                {
                    key: "employment_letter",
                    label: "Appointment Decree / Employment Certificate",
                    multi: false,
                    status: function (ctx) {
                        const employee =
                            ctx.employmentStatus === "permanent_employee" ||
                            ctx.employmentStatus === "contract_employee";
                        if (employee) return required();
                        return ctx.borrowerType === "individual" &&
                            !ctx.employmentStatus
                            ? conditional()
                            : "hidden";
                    },
                    note: "Proposed as required for employee borrowers.",
                },
                {
                    key: "repayment_other_support",
                    label: "Other Repayment Supporting Documents",
                    multi: true,
                    status: optional,
                },
            ],
        },
        {
            key: "takeOver",
            title: "Take Over Documents",
            icon: "fa-solid fa-arrow-right-arrow-left",
            description: "Displayed only when Collateral Status is Take Over.",
            show: function (ctx) {
                return ctx.collateralStatus === "take_over";
            },
            documents: [
                {
                    key: "remaining_loan_statement",
                    label: "Remaining Loan Statement",
                    multi: false,
                    status: required,
                },
                {
                    key: "payment_history_6m",
                    label: "Payment History Ã¢â‚¬â€œ Last 6 Months",
                    multi: true,
                    status: required,
                },
                {
                    key: "takeover_other_support",
                    label: "Other Take Over Supporting Documents",
                    multi: true,
                    status: optional,
                },
            ],
        },
    ];

    function slug(text) {
        return String(text).replace(/[^a-zA-Z0-9_-]+/g, "_");
    }

    function slotKey(categoryKey, repeatIndex, documentKey) {
        return (
            categoryKey +
            "::" +
            (repeatIndex === null ? "base" : repeatIndex) +
            "::" +
            documentKey
        );
    }

    function fieldName(categoryKey, repeatIndex, documentKey) {
        const index = repeatIndex === null ? "base" : String(repeatIndex + 1);
        return (
            "documents[" +
            slug(categoryKey) +
            "][" +
            index +
            "][" +
            slug(documentKey) +
            "][]"
        );
    }

    function ensureSlot(key) {
        if (!state[key]) state[key] = { files: [] };
        return state[key];
    }

    function isPdf(file) {
        return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    }

    function isImage(file) {
        return (
            /image\/(jpeg|png)/i.test(file.type) ||
            /\.(jpe?g|png)$/i.test(file.name)
        );
    }

    function isAllowed(file) {
        return isPdf(file) || isImage(file);
    }

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
        if (bytes < 1024 * 1024)
            return Math.max(1, Math.round(bytes / 1024)) + " KB";
        return (
            (bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1) +
            " MB"
        );
    }

    function fileKey(file) {
        return [file.name, file.size, file.lastModified].join("::");
    }

    function showMessage(text, type) {
        if (!message) return;
        message.hidden = false;
        message.className =
            "doc-checklist-message doc-checklist-message--" + (type || "info");
        message.innerHTML =
            '<i class="fa-solid ' +
            (type === "error" ? "fa-circle-exclamation" : "fa-circle-info") +
            '" aria-hidden="true"></i><span>' +
            text +
            "</span>";
        window.clearTimeout(showMessage.timer);
        showMessage.timer = window.setTimeout(function () {
            message.hidden = true;
        }, 4500);
    }

    function validateFiles(fileList) {
        const accepted = [];
        const errors = [];

        Array.from(fileList || []).forEach(function (file) {
            if (!isAllowed(file)) {
                errors.push(file.name + ": only PDF/JPG/JPEG/PNG is allowed.");
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                errors.push(file.name + ": maximum size is 10 MB.");
                return;
            }
            accepted.push(file);
        });

        if (errors.length) showMessage(errors.join(" "), "error");
        return accepted;
    }

    function syncInput(key, name, multiple) {
        const slot = ensureSlot(key);
        let input = inputMap[key];

        if (!input || !document.body.contains(input)) {
            input = document.createElement("input");
            input.type = "file";
            input.hidden = true;
            input.className = "doc-checklist-hidden-input";
            input.name = name;
            input.multiple = Boolean(multiple);
            root.appendChild(input);
            inputMap[key] = input;
        }

        if (typeof DataTransfer === "undefined") return;
        const dt = new DataTransfer();
        slot.files.forEach(function (record) {
            dt.items.add(record.file);
        });
        input.files = dt.files;
    }

    function revokeRecord(record) {
        if (record?.url) URL.revokeObjectURL(record.url);
        (record?.history || []).forEach(function (version) {
            if (version.url) URL.revokeObjectURL(version.url);
        });
    }

    function addFiles(key, files, multiple, inputName) {
        const accepted = validateFiles(files);
        if (!accepted.length) return;

        const slot = ensureSlot(key);
        const existing = new Set(
            slot.files.map(function (record) {
                return fileKey(record.file);
            }),
        );

        if (!multiple) {
            const file = accepted[0];
            const current = slot.files[0];
            if (current && fileKey(current.file) === fileKey(file)) return;

            if (current) {
                current.history = current.history || [];
                current.history.push({ file: current.file, url: current.url });
                current.file = file;
                current.url = URL.createObjectURL(file);
            } else {
                slot.files = [
                    {
                        file,
                        url: URL.createObjectURL(file),
                        description: "",
                        history: [],
                    },
                ];
            }
        } else {
            accepted.forEach(function (file) {
                const unique = fileKey(file);
                if (existing.has(unique)) return;
                existing.add(unique);
                slot.files.push({
                    file,
                    url: URL.createObjectURL(file),
                    description: "",
                    history: [],
                });
            });
        }

        syncInput(key, inputName, multiple);
        render();
    }

    function replaceFile(key, index, inputName, multiple) {
        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept =
            ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
        picker.addEventListener(
            "change",
            function () {
                const accepted = validateFiles(picker.files);
                if (!accepted.length) return;

                const slot = ensureSlot(key);
                const record = slot.files[index];
                if (!record) return;

                record.history = record.history || [];
                record.history.push({ file: record.file, url: record.url });
                record.file = accepted[0];
                record.url = URL.createObjectURL(accepted[0]);
                syncInput(key, inputName, multiple);
                render();
            },
            { once: true },
        );
        picker.click();
    }

    function removeFile(key, index, inputName, multiple) {
        const slot = ensureSlot(key);
        const removed = slot.files.splice(index, 1)[0];
        revokeRecord(removed);
        syncInput(key, inputName, multiple);
        render();
    }

    function openImagePreview(record) {
        if (!modal || !modalImage || !modalTitle) return;
        modalImage.src = record.url;
        modalImage.alt = record.file.name + " preview";
        modalTitle.textContent = record.file.name;
        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closePreview() {
        if (!modal) return;
        modal.hidden = true;
        if (modalImage) modalImage.removeAttribute("src");
        document.body.style.removeProperty("overflow");
    }

    function statusText(status) {
        if (status === "required") return "Required";
        if (status === "conditional") return "Conditional";
        return "Optional";
    }

    function fileCard(record, key, index, inputName, multiple) {
        const article = document.createElement("article");
        article.className = "doc-checklist-file";

        const media = document.createElement("button");
        media.type = "button";
        media.className = "doc-checklist-file__preview";

        if (isImage(record.file)) {
            const image = document.createElement("img");
            image.src = record.url;
            image.alt = record.file.name;
            media.appendChild(image);
            media.addEventListener("click", function () {
                openImagePreview(record);
            });
        } else {
            media.innerHTML =
                '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i><span>PDF</span>';
            media.addEventListener("click", function () {
                window.open(record.url, "_blank", "noopener,noreferrer");
            });
        }

        const body = document.createElement("div");
        body.className = "doc-checklist-file__body";

        const header = document.createElement("div");
        header.className = "doc-checklist-file__header";

        const fileName = document.createElement("strong");
        fileName.title = record.file.name;
        fileName.textContent = record.file.name;

        const fileSize = document.createElement("span");
        fileSize.textContent = formatBytes(record.file.size);

        header.append(fileName, fileSize);

        const description = document.createElement("input");
        description.type = "text";
        description.className = "doc-checklist-file__description";
        description.placeholder = "Description / note (optional)";
        description.value = record.description || "";
        description.name = inputName.replace(/\[\]$/, "_descriptions[]");
        description.addEventListener("input", function () {
            record.description = description.value;
        });

        const actions = document.createElement("div");
        actions.className = "doc-checklist-file__actions";

        const view = document.createElement(
            isPdf(record.file) ? "a" : "button",
        );
        if (isPdf(record.file)) {
            view.href = record.url;
            view.target = "_blank";
            view.rel = "noopener noreferrer";
            view.innerHTML =
                '<i class="fa-solid fa-arrow-up-right-from-square"></i> View PDF';
        } else {
            view.type = "button";
            view.innerHTML = '<i class="fa-regular fa-eye"></i> Preview';
            view.addEventListener("click", function () {
                openImagePreview(record);
            });
        }
        view.className = "doc-checklist-file__action";

        const replace = document.createElement("button");
        replace.type = "button";
        replace.className = "doc-checklist-file__action";
        replace.innerHTML = '<i class="fa-solid fa-rotate"></i> Replace';
        replace.addEventListener("click", function () {
            replaceFile(key, index, inputName, multiple);
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className =
            "doc-checklist-file__action doc-checklist-file__action--danger";
        remove.innerHTML = '<i class="fa-regular fa-trash-can"></i> Remove';
        remove.addEventListener("click", function () {
            removeFile(key, index, inputName, multiple);
        });

        actions.append(view, replace, remove);

        if (record.history?.length) {
            const history = document.createElement("span");
            history.className = "doc-checklist-file__history";
            history.innerHTML =
                '<i class="fa-solid fa-clock-rotate-left"></i> ' +
                record.history.length +
                " previous version" +
                (record.history.length > 1 ? "s" : "") +
                " kept";
            body.append(header, description, history, actions);
        } else {
            body.append(header, description, actions);
        }

        article.append(media, body);
        return article;
    }

    function createUploadPicker(key, documentDef, inputName) {
        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept =
            ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
        picker.multiple = Boolean(documentDef.multi);
        picker.addEventListener(
            "change",
            function () {
                addFiles(key, picker.files, documentDef.multi, inputName);
            },
            { once: true },
        );
        picker.click();
    }

    function renderDocument(category, documentDef, ctx, repeatIndex) {
        const status =
            typeof documentDef.status === "function"
                ? documentDef.status(ctx, repeatIndex)
                : documentDef.status || "optional";

        if (status === "hidden") return null;

        const key = slotKey(category.key, repeatIndex, documentDef.key);
        const inputName = fieldName(category.key, repeatIndex, documentDef.key);
        const slot = ensureSlot(key);
        const hasFiles = slot.files.length > 0;

        syncInput(key, inputName, documentDef.multi);

        const row = document.createElement("article");
        row.className = "doc-requirement doc-requirement--" + status;
        if (hasFiles) row.classList.add("is-uploaded");
        if (status === "required" && !hasFiles) row.classList.add("is-missing");

        const top = document.createElement("div");
        top.className = "doc-requirement__top";

        const copy = document.createElement("div");
        copy.className = "doc-requirement__copy";
        copy.innerHTML =
            '<div class="doc-requirement__title-row"><h4>' +
            documentDef.label +
            '</h4><span class="doc-requirement__status doc-requirement__status--' +
            status +
            '">' +
            statusText(status) +
            "</span>" +
            (documentDef.multi
                ? '<span class="doc-requirement__multi"><i class="fa-solid fa-layer-group"></i> Multi-file</span>'
                : '<span class="doc-requirement__multi"><i class="fa-regular fa-file"></i> Single file</span>') +
            "</div>" +
            (documentDef.note ? "<p>" + documentDef.note + "</p>" : "");

        const actions = document.createElement("div");
        actions.className = "doc-requirement__actions";

        const upload = document.createElement("button");
        upload.type = "button";
        upload.className = "doc-requirement__upload";
        upload.innerHTML =
            hasFiles && !documentDef.multi
                ? '<i class="fa-solid fa-rotate"></i> Replace File'
                : '<i class="fa-solid fa-cloud-arrow-up"></i> ' +
                  (hasFiles ? "Add Files" : "Upload");
        upload.addEventListener("click", function () {
            createUploadPicker(key, documentDef, inputName);
        });

        actions.appendChild(upload);
        top.append(copy, actions);
        row.appendChild(top);

        if (!hasFiles) {
            const missing = document.createElement("div");
            missing.className = "doc-requirement__empty";
            missing.innerHTML =
                status === "required"
                    ? '<i class="fa-solid fa-circle-exclamation"></i><span>Required document has not been uploaded.</span>'
                    : status === "conditional"
                      ? '<i class="fa-regular fa-circle-question"></i><span>Upload this document when the stated condition applies.</span>'
                      : '<i class="fa-regular fa-file"></i><span>No file uploaded. This document is optional.</span>';
            row.appendChild(missing);
        } else {
            const grid = document.createElement("div");
            grid.className = "doc-checklist-file-grid";
            slot.files.forEach(function (record, index) {
                grid.appendChild(
                    fileCard(record, key, index, inputName, documentDef.multi),
                );
            });
            row.appendChild(grid);
        }

        return { element: row, status, hasFiles };
    }

    function renderCategory(category, ctx) {
        if (!category.show(ctx)) return null;

        const card = document.createElement("section");
        card.className = "doc-checklist-category";
        card.dataset.documentCategory = category.key;

        const header = document.createElement("div");
        header.className = "doc-checklist-category__header";

        const heading = document.createElement("div");
        heading.className = "doc-checklist-category__heading";
        heading.innerHTML =
            '<span class="doc-checklist-category__icon"><i class="' +
            category.icon +
            '" aria-hidden="true"></i></span><div><h3>' +
            category.title +
            "</h3><p>" +
            category.description +
            "</p></div>";

        const headerActions = document.createElement("div");
        headerActions.className = "doc-checklist-category__actions";

        if (category.repeat) {
            const add = document.createElement("button");
            add.type = "button";
            add.className = "doc-checklist-category__add";
            add.innerHTML =
                '<i class="fa-solid fa-plus"></i> ' + category.addLabel;
            add.disabled =
                category.maxRepeat &&
                category.repeatCount(ctx) >= category.maxRepeat;
            add.addEventListener("click", function () {
                manualRepeatCounts[category.key] += 1;
                if (category.maxRepeat)
                    manualRepeatCounts[category.key] = Math.min(
                        category.maxRepeat,
                        manualRepeatCounts[category.key],
                    );
                render();
            });
            headerActions.appendChild(add);
        }

        const categoryStatus = category.categoryStatus
            ? category.categoryStatus(ctx)
            : "";
        if (categoryStatus) {
            const badge = document.createElement("span");
            badge.className =
                "doc-checklist-category__badge doc-checklist-category__badge--" +
                categoryStatus;
            badge.textContent = statusText(categoryStatus);
            headerActions.prepend(badge);
        }

        header.append(heading, headerActions);
        card.appendChild(header);

        const body = document.createElement("div");
        body.className = "doc-checklist-category__body";

        const repeats = category.repeat ? category.repeatCount(ctx) : 1;

        if (category.repeat && repeats === 0) {
            const empty = document.createElement("div");
            empty.className = "doc-checklist-repeat-empty";
            empty.innerHTML =
                '<i class="fa-regular fa-folder-open"></i><div><strong>No document set added yet.</strong><span>' +
                category.emptyText +
                "</span></div>";
            body.appendChild(empty);
        }

        for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
            const group = document.createElement("div");
            group.className = "doc-checklist-repeat-group";

            if (category.repeat) {
                const repeatHeader = document.createElement("div");
                repeatHeader.className = "doc-checklist-repeat-group__header";
                repeatHeader.innerHTML =
                    "<div><strong>" +
                    (category.key === "collateralOwner"
                        ? "Collateral Owner"
                        : "Collateral") +
                    " " +
                    (repeatIndex + 1) +
                    "</strong><span>Document set</span></div>";

                const canRemoveSet =
                    repeatIndex === repeats - 1 &&
                    ((category.key === "collateralOwner" && repeats > 0) ||
                        (category.key === "collateral" && repeats > 1));

                if (canRemoveSet) {
                    const removeSet = document.createElement("button");
                    removeSet.type = "button";
                    removeSet.className = "doc-checklist-repeat-group__remove";
                    removeSet.innerHTML =
                        '<i class="fa-regular fa-trash-can"></i> Remove Set';
                    removeSet.addEventListener("click", function () {
                        category.documents.forEach(function (documentDef) {
                            const key = slotKey(
                                category.key,
                                repeatIndex,
                                documentDef.key,
                            );
                            const slot = state[key];
                            if (slot) {
                                slot.files.forEach(revokeRecord);
                                delete state[key];
                            }
                            const input = inputMap[key];
                            if (input) input.remove();
                            delete inputMap[key];
                        });

                        manualRepeatCounts[category.key] = Math.max(
                            category.key === "collateral" ? 1 : 0,
                            manualRepeatCounts[category.key] - 1,
                        );
                        render();
                    });
                    repeatHeader.appendChild(removeSet);
                }

                group.appendChild(repeatHeader);
            }

            const items = document.createElement("div");
            items.className = "doc-checklist-items";

            category.documents.forEach(function (documentDef) {
                const rendered = renderDocument(
                    category,
                    documentDef,
                    ctx,
                    category.repeat ? repeatIndex : null,
                );
                if (rendered) items.appendChild(rendered.element);
            });

            group.appendChild(items);
            body.appendChild(group);
        }

        card.appendChild(body);
        return card;
    }

    function updateSummary(ctx) {
        let requiredCount = 0;
        let uploadedCount = 0;
        let missingCount = 0;
        let conditionalCount = 0;

        categories.forEach(function (category) {
            if (!category.show(ctx)) return;
            const repeats = category.repeat ? category.repeatCount(ctx) : 1;

            for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
                category.documents.forEach(function (documentDef) {
                    const status =
                        typeof documentDef.status === "function"
                            ? documentDef.status(
                                  ctx,
                                  category.repeat ? repeatIndex : null,
                              )
                            : documentDef.status || "optional";
                    if (status === "hidden") return;

                    const key = slotKey(
                        category.key,
                        category.repeat ? repeatIndex : null,
                        documentDef.key,
                    );
                    const hasFiles = ensureSlot(key).files.length > 0;

                    if (status === "required") {
                        requiredCount += 1;
                        if (!hasFiles) missingCount += 1;
                    }
                    if (status === "conditional") conditionalCount += 1;
                    if (hasFiles) uploadedCount += 1;
                });
            }
        });

        const required = document.getElementById("docRequiredCount");
        const uploaded = document.getElementById("docUploadedCount");
        const missing = document.getElementById("docMissingCount");
        const conditionalEl = document.getElementById("docConditionalCount");
        if (required) required.textContent = String(requiredCount);
        if (uploaded) uploaded.textContent = String(uploadedCount);
        if (missing) missing.textContent = String(missingCount);
        if (conditionalEl) conditionalEl.textContent = String(conditionalCount);

        const missingItems = [];
        categories.forEach(function (category) {
            if (!category.show(ctx)) return;
            const repeats = category.repeat ? category.repeatCount(ctx) : 1;
            for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
                category.documents.forEach(function (documentDef) {
                    const status =
                        typeof documentDef.status === "function"
                            ? documentDef.status(
                                  ctx,
                                  category.repeat ? repeatIndex : null,
                              )
                            : documentDef.status || "optional";
                    if (status !== "required") return;

                    const key = slotKey(
                        category.key,
                        category.repeat ? repeatIndex : null,
                        documentDef.key,
                    );
                    if (ensureSlot(key).files.length > 0) return;

                    const repeatLabel = category.repeat
                        ? " #" + (repeatIndex + 1)
                        : "";
                    missingItems.push({
                        category: category.title + repeatLabel,
                        label: documentDef.label,
                        step: "docUpload",
                    });
                });
            }
        });

        window.__newAppDocumentChecklistStatus = {
            requiredCount,
            uploadedCount,
            missingCount,
            conditionalCount,
            missingItems,
        };

        window.dispatchEvent(
            new CustomEvent("newapp:document-status-changed", {
                detail: window.__newAppDocumentChecklistStatus,
            }),
        );
    }

    function render() {
        const ctx = getContext();
        root.innerHTML = "";

        categories.forEach(function (category) {
            const card = renderCategory(category, ctx);
            if (card) root.appendChild(card);
        });

        updateSummary(ctx);
    }

    [
        ...document.querySelectorAll('input[name="borrower_type"]'),
        ...document.querySelectorAll('input[name="collateral_status"]'),
        document.getElementById("individualMaritalStatus"),
        document.getElementById("businessLegalForm"),
        document.getElementById("employmentStatus"),
    ]
        .filter(Boolean)
        .forEach(function (control) {
            control.addEventListener("change", render);
        });

    const collateralArea = document.getElementById("collateral");
    if (collateralArea && typeof MutationObserver !== "undefined") {
        const observer = new MutationObserver(function () {
            if (!document.getElementById("docUpload")?.hidden) render();
        });
        observer.observe(collateralArea, { childList: true, subtree: true });
    }

    if (modal) {
        modal
            .querySelectorAll("[data-preview-close]")
            .forEach(function (button) {
                button.addEventListener("click", closePreview);
            });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !modal.hidden) closePreview();
        });
    }

    window.addEventListener("beforeunload", function () {
        Object.keys(state).forEach(function (key) {
            state[key].files.forEach(revokeRecord);
        });
    });

    render();
})();

// ***************************************
// * EMPLOYMENT / BUSINESS INFORMATION
// * M02.5 conditional fields + Rupiah UI
// ***************************************
(function () {
    const root = document.getElementById("employmentBusiness");
    if (!root) return;

    const status = document.getElementById("employmentStatus");
    const employeeFields = Array.from(
        root.querySelectorAll('[data-employment-conditional="employee"]'),
    );
    const ownerFields = Array.from(
        root.querySelectorAll('[data-employment-conditional="business-owner"]'),
    );
    const position = document.getElementById("employmentPosition");
    const nib = document.getElementById("employmentNib");
    const employeeCount = document.getElementById("employmentEmployeeCount");

    function setConditionalGroup(fields, visible) {
        fields.forEach(function (field) {
            field.hidden = !visible;
            field
                .querySelectorAll("input, select, textarea")
                .forEach(function (control) {
                    control.disabled = !visible;
                });
        });
    }

    function syncEmploymentStatus() {
        const value = status ? status.value : "";
        const isEmployee =
            value === "permanent_employee" || value === "contract_employee";
        const isBusinessOwner = value === "business_owner";

        setConditionalGroup(employeeFields, isEmployee);
        setConditionalGroup(ownerFields, isBusinessOwner);

        if (position) position.required = isEmployee;
        if (nib) nib.required = isBusinessOwner;
        if (employeeCount) employeeCount.required = isBusinessOwner;
    }

    if (status) {
        status.addEventListener("change", syncEmploymentStatus);
        syncEmploymentStatus();
    }

    // Keep Rupiah fields readable while preserving digits-only values in the UI.
    root.querySelectorAll("[data-rupiah-input]").forEach(function (input) {
        input.addEventListener("input", function () {
            const digits = input.value.replace(/\D/g, "");
            input.value = digits ? Number(digits).toLocaleString("id-ID") : "";
        });
    });

    // Numeric-only fields from the M02.5 definition.
    [
        document.getElementById("employmentOfficePhone"),
        document.getElementById("employmentBusinessNpwp"),
        document.getElementById("employmentNib"),
    ]
        .filter(Boolean)
        .forEach(function (input) {
            input.addEventListener("input", function () {
                const digits = input.value.replace(/\D/g, "");
                const maxLength = Number(input.maxLength);
                input.value =
                    maxLength > 0 ? digits.slice(0, maxLength) : digits;
            });
        });
})();

// ***************************************
// * SPOUSE / MANAGEMENT & SHAREHOLDER
// * M02.4 conditional form + multi-row business parties
// ***************************************
(function () {
    const root = document.getElementById("spouseManagement");
    if (!root) return;

    const borrowerTypeInputs = Array.from(
        document.querySelectorAll('input[name="borrower_type"]'),
    );
    const maritalStatus = document.getElementById("individualMaritalStatus");
    const borrowerNik = document.getElementById("individualNik");

    const spousePanel = document.getElementById("spouseBorrowerPanel");
    const spouseEmpty = document.getElementById("spouseNotRequiredPanel");
    const businessPanel = document.getElementById("managementShareholderPanel");
    const contextTitle = document.getElementById("relatedPartiesContextTitle");
    const contextText = document.getElementById("relatedPartiesContextText");

    const spouseNik = document.getElementById("spouseNik");
    const spousePhone = document.getElementById("spousePhone");

    const rowsRoot = document.getElementById("managementRows");
    const addButton = document.getElementById("addManagementPerson");
    const totalLabel = document.getElementById("managementOwnershipTotal");
    const totalFill = document.getElementById("managementOwnershipFill");
    const totalMessage = document.getElementById("managementOwnershipMessage");
    const totalSummary = document.getElementById("managementOwnershipSummary");

    const structureKey =
        "aggre:new-application:management-structure:" +
        window.location.pathname;

    function setPanelEnabled(panel, enabled) {
        if (!panel) return;
        panel
            .querySelectorAll("input, select, textarea, button")
            .forEach(function (control) {
                control.disabled = !enabled;
            });
    }

    function selectedBorrowerType() {
        const checked = borrowerTypeInputs.find(function (input) {
            return input.checked;
        });
        return checked ? checked.value : "business";
    }

    function digitsOnly(input, maxLength) {
        if (!input) return;
        input.addEventListener("input", function () {
            input.value = input.value
                .replace(/\D/g, "")
                .slice(0, maxLength || 999);
        });
    }

    function formatRupiah(input) {
        if (!input) return;
        input.addEventListener("input", function () {
            const digits = input.value.replace(/\D/g, "");
            input.value = digits ? Number(digits).toLocaleString("id-ID") : "";
        });
    }

    root.querySelectorAll("[data-related-rupiah]").forEach(formatRupiah);
    digitsOnly(spouseNik, 16);
    digitsOnly(spousePhone, 13);

    function validateSpouseNik() {
        if (!spouseNik) return;
        const sameNik = Boolean(
            borrowerNik &&
            borrowerNik.value &&
            spouseNik.value &&
            borrowerNik.value === spouseNik.value,
        );
        spouseNik.setCustomValidity(
            sameNik ? "Spouse NIK must be different from borrower NIK." : "",
        );
    }

    if (borrowerNik) borrowerNik.addEventListener("input", validateSpouseNik);
    if (spouseNik) spouseNik.addEventListener("input", validateSpouseNik);

    function managementRowTemplate(index) {
        return `
            <article class="management-person-card" data-management-row>
                <div class="management-person-card__header">
                    <div class="management-person-card__title">
                        <span class="management-person-card__number">${index + 1}</span>
                        <span>Management / Shareholder Person ${index + 1}</span>
                    </div>

                    <button class="management-remove-button" type="button" data-management-remove>
                        <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
                        Remove
                    </button>
                </div>

                <div class="related-party-grid">
                    <div class="related-party-field">
                        <label>1. Full Name (as per ID Card) <span>*</span></label>
                        <input data-management-field="name" type="text" maxlength="100" required placeholder="Enter full name">
                    </div>

                    <div class="related-party-field">
                        <label>2. NIK <span>*</span></label>
                        <input data-management-field="nik" type="text" inputmode="numeric" minlength="16" maxlength="16" pattern="[0-9]{16}" required placeholder="16-digit NIK">
                    </div>

                    <div class="related-party-field">
                        <label>3. Position / Role <span>*</span></label>
                        <select data-management-field="role" required>
                            <option value="">Select position...</option>
                            <option value="president_director">President Director</option>
                            <option value="director">Director</option>
                            <option value="president_commissioner">President Commissioner</option>
                            <option value="commissioner">Commissioner</option>
                            <option value="shareholder">Shareholder</option>
                            <option value="active_partner">Active Partner</option>
                            <option value="passive_partner">Passive Partner</option>
                        </select>
                    </div>

                    <div class="related-party-field management-share-field" data-management-share-field hidden>
                        <label>4. Share Ownership (%) <span>*</span></label>
                        <div class="related-party-money-input">
                            <input data-management-field="ownership" type="number" min="0" max="100" step="0.01" placeholder="0">
                            <span>%</span>
                        </div>
                        <small>Conditional for Shareholder. Total shareholder ownership must equal 100%.</small>
                    </div>

                    <div class="related-party-field">
                        <label>5. Mobile Number <span>*</span></label>
                        <input data-management-field="phone" type="tel" inputmode="numeric" required placeholder="Mobile number">
                    </div>

                    <div class="related-party-field">
                        <label>7. Personal Guarantee <span>*</span></label>
                        <select data-management-field="guarantee" required>
                            <option value="">Select...</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                        <small>Yes = automatically included in identity &amp; background checking.</small>
                    </div>

                    <div class="related-party-field related-party-field--span-2">
                        <label>6. Address <span>*</span></label>
                        <textarea data-management-field="address" rows="3" required placeholder="Enter residential address"></textarea>
                    </div>
                </div>
            </article>
        `;
    }

    function rows() {
        return rowsRoot
            ? Array.from(rowsRoot.querySelectorAll("[data-management-row]"))
            : [];
    }

    function reindexRows() {
        rows().forEach(function (row, index) {
            const number = row.querySelector(".management-person-card__number");
            const title = row.querySelector(
                ".management-person-card__title > span:last-child",
            );
            if (number) number.textContent = String(index + 1);
            if (title)
                title.textContent =
                    "Management / Shareholder Person " + (index + 1);

            row.querySelectorAll("[data-management-field]").forEach(
                function (control) {
                    const field = control.dataset.managementField;
                    control.name = "management[" + index + "][" + field + "]";
                },
            );
        });

        const currentRows = rows();
        currentRows.forEach(function (row) {
            const remove = row.querySelector("[data-management-remove]");
            if (remove) remove.disabled = currentRows.length === 1;
        });
    }

    function syncShareField(row) {
        const role = row.querySelector('[data-management-field="role"]');
        const wrapper = row.querySelector("[data-management-share-field]");
        const ownership = row.querySelector(
            '[data-management-field="ownership"]',
        );
        if (!role || !wrapper || !ownership) return;

        const isShareholder = role.value === "shareholder";
        wrapper.hidden = !isShareholder;
        ownership.disabled = !isShareholder;
        ownership.required = isShareholder;
        if (!isShareholder) ownership.value = "";
    }

    function updateOwnershipTotal() {
        if (!rowsRoot) return;

        let total = 0;
        let shareholderCount = 0;
        let firstOwnership = null;

        rows().forEach(function (row) {
            const role = row.querySelector('[data-management-field="role"]');
            const ownership = row.querySelector(
                '[data-management-field="ownership"]',
            );
            if (role && role.value === "shareholder" && ownership) {
                shareholderCount += 1;
                total += Number(ownership.value || 0);
                if (!firstOwnership) firstOwnership = ownership;
            }
        });

        const rounded = Math.round(total * 100) / 100;
        if (totalLabel) totalLabel.textContent = rounded + "%";
        if (totalFill)
            totalFill.style.width = Math.min(Math.max(rounded, 0), 100) + "%";

        const requiresHundred = shareholderCount > 0;
        const valid = !requiresHundred || Math.abs(rounded - 100) < 0.001;

        if (totalSummary) {
            totalSummary.classList.toggle("is-valid", requiresHundred && valid);
            totalSummary.classList.toggle(
                "is-invalid",
                requiresHundred && !valid,
            );
        }

        if (totalMessage) {
            if (!requiresHundred) {
                totalMessage.textContent =
                    "If shareholder rows are added, total ownership must equal 100%.";
            } else if (valid) {
                totalMessage.textContent =
                    "Shareholder ownership is complete at 100%.";
            } else {
                totalMessage.textContent =
                    "Current shareholder ownership is " +
                    rounded +
                    "%. Adjust the rows until the total equals 100%.";
            }
        }

        rowsRoot.dataset.ownershipValid = valid ? "true" : "false";

        rows().forEach(function (row) {
            const ownership = row.querySelector(
                '[data-management-field="ownership"]',
            );
            if (ownership) ownership.setCustomValidity("");
        });

        if (requiresHundred && !valid && firstOwnership) {
            firstOwnership.setCustomValidity(
                "Total shareholder ownership must equal 100%.",
            );
        }
    }

    function bindRow(row) {
        const role = row.querySelector('[data-management-field="role"]');
        const ownership = row.querySelector(
            '[data-management-field="ownership"]',
        );
        const nik = row.querySelector('[data-management-field="nik"]');
        const phone = row.querySelector('[data-management-field="phone"]');
        const remove = row.querySelector("[data-management-remove]");

        digitsOnly(nik, 16);
        digitsOnly(phone);

        if (role) {
            role.addEventListener("change", function () {
                syncShareField(row);
                updateOwnershipTotal();
            });
        }

        if (ownership)
            ownership.addEventListener("input", updateOwnershipTotal);

        if (remove) {
            remove.addEventListener("click", function () {
                if (rows().length <= 1) return;
                row.remove();
                reindexRows();
                updateOwnershipTotal();
            });
        }

        syncShareField(row);
    }

    function addManagementRow() {
        if (!rowsRoot) return;
        const index = rows().length;
        rowsRoot.insertAdjacentHTML("beforeend", managementRowTemplate(index));
        const row = rowsRoot.lastElementChild;
        bindRow(row);
        reindexRows();
        updateOwnershipTotal();
    }

    function restoreStructure() {
        let count = 1;
        try {
            const saved = JSON.parse(
                window.localStorage.getItem(structureKey) || "{}",
            );
            if (saved && Number.isInteger(saved.count) && saved.count > 0) {
                count = Math.min(saved.count, 50);
            }
        } catch (error) {
            count = 1;
        }

        for (let i = 0; i < count; i += 1) addManagementRow();
    }

    function persistStructure() {
        try {
            window.localStorage.setItem(
                structureKey,
                JSON.stringify({ count: rows().length || 1 }),
            );
        } catch (error) {
            // Storage may be unavailable in restricted/private browsing modes.
        }
    }

    if (addButton) addButton.addEventListener("click", addManagementRow);

    restoreStructure();

    function syncRelatedPartyMode() {
        const borrowerType = selectedBorrowerType();
        const isIndividual = borrowerType === "individual";
        const isMarried = Boolean(
            maritalStatus && maritalStatus.value === "married",
        );
        const showSpouse = isIndividual && isMarried;
        const showBusiness = !isIndividual;

        if (spousePanel) spousePanel.hidden = !showSpouse;
        if (spouseEmpty) spouseEmpty.hidden = !(isIndividual && !isMarried);
        if (businessPanel) businessPanel.hidden = !showBusiness;

        setPanelEnabled(spousePanel, showSpouse);
        setPanelEnabled(businessPanel, showBusiness);
        if (showBusiness) reindexRows();

        if (contextTitle) {
            contextTitle.textContent = isIndividual
                ? isMarried
                    ? "Individual Ã‚Â· Married"
                    : "Individual Ã‚Â· Spouse Not Required"
                : "Business Entity";
        }

        if (contextText) {
            contextText.textContent = isIndividual
                ? isMarried
                    ? "Marital Status is Married. Complete all mandatory spouse information."
                    : "Spouse fields are skipped because the borrower is not marked as Married."
                : "Add each management or shareholder person as a separate row. Shareholder ownership must total 100%.";
        }

        updateOwnershipTotal();
    }

    borrowerTypeInputs.forEach(function (input) {
        input.addEventListener("change", syncRelatedPartyMode);
    });

    if (maritalStatus)
        maritalStatus.addEventListener("change", syncRelatedPartyMode);

    window.addEventListener("newapp:draft-saved", function (event) {
        if (event.detail && event.detail.step === "spouseManagement") {
            persistStructure();
        }
    });

    syncRelatedPartyMode();
})();

// ***************************************
// * COLLATERAL & COLLATERAL OWNER
// * M02.6 multi-collateral + owner 1-3
// ***************************************
(function () {
    const root = document.getElementById("collateralStepRoot");
    if (!root) return;

    const rowsRoot = document.getElementById("collateralRows");
    const addCollateralButton = document.getElementById("addCollateralButton");
    const ownerSection = document.getElementById("collateralOwnerSection");
    const ownerRowsRoot = document.getElementById("collateralOwnerRows");
    const ownerEmpty = document.getElementById("collateralOwnerEmpty");
    const addOwnerButton = document.getElementById("addCollateralOwnerButton");
    const collateralRowTemplate = document.getElementById(
        "collateralRowTemplate",
    );
    const collateralOwnerRowTemplate = document.getElementById(
        "collateralOwnerRowTemplate",
    );

    if (
        !rowsRoot ||
        !ownerRowsRoot ||
        !collateralRowTemplate ||
        !collateralOwnerRowTemplate
    )
        return;

    const totalNjop = document.getElementById("collateralTotalNjop");
    const totalMarket = document.getElementById("collateralTotalMarket");
    const totalLiquidation = document.getElementById(
        "collateralTotalLiquidation",
    );
    const totalCoverMv = document.getElementById("collateralTotalCoverMv");
    const totalCoverLv = document.getElementById("collateralTotalCoverLv");
    const totalCoverMvNote = document.getElementById(
        "collateralTotalCoverMvNote",
    );
    const totalCoverLvNote = document.getElementById(
        "collateralTotalCoverLvNote",
    );
    const summaryCount = document.getElementById("collateralSummaryCount");

    const structureKey =
        "aggre:new-application:collateral-structure:" +
        window.location.pathname;
    let requestedPlafond = 0;

    function collateralRows() {
        return Array.from(rowsRoot.querySelectorAll("[data-collateral-row]"));
    }

    function ownerRows() {
        return Array.from(
            ownerRowsRoot.querySelectorAll("[data-collateral-owner-row]"),
        );
    }

    function digits(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function numericValue(value) {
        const cleaned = digits(value);
        return cleaned ? Number(cleaned) : 0;
    }

    function formatRupiah(value) {
        const amount = Number(value) || 0;
        return "Rp " + amount.toLocaleString("id-ID");
    }

    function formatRupiahInput(input) {
        const value = digits(input.value);
        input.value = value ? Number(value).toLocaleString("id-ID") : "";
    }

    function ownerNeedsExtraRecord(value) {
        return Boolean(value && value !== "borrower" && value !== "spouse");
    }

    function applyFieldNames(row, index) {
        row.dataset.collateralIndex = String(index);
        row.querySelector("[data-collateral-row]");
        const number = row.querySelector('[data-collateral-field="number"]');
        if (number) number.value = String(index + 1);

        const badge = row.querySelector(".collateral-card__number");
        if (badge) badge.textContent = String(index + 1);
        const title = row.querySelector(".collateral-card__title strong");
        if (title) title.textContent = "Collateral " + (index + 1);

        row.querySelectorAll("[data-collateral-field]").forEach(
            function (control) {
                const field = control.dataset.collateralField;
                control.name = "collateral[" + index + "][" + field + "]";
            },
        );
    }

    function applyOwnerFieldNames(row, index) {
        row.dataset.ownerIndex = String(index);
        const badge = row.querySelector(".collateral-owner-card__number");
        if (badge) badge.textContent = String(index + 1);
        const title = row.querySelector(".collateral-owner-card__title strong");
        if (title) title.textContent = "Collateral Owner " + (index + 1);

        row.querySelectorAll("[data-owner-field]").forEach(function (control) {
            const field = control.dataset.ownerField;
            control.name = "collateral_owner[" + index + "][" + field + "]";
        });
    }

    function reindexCollateralRows() {
        collateralRows().forEach(applyFieldNames);
        collateralRows().forEach(function (row) {
            const remove = row.querySelector("[data-collateral-remove]");
            if (remove) remove.disabled = collateralRows().length <= 1;
        });
        if (summaryCount) {
            const count = collateralRows().length;
            summaryCount.textContent =
                count + (count === 1 ? " Collateral" : " Collaterals");
        }
        refreshOwnerReferences();
    }

    function reindexOwnerRows() {
        ownerRows().forEach(applyOwnerFieldNames);
        if (addOwnerButton) addOwnerButton.disabled = ownerRows().length >= 3;
        if (ownerEmpty) ownerEmpty.hidden = ownerRows().length > 0;
        refreshOwnerReferences();
        updateOwnerRemoveButtons();
    }

    function updateOwnerRemoveButtons() {
        const extraNeeded = collateralRows().some(function (row) {
            const relation = row.querySelector(
                '[data-collateral-field="owner_relationship"]',
            );
            return relation && ownerNeedsExtraRecord(relation.value);
        });

        ownerRows().forEach(function (row) {
            const remove = row.querySelector("[data-owner-remove]");
            if (remove)
                remove.disabled = extraNeeded && ownerRows().length <= 1;
        });
    }

    function refreshOwnerReferences() {
        const owners = ownerRows();
        collateralRows().forEach(function (row) {
            const select = row.querySelector(
                '[data-collateral-field="owner_reference"]',
            );
            if (!select) return;
            const previous = select.value;
            select.innerHTML =
                '<option value="">Select collateral owner...</option>';
            owners.forEach(function (ownerRow, index) {
                const name = ownerRow.querySelector(
                    '[data-owner-field="name"]',
                );
                const label =
                    name && name.value.trim()
                        ? name.value.trim()
                        : "Collateral Owner " + (index + 1);
                const option = document.createElement("option");
                option.value = String(index + 1);
                option.textContent = index + 1 + " Ã¢â‚¬â€ " + label;
                select.appendChild(option);
            });
            if (
                Array.from(select.options).some(function (option) {
                    return option.value === previous;
                })
            ) {
                select.value = previous;
            }
        });
    }

    function validateDuplicateCertificates() {
        const inputs = collateralRows()
            .map(function (row) {
                return row.querySelector(
                    '[data-collateral-field="certificate_no"]',
                );
            })
            .filter(Boolean);

        const counts = new Map();
        inputs.forEach(function (input) {
            const key = input.value.trim().toLowerCase();
            if (key) counts.set(key, (counts.get(key) || 0) + 1);
        });

        inputs.forEach(function (input) {
            const key = input.value.trim().toLowerCase();
            const duplicate = key && counts.get(key) > 1;
            input.setCustomValidity(
                duplicate
                    ? "Certificate number is duplicated in another collateral row."
                    : "",
            );
            const note = input
                .closest(".collateral-field")
                .querySelector("[data-certificate-note]");
            if (note) {
                note.textContent = duplicate
                    ? "Duplicate certificate number detected in this application."
                    : "Duplicate check applies across current application rows.";
                note.classList.toggle("is-warning", Boolean(duplicate));
            }
        });
    }

    function syncCertificateExpiry(row) {
        const type = row.querySelector(
            '[data-collateral-field="certificate_type"]',
        );
        const expiry = row.querySelector(
            '[data-collateral-field="certificate_expiry_date"]',
        );
        const field = row.querySelector("[data-certificate-expiry-field]");
        if (!type || !expiry || !field) return;

        const required = type.value === "SHGB" || type.value === "SHMSRS";
        expiry.required = required;
        field.classList.toggle("is-conditional-active", required);

        const note = field.querySelector("[data-expiry-note]");
        if (note) {
            note.textContent = required
                ? "Required for " +
                  type.value +
                  ". Remaining validity should be at least tenor + 2 years."
                : "Optional for SHM; required for SHGB / SHMSRS.";
        }
    }

    function syncImb(row) {
        const status = row.querySelector(
            '[data-collateral-field="imb_status"]',
        );
        const field = row.querySelector("[data-imb-number-field]");
        const input = row.querySelector('[data-collateral-field="imb_number"]');
        if (!status || !field || !input) return;

        const visible = status.value === "available";
        field.hidden = !visible;
        input.disabled = !visible;
        input.required = visible;
    }

    function syncOwnerRelationship(row) {
        const relation = row.querySelector(
            '[data-collateral-field="owner_relationship"]',
        );
        const refField = row.querySelector("[data-owner-reference-field]");
        const ref = row.querySelector(
            '[data-collateral-field="owner_reference"]',
        );
        if (!relation || !refField || !ref) return;

        const needed = ownerNeedsExtraRecord(relation.value);
        refField.hidden = !needed;
        ref.disabled = !needed;
        ref.required = needed;

        syncOwnerSection();
        if (needed && ownerRows().length === 0) addOwnerRow();
        refreshOwnerReferences();
        updateOwnerRemoveButtons();
    }

    function syncOwnershipWarning(row) {
        const input = row.querySelector(
            '[data-collateral-field="ownership_years"]',
        );
        const note = row.querySelector("[data-ownership-warning]");
        if (!input || !note) return;
        const value = Number(input.value);
        const warn = input.value !== "" && Number.isFinite(value) && value < 1;
        note.textContent = warn
            ? "Warning: collateral ownership is less than 1 year."
            : "Warning will appear when ownership is less than 1 year.";
        note.classList.toggle("is-warning", warn);
    }

    function syncOwnerSection() {
        const show = collateralRows().some(function (row) {
            const relation = row.querySelector(
                '[data-collateral-field="owner_relationship"]',
            );
            return relation && ownerNeedsExtraRecord(relation.value);
        });
        if (ownerSection) ownerSection.hidden = !show;
        if (!show) {
            ownerRowsRoot
                .querySelectorAll("input, select, textarea, button")
                .forEach(function (control) {
                    control.disabled = true;
                });
        } else {
            ownerRowsRoot
                .querySelectorAll("input, select, textarea, button")
                .forEach(function (control) {
                    control.disabled = false;
                });
            updateOwnerRemoveButtons();
        }
    }

    function syncOwnerMarital(row) {
        const status = row.querySelector('[data-owner-field="marital_status"]');
        const spouseField = row.querySelector("[data-owner-spouse-field]");
        const spouseName = row.querySelector(
            '[data-owner-field="spouse_name"]',
        );
        const spouseNik = row.querySelector('[data-owner-field="spouse_nik"]');
        if (!status || !spouseField || !spouseName || !spouseNik) return;

        const married = status.value === "married";
        spouseField.hidden = !married;
        spouseName.disabled = !married;
        spouseNik.disabled = !married;
        spouseName.required = married;
        spouseNik.required = married;
    }

    function updateCoverageForRow(row) {
        const market = numericValue(
            row.querySelector(
                '[data-collateral-field="appraisal_market_value"]',
            )?.value,
        );
        const liquidation = numericValue(
            row.querySelector('[data-collateral-field="liquidation_value"]')
                ?.value,
        );
        const mv = row.querySelector('[data-collateral-field="cover_mv"]');
        const lv = row.querySelector('[data-collateral-field="cover_lv"]');
        if (!mv || !lv) return;

        mv.value =
            requestedPlafond > 0 && market > 0
                ? ((market / requestedPlafond) * 100).toFixed(2) + "%"
                : "Ã¢â‚¬â€";
        lv.value =
            requestedPlafond > 0 && liquidation > 0
                ? ((liquidation / requestedPlafond) * 100).toFixed(2) + "%"
                : "Ã¢â‚¬â€";
    }

    function updateTotals() {
        let njop = 0;
        let market = 0;
        let liquidation = 0;

        collateralRows().forEach(function (row) {
            njop += numericValue(
                row.querySelector('[data-collateral-field="njop_value"]')
                    ?.value,
            );
            market += numericValue(
                row.querySelector(
                    '[data-collateral-field="appraisal_market_value"]',
                )?.value,
            );
            liquidation += numericValue(
                row.querySelector('[data-collateral-field="liquidation_value"]')
                    ?.value,
            );
            updateCoverageForRow(row);
        });

        if (totalNjop) totalNjop.textContent = formatRupiah(njop);
        if (totalMarket) totalMarket.textContent = formatRupiah(market);
        if (totalLiquidation)
            totalLiquidation.textContent = formatRupiah(liquidation);

        if (requestedPlafond > 0) {
            if (totalCoverMv)
                totalCoverMv.textContent =
                    market > 0
                        ? ((market / requestedPlafond) * 100).toFixed(2) + "%"
                        : "0.00%";
            if (totalCoverLv)
                totalCoverLv.textContent =
                    liquidation > 0
                        ? ((liquidation / requestedPlafond) * 100).toFixed(2) +
                          "%"
                        : "0.00%";
            if (totalCoverMvNote)
                totalCoverMvNote.textContent =
                    "Based on requested plafond " +
                    formatRupiah(requestedPlafond);
            if (totalCoverLvNote)
                totalCoverLvNote.textContent =
                    "Based on requested plafond " +
                    formatRupiah(requestedPlafond);
        } else {
            if (totalCoverMv) totalCoverMv.textContent = "Ã¢â‚¬â€";
            if (totalCoverLv) totalCoverLv.textContent = "Ã¢â‚¬â€";
            if (totalCoverMvNote)
                totalCoverMvNote.textContent = "Waiting for requested plafond";
            if (totalCoverLvNote)
                totalCoverLvNote.textContent = "Waiting for requested plafond";
        }
    }

    function bindCollateralRow(row) {
        const certificateType = row.querySelector(
            '[data-collateral-field="certificate_type"]',
        );
        const certificateNo = row.querySelector(
            '[data-collateral-field="certificate_no"]',
        );
        const imbStatus = row.querySelector(
            '[data-collateral-field="imb_status"]',
        );
        const ownerRelation = row.querySelector(
            '[data-collateral-field="owner_relationship"]',
        );
        const ownershipYears = row.querySelector(
            '[data-collateral-field="ownership_years"]',
        );

        row.querySelectorAll("[data-collateral-rupiah]").forEach(
            function (input) {
                input.addEventListener("input", function () {
                    formatRupiahInput(input);
                    updateTotals();
                });
            },
        );

        if (certificateType)
            certificateType.addEventListener("change", function () {
                syncCertificateExpiry(row);
            });
        if (certificateNo)
            certificateNo.addEventListener(
                "input",
                validateDuplicateCertificates,
            );
        if (imbStatus)
            imbStatus.addEventListener("change", function () {
                syncImb(row);
            });
        if (ownerRelation)
            ownerRelation.addEventListener("change", function () {
                syncOwnerRelationship(row);
            });
        if (ownershipYears)
            ownershipYears.addEventListener("input", function () {
                syncOwnershipWarning(row);
            });

        row.querySelector("[data-collateral-remove]").addEventListener(
            "click",
            function () {
                if (collateralRows().length <= 1) return;
                row.remove();
                reindexCollateralRows();
                validateDuplicateCertificates();
                syncOwnerSection();
                updateTotals();
                persistStructure();
            },
        );

        const useLocation = row.querySelector("[data-use-location]");
        const openMap = row.querySelector("[data-open-map]");
        const lat = row.querySelector('[data-collateral-field="latitude"]');
        const lng = row.querySelector('[data-collateral-field="longitude"]');

        if (useLocation) {
            useLocation.addEventListener("click", function () {
                if (!navigator.geolocation) return;
                useLocation.disabled = true;
                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        lat.value = position.coords.latitude.toFixed(6);
                        lng.value = position.coords.longitude.toFixed(6);
                        useLocation.disabled = false;
                    },
                    function () {
                        useLocation.disabled = false;
                    },
                    { enableHighAccuracy: true, timeout: 10000 },
                );
            });
        }

        if (openMap) {
            openMap.addEventListener("click", function () {
                if (!lat.value || !lng.value) {
                    lat.focus();
                    return;
                }
                window.open(
                    "https://www.google.com/maps?q=" +
                        encodeURIComponent(lat.value + "," + lng.value),
                    "_blank",
                    "noopener",
                );
            });
        }

        syncCertificateExpiry(row);
        syncImb(row);
        syncOwnerRelationship(row);
        syncOwnershipWarning(row);
    }

    function bindOwnerRow(row) {
        const marital = row.querySelector(
            '[data-owner-field="marital_status"]',
        );
        const nik = row.querySelector('[data-owner-field="nik"]');
        const spouseNik = row.querySelector('[data-owner-field="spouse_nik"]');
        const phone = row.querySelector('[data-owner-field="phone"]');
        const name = row.querySelector('[data-owner-field="name"]');

        [nik, spouseNik].filter(Boolean).forEach(function (input) {
            input.addEventListener("input", function () {
                input.value = digits(input.value).slice(0, 16);
            });
        });

        if (phone) {
            phone.addEventListener("input", function () {
                phone.value = digits(phone.value);
            });
        }

        if (marital)
            marital.addEventListener("change", function () {
                syncOwnerMarital(row);
            });
        if (name) name.addEventListener("input", refreshOwnerReferences);

        row.querySelector("[data-owner-remove]").addEventListener(
            "click",
            function () {
                if (row.querySelector("[data-owner-remove]").disabled) return;
                row.remove();
                reindexOwnerRows();
                persistStructure();
            },
        );

        syncOwnerMarital(row);
    }

    function clonePhpTemplate(template) {
        if (!template || !template.content) return null;
        const node = template.content.firstElementChild;
        return node ? node.cloneNode(true) : null;
    }

    function addCollateralRow() {
        const row = clonePhpTemplate(collateralRowTemplate);
        if (!row) return null;

        rowsRoot.appendChild(row);
        bindCollateralRow(row);
        reindexCollateralRows();
        updateTotals();
        persistStructure();
        return row;
    }

    function addOwnerRow() {
        if (ownerRows().length >= 3) return null;

        const row = clonePhpTemplate(collateralOwnerRowTemplate);
        if (!row) return null;

        ownerRowsRoot.appendChild(row);
        bindOwnerRow(row);
        reindexOwnerRows();
        persistStructure();
        return row;
    }

    function persistStructure() {
        try {
            window.localStorage.setItem(
                structureKey,
                JSON.stringify({
                    collateralCount: Math.max(1, collateralRows().length),
                    ownerCount: Math.min(3, ownerRows().length),
                }),
            );
        } catch (error) {
            // Storage may be unavailable in restricted/private browsing modes.
        }
    }

    function restoreStructure() {
        // The first row (and any edit-mode rows in the future) are rendered
        // by new-app.php. JavaScript only binds behavior and adds missing
        // rows by cloning the PHP <template> elements.
        collateralRows().forEach(bindCollateralRow);
        ownerRows().forEach(bindOwnerRow);

        let collateralCount = Math.max(1, collateralRows().length);
        let ownerCount = ownerRows().length;

        try {
            const saved = JSON.parse(
                window.localStorage.getItem(structureKey) || "{}",
            );
            if (
                saved &&
                Number.isInteger(saved.collateralCount) &&
                saved.collateralCount > collateralCount
            ) {
                collateralCount = Math.min(saved.collateralCount, 20);
            }
            if (
                saved &&
                Number.isInteger(saved.ownerCount) &&
                saved.ownerCount > ownerCount
            ) {
                ownerCount = Math.min(saved.ownerCount, 3);
            }
        } catch (error) {
            // Keep the rows provided by PHP if localStorage is unavailable.
        }

        while (collateralRows().length < collateralCount) addCollateralRow();
        while (ownerRows().length < ownerCount) addOwnerRow();

        reindexCollateralRows();
        reindexOwnerRows();
        validateDuplicateCertificates();
        syncOwnerSection();
        updateTotals();
    }

    if (addCollateralButton)
        addCollateralButton.addEventListener("click", addCollateralRow);
    if (addOwnerButton) addOwnerButton.addEventListener("click", addOwnerRow);

    // M03.3 appraisal integration hook.
    // Example: applyCollateralAppraisalData(1, { marketValue: 1500000000, liquidationValue: 1150000000 });
    window.applyCollateralAppraisalData = function (collateralNo, data) {
        const index = Number(collateralNo) - 1;
        const row = collateralRows()[index];
        if (!row || !data || typeof data !== "object") return;

        const market = row.querySelector(
            '[data-collateral-field="appraisal_market_value"]',
        );
        const liquidation = row.querySelector(
            '[data-collateral-field="liquidation_value"]',
        );
        if (market && data.marketValue !== undefined)
            market.value = Number(data.marketValue || 0).toLocaleString(
                "id-ID",
            );
        if (liquidation && data.liquidationValue !== undefined)
            liquidation.value = Number(
                data.liquidationValue || 0,
            ).toLocaleString("id-ID");
        updateTotals();
    };

    // Call this when the requested plafond/loan amount becomes available.
    // Example: setRequestedPlafond(1000000000);
    window.setRequestedPlafond = function (value) {
        requestedPlafond = numericValue(value);
        updateTotals();
    };

    window.addEventListener("newapp:draft-saved", function (event) {
        if (event.detail && event.detail.step === "collateral")
            persistStructure();
    });

    restoreStructure();
})();

// ***************************************
// * SAVE DRAFT + CREATED / LAST SAVED TIME
// * Applies to every New Application step
// ***************************************
(function () {
    const pages = Array.from(
        document.querySelectorAll("#newAppPages .new-app-page"),
    );
    if (!pages.length) return;

    const storageKey =
        "aggre:new-application:draft-times:" + window.location.pathname;
    let stored = {};

    try {
        stored =
            JSON.parse(window.localStorage.getItem(storageKey) || "{}") || {};
    } catch (error) {
        stored = {};
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function formatTimestamp(value) {
        if (!value) return "Ã¢â‚¬â€";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Ã¢â‚¬â€";

        return (
            new Intl.DateTimeFormat("en-GB", {
                timeZone: "Asia/Jakarta",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            }).format(date) + " WIB"
        );
    }

    function persist() {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(stored));
        } catch (error) {
            // localStorage may be unavailable in private/restricted environments.
        }
    }

    function serializePage(page) {
        const values = {};
        if (!page) return values;

        page.querySelectorAll("input, select, textarea").forEach(
            function (control) {
                if (control.type === "file" || control.disabled) return;

                const key = control.name || control.id;
                if (!key) return;

                if (control.type === "radio") {
                    if (control.checked) {
                        values[key] = { type: "radio", value: control.value };
                    }
                    return;
                }

                if (control.type === "checkbox") {
                    values[key] = {
                        type: "checkbox",
                        checked: control.checked,
                    };
                    return;
                }

                values[key] = { type: "value", value: control.value };
            },
        );

        return values;
    }

    function restorePage(page, values) {
        if (!page || !values || typeof values !== "object") return;

        Object.keys(values).forEach(function (key) {
            const saved = values[key];
            if (!saved) return;

            if (saved.type === "radio") {
                const radios = Array.from(
                    page.querySelectorAll(
                        'input[type="radio"][name="' + CSS.escape(key) + '"]',
                    ),
                );
                radios.forEach(function (radio) {
                    radio.checked = radio.value === saved.value;
                });

                const checked = radios.find(function (radio) {
                    return radio.checked;
                });
                if (checked)
                    checked.dispatchEvent(
                        new Event("change", { bubbles: true }),
                    );
                return;
            }

            const controls = Array.from(
                page.querySelectorAll(
                    '[name="' + CSS.escape(key) + '"], #' + CSS.escape(key),
                ),
            );
            controls.forEach(function (control) {
                if (control.type === "file") return;

                if (saved.type === "checkbox") {
                    control.checked = Boolean(saved.checked);
                } else if ("value" in saved) {
                    control.value = saved.value;
                }

                control.dispatchEvent(new Event("change", { bubbles: true }));
                control.dispatchEvent(new Event("input", { bubbles: true }));
            });
        });
    }

    function render(stepId) {
        const stamp = document.querySelector(
            '[data-draft-time="' + stepId + '"] span',
        );
        if (!stamp || !stored[stepId]) return;

        stamp.textContent =
            "Created: " +
            formatTimestamp(stored[stepId].createdAt) +
            " Ã‚Â· Last saved: " +
            formatTimestamp(stored[stepId].lastSavedAt);
    }

    pages.forEach(function (page) {
        const stepId = page.id;
        if (!stepId) return;

        if (!stored[stepId]) {
            stored[stepId] = {
                createdAt: nowIso(),
                lastSavedAt: null,
                values: {},
            };
        }

        restorePage(page, stored[stepId].values);
        render(stepId);
    });

    persist();

    document.querySelectorAll("[data-save-draft]").forEach(function (button) {
        button.addEventListener("click", function () {
            const stepId = button.dataset.saveDraft;
            if (!stepId) return;

            if (!stored[stepId]) {
                stored[stepId] = {
                    createdAt: nowIso(),
                    lastSavedAt: null,
                    values: {},
                };
            }

            const page = document.getElementById(stepId);
            stored[stepId].values = serializePage(page);
            stored[stepId].lastSavedAt = nowIso();
            persist();
            render(stepId);

            button.classList.add("is-saved");
            const originalHtml = button.innerHTML;
            button.innerHTML =
                '<i class="fa-solid fa-check" aria-hidden="true"></i> Draft Saved';

            window.setTimeout(function () {
                button.classList.remove("is-saved");
                button.innerHTML = originalHtml;
            }, 1600);

            // Hook for future backend persistence.
            window.dispatchEvent(
                new CustomEvent("newapp:draft-saved", {
                    detail: {
                        step: stepId,
                        createdAt: stored[stepId].createdAt,
                        lastSavedAt: stored[stepId].lastSavedAt,
                    },
                }),
            );
        });
    });
})();

// ***************************************
// * REPAYMENT CAPACITY - STEP 7
// * Auto-linked from Employment / Business Information
// ***************************************
(function () {
    const root = document.getElementById("repaymentCapacityShell");
    if (!root) return;

    const requestedAmount = document.getElementById("repaymentRequestedAmount");
    const tenorMonths = document.getElementById("repaymentTenorMonths");
    const annualRate = document.getElementById("repaymentAnnualRate");
    const repaymentMethod = document.getElementById("repaymentMethod");
    const maxDsrInput = document.getElementById("repaymentMaxDsr");
    const includeSpouse = document.getElementById("repaymentIncludeSpouse");
    const includeSpouseField = document.getElementById(
        "repaymentIncludeSpouseField",
    );
    const spouseIncomeSource = document.getElementById(
        "repaymentSpouseIncomeSource",
    );
    const businessBasisNote = document.getElementById(
        "repaymentBusinessBasisNote",
    );

    const employmentMonthlyIncome = document.getElementById(
        "employmentMonthlyIncome",
    );
    const employmentOtherIncome = document.getElementById(
        "employmentOtherIncome",
    );
    const employmentOtherInstallments = document.getElementById(
        "employmentOtherInstallments",
    );
    const spouseMonthlyIncome = document.getElementById("spouseMonthlyIncome");
    const maritalStatus = document.getElementById("individualMaritalStatus");
    const additionalAmount = document.getElementById("additionalAmount");
    const borrowerTypeInputs = Array.from(
        document.querySelectorAll('input[name="borrower_type"]'),
    );

    const primaryDisplay = document.getElementById(
        "repaymentPrimaryIncomeDisplay",
    );
    const otherDisplay = document.getElementById("repaymentOtherIncomeDisplay");
    const spouseDisplay = document.getElementById(
        "repaymentSpouseIncomeDisplay",
    );
    const obligationsDisplay = document.getElementById(
        "repaymentExistingObligationsDisplay",
    );

    const estimatedInstallmentEl = document.getElementById(
        "repaymentEstimatedInstallment",
    );
    const maxNewInstallmentEl = document.getElementById(
        "repaymentMaxNewInstallment",
    );
    const dsrAfterEl = document.getElementById("repaymentDsrAfter");
    const dsrLimitLabel = document.getElementById("repaymentDsrLimitLabel");
    const disposableIncomeEl = document.getElementById(
        "repaymentDisposableIncome",
    );
    const assessableIncomeEl = document.getElementById(
        "repaymentAssessableIncome",
    );
    const obligationsResultEl = document.getElementById(
        "repaymentExistingObligationsResult",
    );
    const dsrBeforeEl = document.getElementById("repaymentDsrBefore");
    const totalDebtServiceEl = document.getElementById(
        "repaymentTotalDebtService",
    );
    const recommendedMaxLoanEl = document.getElementById(
        "repaymentRecommendedMaxLoan",
    );
    const utilizationEl = document.getElementById(
        "repaymentCapacityUtilization",
    );
    const headroomEl = document.getElementById("repaymentCapacityHeadroom");
    const capacityFill = document.getElementById("repaymentCapacityFill");
    const statusEl = document.getElementById("repaymentCapacityStatus");

    const hidden = {
        primary: document.getElementById("repaymentPrimaryIncome"),
        other: document.getElementById("repaymentOtherIncome"),
        spouse: document.getElementById("repaymentSpouseIncome"),
        obligations: document.getElementById("repaymentExistingObligations"),
        assessable: document.getElementById("repaymentAssessableIncomeValue"),
        estimated: document.getElementById(
            "repaymentEstimatedInstallmentValue",
        ),
        maxNew: document.getElementById("repaymentMaxNewInstallmentValue"),
        totalDebt: document.getElementById("repaymentTotalDebtServiceValue"),
        disposable: document.getElementById("repaymentDisposableIncomeValue"),
        dsrBefore: document.getElementById("repaymentDsrBeforeValue"),
        dsrAfter: document.getElementById("repaymentDsrAfterValue"),
        headroom: document.getElementById("repaymentCapacityHeadroomValue"),
        recommendedLoan: document.getElementById(
            "repaymentRecommendedMaxLoanValue",
        ),
        status: document.getElementById("repaymentCapacityStatusValue"),
    };

    let requestedTouched = Boolean(
        requestedAmount && requestedAmount.value.trim(),
    );

    function numeric(value) {
        const cleaned = String(value == null ? "" : value).replace(
            /[^0-9.-]/g,
            "",
        );
        const number = Number(cleaned);
        return Number.isFinite(number) ? number : 0;
    }

    function rupiah(value) {
        const amount = Math.round(Number(value) || 0);
        return "Rp " + amount.toLocaleString("id-ID");
    }

    function percent(value) {
        const number = Number(value) || 0;
        return number.toFixed(2) + "%";
    }

    function selectedBorrowerType() {
        const selected = borrowerTypeInputs.find(function (input) {
            return input.checked;
        });
        return selected ? selected.value : "business";
    }

    function calculateInstallment(principal, months, yearlyRate, method) {
        principal = Math.max(0, principal);
        months = Math.max(0, Math.round(months));
        yearlyRate = Math.max(0, yearlyRate);
        if (!principal || !months) return 0;

        const monthlyRate = yearlyRate / 100 / 12;

        if (method === "flat") {
            return principal / months + principal * monthlyRate;
        }

        if (!monthlyRate) {
            return principal / months;
        }

        const factor = Math.pow(1 + monthlyRate, months);
        return (principal * monthlyRate * factor) / (factor - 1);
    }

    function maximumPrincipalFromPayment(payment, months, yearlyRate, method) {
        payment = Math.max(0, payment);
        months = Math.max(0, Math.round(months));
        yearlyRate = Math.max(0, yearlyRate);
        if (!payment || !months) return 0;

        const monthlyRate = yearlyRate / 100 / 12;

        if (method === "flat") {
            const denominator = 1 / months + monthlyRate;
            return denominator > 0 ? payment / denominator : 0;
        }

        if (!monthlyRate) {
            return payment * months;
        }

        const factor = Math.pow(1 + monthlyRate, months);
        return (payment * (factor - 1)) / (monthlyRate * factor);
    }

    function setHidden(input, value) {
        if (!input) return;
        input.value = String(Number.isFinite(Number(value)) ? value : 0);
    }

    function setStatus(type, text, icon) {
        if (!statusEl) return;
        statusEl.className = "repayment-status repayment-status--" + type;
        statusEl.innerHTML =
            '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>' + text;
    }

    function syncContextUI() {
        const borrowerType = selectedBorrowerType();
        const isIndividual = borrowerType === "individual";
        const isMarried = maritalStatus && maritalStatus.value === "married";
        const spouseAvailable =
            isIndividual &&
            isMarried &&
            numeric(spouseMonthlyIncome ? spouseMonthlyIncome.value : 0) > 0;

        if (includeSpouseField) includeSpouseField.hidden = !spouseAvailable;
        if (spouseIncomeSource) spouseIncomeSource.hidden = !spouseAvailable;
        if (!spouseAvailable && includeSpouse) includeSpouse.value = "no";
        if (businessBasisNote)
            businessBasisNote.hidden = borrowerType !== "business";
    }

    function maybeSyncExistingFacilityAmount() {
        if (
            !requestedAmount ||
            requestedTouched ||
            requestedAmount.value.trim()
        )
            return;
        const existing = numeric(additionalAmount ? additionalAmount.value : 0);
        if (existing > 0) {
            requestedAmount.value =
                Math.round(existing).toLocaleString("id-ID");
        }
    }

    function calculate() {
        syncContextUI();
        maybeSyncExistingFacilityAmount();

        const primaryIncome = numeric(
            employmentMonthlyIncome ? employmentMonthlyIncome.value : 0,
        );
        const otherIncome = numeric(
            employmentOtherIncome ? employmentOtherIncome.value : 0,
        );
        const spouseIncome = numeric(
            spouseMonthlyIncome ? spouseMonthlyIncome.value : 0,
        );
        const existingObligations = numeric(
            employmentOtherInstallments ? employmentOtherInstallments.value : 0,
        );
        const includeSpouseValue =
            includeSpouse && includeSpouse.value === "yes" ? spouseIncome : 0;

        const assessableIncome =
            primaryIncome + otherIncome + includeSpouseValue;
        const principal = numeric(requestedAmount ? requestedAmount.value : 0);
        const months = numeric(tenorMonths ? tenorMonths.value : 0);
        const rate = numeric(annualRate ? annualRate.value : 0);
        const method = repaymentMethod ? repaymentMethod.value : "annuity";
        const maxDsr = Math.min(
            100,
            Math.max(0, numeric(maxDsrInput ? maxDsrInput.value : 0)),
        );

        const estimatedInstallment = calculateInstallment(
            principal,
            months,
            rate,
            method,
        );
        const maxTotalDebtService = (assessableIncome * maxDsr) / 100;
        const maxNewInstallment = Math.max(
            0,
            maxTotalDebtService - existingObligations,
        );
        const totalDebtService = existingObligations + estimatedInstallment;
        const disposableIncome = assessableIncome - totalDebtService;
        const dsrBefore =
            assessableIncome > 0
                ? (existingObligations / assessableIncome) * 100
                : 0;
        const dsrAfter =
            assessableIncome > 0
                ? (totalDebtService / assessableIncome) * 100
                : 0;
        const headroom = maxNewInstallment - estimatedInstallment;
        const utilization =
            maxNewInstallment > 0
                ? (estimatedInstallment / maxNewInstallment) * 100
                : estimatedInstallment > 0
                  ? 999
                  : 0;
        const recommendedMaxLoan = maximumPrincipalFromPayment(
            maxNewInstallment,
            months,
            rate,
            method,
        );

        if (primaryDisplay) primaryDisplay.textContent = rupiah(primaryIncome);
        if (otherDisplay) otherDisplay.textContent = rupiah(otherIncome);
        if (spouseDisplay) spouseDisplay.textContent = rupiah(spouseIncome);
        if (obligationsDisplay)
            obligationsDisplay.textContent = rupiah(existingObligations);

        if (estimatedInstallmentEl)
            estimatedInstallmentEl.textContent = rupiah(estimatedInstallment);
        if (maxNewInstallmentEl)
            maxNewInstallmentEl.textContent = rupiah(maxNewInstallment);
        if (dsrAfterEl) dsrAfterEl.textContent = percent(dsrAfter);
        if (dsrLimitLabel)
            dsrLimitLabel.textContent = "Policy limit: " + percent(maxDsr);
        if (disposableIncomeEl)
            disposableIncomeEl.textContent = rupiah(disposableIncome);
        if (assessableIncomeEl)
            assessableIncomeEl.textContent = rupiah(assessableIncome);
        if (obligationsResultEl)
            obligationsResultEl.textContent = rupiah(existingObligations);
        if (dsrBeforeEl) dsrBeforeEl.textContent = percent(dsrBefore);
        if (totalDebtServiceEl)
            totalDebtServiceEl.textContent = rupiah(totalDebtService);
        if (recommendedMaxLoanEl)
            recommendedMaxLoanEl.textContent = rupiah(recommendedMaxLoan);
        if (utilizationEl)
            utilizationEl.textContent =
                utilization >= 999 ? ">999%" : percent(utilization);
        if (headroomEl)
            headroomEl.textContent =
                (headroom >= 0 ? "Headroom: " : "Shortfall: ") +
                rupiah(Math.abs(headroom));

        if (capacityFill) {
            capacityFill.style.width =
                Math.min(100, Math.max(0, utilization)) + "%";
            capacityFill.classList.toggle(
                "is-warning",
                utilization >= 90 && utilization <= 100,
            );
            capacityFill.classList.toggle("is-danger", utilization > 100);
        }

        let statusValue = "waiting";
        if (assessableIncome <= 0 || principal <= 0 || months <= 0) {
            setStatus("neutral", "Waiting for Data", "fa-clock");
        } else if (
            estimatedInstallment > maxNewInstallment ||
            dsrAfter > maxDsr
        ) {
            statusValue = "over_capacity";
            setStatus("danger", "Exceeds Capacity", "fa-triangle-exclamation");
        } else if (utilization >= 90) {
            statusValue = "near_limit";
            setStatus(
                "warning",
                "Near Capacity Limit",
                "fa-circle-exclamation",
            );
        } else {
            statusValue = "within_capacity";
            setStatus("success", "Within Capacity", "fa-circle-check");
        }

        setHidden(hidden.primary, Math.round(primaryIncome));
        setHidden(hidden.other, Math.round(otherIncome));
        setHidden(hidden.spouse, Math.round(includeSpouseValue));
        setHidden(hidden.obligations, Math.round(existingObligations));
        setHidden(hidden.assessable, Math.round(assessableIncome));
        setHidden(hidden.estimated, Math.round(estimatedInstallment));
        setHidden(hidden.maxNew, Math.round(maxNewInstallment));
        setHidden(hidden.totalDebt, Math.round(totalDebtService));
        setHidden(hidden.disposable, Math.round(disposableIncome));
        setHidden(hidden.dsrBefore, dsrBefore.toFixed(4));
        setHidden(hidden.dsrAfter, dsrAfter.toFixed(4));
        setHidden(hidden.headroom, Math.round(headroom));
        setHidden(hidden.recommendedLoan, Math.round(recommendedMaxLoan));
        if (hidden.status) hidden.status.value = statusValue;

        // Keep Step 6 collateral coverage synchronized with the same requested plafond.
        if (typeof window.setRequestedPlafond === "function") {
            window.setRequestedPlafond(principal);
        }

        const result = {
            requestedAmount: principal,
            tenorMonths: months,
            annualRate: rate,
            method: method,
            maxDsr: maxDsr,
            primaryIncome: primaryIncome,
            otherIncome: otherIncome,
            includedSpouseIncome: includeSpouseValue,
            existingObligations: existingObligations,
            assessableIncome: assessableIncome,
            estimatedInstallment: estimatedInstallment,
            maxNewInstallment: maxNewInstallment,
            totalDebtService: totalDebtService,
            disposableIncome: disposableIncome,
            dsrBefore: dsrBefore,
            dsrAfter: dsrAfter,
            capacityUtilization: utilization,
            capacityHeadroom: headroom,
            recommendedMaxLoan: recommendedMaxLoan,
            status: statusValue,
        };

        window.__newAppRepaymentCapacity = result;
        window.dispatchEvent(
            new CustomEvent("newapp:repayment-calculated", { detail: result }),
        );
    }

    if (requestedAmount) {
        requestedAmount.addEventListener("input", function () {
            requestedTouched = true;
            const digits = requestedAmount.value.replace(/\D/g, "");
            requestedAmount.value = digits
                ? Number(digits).toLocaleString("id-ID")
                : "";
            calculate();
        });
    }

    [tenorMonths, annualRate, repaymentMethod, maxDsrInput, includeSpouse]
        .filter(Boolean)
        .forEach(function (control) {
            control.addEventListener("input", calculate);
            control.addEventListener("change", calculate);
        });

    [
        employmentMonthlyIncome,
        employmentOtherIncome,
        employmentOtherInstallments,
        spouseMonthlyIncome,
    ]
        .filter(Boolean)
        .forEach(function (control) {
            control.addEventListener("input", calculate);
            control.addEventListener("change", calculate);
        });

    borrowerTypeInputs.forEach(function (control) {
        control.addEventListener("change", calculate);
    });

    if (maritalStatus) maritalStatus.addEventListener("change", calculate);
    if (additionalAmount) {
        additionalAmount.addEventListener("input", function () {
            if (
                !requestedTouched &&
                requestedAmount &&
                !requestedAmount.value.trim()
            ) {
                maybeSyncExistingFacilityAmount();
            }
            calculate();
        });
    }

    window.getRepaymentCapacityResult = function () {
        return Object.assign({}, window.__newAppRepaymentCapacity || {});
    };

    calculate();
})();

// ***************************************
// * REVIEW & SUBMIT - STEP 8
// * Read-only summary, completeness gate, submit/cancel workflow
// ***************************************
(function () {
    const root = document.getElementById("reviewSubmit");
    if (!root) return;

    const submitButton = document.getElementById("submitApplicationButton");
    const cancelButton = document.getElementById("cancelApplicationButton");
    const readinessBadge = document.getElementById("reviewReadinessBadge");
    const checklistStatus = document.getElementById("reviewChecklistStatus");
    const missingFieldsList = document.getElementById(
        "reviewMissingFieldsList",
    );
    const missingDocumentsList = document.getElementById(
        "reviewMissingDocumentsList",
    );
    const missingFieldCount = document.getElementById(
        "reviewMissingFieldCount",
    );
    const completeFieldCount = document.getElementById(
        "reviewCompleteFieldCount",
    );
    const missingDocumentCount = document.getElementById(
        "reviewMissingDocumentCount",
    );
    const fieldChecklistCount = document.getElementById(
        "reviewFieldChecklistCount",
    );
    const documentChecklistCount = document.getElementById(
        "reviewDocumentChecklistCount",
    );
    const note = document.getElementById("reviewMarketingNote");
    const noteCount = document.getElementById("reviewMarketingNoteCount");

    const successModal = document.getElementById("submitSuccessModal");
    const successAppNo = document.getElementById("submitSuccessApplicationNo");
    const countdownEl = document.getElementById("submitRedirectCountdown");
    const goToListButton = document.getElementById("submitGoToListButton");

    const cancelModal = document.getElementById("cancelApplicationModal");
    const cancelReason = document.getElementById("cancelApplicationReason");
    const cancelError = document.getElementById("cancelApplicationError");
    const confirmCancel = document.getElementById("confirmCancelApplication");

    const summaryTargets = {
        application: document.getElementById("reviewSummaryApplication"),
        documents: document.getElementById("reviewSummaryDocuments"),
        borrower: document.getElementById("reviewSummaryBorrower"),
        employment: document.getElementById("reviewSummaryEmployment"),
        related: document.getElementById("reviewSummaryRelatedParties"),
        collateral: document.getElementById("reviewSummaryCollateral"),
        repayment: document.getElementById("reviewSummaryRepayment"),
    };

    let lastCompleteness = null;
    let redirectTimer = null;
    let countdownTimer = null;

    function getValue(id, fallback) {
        const el = document.getElementById(id);
        if (!el) return fallback || "Ã¢â‚¬â€";
        if (el.tagName === "SELECT") {
            const option = el.options[el.selectedIndex];
            return option && option.value !== ""
                ? option.textContent.trim()
                : fallback || "Ã¢â‚¬â€";
        }
        const value = "value" in el ? el.value : el.textContent;
        return String(value || "").trim() || fallback || "Ã¢â‚¬â€";
    }

    function textValue(id, fallback) {
        const el = document.getElementById(id);
        return el
            ? String(el.textContent || "").trim() || fallback || "Ã¢â‚¬â€"
            : fallback || "Ã¢â‚¬â€";
    }

    function radioLabel(name, fallback) {
        const checked = document.querySelector(
            'input[name="' + name + '"]:checked',
        );
        if (!checked) return fallback || "Ã¢â‚¬â€";
        const option = checked.closest(".new-app-option");
        const text = option
            ? option.querySelector(".new-app-option__text")
            : null;
        return text ? text.textContent.trim() : checked.value;
    }

    function formatCurrencyRaw(value) {
        const digits = String(value || "").replace(/\D/g, "");
        if (!digits) return "Rp 0";
        return "Rp " + Number(digits).toLocaleString("id-ID");
    }

    function summaryRows(target, rows) {
        if (!target) return;
        target.innerHTML = "";
        rows.forEach(function (row) {
            const wrap = document.createElement("div");
            const dt = document.createElement("dt");
            const dd = document.createElement("dd");
            dt.textContent = row[0];
            dd.textContent = row[1] || "Ã¢â‚¬â€";
            if (!row[1] || row[1] === "Ã¢â‚¬â€") dd.classList.add("is-empty");
            wrap.append(dt, dd);
            target.appendChild(wrap);
        });
    }

    function borrowerType() {
        const checked = document.querySelector(
            'input[name="borrower_type"]:checked',
        );
        return checked ? checked.value : "business";
    }

    function updateSummaries() {
        const type = borrowerType();
        const doc = window.__newAppDocumentChecklistStatus || {
            requiredCount: Number(textValue("docRequiredCount", "0")) || 0,
            uploadedCount: Number(textValue("docUploadedCount", "0")) || 0,
            missingCount: Number(textValue("docMissingCount", "0")) || 0,
            conditionalCount:
                Number(textValue("docConditionalCount", "0")) || 0,
            missingItems: [],
        };

        summaryRows(summaryTargets.application, [
            ["Application Type", radioLabel("application_type")],
            ["Borrower Type", radioLabel("borrower_type")],
            ["Collateral Status", radioLabel("collateral_status")],
            ["Branch", getValue("applicationBranch")],
            ["Account Manager", getValue("accountManager")],
        ]);

        summaryRows(summaryTargets.documents, [
            ["Required Documents", String(doc.requiredCount)],
            ["Uploaded Items", String(doc.uploadedCount)],
            ["Missing Required", String(doc.missingCount)],
            ["Conditional Items", String(doc.conditionalCount)],
        ]);

        if (type === "individual") {
            summaryRows(summaryTargets.borrower, [
                ["Borrower Type", "Individual"],
                ["Full Name", getValue("individualFullName")],
                ["NIK", getValue("individualNik")],
                ["Marital Status", getValue("individualMaritalStatus")],
                ["Mobile Number", getValue("individualPhone")],
                ["Email", getValue("individualEmail")],
            ]);
        } else {
            summaryRows(summaryTargets.borrower, [
                ["Borrower Type", "Business Entity"],
                ["Business Name", getValue("businessName")],
                ["Legal Form", getValue("businessLegalForm")],
                ["NIB", getValue("businessNib")],
                ["Office Phone", getValue("businessOfficePhone")],
                ["Email", getValue("businessEmail")],
            ]);
        }

        summaryRows(summaryTargets.employment, [
            ["Employment Status", getValue("employmentStatus")],
            ["Employer / Business", getValue("employmentCompanyName")],
            ["Business Sector", getValue("employmentSector")],
            [
                "Monthly Income / Revenue",
                formatCurrencyRaw(getValue("employmentMonthlyIncome", "0")),
            ],
            [
                "Other Monthly Income",
                formatCurrencyRaw(getValue("employmentOtherIncome", "0")),
            ],
            [
                "Other Installments",
                formatCurrencyRaw(getValue("employmentOtherInstallments", "0")),
            ],
        ]);

        if (type === "individual") {
            const marital = getValue("individualMaritalStatus");
            if (String(marital).toLowerCase().includes("married")) {
                summaryRows(summaryTargets.related, [
                    ["Context", "Spouse Data"],
                    ["Spouse Name", getValue("spouseFullName")],
                    ["Spouse NIK", getValue("spouseNik")],
                    ["Occupation", getValue("spouseOccupation")],
                    [
                        "Monthly Income",
                        formatCurrencyRaw(getValue("spouseMonthlyIncome", "0")),
                    ],
                ]);
            } else {
                summaryRows(summaryTargets.related, [
                    ["Context", "Spouse Data"],
                    ["Status", "Not required for current marital status"],
                ]);
            }
        } else {
            const managementRows = document.querySelectorAll(
                "[data-management-row]",
            ).length;
            summaryRows(summaryTargets.related, [
                ["Context", "Management & Shareholders"],
                ["Management / Shareholder Rows", String(managementRows)],
                [
                    "Share Ownership Total",
                    textValue("managementOwnershipTotal", "0%"),
                ],
                ["Validation", textValue("managementOwnershipMessage", "Ã¢â‚¬â€")],
            ]);
        }

        summaryRows(summaryTargets.collateral, [
            ["Collateral Count", textValue("collateralSummaryCount", "0")],
            ["Total NJOP", textValue("collateralTotalNjop", "Rp 0")],
            ["Total Market Value", textValue("collateralTotalMarket", "Rp 0")],
            [
                "Total Liquidation Value",
                textValue("collateralTotalLiquidation", "Rp 0"),
            ],
            ["MV Coverage", textValue("collateralTotalCoverMv", "Ã¢â‚¬â€")],
            ["LV Coverage", textValue("collateralTotalCoverLv", "Ã¢â‚¬â€")],
        ]);

        summaryRows(summaryTargets.repayment, [
            [
                "Requested Loan Amount",
                formatCurrencyRaw(getValue("repaymentRequestedAmount", "0")),
            ],
            ["Tenor", getValue("repaymentTenorMonths", "0") + " months"],
            [
                "Estimated Installment",
                textValue("repaymentEstimatedInstallment", "Rp 0"),
            ],
            ["DSR After", textValue("repaymentDsrAfter", "0.00%")],
            [
                "Capacity Status",
                textValue("repaymentCapacityStatus", "Waiting for Data"),
            ],
            [
                "Recommended Maximum Loan",
                textValue("repaymentRecommendedMaxLoan", "Rp 0"),
            ],
        ]);
    }

    function isHiddenInsidePage(control, page) {
        let node = control;
        while (node && node !== page) {
            if (node.hidden) return true;
            if (
                node.getAttribute &&
                node.getAttribute("aria-hidden") === "true"
            )
                return true;
            if (
                node.classList &&
                (node.classList.contains("is-hidden") ||
                    node.classList.contains("hidden"))
            )
                return true;
            node = node.parentElement;
        }
        return false;
    }

    function controlLabel(control) {
        if (control.id) {
            const label = document.querySelector(
                'label[for="' + CSS.escape(control.id) + '"]',
            );
            if (label)
                return label.textContent
                    .replace(/\*/g, "")
                    .replace(/^\s*\d+\.\s*/, "")
                    .trim();
        }
        const parentLabel = control.closest("label");
        if (parentLabel)
            return parentLabel.textContent.replace(/\*/g, "").trim();
        return control.name || control.id || "Required field";
    }

    function isFilled(control) {
        if (control.type === "checkbox") return control.checked;
        if (control.type === "radio") {
            if (!control.name) return control.checked;
            return Boolean(
                document.querySelector(
                    'input[type="radio"][name="' +
                        CSS.escape(control.name) +
                        '"]:checked',
                ),
            );
        }
        if (control.tagName === "SELECT")
            return String(control.value || "").trim() !== "";
        return (
            String(control.value || "").trim() !== "" && control.checkValidity()
        );
    }

    function collectRequiredFields() {
        const result = [];
        const seenRadio = new Set();
        const pages = Array.from(
            document.querySelectorAll("#newAppPages .new-app-page"),
        ).filter(function (page) {
            return page.id !== "reviewSubmit" && page.id !== "docUpload";
        });

        pages.forEach(function (page) {
            page.querySelectorAll(
                "input[required], select[required], textarea[required]",
            ).forEach(function (control) {
                if (
                    control.disabled ||
                    control.type === "file" ||
                    isHiddenInsidePage(control, page)
                )
                    return;
                if (control.type === "radio" && control.name) {
                    if (seenRadio.has(control.name)) return;
                    seenRadio.add(control.name);
                }
                result.push({
                    control: control,
                    pageId: page.id,
                    label: controlLabel(control),
                    filled: isFilled(control),
                });
            });
        });
        return result;
    }

    function renderChecklistList(target, items, emptyText, icon, stepResolver) {
        if (!target) return;
        target.innerHTML = "";
        if (!items.length) {
            const complete = document.createElement("div");
            complete.className =
                "review-checklist-item review-checklist-item--complete";
            complete.innerHTML =
                '<i class="fa-solid fa-circle-check"></i><span>' +
                emptyText +
                "</span>";
            target.appendChild(complete);
            return;
        }

        items.forEach(function (item) {
            const row = document.createElement("div");
            row.className = "review-checklist-item";
            const iconEl = document.createElement("i");
            iconEl.className = "fa-solid " + icon;
            const text = document.createElement("span");
            text.textContent = item.label || String(item);
            const edit = document.createElement("a");
            const step = stepResolver(item);
            edit.href = "#" + step;
            edit.textContent = "Fix";
            row.append(iconEl, text, edit);
            target.appendChild(row);
        });
    }

    function refreshCompleteness() {
        const requiredFields = collectRequiredFields();
        const missingFields = requiredFields.filter(function (item) {
            return !item.filled;
        });
        const documentStatus = window.__newAppDocumentChecklistStatus || {
            missingCount: Number(textValue("docMissingCount", "0")) || 0,
            missingItems: [],
        };
        const missingDocs = documentStatus.missingItems || [];
        const missingDocsCount = Number(
            documentStatus.missingCount || missingDocs.length || 0,
        );
        const completeFields = Math.max(
            0,
            requiredFields.length - missingFields.length,
        );
        const ready =
            missingFields.length === 0 &&
            missingDocsCount === 0 &&
            requiredFields.length > 0;

        lastCompleteness = {
            ready,
            requiredFields,
            missingFields,
            missingDocs,
            missingDocsCount,
        };

        if (completeFieldCount)
            completeFieldCount.textContent = String(completeFields);
        if (missingFieldCount)
            missingFieldCount.textContent = String(missingFields.length);
        if (missingDocumentCount)
            missingDocumentCount.textContent = String(missingDocsCount);
        if (fieldChecklistCount)
            fieldChecklistCount.textContent = missingFields.length + " missing";
        if (documentChecklistCount)
            documentChecklistCount.textContent = missingDocsCount + " missing";

        renderChecklistList(
            missingFieldsList,
            missingFields,
            "All required fields are complete.",
            "fa-circle-exclamation",
            function (item) {
                return item.pageId;
            },
        );
        renderChecklistList(
            missingDocumentsList,
            missingDocs,
            "All required documents are uploaded.",
            "fa-file-circle-exclamation",
            function () {
                return "docUpload";
            },
        );

        if (submitButton) submitButton.disabled = !ready;

        if (readinessBadge) {
            readinessBadge.className =
                "review-readiness-badge " +
                (ready
                    ? "review-readiness-badge--ready"
                    : "review-readiness-badge--blocked");
            readinessBadge.innerHTML = ready
                ? '<i class="fa-solid fa-circle-check"></i> Ready to Submit'
                : '<i class="fa-solid fa-triangle-exclamation"></i> ' +
                  (missingFields.length + missingDocsCount) +
                  " item(s) incomplete";
        }

        if (checklistStatus) {
            checklistStatus.className =
                "review-checklist-status " +
                (ready ? "is-ready" : "is-blocked");
            checklistStatus.textContent = ready
                ? "Complete"
                : "Action Required";
        }

        return lastCompleteness;
    }

    function refreshReview() {
        updateSummaries();
        refreshCompleteness();
    }

    function generatedApplicationNumber() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const serial = String((now.getTime() % 9000) + 1000).slice(-4);
        return "LOS-JKT-" + y + m + "-" + serial;
    }

    function navigateToList(modal) {
        const redirect =
            modal && modal.dataset.redirect
                ? modal.dataset.redirect
                : "/app-list";
        window.location.href = redirect;
    }

    function openSuccessModal() {
        if (!successModal) return;
        const applicationNo = generatedApplicationNumber();
        if (successAppNo) successAppNo.textContent = applicationNo;
        successModal.hidden = false;
        document.body.classList.add("review-action-modal-open");

        let seconds = 3;
        if (countdownEl) countdownEl.textContent = String(seconds);
        window.clearInterval(countdownTimer);
        window.clearTimeout(redirectTimer);
        countdownTimer = window.setInterval(function () {
            seconds -= 1;
            if (countdownEl)
                countdownEl.textContent = String(Math.max(0, seconds));
            if (seconds <= 0) window.clearInterval(countdownTimer);
        }, 1000);
        redirectTimer = window.setTimeout(function () {
            navigateToList(successModal);
        }, 3000);

        window.dispatchEvent(
            new CustomEvent("newapp:submitted", {
                detail: {
                    applicationNo: applicationNo,
                    marketingNote: note ? note.value : "",
                    submittedAt: new Date().toISOString(),
                    nextStages: ["appraisal", "credit_analysis"],
                },
            }),
        );
    }

    if (note) {
        const updateNoteCount = function () {
            if (noteCount) noteCount.textContent = String(note.value.length);
        };
        note.addEventListener("input", updateNoteCount);
        updateNoteCount();
    }

    if (submitButton) {
        submitButton.addEventListener("click", function () {
            const status = refreshCompleteness();
            if (!status.ready) return;
            openSuccessModal();
        });
    }

    if (goToListButton) {
        goToListButton.addEventListener("click", function () {
            navigateToList(successModal);
        });
    }

    if (cancelButton && cancelModal) {
        cancelButton.addEventListener("click", function () {
            cancelModal.hidden = false;
            document.body.classList.add("review-action-modal-open");
            if (cancelReason) cancelReason.focus();
        });
    }

    function closeCancelModal() {
        if (!cancelModal) return;
        cancelModal.hidden = true;
        document.body.classList.remove("review-action-modal-open");
        if (cancelError) cancelError.hidden = true;
    }

    document
        .querySelectorAll("[data-cancel-modal-close]")
        .forEach(function (button) {
            button.addEventListener("click", closeCancelModal);
        });

    if (confirmCancel) {
        confirmCancel.addEventListener("click", function () {
            const reason = cancelReason ? cancelReason.value.trim() : "";
            if (!reason) {
                if (cancelError) cancelError.hidden = false;
                if (cancelReason) cancelReason.focus();
                return;
            }

            window.dispatchEvent(
                new CustomEvent("newapp:cancelled", {
                    detail: {
                        reason: reason,
                        cancelledAt: new Date().toISOString(),
                    },
                }),
            );
            navigateToList(cancelModal);
        });
    }

    // Backend-ready hook for applications returned by Credit Analyst.
    window.setReturnedApplicationNotice = function (message, requestedItems) {
        const panel = document.getElementById("reviewReturnedNotice");
        const messageEl = document.getElementById("reviewReturnedMessage");
        const itemsEl = document.getElementById("reviewReturnedItems");
        if (!panel) return;

        const hasMessage = Boolean(String(message || "").trim());
        panel.hidden = !hasMessage;
        if (messageEl)
            messageEl.textContent = hasMessage ? String(message) : "";
        if (itemsEl) {
            itemsEl.innerHTML = "";
            (Array.isArray(requestedItems) ? requestedItems : []).forEach(
                function (item) {
                    const badge = document.createElement("span");
                    badge.textContent = String(item);
                    itemsEl.appendChild(badge);
                },
            );
        }
    };

    window.addEventListener("newapp:document-status-changed", refreshReview);
    window.addEventListener("newapp:repayment-calculated", refreshReview);
    window.addEventListener("newapp:page-change", function (event) {
        if (event.detail && event.detail.hash === "#reviewSubmit")
            refreshReview();
    });

    document
        .getElementById("newAppPages")
        ?.addEventListener("input", function (event) {
            if (event.target.closest("#reviewSubmit")) return;
            refreshReview();
        });
    document
        .getElementById("newAppPages")
        ?.addEventListener("change", function (event) {
            if (event.target.closest("#reviewSubmit")) return;
            refreshReview();
        });

    refreshReview();
})();

export default {
    mounted(): void {
        applicationList.mount();
    },
    unmounted(): void {
        applicationList.unmount();
    },
};
