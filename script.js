document.documentElement.classList.add("js");

(function () {
  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.getElementById("main-nav");
  const backToTop = document.getElementById("back-to-top");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setNavigationState(isOpen) {
    if (!navToggle || !mainNav) {
      return;
    }

    mainNav.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "收起主导航" : "展开主导航");
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
      if (window.innerWidth > 1120) {
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
})();
