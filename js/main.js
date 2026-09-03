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

  const toast = document.getElementById("toast");
  let toastTimer;
  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  };

  const discordCard = document.getElementById("discord-card");
  if (discordCard) {
    discordCard.addEventListener("click", async (event) => {
      const username = document.getElementById("discord-copy-value")?.textContent.trim() || "potaterrr";
      try {
        await navigator.clipboard.writeText(username);
        showToast(`Copied "${username}" to clipboard`);
      } catch {
        showToast(`Discord: ${username}`);
      }
      if (event.detail > 1 || event.altKey) return;
      window.open(
        `https://discord.com/users/${discordCard.dataset.userId}`,
        "_blank",
        "noopener"
      );
    });
  }

  // Floating Action Button for Contact
  // Discord button in FAB panel
  if (discordFab) {
    discordFab.addEventListener("click", async (event) => {
      const username = document.getElementById("discord-copy-value-fab")?.textContent.trim() || "potaterrr";
      try {
        await navigator.clipboard.writeText(username);
        showToast(`Copied "${username}" to clipboard`);
      } catch {
        showToast(`Discord: ${username}`);
      }
      if (event.detail > 1 || event.altKey) return;
      window.open(
        `https://discord.com/users/684383261744431104`,
        "_blank",
        "noopener"
      );
    });
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
});
