document.documentElement.classList.add("js");

(function () {
  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.getElementById("main-nav");
  const backToTop = document.getElementById("back-to-top");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const english = document.documentElement.lang === "en";
  // A paired page keeps the same stage, selected path and URL fragment.
  function updateLanguageLink() {
    document.querySelectorAll("[data-language-switch]").forEach(link => {
      const url = new URL(link.href);
      url.search = location.search;
      url.hash = location.hash;
      link.href = url.href;
    });
  }
  updateLanguageLink();
  window.addEventListener("hashchange", updateLanguageLink);
  document.addEventListener("change", updateLanguageLink);
  document.querySelectorAll("[data-language-switch]").forEach(link => link.addEventListener("click", updateLanguageLink));

  function setNavigationState(isOpen) {
    if (!navToggle || !mainNav) {
      return;
    }

    mainNav.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", english ? (isOpen ? "Collapse main navigation" : "Expand main navigation") : (isOpen ? "收起主导航" : "展开主导航"));
  }

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      setNavigationState(!mainNav.classList.contains("open"));
    });

    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setNavigationState(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && mainNav.classList.contains("open")) {
        setNavigationState(false);
        navToggle.focus();
      }
    });

    document.addEventListener("click", function (event) {
      const header = navToggle.closest(".site-header");
      if (mainNav.classList.contains("open") && header && !header.contains(event.target)) {
        setNavigationState(false);
      }
    });

    window.addEventListener("resize", function () {
      if (getComputedStyle(navToggle).display === "none") {
        setNavigationState(false);
      }
    });
  }

  if (backToTop) {
    window.addEventListener("scroll", function () {
      backToTop.classList.toggle("visible", window.scrollY > 360);
    }, { passive: true });

    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    });
  }

  // A saved stage link should reveal its content even when the stage is folded.
  function revealLinkedStage() {
    if (!window.location.hash) return;
    let id;
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;
    let detail = target.closest("details");
    if (!detail) return;
    while (detail) {
      detail.open = true;
      detail = detail.parentElement.closest("details");
    }
    window.requestAnimationFrame(function () {
      target.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }

  window.addEventListener("hashchange", revealLinkedStage);
  revealLinkedStage();

  // Print the complete guide, then restore the reader's open/closed stages.
  let printState = [];
  window.addEventListener("beforeprint", function () {
    printState = [...document.querySelectorAll("details.stage-gate")]
      .map(function (detail) {
        const wasOpen = detail.open;
        detail.open = true;
        return [detail, wasOpen];
      });
  });
  window.addEventListener("afterprint", function () {
    printState.forEach(function ([detail, wasOpen]) { detail.open = wasOpen; });
    printState = [];
  });
})();
