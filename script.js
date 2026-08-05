/* =========================================================
   Luque & Merino — Interactividad
   ========================================================= */
(function () {
  "use strict";

  /* ---- Año dinámico en el footer ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Sombra en la nav al hacer scroll ---- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("is-stuck", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Menú móvil ---- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("menu");
  function closeMenu() {
    if (!menu || !toggle) return;
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    });
    // Cerrar al pulsar un enlace
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    // Cerrar con Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---- Reveal al hacer scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---- Filtros de la galería ---- */
  var filters = document.querySelectorAll(".filter");
  var shots = document.querySelectorAll(".gallery .shot");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filters.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var f = btn.getAttribute("data-filter");
      shots.forEach(function (shot) {
        var show = f === "all" || shot.getAttribute("data-tag") === f;
        shot.classList.toggle("is-hidden", !show);
      });
    });
  });

  /* ---- Lightbox de la galería ---- */
  var lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.innerHTML =
    '<div class="lightbox__card" id="lbCard">' +
    '<button class="lightbox__close" aria-label="Cerrar">&times;</button>' +
    '<div class="lightbox__cap" id="lbCap"></div>' +
    "</div>";
  document.body.appendChild(lightbox);
  var lbCard = lightbox.querySelector("#lbCard");
  var lbCap = lightbox.querySelector("#lbCap");

  function openLightbox(shot) {
    var h = shot.style.getPropertyValue("--h");
    lbCard.style.background =
      "linear-gradient(160deg, hsl(" + h + " / .95), hsl(" + h + " / .6))";
    var cap = shot.querySelector("figcaption");
    lbCap.textContent = cap ? cap.textContent : "";
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  shots.forEach(function (shot) {
    shot.addEventListener("click", function () { openLightbox(shot); });
  });
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target.classList.contains("lightbox__close")) {
      closeLightbox();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });

  /* ---- Formulario → WhatsApp ---- */
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (document.getElementById("name") || {}).value || "";
      var phone = (document.getElementById("phone") || {}).value || "";
      var topic = (document.getElementById("topic") || {}).value || "";
      var msg = (document.getElementById("msg") || {}).value || "";

      if (!name.trim() || !phone.trim()) {
        form.reportValidity();
        return;
      }

      var text =
        "Hola Luque & Merino 👋\n" +
        "Soy " + name + ".\n" +
        "Me interesa: " + topic + ".\n" +
        (msg ? "Mensaje: " + msg + "\n" : "") +
        "Mi teléfono: " + phone;

      var url = "https://wa.me/34679381294?text=" + encodeURIComponent(text);
      window.open(url, "_blank", "noopener");
    });
  }
})();
