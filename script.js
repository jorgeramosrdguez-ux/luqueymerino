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

  /* ---- Menú lateral (móvil) ---- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("menu");
  var backdrop = document.getElementById("navBackdrop");

  function openMenu() {
    if (!menu || !toggle) return;
    menu.classList.add("is-open");
    document.body.classList.add("menu-open");
    if (backdrop) backdrop.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar menú");
  }
  function closeMenu() {
    if (!menu || !toggle) return;
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    if (backdrop) backdrop.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) closeMenu();
      else openMenu();
    });
    if (backdrop) backdrop.addEventListener("click", closeMenu);
    // Cerrar al pulsar un enlace del menú
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

  /* ---- Catálogo: buscador + filtro por categoría ---- */
  var catFilters = document.querySelectorAll(".cat-filters .filter");
  var catItems = document.querySelectorAll("#catalog .product");
  var searchInput = document.getElementById("catSearch");
  var noResults = document.getElementById("noResults");
  var activeFilter = "all";

  function refreshCatalog() {
    var q = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var anyVisible = false;
    catItems.forEach(function (item) {
      var okCat = activeFilter === "all" || item.getAttribute("data-cat") === activeFilter;
      var okSearch = q === "" || item.textContent.toLowerCase().indexOf(q) >= 0;
      var show = okCat && okSearch;
      item.classList.toggle("is-hidden", !show);
      if (show) anyVisible = true;
    });
    if (noResults) noResults.hidden = anyVisible || catItems.length === 0;
  }

  function setFilter(f) {
    activeFilter = f;
    catFilters.forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-filter") === f);
    });
    refreshCatalog();
  }

  // Botones de filtro dentro del catálogo
  catFilters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setFilter(btn.getAttribute("data-filter"));
    });
  });

  // Buscador en vivo
  if (searchInput) {
    searchInput.addEventListener("input", refreshCatalog);
  }

  // Accesos directos (tarjetas de categoría y menú) que filtran el catálogo
  document.querySelectorAll("[data-cat-filter]").forEach(function (el) {
    el.addEventListener("click", function () {
      setFilter(el.getAttribute("data-cat-filter"));
    });
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
