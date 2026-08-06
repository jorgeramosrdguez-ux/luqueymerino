/* =========================================================
   Luque & Merino — Panel de administración
   ========================================================= */
(function () {
  "use strict";

  var cfg = window.LYM_SUPABASE || {};
  var TABLE = cfg.table || "lym_products";
  var CATS = "lym_categories";

  // Si la librería de Supabase no cargó (sin conexión, CDN bloqueado…),
  // avisamos en lugar de romper la página.
  if (!window.supabase || !cfg.url) {
    var lm = document.getElementById("loginMsg");
    if (lm) lm.textContent = "No se pudo conectar con el servidor. Revisa tu conexión y recarga la página.";
    var lb = document.getElementById("loginBtn");
    if (lb) lb.disabled = true;
    return;
  }
  var sb = window.supabase.createClient(cfg.url, cfg.key);

  var el = function (id) { return document.getElementById(id); };
  var state = { products: [], categories: [], filterCat: "all", search: "" };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function slugify(s) {
    return String(s || "").toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function catLabel(slug) {
    var c = state.categories.find(function (x) { return x.slug === slug; });
    return c ? c.label : (window.LYM_CATEGORIES && window.LYM_CATEGORIES[slug]) || slug || "—";
  }

  /* ============ AUTENTICACIÓN ============ */
  function showLogin() { el("loginView").classList.remove("hidden"); el("appView").classList.add("hidden"); }
  function showApp(user) {
    el("loginView").classList.add("hidden");
    el("appView").classList.remove("hidden");
    el("userEmail").textContent = user && user.email ? user.email : "";
    loadAll();
  }

  sb.auth.getSession().then(function (res) {
    if (res.data && res.data.session) showApp(res.data.session.user);
    else showLogin();
  });

  el("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = el("loginMsg"); msg.textContent = ""; msg.className = "msg msg--err";
    var btn = el("loginBtn"); btn.disabled = true; btn.textContent = "Entrando…";
    sb.auth.signInWithPassword({
      email: el("email").value.trim(),
      password: el("password").value
    }).then(function (res) {
      btn.disabled = false; btn.textContent = "Entrar";
      if (res.error) {
        msg.textContent = /invalid login/i.test(res.error.message)
          ? "Correo o contraseña incorrectos."
          : res.error.message;
        return;
      }
      showApp(res.data.user);
    });
  });

  el("logoutBtn").addEventListener("click", function () {
    sb.auth.signOut().then(function () { location.reload(); });
  });

  /* ============ CARGA DE DATOS ============ */
  function loadAll() {
    Promise.all([
      sb.from(CATS).select("*").order("sort_order", { ascending: true }),
      sb.from(TABLE).select("*").order("sort_order", { ascending: true })
    ]).then(function (r) {
      state.categories = (r[0] && r[0].data) || [];
      if (r[1] && r[1].error) { alert("Error cargando productos: " + r[1].error.message); return; }
      state.products = (r[1] && r[1].data) || [];
      fillCategorySelect();
      renderCatbar();
      renderList();
    });
  }

  function fillCategorySelect() {
    var sel = el("pcategory");
    sel.innerHTML = state.categories.map(function (c) {
      return '<option value="' + esc(c.slug) + '">' + esc(c.label) + '</option>';
    }).join("");

    var img = el("pimage");
    img.innerHTML = (window.LYM_IMAGES || []).map(function (f) {
      return '<option value="' + esc(f) + '">' + esc(f) + '</option>';
    }).join("");
  }

  /* ============ BARRA DE CATEGORÍAS ============ */
  function renderCatbar() {
    var bar = el("catbar");
    var counts = {}; state.products.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var html = '<button class="cpill' + (state.filterCat === "all" ? " is-active" : "") +
      '" data-cat="all">Todos <span class="n">' + state.products.length + '</span></button>';
    state.categories.forEach(function (c) {
      html += '<button class="cpill' + (state.filterCat === c.slug ? " is-active" : "") +
        '" data-cat="' + esc(c.slug) + '">' + esc(c.label) +
        ' <span class="n">' + (counts[c.slug] || 0) + '</span></button>';
    });
    bar.innerHTML = html;
    bar.querySelectorAll(".cpill").forEach(function (b) {
      b.addEventListener("click", function () {
        state.filterCat = b.getAttribute("data-cat");
        renderCatbar(); renderList();
      });
    });
  }

  /* ============ LISTADO DE PRODUCTOS ============ */
  function renderList() {
    var wrap = el("list");
    var q = state.search.trim().toLowerCase();
    var items = state.products.filter(function (p) {
      var okCat = state.filterCat === "all" || p.category === state.filterCat;
      var okSearch = !q || ((p.name || "") + " " + (p.description || "")).toLowerCase().indexOf(q) >= 0;
      return okCat && okSearch;
    });
    el("count").textContent = items.length + " producto" + (items.length === 1 ? "" : "s");
    el("empty").classList.toggle("hidden", state.products.length !== 0);

    wrap.innerHTML = items.map(function (p) {
      var tags = "";
      if (p.is_featured) tags += '<span class="tag tag--offer">⭐ Destacado</span>';
      if (p.is_offer) tags += '<span class="tag tag--offer">🏷️ Oferta' + (p.discount_pct ? " -" + esc(p.discount_pct) + "%" : "") + '</span>';
      if (!p.active) tags += '<span class="tag tag--off">Oculto</span>';
      var price = (p.is_offer && p.old_price)
        ? '<span class="card__old">' + esc(p.old_price) + '</span>' + esc(p.price)
        : esc(p.price);
      return '' +
        '<article class="card' + (p.active ? "" : " is-off") + '">' +
          '<div class="card__img"><img src="img/' + esc(p.image || "cama.svg") + '" alt="" /></div>' +
          '<div class="card__body">' +
            '<span class="card__cat">' + esc(catLabel(p.category)) + '</span>' +
            '<h3 class="card__name">' + esc(p.name) + '</h3>' +
            '<p class="card__desc">' + esc(p.description || "") + '</p>' +
            '<div class="tags">' + tags + '</div>' +
            '<div class="card__price">' + price + '</div>' +
            '<div class="card__actions" style="margin-top:8px">' +
              '<button class="btn btn--ghost btn--sm" data-edit="' + esc(p.id) + '">✎ Editar</button>' +
              '<button class="btn btn--danger btn--sm" data-del="' + esc(p.id) + '">🗑 Eliminar</button>' +
            '</div>' +
          '</div>' +
        '</article>';
    }).join("");

    wrap.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openForm(b.getAttribute("data-edit")); });
    });
    wrap.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { removeProduct(b.getAttribute("data-del")); });
    });
  }

  el("search").addEventListener("input", function () { state.search = this.value; renderList(); });

  /* ============ FORMULARIO (alta / edición) ============ */
  function toggleOffer() { el("offerFields").classList.toggle("hidden", !el("poffer").checked); }
  el("poffer").addEventListener("change", toggleOffer);

  function openForm(id) {
    el("formMsg").textContent = "";
    var p = id ? state.products.find(function (x) { return String(x.id) === String(id); }) : null;
    el("modalTitle").textContent = p ? "Editar producto" : "Nuevo producto";
    el("pid").value = p ? p.id : "";
    el("pname").value = p ? p.name : "";
    fillCategorySelect();
    el("pcategory").value = p ? p.category : (state.categories[0] && state.categories[0].slug) || "";
    el("pimage").value = p ? (p.image || "cama.svg") : "cama.svg";
    el("pdesc").value = p ? (p.description || "") : "";
    el("pprice").value = p ? (p.price || "") : "";
    el("porder").value = p ? (p.sort_order != null ? p.sort_order : 100) : 100;
    el("pactive").checked = p ? !!p.active : true;
    el("pfeatured").checked = p ? !!p.is_featured : false;
    el("poffer").checked = p ? !!p.is_offer : false;
    el("pdiscount").value = p && p.discount_pct != null ? p.discount_pct : "";
    el("poldprice").value = p ? (p.old_price || "") : "";
    toggleOffer();
    el("overlay").classList.remove("hidden");
  }
  function closeForm() { el("overlay").classList.add("hidden"); }

  el("addBtn").addEventListener("click", function () { openForm(null); });
  el("cancelBtn").addEventListener("click", closeForm);
  el("overlay").addEventListener("click", function (e) { if (e.target === el("overlay")) closeForm(); });

  el("productForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = el("formMsg"); msg.textContent = "";
    var name = el("pname").value.trim();
    if (!name) { msg.textContent = "El nombre es obligatorio."; return; }

    var isOffer = el("poffer").checked;
    var payload = {
      name: name,
      category: el("pcategory").value,
      image: el("pimage").value,
      description: el("pdesc").value.trim(),
      price: el("pprice").value.trim(),
      sort_order: parseInt(el("porder").value, 10) || 100,
      active: el("pactive").checked,
      is_featured: el("pfeatured").checked,
      is_offer: isOffer,
      discount_pct: isOffer && el("pdiscount").value ? parseInt(el("pdiscount").value, 10) : null,
      old_price: isOffer ? el("poldprice").value.trim() || null : null
    };

    var btn = el("saveBtn"); btn.disabled = true; btn.textContent = "Guardando…";
    var id = el("pid").value;
    var op = id
      ? sb.from(TABLE).update(payload).eq("id", id)
      : sb.from(TABLE).insert(payload);

    op.then(function (res) {
      btn.disabled = false; btn.textContent = "Guardar";
      if (res.error) { msg.textContent = "No se pudo guardar: " + res.error.message; return; }
      closeForm(); loadAll();
    });
  });

  function removeProduct(id) {
    var p = state.products.find(function (x) { return String(x.id) === String(id); });
    if (!confirm('¿Eliminar "' + (p ? p.name : "este producto") + '"?\nEsta acción no se puede deshacer.')) return;
    sb.from(TABLE).delete().eq("id", id).then(function (res) {
      if (res.error) { alert("No se pudo eliminar: " + res.error.message); return; }
      loadAll();
    });
  }

  /* ============ AÑADIR CATEGORÍA ============ */
  el("addCatBtn").addEventListener("click", function () {
    var label = prompt("Nombre de la nueva categoría (ej. Alfombras):");
    if (!label) return;
    label = label.trim(); if (!label) return;
    var slug = slugify(label);
    if (!slug) { alert("Nombre no válido."); return; }
    if (state.categories.some(function (c) { return c.slug === slug; })) {
      alert("Esa categoría ya existe."); return;
    }
    var maxOrder = state.categories.reduce(function (m, c) { return Math.max(m, c.sort_order || 0); }, 0);
    sb.from(CATS).insert({ slug: slug, label: label, sort_order: maxOrder + 10 }).then(function (res) {
      if (res.error) { alert("No se pudo crear la categoría: " + res.error.message); return; }
      loadAll();
    });
  });

})();
