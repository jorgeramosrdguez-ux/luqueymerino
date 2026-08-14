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

  var BUCKET = "lym-images";
  var el = function (id) { return document.getElementById(id); };
  var state = { products: [], categories: [], settings: {}, filterCat: "all", search: "" };

  // Las fotos subidas se guardan como URL completa; las ilustraciones, como
  // nombre de archivo dentro de img/.
  function imgSrc(v) {
    if (!v) return "img/cama.svg";
    return /^https?:\/\//.test(v) ? v : "img/" + v;
  }

  // Sube un archivo al almacén y devuelve su URL pública.
  function uploadImage(file) {
    var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    var path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return sb.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      });
  }

  // Imágenes grandes de la página principal que el cliente puede cambiar.
  var SITE_IMAGES = [
    { key: "img_curtains",   title: "Cortinas y estores a medida", desc: "Foto grande de la sección del servicio estrella." },
    { key: "img_embroidery", title: "Bordado personalizado",       desc: "Foto de la sección de bordados." },
    { key: "img_store",      title: "La tienda",                   desc: "Foto del escaparate o interior en “Sobre nosotros”." }
  ];

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

  // Convierte lo que se escribe (32.90, 32,90, "32,90 €"…) a número.
  // Si no es numérico (p. ej. "Presupuesto"), devuelve null.
  function parsePrice(str) {
    if (str == null) return null;
    var s = String(str).replace(/[€\s]/g, "").trim();
    if (!s || !/[0-9]/.test(s)) return null;
    if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0) {
      s = s.replace(/\./g, "").replace(",", ".");   // 1.234,56 → 1234.56
    } else if (s.indexOf(",") >= 0) {
      s = s.replace(",", ".");                        // 32,90 → 32.90
    }
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  // Formatea un número como euros españoles: 32.9 → "32,90 €"
  function formatEuro(n) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency", currency: "EUR",
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(n);
  }
  // Deja el precio "normal" bien formateado (o tal cual si es texto tipo "Presupuesto").
  function normalizePrice(str) {
    var n = parsePrice(str);
    return n != null ? formatEuro(n) : String(str || "").trim();
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

  /* ============ PESTAÑAS ============ */
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      var name = t.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("is-active", x === t); });
      ["products", "categories", "site"].forEach(function (n) {
        el("tab-" + n).classList.toggle("hidden", n !== name);
      });
    });
  });

  /* ============ CARGA DE DATOS ============ */
  function loadAll() {
    Promise.all([
      sb.from(CATS).select("*").order("sort_order", { ascending: true }),
      sb.from(TABLE).select("*").order("sort_order", { ascending: true }),
      sb.from("lym_settings").select("*"),
      sb.from("lym_variants").select("*").order("sort_order", { ascending: true })
    ]).then(function (r) {
      state.categories = (r[0] && r[0].data) || [];
      if (r[1] && r[1].error) { alert("Error cargando productos: " + r[1].error.message); return; }
      state.products = (r[1] && r[1].data) || [];
      state.settings = {};
      ((r[2] && r[2].data) || []).forEach(function (s) { state.settings[s.key] = s.value; });
      state.variants = {};
      ((r[3] && r[3].data) || []).forEach(function (v) {
        (state.variants[v.product_id] = state.variants[v.product_id] || []).push(v);
      });
      fillCategorySelect();
      renderCatbar();
      renderList();
      renderCatList();
      renderSiteImages();
    });
  }

  function fillCategorySelect() {
    var sel = el("pcategory");
    sel.innerHTML = state.categories.map(function (c) {
      return '<option value="' + esc(c.slug) + '">' + esc(c.label) + '</option>';
    }).join("");

    var img = el("pimage");
    img.innerHTML = '<option value="">— o elige una ilustración —</option>' +
      (window.LYM_IMAGES || []).map(function (f) {
        return '<option value="' + esc(f) + '">' + esc(f).replace(".svg", "") + '</option>';
      }).join("");
  }

  /* ============ BARRA DE CATEGORÍAS ============ */
  function renderCatbar() {
    var bar = el("catbar");
    var counts = {}; state.products.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var nFeatured = state.products.filter(function (p) { return p.is_featured; }).length;
    var nOffers = state.products.filter(function (p) { return p.is_offer; }).length;

    function pill(key, label, n) {
      return '<button class="cpill' + (state.filterCat === key ? " is-active" : "") +
        '" data-cat="' + esc(key) + '">' + label + ' <span class="n">' + n + '</span></button>';
    }

    var html = pill("all", "Todos", state.products.length);
    html += pill("featured", "⭐ Destacados", nFeatured);
    html += pill("offers", "🏷️ Ofertas", nOffers);
    state.categories.forEach(function (c) {
      html += pill(c.slug, esc(c.label), counts[c.slug] || 0);
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
      var okCat;
      if (state.filterCat === "all") okCat = true;
      else if (state.filterCat === "featured") okCat = !!p.is_featured;
      else if (state.filterCat === "offers") okCat = !!p.is_offer;
      else okCat = p.category === state.filterCat;
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
          '<div class="card__img"><img src="' + esc(imgSrc(p.image)) + '" alt="" /></div>' +
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
  function toggleOffer() {
    el("offerFields").classList.toggle("hidden", !el("poffer").checked);
    updateOfferPreview();
  }
  el("poffer").addEventListener("change", toggleOffer);

  // Vista previa en vivo del cálculo de la oferta.
  function updateOfferPreview() {
    var box = el("offerPreview");
    if (!box) return;
    if (!el("poffer").checked) { box.textContent = ""; return; }
    var base = parsePrice(el("pprice").value);
    var pct = parseInt(el("pdiscount").value, 10);
    if (base == null) { box.textContent = "Escribe un precio numérico para calcular la oferta."; return; }
    if (!pct || pct <= 0) { box.textContent = "Precio normal: " + formatEuro(base) + " · escribe el % de descuento."; return; }
    var sale = base * (1 - pct / 100);
    box.innerHTML = "Antes <s>" + formatEuro(base) + "</s> → <strong>" + formatEuro(sale) + "</strong> (−" + pct + "%)";
  }
  el("pprice").addEventListener("input", updateOfferPreview);
  el("pdiscount").addEventListener("input", updateOfferPreview);

  // Imagen elegida para el producto (nombre de ilustración o URL subida)
  // junto con su encuadre: ajuste, tamaño y posición.
  var currentImage = "cama.svg";
  var frame = { fit: "cover", zoom: 100, x: 50, y: 50 };

  // Aplica el encuadre a una imagen (vale para el panel y para la web).
  function applyFrame(img, f) {
    img.style.objectFit = f.fit || "cover";
    img.style.objectPosition = (f.x == null ? 50 : f.x) + "% " + (f.y == null ? 50 : f.y) + "%";
    img.style.setProperty("--z", (f.zoom || 100) / 100);
    img.style.transform = "scale(" + (f.zoom || 100) / 100 + ")";
  }

  function refreshFramer() {
    applyFrame(el("pimgPrev"), frame);
    el("pzoom").value = frame.zoom;
    el("px").value = frame.x;
    el("py").value = frame.y;
    el("pfit").textContent = frame.fit === "contain" ? "🔲 Rellenar el hueco" : "🖼️ Ver foto completa";
  }

  function setImage(v) {
    currentImage = v || "cama.svg";
    el("pimgPrev").src = imgSrc(currentImage);
    var isUpload = /^https?:\/\//.test(currentImage);
    el("pimage").value = isUpload ? "" : currentImage;
    el("pimgHint").textContent = isUpload
      ? "Foto propia subida ✓ — ajústala con los controles de abajo."
      : "Puedes subir tu propia foto o elegir una ilustración.";
    // Las ilustraciones se ven mejor enteras; las fotos, rellenando.
    if (!isUpload) frame.fit = "contain";
    refreshFramer();
  }

  /* ---- Galería de fotos del producto ---- */
  var gallery = [];
  function renderGallery() {
    var box = el("pgallery");
    if (!gallery.length) { box.innerHTML = '<span class="gempty">Sin fotos adicionales.</span>'; return; }
    box.innerHTML = gallery.map(function (u, i) {
      return '<div class="gitem"><img src="' + esc(imgSrc(u)) + '" alt="" />' +
             '<button type="button" data-gdel="' + i + '" title="Quitar">×</button></div>';
    }).join("");
    box.querySelectorAll("[data-gdel]").forEach(function (b) {
      b.addEventListener("click", function () {
        gallery.splice(parseInt(b.getAttribute("data-gdel"), 10), 1);
        renderGallery();
      });
    });
  }
  el("pgalfile").addEventListener("change", function () {
    var files = Array.prototype.slice.call(this.files || []);
    if (!files.length) return;
    var hint = el("pgalHint");
    hint.textContent = "Subiendo " + files.length + " foto(s)…";
    Promise.all(files.map(uploadImage)).then(function (urls) {
      urls.forEach(function (u) { gallery.push(u); });
      renderGallery();
      hint.textContent = "Fotos añadidas ✓";
    }).catch(function (e) { hint.textContent = "No se pudo subir: " + (e.message || e); });
    this.value = "";
  });

  /* ---- Colores y medidas ---- */
  var variants = [];
  function renderVariants() {
    var box = el("pvariants");
    if (!variants.length) { box.innerHTML = '<span class="gempty">Sin colores ni medidas: se usa el precio general.</span>'; return; }
    box.innerHTML = variants.map(function (v, i) {
      return '<div class="vcard">' +
        '<div class="vcard__img">' +
          (v.image ? '<img src="' + esc(imgSrc(v.image)) + '" alt="" />' : '<span>sin foto</span>') +
        '</div>' +
        '<div class="vcard__fields">' +
          '<div class="vrow">' +
            '<input type="text" placeholder="Color (ej. Blanco)" value="' + esc(v.color || "") + '" data-vc="' + i + '" />' +
            '<input type="text" placeholder="Medida (ej. 150 cm)" value="' + esc(v.size || "") + '" data-vs="' + i + '" />' +
          '</div>' +
          '<div class="vrow">' +
            '<input type="text" placeholder="Precio (ej. 32,90)" value="' + esc(v.price || "") + '" data-vp="' + i + '" />' +
            '<label class="filebtn filebtn--mini">📷 Foto<input type="file" accept="image/*" data-vimg="' + i + '" /></label>' +
          '</div>' +
          '<p class="hint" data-vmsg="' + i + '"></p>' +
        '</div>' +
        '<button type="button" class="vcard__del" data-vdel="' + i + '" title="Quitar">×</button>' +
      '</div>';
    }).join("");

    [["vc", "color"], ["vs", "size"], ["vp", "price"]].forEach(function (pair) {
      box.querySelectorAll("[data-" + pair[0] + "]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          variants[parseInt(inp.getAttribute("data-" + pair[0]), 10)][pair[1]] = inp.value;
        });
      });
    });
    box.querySelectorAll("[data-vdel]").forEach(function (b) {
      b.addEventListener("click", function () {
        variants.splice(parseInt(b.getAttribute("data-vdel"), 10), 1);
        renderVariants();
      });
    });
    // Foto propia de cada color / medida
    box.querySelectorAll("[data-vimg]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var i = parseInt(inp.getAttribute("data-vimg"), 10);
        var file = inp.files && inp.files[0];
        if (!file) return;
        var msg = box.querySelector('[data-vmsg="' + i + '"]');
        msg.textContent = "Subiendo foto…";
        uploadImage(file).then(function (url) {
          variants[i].image = url;
          renderVariants();
        }).catch(function (e) { msg.textContent = "No se pudo subir: " + (e.message || e); });
      });
    });
  }
  el("paddvar").addEventListener("click", function () {
    variants.push({ color: "", size: "", price: "" });
    renderVariants();
  });

  ["pzoom", "px", "py"].forEach(function (id) {
    el(id).addEventListener("input", function () {
      frame.zoom = parseInt(el("pzoom").value, 10);
      frame.x = parseInt(el("px").value, 10);
      frame.y = parseInt(el("py").value, 10);
      applyFrame(el("pimgPrev"), frame);
    });
  });
  el("pcenter").addEventListener("click", function () {
    frame.zoom = 100; frame.x = 50; frame.y = 50;
    refreshFramer();
  });
  el("pfit").addEventListener("click", function () {
    frame.fit = frame.fit === "contain" ? "cover" : "contain";
    refreshFramer();
  });
  el("pimage").addEventListener("change", function () {
    if (this.value) setImage(this.value);
  });
  el("pfile").addEventListener("change", function () {
    var file = this.files && this.files[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      el("pimgHint").textContent = "La foto es muy grande (máx. 6 MB).";
      return;
    }
    el("pimgHint").textContent = "Subiendo foto…";
    uploadImage(file).then(function (url) {
      setImage(url);
    }).catch(function (e) {
      el("pimgHint").textContent = "No se pudo subir: " + (e.message || e);
    });
    this.value = "";
  });

  function openForm(id) {
    el("formMsg").textContent = "";
    var p = id ? state.products.find(function (x) { return String(x.id) === String(id); }) : null;
    el("modalTitle").textContent = p ? "Editar producto" : "Nuevo producto";
    el("pid").value = p ? p.id : "";
    el("pname").value = p ? p.name : "";
    fillCategorySelect();
    el("pcategory").value = p ? p.category : (state.categories[0] && state.categories[0].slug) || "";
    // Encuadre guardado (o valores por defecto para uno nuevo)
    frame = {
      fit: (p && p.img_fit) || "cover",
      zoom: (p && p.img_zoom) || 100,
      x: p && p.img_x != null ? p.img_x : 50,
      y: p && p.img_y != null ? p.img_y : 50
    };
    setImage(p ? (p.image || "cama.svg") : "cama.svg");

    // Galería y variantes del producto
    var g = p && p.gallery;
    if (typeof g === "string") { try { g = JSON.parse(g); } catch (e) { g = []; } }
    gallery = (g || []).slice();
    el("pgalHint").textContent = "";
    renderGallery();

    variants = (state.variants[p ? p.id : ""] || []).map(function (v) {
      return { color: v.color || "", size: v.size || "", price: v.price || "", image: v.image || null };
    });
    renderVariants();
    el("pdesc").value = p ? (p.description || "") : "";
    // El campo "precio normal" muestra siempre el precio SIN descuento.
    // En una oferta guardada, ese precio base es el "precio anterior".
    el("pprice").value = p ? ((p.is_offer && p.old_price) ? p.old_price : (p.price || "")) : "";
    el("porder").value = p ? (p.sort_order != null ? p.sort_order : 100) : 100;
    el("pactive").checked = p ? !!p.active : true;
    el("pfeatured").checked = p ? !!p.is_featured : false;
    el("poffer").checked = p ? !!p.is_offer : false;
    el("pdiscount").value = p && p.discount_pct != null ? p.discount_pct : "";
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
    var baseNum = parsePrice(el("pprice").value);
    var pct = el("pdiscount").value ? parseInt(el("pdiscount").value, 10) : null;

    // Precio "normal" siempre bien formateado (o texto tal cual, p. ej. "Presupuesto").
    var priceStr = normalizePrice(el("pprice").value);
    var oldStr = null, discount = null;

    if (isOffer) {
      if (baseNum == null) { msg.textContent = "Para una oferta, el precio debe ser un número (ej. 32,90)."; return; }
      if (!pct || pct <= 0 || pct >= 100) { msg.textContent = "Indica un descuento entre 1 y 99 %."; return; }
      // El precio anterior es el que había escrito; el nuevo se calcula solo.
      oldStr = formatEuro(baseNum);
      priceStr = formatEuro(baseNum * (1 - pct / 100));
      discount = pct;
    }

    // Las fotos de cada color/medida se suman también a las fotos
    // adicionales del producto, para que salgan en la galería.
    var fullGallery = gallery.slice();
    variants.forEach(function (v) {
      if (v.image && v.image !== currentImage && fullGallery.indexOf(v.image) < 0) {
        fullGallery.push(v.image);
      }
    });

    var payload = {
      name: name,
      category: el("pcategory").value,
      image: currentImage,
      gallery: fullGallery,
      img_fit: frame.fit,
      img_zoom: frame.zoom,
      img_x: frame.x,
      img_y: frame.y,
      description: el("pdesc").value.trim(),
      price: priceStr,
      sort_order: parseInt(el("porder").value, 10) || 100,
      active: el("pactive").checked,
      is_featured: el("pfeatured").checked,
      is_offer: isOffer,
      discount_pct: discount,
      old_price: oldStr
    };

    var btn = el("saveBtn"); btn.disabled = true; btn.textContent = "Guardando…";
    var id = el("pid").value;
    var op = id
      ? sb.from(TABLE).update(payload).eq("id", id)
      : sb.from(TABLE).insert(payload);

    if (!id) op = op.select();   // al crear, necesitamos el id para las variantes
    op.then(function (res) {
      if (res.error) throw res.error;
      var pid = id || (res.data && res.data[0] && res.data[0].id);
      if (!pid) return null;
      // Se reescriben las variantes del producto (borrar y volver a insertar):
      // son pocas líneas y así el orden queda tal cual se ve en el panel.
      return sb.from("lym_variants").delete().eq("product_id", pid).then(function () {
        var rows = variants
          .filter(function (v) { return (v.color || "").trim() || (v.size || "").trim(); })
          .map(function (v, i) {
            return {
              product_id: pid,
              color: (v.color || "").trim(),
              size: (v.size || "").trim(),
              price: normalizePrice(v.price),
              image: v.image || null,
              sort_order: (i + 1) * 10
            };
          });
        return rows.length ? sb.from("lym_variants").insert(rows) : null;
      });
    }).then(function (res) {
      btn.disabled = false; btn.textContent = "Guardar";
      if (res && res.error) { msg.textContent = "Producto guardado, pero fallaron los colores: " + res.error.message; return; }
      closeForm(); loadAll();
    }).catch(function (e) {
      btn.disabled = false; btn.textContent = "Guardar";
      msg.textContent = "No se pudo guardar: " + (e.message || e);
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

  /* ============ GESTIÓN DE CATEGORÍAS ============ */
  function renderCatList() {
    var wrap = el("catlist");
    if (!wrap) return;
    var counts = {}; state.products.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    if (!state.categories.length) {
      wrap.innerHTML = '<p class="empty">Aún no hay categorías. Pulsa “+ Nueva categoría”.</p>';
      return;
    }
    wrap.innerHTML = state.categories.map(function (c, i) {
      var n = counts[c.slug] || 0;
      return '<div class="crow">' +
        '<div class="gitem" style="flex:0 0 70px"><img data-cprev="' + esc(c.slug) + '" src="' + esc(imgSrc(c.image || "cama.svg")) + '" alt="" /></div>' +
        '<div style="flex:1;min-width:140px">' +
          '<div class="crow__name">' + esc(c.label) + '</div>' +
          '<div class="crow__n">' + n + ' producto' + (n === 1 ? "" : "s") + '</div>' +
        '</div>' +
        (c.image ? '<div style="flex:1 0 100%">' +
          '<div class="framer__row"><span>🔍 Tamaño</span><input type="range" min="100" max="250" value="' + (c.img_zoom || 100) + '" data-cz="' + esc(c.slug) + '" /></div>' +
          '<div class="framer__row"><span>↔️ Horizontal</span><input type="range" min="0" max="100" value="' + (c.img_x == null ? 50 : c.img_x) + '" data-cx="' + esc(c.slug) + '" /></div>' +
          '<div class="framer__row"><span>↕️ Vertical</span><input type="range" min="0" max="100" value="' + (c.img_y == null ? 50 : c.img_y) + '" data-cy="' + esc(c.slug) + '" /></div>' +
          '<button class="btn btn--primary btn--sm" style="width:100%;justify-content:center;margin-top:8px" data-csave="' + esc(c.slug) + '">Guardar encuadre</button>' +
        '</div>' : '') +
        '<div style="flex:1 0 100%;display:flex;gap:6px;flex-wrap:wrap">' +
          '<label class="filebtn" style="flex:1;min-width:130px">📷 Foto<input type="file" accept="image/*" data-cimg="' + esc(c.slug) + '" /></label>' +
          '<button class="btn btn--ghost btn--sm" data-cedit="' + esc(c.slug) + '">✎ Nombre</button>' +
          '<button class="btn btn--ghost btn--sm" data-cdesc="' + esc(c.slug) + '">✎ Texto</button>' +
          '<button class="btn btn--ghost btn--sm" data-up="' + esc(c.slug) + '"' + (i === 0 ? " disabled" : "") + '>↑</button>' +
          '<button class="btn btn--ghost btn--sm" data-down="' + esc(c.slug) + '"' + (i === state.categories.length - 1 ? " disabled" : "") + '>↓</button>' +
          '<button class="btn btn--danger btn--sm" data-cdel="' + esc(c.slug) + '">🗑</button>' +
        '</div>' +
        '<p class="hint" data-cmsg="' + esc(c.slug) + '" style="flex:1 0 100%"></p>' +
      '</div>';
    }).join("");

    wrap.querySelectorAll("[data-cimg]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var slug = inp.getAttribute("data-cimg");
        var file = inp.files && inp.files[0];
        if (!file) return;
        var msg = wrap.querySelector('[data-cmsg="' + slug + '"]');
        msg.textContent = "Subiendo foto…";
        uploadImage(file).then(function (url) {
          return sb.from(CATS).update({ image: url }).eq("slug", slug);
        }).then(function (res) {
          if (res && res.error) throw res.error;
          loadAll();
        }).catch(function (e) { msg.textContent = "No se pudo subir: " + (e.message || e); });
      });
    });

    // Encuadre de la foto de cada categoría (vista previa en vivo)
    state.categories.forEach(function (c) {
      var img = wrap.querySelector('[data-cprev="' + c.slug + '"]');
      if (c.image && img) applyFrame(img, { fit: "cover", zoom: c.img_zoom, x: c.img_x, y: c.img_y });
    });
    function catLive(slug) {
      var img = wrap.querySelector('[data-cprev="' + slug + '"]');
      if (!img) return;
      applyFrame(img, {
        fit: "cover",
        zoom: parseInt(wrap.querySelector('[data-cz="' + slug + '"]').value, 10),
        x: parseInt(wrap.querySelector('[data-cx="' + slug + '"]').value, 10),
        y: parseInt(wrap.querySelector('[data-cy="' + slug + '"]').value, 10)
      });
    }
    ["cz", "cx", "cy"].forEach(function (attr) {
      wrap.querySelectorAll("[data-" + attr + "]").forEach(function (r) {
        r.addEventListener("input", function () { catLive(r.getAttribute("data-" + attr)); });
      });
    });
    wrap.querySelectorAll("[data-csave]").forEach(function (b) {
      b.addEventListener("click", function () {
        var slug = b.getAttribute("data-csave");
        var msg = wrap.querySelector('[data-cmsg="' + slug + '"]');
        msg.textContent = "Guardando…";
        sb.from(CATS).update({
          img_zoom: parseInt(wrap.querySelector('[data-cz="' + slug + '"]').value, 10),
          img_x: parseInt(wrap.querySelector('[data-cx="' + slug + '"]').value, 10),
          img_y: parseInt(wrap.querySelector('[data-cy="' + slug + '"]').value, 10)
        }).eq("slug", slug).then(function (res) {
          if (res.error) { msg.textContent = "No se pudo guardar: " + res.error.message; return; }
          msg.textContent = "Encuadre guardado ✓";
          loadAll();
        });
      });
    });

    wrap.querySelectorAll("[data-cdesc]").forEach(function (b) {
      b.addEventListener("click", function () {
        var slug = b.getAttribute("data-cdesc");
        var c = state.categories.find(function (x) { return x.slug === slug; });
        var d = prompt("Texto que se ve bajo el nombre de la categoría:", (c && c.description) || "");
        if (d === null) return;
        sb.from(CATS).update({ description: d.trim() }).eq("slug", slug).then(function (res) {
          if (res.error) { alert("No se pudo guardar: " + res.error.message); return; }
          loadAll();
        });
      });
    });

    wrap.querySelectorAll("[data-cedit]").forEach(function (b) {
      b.addEventListener("click", function () { renameCategory(b.getAttribute("data-cedit")); });
    });
    wrap.querySelectorAll("[data-cdel]").forEach(function (b) {
      b.addEventListener("click", function () { deleteCategory(b.getAttribute("data-cdel")); });
    });
    wrap.querySelectorAll("[data-up]").forEach(function (b) {
      b.addEventListener("click", function () { moveCategory(b.getAttribute("data-up"), -1); });
    });
    wrap.querySelectorAll("[data-down]").forEach(function (b) {
      b.addEventListener("click", function () { moveCategory(b.getAttribute("data-down"), 1); });
    });
  }

  function renameCategory(slug) {
    var c = state.categories.find(function (x) { return x.slug === slug; });
    if (!c) return;
    var label = prompt("Nuevo nombre para la categoría:", c.label);
    if (!label) return;
    label = label.trim(); if (!label || label === c.label) return;
    // Solo cambia el nombre visible: el identificador se mantiene,
    // así los productos siguen enlazados sin tocar nada.
    sb.from(CATS).update({ label: label }).eq("slug", slug).then(function (res) {
      if (res.error) { alert("No se pudo renombrar: " + res.error.message); return; }
      loadAll();
    });
  }

  function deleteCategory(slug) {
    var c = state.categories.find(function (x) { return x.slug === slug; });
    if (!c) return;
    var n = state.products.filter(function (p) { return p.category === slug; }).length;
    if (n > 0) {
      alert('No se puede eliminar "' + c.label + '" porque tiene ' + n + ' producto' + (n === 1 ? "" : "s") +
            '.\n\nMueve esos productos a otra categoría (editándolos) y vuelve a intentarlo.');
      return;
    }
    if (!confirm('¿Eliminar la categoría "' + c.label + '"?')) return;
    sb.from(CATS).delete().eq("slug", slug).then(function (res) {
      if (res.error) { alert("No se pudo eliminar: " + res.error.message); return; }
      loadAll();
    });
  }

  function moveCategory(slug, dir) {
    var i = state.categories.findIndex(function (x) { return x.slug === slug; });
    var j = i + dir;
    if (i < 0 || j < 0 || j >= state.categories.length) return;
    var a = state.categories[i], b = state.categories[j];
    // Intercambia el orden de las dos categorías.
    Promise.all([
      sb.from(CATS).update({ sort_order: b.sort_order }).eq("slug", a.slug),
      sb.from(CATS).update({ sort_order: a.sort_order }).eq("slug", b.slug)
    ]).then(loadAll);
  }

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

  /* ============ IMÁGENES DE LA WEB ============ */
  // El ajuste se guarda como JSON; se admite el formato antiguo (solo la URL).
  function parseSetting(v) {
    if (!v) return null;
    if (v.charAt(0) === "{") { try { return JSON.parse(v); } catch (e) { return null; } }
    return { url: v, fit: "cover", zoom: 100, x: 50, y: 50 };
  }
  function saveSetting(key, obj) {
    return sb.from("lym_settings").upsert({
      key: key, value: JSON.stringify(obj), updated_at: new Date().toISOString()
    });
  }

  function renderSiteImages() {
    var wrap = el("siteimgs");
    if (!wrap) return;
    wrap.innerHTML = SITE_IMAGES.map(function (s) {
      var cfg = parseSetting(state.settings[s.key]);
      var body;
      if (cfg) {
        body =
          '<div class="framer__stage" style="height:150px"><img data-siteprev="' + esc(s.key) + '" src="' + esc(cfg.url) + '" alt="" /></div>' +
          '<div class="framer__row"><span>🔍 Tamaño</span><input type="range" min="100" max="250" value="' + (cfg.zoom || 100) + '" data-sz="' + esc(s.key) + '" /></div>' +
          '<div class="framer__row"><span>↔️ Horizontal</span><input type="range" min="0" max="100" value="' + (cfg.x == null ? 50 : cfg.x) + '" data-sx="' + esc(s.key) + '" /></div>' +
          '<div class="framer__row"><span>↕️ Vertical</span><input type="range" min="0" max="100" value="' + (cfg.y == null ? 50 : cfg.y) + '" data-sy="' + esc(s.key) + '" /></div>' +
          '<div class="framer__btns">' +
            '<button class="btn btn--ghost btn--sm" data-scenter="' + esc(s.key) + '">🎯 Centrar</button>' +
            '<button class="btn btn--primary btn--sm" data-ssave="' + esc(s.key) + '">Guardar encuadre</button>' +
          '</div>';
      } else {
        body = '<div class="simg__prev">Sin foto propia (se ve el diseño por defecto)</div>';
      }
      return '<div class="simg">' +
        '<h3>' + esc(s.title) + '</h3>' +
        '<p>' + esc(s.desc) + '</p>' +
        body +
        '<label class="filebtn" style="margin-top:10px">📷 ' + (cfg ? "Cambiar" : "Subir") + ' foto<input type="file" accept="image/*" data-site="' + esc(s.key) + '" /></label>' +
        (cfg ? '<button class="btn btn--danger btn--sm" style="margin-top:8px;width:100%;justify-content:center" data-siteclear="' + esc(s.key) + '">Quitar foto</button>' : '') +
        '<p class="hint" data-sitemsg="' + esc(s.key) + '"></p>' +
      '</div>';
    }).join("");

    // Aplica el encuadre guardado a cada vista previa
    SITE_IMAGES.forEach(function (s) {
      var cfg = parseSetting(state.settings[s.key]);
      var img = wrap.querySelector('[data-siteprev="' + s.key + '"]');
      if (cfg && img) applyFrame(img, cfg);
    });

    function liveUpdate(key) {
      var img = wrap.querySelector('[data-siteprev="' + key + '"]');
      if (!img) return;
      applyFrame(img, {
        fit: "cover",
        zoom: parseInt(wrap.querySelector('[data-sz="' + key + '"]').value, 10),
        x: parseInt(wrap.querySelector('[data-sx="' + key + '"]').value, 10),
        y: parseInt(wrap.querySelector('[data-sy="' + key + '"]').value, 10)
      });
    }
    ["sz", "sx", "sy"].forEach(function (attr) {
      wrap.querySelectorAll("[data-" + attr + "]").forEach(function (r) {
        r.addEventListener("input", function () { liveUpdate(r.getAttribute("data-" + attr)); });
      });
    });

    wrap.querySelectorAll("[data-scenter]").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-scenter");
        wrap.querySelector('[data-sz="' + key + '"]').value = 100;
        wrap.querySelector('[data-sx="' + key + '"]').value = 50;
        wrap.querySelector('[data-sy="' + key + '"]').value = 50;
        liveUpdate(key);
      });
    });

    wrap.querySelectorAll("[data-ssave]").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-ssave");
        var cfg = parseSetting(state.settings[key]) || {};
        var msg = wrap.querySelector('[data-sitemsg="' + key + '"]');
        msg.textContent = "Guardando…";
        saveSetting(key, {
          url: cfg.url, fit: "cover",
          zoom: parseInt(wrap.querySelector('[data-sz="' + key + '"]').value, 10),
          x: parseInt(wrap.querySelector('[data-sx="' + key + '"]').value, 10),
          y: parseInt(wrap.querySelector('[data-sy="' + key + '"]').value, 10)
        }).then(function (res) {
          if (res.error) { msg.textContent = "No se pudo guardar: " + res.error.message; return; }
          msg.textContent = "Encuadre guardado ✓";
          loadAll();
        });
      });
    });

    wrap.querySelectorAll("[data-site]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var key = inp.getAttribute("data-site");
        var file = inp.files && inp.files[0];
        if (!file) return;
        var msg = wrap.querySelector('[data-sitemsg="' + key + '"]');
        msg.textContent = "Subiendo foto…";
        uploadImage(file).then(function (url) {
          return saveSetting(key, { url: url, fit: "cover", zoom: 100, x: 50, y: 50 });
        }).then(function (res) {
          if (res && res.error) throw res.error;
          loadAll();
        }).catch(function (e) { msg.textContent = "No se pudo subir: " + (e.message || e); });
      });
    });

    wrap.querySelectorAll("[data-siteclear]").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-siteclear");
        if (!confirm("¿Quitar esta foto y volver al diseño por defecto?")) return;
        sb.from("lym_settings").delete().eq("key", key).then(function (res) {
          if (res.error) { alert("No se pudo quitar: " + res.error.message); return; }
          loadAll();
        });
      });
    });
  }

})();
