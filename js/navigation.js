(() => {
  const pages = ["index.html", "resume.html", "projects.html", "contact.html"];
  const current = location.pathname.split("/").pop() || "index.html";
  const index = pages.indexOf(current);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const nativeTransitions = "onpagereveal" in window && "onpageswap" in window;
  let leaving = false;
  let readyAt = performance.now() + 650;
  let edgeDirection = 0;
  let distance = 0;

  function navigate(url) {
    if (leaving) return;
    leaving = true;
    if (nativeTransitions || reducedMotion.matches) {
      location.assign(url);
      return;
    }
    document.body.classList.remove("page-arrival");
    document.body.classList.add("is-leaving");
    const fadeDuration = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue("--page-fade-out")) || 240;
    setTimeout(() => location.assign(url), fadeDuration);
  }

  // Warm adjacent documents so the fade is spent transitioning, not fetching.
  for (const adjacent of [pages[index - 1], pages[index + 1]]) {
    if (!adjacent) continue;
    const hint = document.createElement("link");
    hint.rel = "prefetch";
    hint.href = adjacent;
    document.head.append(hint);
  }

  window.addEventListener("pageshow", () => {
    leaving = false;
    distance = 0;
    edgeDirection = 0;
    readyAt = performance.now() + 650;
    document.body.classList.remove("is-leaving");
    if (!nativeTransitions) document.body.classList.add("page-arrival");
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

  function atPageEdge(direction) {
    const root = document.scrollingElement;
    return direction > 0 ? root.scrollHeight - root.clientHeight - root.scrollTop <= 3
      : root.scrollTop <= 3;
  }

  function goToAdjacentPage(direction) {
    const destination = pages[index + direction];
    if (destination) navigate(destination + (direction < 0 ? "#page-end" : ""));
  }

  let swipe = null;
  window.addEventListener("touchstart", event => {
    swipe = null;
    if (index < 0 || leaving || event.touches.length !== 1 ||
        event.target.closest("a, button, input, textarea, select, [contenteditable], .project-gallery")) return;
    const { clientX, clientY } = event.touches[0];
    swipe = { clientX, clientY, top: atPageEdge(-1), bottom: atPageEdge(1) };
  }, { passive: true });

  window.addEventListener("touchcancel", () => { swipe = null; }, { passive: true });
  window.addEventListener("touchend", event => {
    const start = swipe;
    swipe = null;
    if (!start || event.defaultPrevented || event.touches.length ||
        event.changedTouches.length !== 1) return;
    const { clientX, clientY } = event.changedTouches[0];
    const vertical = start.clientY - clientY;
    if (Math.abs(vertical) < 64 || Math.abs(vertical) < 1.5 * Math.abs(clientX - start.clientX)) return;
    const direction = Math.sign(vertical);
    if ((direction > 0 ? start.bottom : start.top) && atPageEdge(direction)) {
      goToAdjacentPage(direction);
    }
  }, { passive: true });

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
    if (!atPageEdge(direction) || now < readyAt) {
      distance = 0;
      edgeDirection = 0;
      return;
    }
    // Accumulate continued scrolling at the boundary without requiring a pause.
    if (direction !== edgeDirection) {
      edgeDirection = direction;
      distance = 0;
    }
    distance += Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 :
      event.deltaMode === 2 ? innerHeight : 1);
    if (distance >= 48) goToAdjacentPage(direction);
  }, { passive: true });
})();
