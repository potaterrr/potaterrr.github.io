document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    navLinks.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      })
    );
  }

});

document.addEventListener("DOMContentLoaded", () => {
  const slideshow = document.getElementById("blog-slideshow");
  if (!slideshow) return;

  const slides = Array.from(slideshow.querySelectorAll(".slide"));
  const dotsWrap = slideshow.querySelector(".ss-dots");
  const prevBtn = slideshow.querySelector(".ss-prev");
  const nextBtn = slideshow.querySelector(".ss-next");
  if (!slides.length || !dotsWrap) return;

  let index = 0;
  let timer = null;
  const AUTO_MS = 6000;

  const dots = slides.map((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Go to post ${i + 1}`);
    dot.addEventListener("click", () => {
      show(i);
      restart();
    });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
      dot.setAttribute("aria-selected", String(i === index));
    });
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(() => show(index + 1), AUTO_MS);
  }

  prevBtn?.addEventListener("click", () => {
    show(index - 1);
    restart();
  });
  nextBtn?.addEventListener("click", () => {
    show(index + 1);
    restart();
  });

  slideshow.addEventListener("mouseenter", () => clearInterval(timer));
  slideshow.addEventListener("mouseleave", restart);
  slideshow.addEventListener("focusin", () => clearInterval(timer));
  slideshow.addEventListener("focusout", restart);

  slideshow.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { show(index - 1); restart(); }
    if (event.key === "ArrowRight") { show(index + 1); restart(); }
  });

  let touchX = null;
  slideshow.addEventListener("touchstart", (e) => {
    touchX = e.touches[0].clientX;
    clearInterval(timer);
  }, { passive: true });
  slideshow.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
    restart();
  }, { passive: true });

  show(0);
  restart();

  // Typing effect for the install command (starts when scrolled into view)
  const typeEl = document.getElementById("install-cmd");
  if (typeEl) {
    const command = typeEl.dataset.command || "";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let typed = false;
    const typeCommand = () => {
      if (typed) return;
      typed = true;
      if (reducedMotion || !command) {
        typeEl.textContent = command;
        return;
      }
      let i = 0;
      const tick = () => {
        i += 1;
        typeEl.textContent = command.slice(0, i);
        if (i < command.length) setTimeout(tick, 26 + Math.random() * 40);
      };
      tick();
    };
    if ("IntersectionObserver" in window) {
      const typer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              typeCommand();
              typer.disconnect();
            }
          });
        },
        { threshold: 0.3 }
      );
      typer.observe(typeEl);
    } else {
      typeCommand();
    }
  }

  // One-click copy for the install command
  const copyBtn = document.getElementById("copy-install");
  const installCmd = document.getElementById("install-cmd");
  if (copyBtn && installCmd) {
    copyBtn.addEventListener("click", async () => {
      const text = (installCmd.dataset.command || installCmd.textContent).trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        // Fallback for non-secure contexts / older browsers
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      const label = copyBtn.querySelector(".copy-btn-label");
      const original = label ? label.textContent : "Copy";
      copyBtn.classList.add("copied");
      if (label) label.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        if (label) label.textContent = original;
      }, 1600);
    });
  }
});

// Theme: apply persisted/system theme + wire up the toggle button
(function () {
  const STORAGE_KEY = "theme";
  const root = document.documentElement;

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function currentTheme() {
    return root.getAttribute("data-theme") || systemTheme();
  }

  function applyTheme(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
    const btn = document.querySelector(".theme-toggle");
    if (btn) {
      btn.textContent = theme === "light" ? "🌙" : "☀️";
      const label = theme === "light" ? "Switch to dark mode" : "Switch to light mode";
      btn.setAttribute("aria-label", label);
      btn.setAttribute("aria-pressed", String(theme === "light"));
      btn.title = label;
    }
  }

  // Follow system preference changes unless the visitor made an explicit choice
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  if (media && typeof media.addEventListener === "function") {
    media.addEventListener("change", (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) applyTheme(e.matches ? "light" : "dark");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(currentTheme());

    const navLinks = document.querySelector(".nav-links");
    if (!navLinks || document.querySelector(".theme-toggle")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.addEventListener("click", () => {
      const next = currentTheme() === "light" ? "dark" : "light";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (err) {
        /* private mode etc. — theme just won't persist */
      }
      applyTheme(next);
    });
    navLinks.insertAdjacentElement("afterend", btn);
    applyTheme(currentTheme());
  });
})();
