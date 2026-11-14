(() => {
  const pages = ["index.html", "resume.html", "projects.html", "contact.html"];
  const current = location.pathname.split("/").pop() || "index.html";
  const index = pages.indexOf(current);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let leaving = false;
  let readyAt = performance.now() + 900;
  let lastWheelAt = 0;
  let edgeDirection = 0;
  let distance = 0;

  function navigate(url) {
    if (leaving) return;
    leaving = true;
    document.body.classList.add("is-leaving");
    setTimeout(() => location.assign(url), reducedMotion.matches ? 0 : 180);
  }

  window.addEventListener("pageshow", () => {
    leaving = false;
    distance = 0;
    edgeDirection = 0;
    readyAt = performance.now() + 900;
    document.body.classList.remove("is-leaving");
    document.body.classList.add("page-arrival");
  });

  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey ||
        event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a");
    if (!link || link.target || link.hasAttribute("download")) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.hash ||
        !pages.includes(url.pathname.split("/").pop()) ||
        url.pathname === location.pathname) return;
    event.preventDefault();
    navigate(url.href);
  });

  // Re-enter the previous page at its end, including after web fonts settle.
  if (location.hash === "#page-end") {
    Promise.all([document.fonts.ready, new Promise(resolve => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve, { once: true });
    })]).then(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
    });
  }

  window.addEventListener("wheel", event => {
    if (index < 0 || leaving || event.ctrlKey || event.defaultPrevented ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        event.target.closest("input, textarea, select, [contenteditable='true']")) return;

    // Let any nested scrolling area consume its own gestures.
    for (let element = event.target; element instanceof Element &&
         element !== document.body; element = element.parentElement) {
      const style = getComputedStyle(element);
      if (/(auto|scroll)/.test(style.overflowY) &&
          element.scrollHeight > element.clientHeight) return;
    }

    const now = performance.now();
    const direction = Math.sign(event.deltaY);
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    const atEdge = direction > 0 ? scrollY >= maxScroll - 2 : scrollY <= 2;
    const newGesture = now - lastWheelAt > 180;
    lastWheelAt = now;
    if (!atEdge || now < readyAt) {
      distance = 0;
      edgeDirection = 0;
      return;
    }
    // A deliberate gesture at the boundary avoids skipping unread content.
    if (newGesture) {
      edgeDirection = direction;
      distance = 0;
    }
    if (direction !== edgeDirection) return;
    distance += Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 :
      event.deltaMode === 2 ? innerHeight : 1);
    const destination = pages[index + direction];
    if (destination && distance >= 70) {
      navigate(destination + (direction < 0 ? "#page-end" : ""));
    }
  }, { passive: true });
})();
