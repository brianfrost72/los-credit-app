const animatedCardIds = [
    "application-status-card",
    "sla-monitoring-card",
    "portfolio-quality-card",
];

export default {
    mounted(): void {
        const cards = animatedCardIds
            .map((id) => document.getElementById(id))
            .filter((card): card is HTMLElement => card instanceof HTMLElement);

        requestAnimationFrame(() => requestAnimationFrame(() => {
            cards.forEach((card) => card.classList.add("is-loaded"));
        }));
    },
};
