/* potaterrr.github.io — vanilla JS, no dependencies.
   Sections: year, reveals, blog slideshow, theme,
   FAB easter egg, contour background, rail scrollspy, project barrel,
   mobile tab bar, intro overlay, accessibility menu. Pipeline demos live in js/hiw.js. */

/* `.panel` only becomes a scroll container at >=1100px (see style.css); below
   that the window scrolls. Scrolling the panel element on mobile is a silent
   no-op, so every scroll must go through here instead. */
const desktopShell = window.matchMedia("(min-width: 1100px)");
const scrollRoot = () => (desktopShell.matches ? document.getElementById("main-content") : null);
const scrollToTarget = (target, behavior) => {
  if (!target) return;
  const root = scrollRoot();
  if (root) {
    const top =
      target.getBoundingClientRect().top + root.scrollTop - root.getBoundingClientRect().top;
    root.scrollTo({ top, behavior });
  } else {
    target.scrollIntoView({ behavior });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let motionPref = false;
  try { motionPref = localStorage.getItem("reduce-motion") === "1"; } catch (e) { /* noop */ }
  const stillMotion = reduceMotion || motionPref || document.documentElement.classList.contains("reduce-motion");
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

  /* ---------- Contour background (hero canvas) ---------- */
  const canvas = document.getElementById("contour");
  if (canvas && !stillMotion && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      let raf = null;
      let running = true;
      let last = 0;
      // Frame-rate governor: slow machines get a quieter canvas.
      let frameTimes = [];
      let lowPerf = false;
      const ACCENT = [240, 180, 41];
      const GREEN = [46, 168, 134];

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      };

      // Cheap pseudo-noise via layered sines (no library, no per-pixel math).
      const field = (x, y, t) =>
        Math.sin(x * 0.0032 + t * 0.28) +
        Math.sin(y * 0.0041 - t * 0.21) +
        Math.sin((x + y) * 0.0018 + t * 0.15) +
        Math.sin(Math.hypot(x - canvas.width * 0.7, y - canvas.height * 0.3) * 0.0025 - t * 0.3);

      const draw = (ts) => {
        raf = requestAnimationFrame(draw);
        const t = ts / 1000;
        if (t - last < (lowPerf ? 0.1 : 0.05)) return; // cap ~20/10 fps
        const dt = t - last;
        last = t;

        if (!lowPerf) {
          frameTimes.push(dt);
          if (frameTimes.length > 40) {
            const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            if (avg > 0.06) lowPerf = true; // < ~16 fps sustained: step down
            frameTimes = [];
          }
        }

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = Math.max(1, w * 0.0012);

        const rows = lowPerf ? 7 : 11;
        const step = h / rows;
        for (let r = 0; r <= rows; r++) {
          const y0 = r * step;
          const color = r % 3 === 0 ? GREEN : ACCENT;
          ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${lowPerf ? 0.05 : 0.07})`;
          ctx.beginPath();
          for (let x = 0; x <= w; x += Math.max(6, w / 160)) {
            const n = field(x, y0, t);
            const y = y0 + n * step * 0.42;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      };

      const start = () => {
        if (raf === null && running) raf = requestAnimationFrame(draw);
      };
      const stop = () => {
        if (raf !== null) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      };

      resize();
      window.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", () => {
        running = !document.hidden;
        if (running) start(); else stop();
      });

      // Only animate while the hero is on screen.
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(
          (entries) => {
            running = entries[0].isIntersecting && !document.hidden;
            if (running) start(); else stop();
          },
          { threshold: 0 }
        ).observe(canvas);
      } else {
        start();
      }
      start();
    }
  }

  /* ---------- Rail scrollspy + tab-bar active state ---------- */
  const spyRoot = scrollRoot();
  const spyOptions = spyRoot
    ? { root: spyRoot, rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    : { rootMargin: "-35% 0px -55% 0px", threshold: 0 };

  const sectionIds = ["top", "projects", "skills", "work-with-me", "contact"];
  const railLinks = new Map();
  document.querySelectorAll(".rail-nav a[data-section]").forEach((a) => {
    railLinks.set(a.dataset.section, a);
  });
  const tabLinks = new Map();
  document.querySelectorAll(".tabbar a[href^='#']").forEach((a) => {
    tabLinks.set(a.getAttribute("href").slice(1), a);
  });

  const setActive = (id) => {
    railLinks.forEach((link, key) => {
      const on = key === id;
      link.classList.toggle("active", on);
      if (on) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    tabLinks.forEach((link, key) => {
      const on = key === id;
      link.classList.toggle("active", on);
      if (on) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };
  setActive("top");

  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, spyOptions);
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* ---------- Smooth in-panel anchor scrolling ---------- */
  const scrollToId = (id) => {
    scrollToTarget(document.getElementById(id), reduceMotion ? "auto" : "smooth");
  };

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const id = link.getAttribute("href").slice(1);
    if (!id || !document.getElementById(id)) return;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToId(id);
      history.replaceState(null, "", `#${id}`);
    });
  });

  /* ---------- Project barrel carousel ---------- */
  const barrel = document.getElementById("project-barrel");
  if (barrel) {
    const ring = barrel.querySelector(".barrel-ring");
    const slides = Array.from(ring ? ring.children : []);
    const dotsWrap = document.getElementById("barrel-dots");
    const prevBtn = document.getElementById("barrel-prev");
    const nextBtn = document.getElementById("barrel-next");

    if (ring && slides.length && dotsWrap) {
      const n = slides.length;
      let index = 0;

      const show = (i, animate = true) => {
        index = (i + n) % n;
        slides.forEach((s, j) => {
          s.classList.toggle("is-front", j === index);
          s.classList.remove("is-enter");
        });
        if (animate) {
          const front = slides[index];
          void front.offsetWidth;
          front.classList.add("is-enter");
        }
        dotsWrap.querySelectorAll("button").forEach((d, j) => {
          d.classList.toggle("active", j === index);
          if (j === index) d.setAttribute("aria-current", "true");
          else d.removeAttribute("aria-current");
        });
      };

      const dots = slides.map((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Go to project ${i + 1}`);
        dot.addEventListener("click", () => show(i));
        dotsWrap.appendChild(dot);
        return dot;
      });

      slides.forEach((slide, i) => {
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", "slide");
        slide.setAttribute("aria-label", `${i + 1} of ${slides.length}`);
      });

      prevBtn?.addEventListener("click", () => show(index - 1));
      nextBtn?.addEventListener("click", () => show(index + 1));

      barrel.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") show(index - 1);
        if (e.key === "ArrowRight") show(index + 1);
      });

      let dragX = null;
      barrel.addEventListener("pointerdown", (e) => {
        dragX = e.clientX;
      });
      window.addEventListener("pointerup", (e) => {
        if (dragX === null) return;
        const dx = e.clientX - dragX;
        if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
        dragX = null;
      });

      show(0, false);
    }
  }

  /* ---------- Mobile tab bar: hide on scroll down, show on scroll up ---------- */
  const tabbar = document.querySelector(".tabbar");
  if (tabbar) {
    let lastY = window.scrollY;
    let goingDown = false;
    let heroCtaVisible = false;
    const heroCta = document.querySelector(".hero-cta");

    const applyTabbarState = () => {
      tabbar.classList.toggle("tabbar-hidden", heroCtaVisible || goingDown);
    };

    const onScroll = () => {
      const y = window.scrollY;
      goingDown = y > lastY && y > 120;
      lastY = y;
      applyTabbarState();
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    /* The fixed bar would otherwise cover the hero CTA at the top of the
       page. Keep it out of the way until the CTA has scrolled past. */
    if (heroCta && "IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        heroCtaVisible = entry.isIntersecting;
        applyTabbarState();
      }, { threshold: 0.01 }).observe(heroCta);
    }
  }

  /* ---------- Blog slideshow ---------- */
  const slideshow = document.getElementById("blog-slideshow");
  if (slideshow) {
    const slides = Array.from(slideshow.querySelectorAll(".slide"));
    const dotsWrap = slideshow.querySelector(".ss-dots");
    const prevBtn = slideshow.querySelector(".ss-prev");
    const nextBtn = slideshow.querySelector(".ss-next");
    if (slides.length && dotsWrap) {
      let index = 0;
      let timer = null;
      const AUTO_MS = 6000;

      const dots = slides.map((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Go to post ${i + 1}`);
        dot.addEventListener("click", () => {
          show(i);
          restart();
        });
        dotsWrap.appendChild(dot);
        return dot;
      });

      slides.forEach((slide, i) => {
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", "slide");
        slide.setAttribute("aria-label", `${i + 1} of ${slides.length}`);
      });

      function show(next) {
        index = (next + slides.length) % slides.length;
        slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
        dots.forEach((dot, i) => {
          dot.classList.toggle("active", i === index);
          if (i === index) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      }

      function restart() {
        clearInterval(timer);
        if (stillMotion) return;
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
    }
  }

  /* ---------- Bento projects reel (cycling project names) ---------- */
  const reelEl = document.querySelector("[data-reel]");
  if (reelEl && !stillMotion) {
    const names = ["scrapers", "voice agents", "signal engines", "LLM pipelines", "webhooks"];
    let ri = 0;
    setInterval(() => {
      reelEl.classList.add("swap");
      setTimeout(() => {
        ri = (ri + 1) % names.length;
        reelEl.textContent = names[ri];
        reelEl.classList.remove("swap");
      }, 180);
    }, 2600);
  }
});

/* ---------- Intro boot overlay (once per session, skipped for a week) ---------- */
(function () {
  const intro = document.getElementById("intro");
  if (!intro) return;
  const INTRO_KEY = "intro-seen-at";
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let motionSaved = false;
  try { motionSaved = localStorage.getItem("reduce-motion") === "1"; } catch (e) { /* noop */ }
  let recentlySeen = false;
  try {
    const at = Number(localStorage.getItem(INTRO_KEY)) || 0;
    recentlySeen = Date.now() - at < WEEK;
  } catch (e) { /* private mode — just play it */ }

  const finish = () => {
    intro.classList.add("intro-done");
    document.body.classList.remove("intro-lock");
    try { localStorage.setItem(INTRO_KEY, String(Date.now())); } catch (e) { /* noop */ }
    setTimeout(() => intro.remove(), 600);
  };

  if (reduce || motionSaved || recentlySeen) {
    intro.remove();
    return;
  }
  document.body.classList.add("intro-lock");
  setTimeout(finish, 900);
  intro.addEventListener("click", finish);
})();

/* ---------- Reading progress + "on this page" (long-form pages) ---------- */
(function () {
  const postBody = document.querySelector(".post-body");
  if (!postBody) return;

  const bar = document.querySelector(".post-progress-fill");
  if (bar) {
    let ticking = false;
    const update = () => {
      const rect = postBody.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      bar.style.width = (progress * 100).toFixed(2) + "%";
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    const panel = document.getElementById("main-content");
    window.addEventListener("scroll", onScroll, { passive: true });
    if (panel) panel.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  const toc = document.querySelector(".post-toc");
  const tocList = toc ? toc.querySelector("ol") : null;
  if (!toc || !tocList) return;

  const narrow = window.matchMedia("(max-width: 720px)");
  if (toc.tagName === "DETAILS" && narrow.matches) toc.removeAttribute("open");

  const headings = Array.from(postBody.querySelectorAll("h2"));
  if (headings.length < 2) {
    toc.hidden = true;
    return;
  }
  headings.forEach((heading, i) => {
    if (!heading.id) heading.id = "section-" + (i + 1);
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#" + heading.id;
    link.textContent = heading.textContent.trim();
    if (toc.tagName === "DETAILS") {
      link.addEventListener("click", () => {
        if (narrow.matches) toc.removeAttribute("open");
      });
    }
    item.appendChild(link);
    tocList.appendChild(item);
  });
})();

/* ---------- Theme: apply persisted/system theme + wire up toggles ---------- */
(function () {
  const STORAGE_KEY = "theme";
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.textContent = theme === "light" ? "🌙" : "☀️";
      const label = theme === "light" ? "Switch to dark mode" : "Switch to light mode";
      btn.setAttribute("aria-label", label);
      btn.setAttribute("aria-pressed", String(theme === "light"));
      btn.title = label;
    });
  }

  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  if (media && typeof media.addEventListener === "function") {
    media.addEventListener("change", (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) applyTheme(e.matches ? "light" : "dark");
    });
  }

  function flipTheme() {
    const next = currentTheme() === "light" ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      /* private mode etc. — theme just won't persist */
    }
    applyTheme(next);
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(currentTheme());

    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.addEventListener("click", flipTheme);
    });

    // Keep legacy nav behavior if a .nav-links exists (blog pages).
    const navLinks = document.querySelector(".nav-links");
    if (navLinks && !document.querySelector(".nav .theme-toggle")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-toggle";
      btn.addEventListener("click", flipTheme);
      navLinks.insertAdjacentElement("afterend", btn);
      applyTheme(currentTheme());
    }

    // Easter egg: double-tap/double-click the potato FAB to flip the theme.
    // A confirmed single tap scrolls to the contact section after a short
    // wait, so the first tap of a double-tap doesn't navigate.
    const fab = document.querySelector(".potato-fab");
    if (fab) {
      let lastTap = 0;
      let singleTimer = null;
      fab.addEventListener("click", (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - lastTap < 400) {
          clearTimeout(singleTimer);
          lastTap = 0;
          fab.classList.remove("fab-spin");
          void fab.offsetWidth; // restart the animation
          fab.classList.add("fab-spin");
          flipTheme();
        } else {
          lastTap = now;
          clearTimeout(singleTimer);
          singleTimer = setTimeout(() => {
            const id = (fab.getAttribute("href") || "#contact").slice(1);
            const target = document.getElementById(id);
            if (target) scrollToTarget(target, reduce ? "auto" : "smooth");
            else window.location.hash = `#${id}`;
          }, 400);
        }
      });
    }

    /* ---------- Accessibility menu ---------- */
    const triggers = document.querySelectorAll(".a11y-trigger");
    const menu = document.getElementById("a11y-menu");
    if (triggers.length && menu) {
      const MOTION_KEY = "reduce-motion";
      const FONT_KEY = "font-scale";
      const motionBtn = document.getElementById("a11y-motion");
      const fontValue = document.getElementById("a11y-font-value");
      const fontMinus = document.getElementById("a11y-font-minus");
      const fontPlus = document.getElementById("a11y-font-plus");
      let scale = 1;
      try { scale = parseFloat(localStorage.getItem(FONT_KEY)) || 1; } catch (e) { /* noop */ }
      scale = Math.min(1.4, Math.max(0.85, scale));

      const applyFont = () => {
        root.style.setProperty("--font-scale", String(scale));
        if (fontValue) fontValue.textContent = `${Math.round(scale * 100)}%`;
        try { localStorage.setItem(FONT_KEY, String(scale)); } catch (e) { /* noop */ }
      };

      let motionOn = root.classList.contains("reduce-motion");
      try { motionOn = localStorage.getItem(MOTION_KEY) === "1"; } catch (e) { /* noop */ }
      const applyMotion = () => {
        root.classList.toggle("reduce-motion", motionOn);
        if (motionBtn) motionBtn.setAttribute("aria-checked", String(motionOn));
        try { localStorage.setItem(MOTION_KEY, motionOn ? "1" : "0"); } catch (e) { /* noop */ }
      };

      applyFont();
      applyMotion();

      const toggleMenu = (force) => {
        const open = typeof force === "boolean" ? force : menu.hidden;
        menu.hidden = !open;
        triggers.forEach((t) => t.setAttribute("aria-expanded", String(open)));
      };

      triggers.forEach((t) =>
        t.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleMenu();
        })
      );
      document.addEventListener("click", (e) => {
        if (!menu.hidden && !menu.contains(e.target)) toggleMenu(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !menu.hidden) toggleMenu(false);
      });

      motionBtn?.addEventListener("click", () => {
        motionOn = !motionOn;
        applyMotion();
      });
      fontMinus?.addEventListener("click", () => {
        scale = Math.max(0.85, Math.round((scale - 0.05) * 100) / 100);
        applyFont();
      });
      fontPlus?.addEventListener("click", () => {
        scale = Math.min(1.4, Math.round((scale + 0.05) * 100) / 100);
        applyFont();
      });
    }
  });
})();
