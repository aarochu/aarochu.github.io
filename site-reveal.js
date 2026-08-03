(function () {
  const siteView = document.getElementById("site-view");
  if (!siteView) return;

  const singleSelectors = [
    ".site-hero-grid > div",
    ".site-hero-photo-wrap",
    ".section-kicker",
    ".site-section-lede",
    ".contact-block",
  ];

  const groupSelectors = [".about-tags", ".exp-list", ".case-list", ".reel-grid"];

  const targets = [];

  singleSelectors.forEach((selector) => {
    siteView.querySelectorAll(selector).forEach((el) => {
      el.classList.add("reveal");
      targets.push(el);
    });
  });

  groupSelectors.forEach((selector) => {
    siteView.querySelectorAll(selector).forEach((group) => {
      [...group.children].forEach((child, i) => {
        child.classList.add("reveal");
        child.style.setProperty("--reveal-delay", `${Math.min(i, 5) * 70}ms`);
        targets.push(child);
      });
    });
  });

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-inview"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
  );

  targets.forEach((el) => io.observe(el));
})();
