// ===== Advanced Shop UI (Cart/Wishlist/Search) + DOM & Image Auto-Discovery =====
(function () {
  // ---------- Config ----------
  const CURRENCY = "₵";
  const ENABLE_IMAGE_PROBING = (location.protocol !== 'file:'); // set to false to fully disable
  const PROBE_MAX_INDEX = 15;            // was 30; lower to reduce attempts
  const PROBE_MISS_LIMIT = ENABLE_IMAGE_PROBING ? 8 : 2; // stop early on file://


  // Optional seed products (can leave empty)
  let PRODUCTS = [
    // { id: "p1", name: "Moisturizing Cream", image: "images/Product-1.jpg", price: 130, oldPrice: 150, category: "Skincare" },
  ];
  function persistProducts() {
  try { localStorage.setItem('GW_PRODUCTS', JSON.stringify(PRODUCTS)); } catch {}
}


  // ---------- Helpers ----------
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (n) => CURRENCY + Number(n).toFixed(2);

  function slugify(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  }
  function uniqueIdFrom(p) {
    const file = (p.image || "").split("/").pop() || p.name || Math.random().toString(36).slice(2);
    return slugify(file.replace(/\.(jpe?g|png|webp|gif)$/i, ""));
  }
  function byId(id) { return PRODUCTS.find((p) => p.id === id); }
  function parsePrice(text) {
    if (!text) return 0;
    const m = String(text).replace(/[^\d.]/g, "");
    return Number(m || 0);
  }


  // ---------- State ----------
  const state = { cart: [], wishlist: [] };
  function loadState() {
    try {
      state.cart = JSON.parse(localStorage.getItem("cart") || "[]");
      state.wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    } catch (_) {
      state.cart = []; state.wishlist = [];
    }
  }
  function saveState() {
    localStorage.setItem("cart", JSON.stringify(state.cart));
    localStorage.setItem("wishlist", JSON.stringify(state.wishlist));
  }
  function updateCounts() {
    const cartCount = state.cart.reduce((a, b) => a + (b.qty || 0), 0);
    const wishCount = state.wishlist.length;
    $("#cart-count") && ($("#cart-count").textContent = cartCount);
    $("#wishlist-count") && ($("#wishlist-count").textContent = wishCount);
  }
  function inWishlist(id) { return state.wishlist.includes(id); }

  // ---------- Cart ----------
  function addToCart(id, qty = 1) {
    const it = state.cart.find((x) => x.id === id);
    if (it) it.qty += qty;
    else state.cart.push({ id, qty });
    saveState(); renderCart(); updateCounts(); openDrawer("cart-drawer");
  }
  function removeFromCart(id) {
    state.cart = state.cart.filter((x) => x.id !== id);
    saveState(); renderCart(); updateCounts();
  }
  function updateQty(id, q) {
    const it = state.cart.find((x) => x.id === id);
    if (!it) return;
    it.qty = Math.max(1, parseInt(q, 10) || 1);
    saveState(); renderCart(); updateCounts();
  }
  function renderCart() {
    const el = $("#cart-items"); if (!el) return;
    let subtotal = 0;
    el.innerHTML = state.cart.map(ci => {
      const p = byId(ci.id) || { name: "Unknown", image: "", price: 0 };
      const line = (p.price || 0) * ci.qty; subtotal += line;
      return `
        <div class="cart-line" data-id="${ci.id}">
          <img src="${p.image}" alt="${p.name}">
          <div class="line-info">
            <div class="line-name">${p.name}</div>
            <div class="line-price">${fmt(p.price || 0)}</div>
            <div class="qty">
              <button class="qty-btn dec" type="button">-</button>
              <input type="number" class="qty-input" min="1" value="${ci.qty}">
              <button class="qty-btn inc" type="button">+</button>
            </div>
          </div>
          <button class="icon-btn remove-line" title="Remove" type="button"><i class="fas fa-times"></i></button>
        </div>`;
    }).join("");
    $("#cart-subtotal") && ($("#cart-subtotal").textContent = fmt(subtotal));
  }

  // ---------- Wishlist ----------
  function toggleWishlist(id) {
    const i = state.wishlist.indexOf(id);
    if (i >= 0) state.wishlist.splice(i, 1);
    else state.wishlist.push(id);
    saveState(); renderWishlist(); updateCounts();
  }
  function renderWishlist() {
    const el = $("#wishlist-items"); if (!el) return;
    el.innerHTML = state.wishlist.map(id => {
      const p = byId(id) || { name: "Unknown", image: "", price: 0 };
      return `
        <div class="wish-line" data-id="${id}">
          <img src="${p.image}" alt="${p.name}">
          <div class="line-info">
            <div class="line-name">${p.name}</div>
            <div class="line-price">${fmt(p.price || 0)}</div>
          </div>
          <div class="line-actions">
            <button class="btn add-from-wishlist" type="button">Add to Cart</button>
            <button class="icon-btn remove-wish" title="Remove" type="button"><i class="fas fa-trash"></i></button>
          </div>
        </div>`;
    }).join("");
  }

  // ---------- Cards/Grid ----------
  function productCard(p) {
    const wishActive = inWishlist(p.id) ? "active" : "";
    const old = p.oldPrice ? `<span class="old-price">${fmt(p.oldPrice)}</span>` : "";
    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-media">
          <img src="${p.image}" alt="${p.name}">
          <button class="icon-btn wishlist-toggle ${wishActive}" title="Wishlist" type="button">
            <i class="fas fa-heart"></i>
          </button>
        </div>
        <div class="product-info">
          <h4 class="product-name">${p.name}</h4>
          <div class="product-meta">
            <span class="price">${fmt(p.price || 0)}</span>
            ${old}
          </div>
          <div class="product-actions">
            <button class="btn add-to-cart-btn" type="button">Add to Cart</button>
          </div>
        </div>
      </div>`;
  }
  function renderGrid(list, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = list.map(productCard).join("");
  }

  // ---------- Drawers & Panels ----------
  function openDrawer(id) {
    $("#drawer-overlay")?.classList.add("show");
    const d = $("#" + id);
    if (d) { d.classList.add("open"); d.setAttribute("aria-hidden", "false"); }
  }
  function closeDrawer(id) {
    const d = $("#" + id);
    if (d) { d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); }
    if (!$(".drawer.open")) $("#drawer-overlay")?.classList.remove("show");
  }

  function openSearch() {
    const p = $("#search-panel"); if (!p) return;
    p.classList.add("open"); p.setAttribute("aria-hidden", "false");
    $("#product-search-input")?.focus();
  }
  function closeSearch() {
    const p = $("#search-panel"); if (!p) return;
    p.classList.remove("open"); p.setAttribute("aria-hidden", "true");
  }

  // ---------- Discovery (DOM sliders) ----------
  function collectProductsFromFeaturedShop() {
    const found = [];
    $$(".shop .swiper-slide.slide").forEach(slide => {
      const img = slide.querySelector(".image img");
      const nameEl = slide.querySelector(".content p, .content h3, .content .title");
      const priceEl = slide.querySelector(".content .price");
      const priceStr = priceEl ? (priceEl.childNodes[0]?.textContent || priceEl.textContent) : "";
      const oldEl = priceEl ? priceEl.querySelector("span") : null;

      const p = {
        id: "",
        name: nameEl ? nameEl.textContent.trim() : (img?.alt || "Product"),
        image: img ? img.getAttribute("src") : "",
        price: parsePrice(priceStr),
        oldPrice: oldEl ? parsePrice(oldEl.textContent) : undefined,
        category: "Featured",
        _source: "DOM:shop"
      };
      p.id = uniqueIdFrom(p);
      if (p.image) found.push(p);

      // wire existing icons if present
      slide.querySelector(".icons .fa-shopping-cart")?.addEventListener("click", (e) => {
        e.preventDefault(); addToCart(p.id, 1);
      });
      slide.querySelector(".icons .fa-heart")?.addEventListener("click", (e) => {
        e.preventDefault(); toggleWishlist(p.id);
      });
    });
    return found;
  }

  // Parse products from Arrivals Swiper slides
function collectProductsFromArrivalsSwiper() {
  const found = [];
  // avoid collecting Swiper duplicates into catalog
  document.querySelectorAll('.arrivals .swiper-slide.slide:not(.swiper-slide-duplicate)').forEach(slide => {
    const img = slide.querySelector('.image img');
    const nameEl = slide.querySelector('.content p, .content h3, h3, p');
    const priceEl = slide.querySelector('.content .price');
    const priceStr = priceEl ? (priceEl.childNodes[0]?.textContent || priceEl.textContent) : '';
    const oldEl = priceEl ? priceEl.querySelector('span') : null;

    const p = {
      id: '',
      name: nameEl ? nameEl.textContent.trim() : (img?.alt || 'Item'),
      image: img ? img.getAttribute('src') : '',
      price: parsePrice(priceStr),
      oldPrice: oldEl ? parsePrice(oldEl.textContent) : undefined,
      category: 'New Arrivals',
      _source: 'DOM:arrivals-swiper'
    };
    p.id = uniqueIdFrom(p);
    if (p.image) found.push(p);
  });
  return dedupeProducts(found);
}
// Read a product directly from an Arrivals slide element (works for clones)
function readProductFromArrivalsSlide(slide) {
  if (!slide) return null;
  const img = slide.querySelector('.image img');
  const nameEl = slide.querySelector('.content p, .content h3, h3, p');
  const priceEl = slide.querySelector('.content .price');
  const priceStr = priceEl ? (priceEl.childNodes[0]?.textContent || priceEl.textContent) : '';
  const oldEl = priceEl ? priceEl.querySelector('span') : null;

  const p = {
    id: '',
    name: nameEl ? nameEl.textContent.trim() : (img?.alt || 'Item'),
    image: img ? img.getAttribute('src') : '',
    price: parsePrice(priceStr),
    oldPrice: oldEl ? parsePrice(oldEl.textContent) : undefined,
    category: 'New Arrivals',
    _source: 'DOM:arrivals-swiper'
  };
  p.id = uniqueIdFrom(p);
  return p.image ? p : null;
}


  // If you have any .arrivals .box structure (not the swiper), we also try to parse it:
  function collectProductsFromArrivalsBoxes() {
    const found = [];
    $$("#arrivals .box, .arrivals .box").forEach(box => {
      const img = box.querySelector("img");
      const name = box.querySelector(".content p, .content h3, h3, p");
      const priceEl = box.querySelector(".price");
      const p = {
        id: "",
        name: name ? name.textContent.trim() : (img?.alt || "Item"),
        image: img ? img.getAttribute("src") : "",
        price: priceEl ? parsePrice(priceEl.childNodes[0]?.textContent || priceEl.textContent) : 0,
        oldPrice: priceEl ? parsePrice(priceEl.querySelector("span")?.textContent) : undefined,
        category: "Arrivals",
        _source: "DOM:arrivals-box"
      };
      p.id = uniqueIdFrom(p);
      if (p.image) found.push(p);

      box.querySelector(".icons .fa-shopping-cart")?.addEventListener("click", (e) => {
        e.preventDefault(); addToCart(p.id, 1);
      });
      box.querySelector(".icons .fa-heart")?.addEventListener("click", (e) => {
        e.preventDefault(); toggleWishlist(p.id);
      });
    });
    return found;
  }

  // ---------- Discovery (probe images that actually exist) ----------
  function tryLoadImage(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = img.onabort = () => resolve(false);
      img.src = url;
    });
  }
  async function autoDiscoverFromImages() {
  if (!ENABLE_IMAGE_PROBING) return [];

  const patterns = [
    { pat: (i) => `images/Product-${i}.jpg`, start: 1, end: PROBE_MAX_INDEX, name: (i) => `Product ${i}`, category: "Catalog", oldFactor: 1.15 },
    { pat: (i) => `images/product-${i}.jpg`, start: 1, end: PROBE_MAX_INDEX, name: (i) => `Product ${i}`, category: "Catalog", oldFactor: 1.15 },
    { pat: (i) => `images/arrival-${i}.jpg`, start: 1, end: PROBE_MAX_INDEX, name: (i) => `Arrival Set ${i}`, category: "New Arrivals", oldFactor: 1.18 },
    { pat: (i) => `images/Arrival-${i}.jpg`, start: 1, end: PROBE_MAX_INDEX, name: (i) => `Arrival ${i}`, category: "New Arrivals", oldFactor: 1.18 },
  ];

  const found = [];
  for (const p of patterns) {
    let misses = 0;
    for (let i = p.start; i <= p.end; i++) {
      const url = p.pat(i);
      const ok = await tryLoadImage(url);
      if (ok) {
        misses = 0;
        const base = 80 + (i * 5) % 70; // 80..150
        const old = Math.round(base * (p.oldFactor || 1.1));
        const item = {
          id: "",
          name: typeof p.name === "function" ? p.name(i) : (p.name || `Item ${i}`),
          image: url,
          price: base,
          oldPrice: old,
          category: p.category || "Catalog",
          _source: "IMG:probe"
        };
        item.id = uniqueIdFrom(item);
        found.push(item);
      } else {
        if (++misses >= PROBE_MISS_LIMIT) break; // stop early when nothing is found
      }
    }
  }
  return found;
}


  // ---------- Merge/Dedupe ----------
  function dedupeProducts(list) {
    const map = new Map();
    list.forEach(p => {
      const key = p.image || p.id;
      if (key && !map.has(key)) map.set(key, p);
    });
    return Array.from(map.values());
  }
  function mergeProducts(base, extra) {
    const set = new Set(base.map(p => p.image || p.id));
    const merged = base.slice();
    extra.forEach(p => {
      const key = p.image || p.id;
      if (!set.has(key)) { set.add(key); merged.push(p); }
    });
    return merged;
  }
  try { localStorage.setItem('GW_PRODUCTS', JSON.stringify(PRODUCTS)); } catch {}

  // ---------- UI Bindings ----------
  function bindGlobal() {
    // Header buttons
    $("#cart-btn")?.addEventListener("click", () => { renderCart(); openDrawer("cart-drawer"); });
    $("#wishlist-btn")?.addEventListener("click", () => { renderWishlist(); openDrawer("wishlist-drawer"); });
    $("#drawer-overlay")?.addEventListener("click", () => {
      $$(".drawer.open").forEach(d => d.classList.remove("open"));
      $("#drawer-overlay")?.classList.remove("show");
    });
    $$("[data-drawer-close]").forEach(btn => btn.addEventListener("click", () => {
      closeDrawer(btn.getAttribute("data-drawer-close"));
    }));

    // Cart controls
    $("#clear-cart-btn")?.addEventListener("click", () => {
      state.cart = []; saveState(); renderCart(); updateCounts();
    });
    $("#checkout-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    // same key used by login page
    const AUTH_KEY = "authUser";
    const isLoggedIn = !!localStorage.getItem(AUTH_KEY);
    if (isLoggedIn) {
    alert("Proceeding to checkout (user is logged in).");
    // e.g. location.href = "checkout.html";
    } else {
    const back = encodeURIComponent(location.href);
    location.href = `Sliding-Sign-In-Sign-Up-Form-master/login.html?redirect=${back}`;
    }
    });
    $("#cart-drawer")?.addEventListener("click", (e) => {
      const line = e.target.closest(".cart-line"); if (!line) return;
      const id = line.dataset.id;
      if (e.target.closest(".remove-line")) { removeFromCart(id); return; }
      if (e.target.closest(".inc")) { const it = state.cart.find(x => x.id === id); updateQty(id, (it?.qty || 1) + 1); return; }
      if (e.target.closest(".dec")) { const it = state.cart.find(x => x.id === id); updateQty(id, Math.max(1, (it?.qty || 1) - 1)); return; }
    });
    $("#cart-drawer")?.addEventListener("change", (e) => {
      const line = e.target.closest(".cart-line"); if (!line) return;
      if (e.target.classList.contains("qty-input")) {
        updateQty(line.dataset.id, parseInt(e.target.value, 10) || 1);
      }
    });

    // Wishlist controls
    $("#wishlist-drawer")?.addEventListener("click", (e) => {
      const row = e.target.closest(".wish-line"); if (!row) return;
      const id = row.dataset.id;
      if (e.target.closest(".remove-wish")) { toggleWishlist(id); syncWishlistButtons(id); return; }
      if (e.target.closest(".add-from-wishlist")) { addToCart(id, 1); }
    });

    // Search
    ["#open-search-btn", "#search-btn"].forEach(sel => {
      const btn = $(sel); btn && btn.addEventListener("click", openSearch);
    });
    $("#search-close")?.addEventListener("click", closeSearch);
    $("#product-search-input")?.addEventListener("input", (e) => {
      const q = (e.target.value || "").trim().toLowerCase();
      const results = q ? PRODUCTS.filter(p => (p.name + " " + (p.category || "")).toLowerCase().includes(q)) : [];
      renderGrid(results, "search-results-grid");
    });

    // Delegate actions on product cards
    document.addEventListener("click", (e) => {
      const card = e.target.closest(".product-card"); if (!card) return;
      const id = card.dataset.id;
      if (e.target.closest(".add-to-cart-btn")) addToCart(id, 1);
      if (e.target.closest(".wishlist-toggle")) { toggleWishlist(id); syncWishlistButtons(id); }
    });

    // Delegated handlers for Arrivals slides (covers Swiper clones)
    document.addEventListener('click', (e) => {
   // Add-to-cart button inside Arrivals slide
   const addBtn = e.target.closest('.arrivals .add-to-cart-btn');
   if (addBtn) {
    e.preventDefault();
    const slide = addBtn.closest('.swiper-slide');
    const p = readProductFromArrivalsSlide(slide);
    if (p) {
      // ensure present in catalog
      if (!byId(p.id)) { PRODUCTS = mergeProducts(PRODUCTS, [p]); }
      addToCart(p.id, 1);
    }
    return;
   }

   // Optional: heart icon inside Arrivals slide
   const heartIcon = e.target.closest('.arrivals .fa-heart');
   if (heartIcon) {
    e.preventDefault();
    const slide = heartIcon.closest('.swiper-slide');
    const p = readProductFromArrivalsSlide(slide);
    if (p) {
      if (!byId(p.id)) { PRODUCTS = mergeProducts(PRODUCTS, [p]); }
      toggleWishlist(p.id);
    }
    return;
   }

   // Optional: cart icon inside Arrivals slide (if you add it)
   const cartIcon = e.target.closest('.arrivals .fa-shopping-cart');
   if (cartIcon) {
    e.preventDefault();
    const slide = cartIcon.closest('.swiper-slide');
    const p = readProductFromArrivalsSlide(slide);
    if (p) {
      if (!byId(p.id)) { PRODUCTS = mergeProducts(PRODUCTS, [p]); }
      addToCart(p.id, 1);
      persistProducts();           // <-- ADD after merging a new product
    }
   }
    });

  }

  function syncWishlistButtons(id) {
    const active = inWishlist(id);
    document.querySelectorAll('.product-card[data-id="' + id + '"] .wishlist-toggle')
      .forEach(b => b.classList.toggle("active", active));
  }

  // Keep legacy navbar/search form toggles working
function initNavbarAndForms() {
  const navbar = document.querySelector('.navbar');
  const menuBtn = document.querySelector("#menu-btn");
  const closeBtn = document.querySelector("#close-navbar");
  const searchForm = document.querySelector(".search-form");
  const accountMenu = document.getElementById("account-menu"); // dropdown created by our auth UI
  const searchPanel = document.getElementById("search-panel"); // your full-page search

  function openNav() {
    navbar?.classList.add("active");
    document.body.classList.add("nav-open");
    document.body.style.overflow = "hidden"; // prevent background scroll
    accountMenu?.classList.remove("show");
    if (searchPanel) {
      searchPanel.classList.remove("open");
      searchPanel.setAttribute("aria-hidden", "true");
    }
  }
  function closeNav() {
    navbar?.classList.remove("active");
    document.body.classList.remove("nav-open");
    document.body.style.overflow = ""; // restore
  }

  menuBtn?.addEventListener("click", openNav);
  closeBtn?.addEventListener("click", closeNav);

  // Close nav when a link is clicked
  navbar?.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) closeNav();
  });

  // Old inline search-form toggle
  document.querySelector("#search-btn")?.addEventListener("click", () => {
    searchForm?.classList.toggle("active");
  });

  // Close account dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#account-anchor") && !e.target.closest("#account-btn")) {
      accountMenu?.classList.remove("show");
    }
  });
}


// Re-run if you changed the function
document.addEventListener("DOMContentLoaded", initNavbarAndForms);


  // ---------- Carousels ----------
  function initCarousels() {
    // Arrivals Swiper
    if (window._arrivalsSwiper?.destroy) { try { window._arrivalsSwiper.destroy(true, true); } catch(_) {} }
    try {
      if (window.Swiper && document.querySelector('.arrivals-slider')) {
        window._arrivalsSwiper = new Swiper('.arrivals-slider', {
          loop: true,
          grabCursor: true,
          spaceBetween: 16,
          slidesPerView: 1,
          navigation: {
            nextEl: '.arrivals .swiper-button-next',
            prevEl: '.arrivals .swiper-button-prev',
          },
          breakpoints: {
            576: { slidesPerView: 2 },
            768: { slidesPerView: 2 },
            992: { slidesPerView: 3 },
            1200:{ slidesPerView: 4 },
          }
        });
      }
    } catch (e) { console.warn('Arrivals swiper init skipped:', e); }
    // If you want Featured/Shop slider here too, add a similar block for '.products-slider'.
  }

  // ---------- Init ----------
  async function init() {
    loadState(); updateCounts();

    // Discover from DOM
    let domProducts = [
      ...collectProductsFromFeaturedShop(),
      ...collectProductsFromArrivalsSwiper(),
      ...collectProductsFromArrivalsBoxes(),
    ];
    domProducts = dedupeProducts(domProducts);

    // Discover from file patterns (only existing images)
    const imgProducts = ENABLE_IMAGE_PROBING ? await autoDiscoverFromImages() : [];

    // Merge: Seeds -> DOM -> Images
    PRODUCTS = mergeProducts(PRODUCTS, domProducts);
    PRODUCTS = mergeProducts(PRODUCTS, imgProducts);
    persistProducts();

    // Render & bind
    renderGrid(PRODUCTS, "all-products-grid");
    renderWishlist();
    bindGlobal();
    initNavbarAndForms();
    initCarousels();
    updateCounts();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

// ===== Simple Home Slider Controller for .home .slide with .active class =====
(function(){
  const slides = Array.from(document.querySelectorAll('.home .slide'));
  if (!slides.length) return;
  let idx = slides.findIndex(s => s.classList.contains('active'));
  if (idx < 0) idx = 0;

  function show(i){
    slides.forEach(s => s.classList.remove('active'));
    slides[i].classList.add('active');
  }
  window.next = function(){ idx = (idx + 1) % slides.length; show(idx); };
  window.prev = function(){ idx = (idx - 1 + slides.length) % slides.length; show(idx); };
})();

/* ===== Goodwife Auth UI & Checkout Gate (pure JS) ===== */

/* Storage helpers must match login page keys */
function GW_getAuthUser() {
  try {
    const a = localStorage.getItem("gw_current_user");
    if (a && a !== "null") return JSON.parse(a);
    const b = localStorage.getItem("authUser"); // legacy fallback
    if (b && b !== "null") return JSON.parse(b);
  } catch {}
  return null;
}

function GW_logout() {
  localStorage.removeItem("gw_current_user");
  location.reload();
}

/* Build account UI in header (avatar + dropdown) or keep Login button */
function GW_applyAuthHeader() {
  const form = document.getElementById("login-form");
  const loginBtn = document.getElementById("login-btn");
  const anchor = document.getElementById("account-anchor");
  if (!form || !anchor) return;

  const user = GW_getAuthUser();

  // Ensure the Login button goes to login.html with redirect back
  form.addEventListener("submit", (e) => {
    const u = GW_getAuthUser();
    e.preventDefault();
    if (u) {
      // Already logged in -> toggle menu
      document.getElementById("account-menu")?.classList.toggle("show");
      return;
    }
    const back = encodeURIComponent(location.href);
    location.href = `Sliding-Sign-In-Sign-Up-Form-master/login.html?redirect=${back}`;
  });

  if (!user) {
    // Not signed in
    anchor.innerHTML = "";
    if (loginBtn) loginBtn.style.display = "";
    return;
  }

  // Signed in: hide Login and show avatar dropdown
  if (loginBtn) loginBtn.style.display = "none";
  const displayName = user.username || user.email || "User";
  const initial = (displayName[0] || "U").toUpperCase();

  anchor.innerHTML = `
    <button id="account-btn" class="avatar-btn" type="button">
      <span class="avatar">${initial}</span>
      <span class="account-label">${displayName}</span>
      <i class="fas fa-caret-down caret"></i>
    </button>
    <div id="account-menu" class="account-menu">
      <div class="hello">Signed in as <strong>${displayName}</strong></div>
      <a href="profile.html" class="btn btn-secondary">Profile</a>
      <button type="button" class="btn btn-primary" id="gw-logout">Logout</button>
    </div>
  `;

  const accountBtn = document.getElementById("account-btn");
  const menu = document.getElementById("account-menu");
  accountBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("show");
  });
  document.addEventListener("click", () => menu.classList.remove("show"));

  document.getElementById("gw-logout").addEventListener("click", GW_logout);
}

/* Checkout gate: if not logged in -> send to login; else go to checkout.html */
function GW_applyCheckoutGate() {
  const old = document.getElementById("checkout-btn");
  if (!old) return;

  // Remove any previous listeners registered earlier
  const btn = old.cloneNode(true);
  old.parentNode.replaceChild(btn, old);

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const user = GW_getAuthUser();

    if (!user) {
      // Build an absolute URL to checkout.html and send user to login with redirect back
      const target = new URL("checkout.html", location.href).href;
      location.href = `Sliding-Sign-In-Sign-Up-Form-master/login.html?redirect=${encodeURIComponent(target)}`;
      return;
    }

    // Already logged in → straight to checkout
    location.href = "checkout.html";
  });
}


/* Run on page load */
document.addEventListener("DOMContentLoaded", () => {
  GW_applyAuthHeader();
  GW_applyCheckoutGate();
});


