// ========== STORAGE ==========
const STORAGE_KEYS = {
  cart: "reusestore_cart",
  favs: "reusestore_favs",
  state: "reusestore_state",
};

const storage = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

// ========== ESTADO ==========
const defaultFilters = { categories: [], conditions: [], brands: [], minPrice: 0, maxPrice: 1500, warranty: 0, inStock: false, onlyDiscount: false };
const saved = storage.get(STORAGE_KEYS.state, {});

const state = {
  search: saved.search || "",
  sort: saved.sort || "relevance",
  filters: { ...defaultFilters, ...(saved.filters || {}) },
};

// ========== CARRINHO E FAVORITOS ==========
let cart = storage.get(STORAGE_KEYS.cart, []); // [{ id, qty }]
let favorites = new Set(storage.get(STORAGE_KEYS.favs, []));

function persistCart() { storage.set(STORAGE_KEYS.cart, cart); }
function persistFavs() { storage.set(STORAGE_KEYS.favs, [...favorites]); }
function persistState() {
  storage.set(STORAGE_KEYS.state, { search: state.search, sort: state.sort, filters: state.filters });
}

// ========== HELPERS ==========
function discountPct(p) { if (!p.oldPrice || p.oldPrice <= p.price) return 0; return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100); }
function fmtPrice(v) { return v.toFixed(2) + "€"; }
function escapeHTML(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function getProduct(id) { return PRODUCTS.find((p) => p.id === id); }
function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }
function cartSubtotal() {
  return cart.reduce((s, i) => {
    const p = getProduct(i.id);
    return p ? s + p.price * i.qty : s;
  }, 0);
}
function shippingCost() {
  const sub = cartSubtotal();
  if (sub === 0) return 0;
  if (sub >= 50) return 0; // envio grátis a partir de 50€
  return 4.99;
}

function applyFilters(list, f, search) {
  return list.filter((p) => {
    if (f.categories.length && !f.categories.includes(p.category)) return false;
    if (f.conditions.length && !f.conditions.includes(p.condition)) return false;
    if (f.brands.length && !f.brands.includes(p.brand)) return false;
    if (p.price < f.minPrice || p.price > f.maxPrice) return false;
    if (p.warrantyMonths < f.warranty) return false;
    if (f.inStock && p.stock === 0) return false;
    if (f.onlyDiscount && (!p.oldPrice || p.oldPrice <= p.price)) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${p.title} ${p.brand} ${p.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function sortList(list, key) {
  const arr = [...list];
  switch (key) {
    case "price-asc":  return arr.sort((a, b) => a.price - b.price);
    case "price-desc": return arr.sort((a, b) => b.price - a.price);
    case "rating":     return arr.sort((a, b) => b.rating - a.rating);
    case "discount":   return arr.sort((a, b) => discountPct(b) - discountPct(a));
    default:           return arr;
  }
}

// ========== TOASTS ==========
function toast(message, type = "info") {
  const icons = { success: "done", error: "close", info: "info" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="ico material-symbols-outlined">${icons[type] || "info"}</span><span>${escapeHTML(message)}</span>`;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ========== RENDER: NAV / FILTROS / GRELHA ==========
function renderNav() {
  const ul = document.getElementById("categoryNav");
  ul.innerHTML = NAV_ITEMS.map((n) => `<li><a href="#">${escapeHTML(n)}</a></li>`).join("")
    + `<li class="highlight"><a href="#"><span class="material-symbols-outlined">flash_on</span> Outlet · até 70% OFF</a></li>`;
}

function renderFilterOptions() {
  document.getElementById("filterCategories").innerHTML = CATEGORIES.map((v) => checkboxHTML("category", v)).join("");
  document.getElementById("filterConditions").innerHTML = CONDITIONS.map((v) => checkboxHTML("condition", v)).join("");
  document.getElementById("filterBrands").innerHTML = BRANDS.map((v) => checkboxHTML("brand", v)).join("");
}

function checkboxHTML(type, value) {
  return `<label class="cb"><input type="checkbox" data-filter="${type}" value="${escapeHTML(value)}" /> <span>${escapeHTML(value)}</span></label>`;
}

function renderGrid() {
  const filtered = applyFilters(PRODUCTS, state.filters, state.search);
  const sorted = sortList(filtered, state.sort);
  document.getElementById("productGrid").innerHTML = sorted.map(productCardHTML).join("");
  document.getElementById("resultCount").textContent = `${sorted.length} itens encontrados`;
  document.getElementById("totalCount").textContent = sorted.length;
  document.getElementById("emptyState").classList.toggle("hidden", sorted.length > 0);
}

function productCardHTML(p) {
  const off = discountPct(p);
  const low = p.stock > 0 && p.stock <= 5;
  const stars = Array.from({ length: 5 }).map((_, i) => `<span class="material-symbols-outlined ${i < Math.round(p.rating) ? "on" : ""}">star</span>`).join("");
  const isFav = favorites.has(p.id);
  return `
    <article class="card" data-id="${p.id}" role="button" tabindex="0">
      <div class="thumb">
        <img src="${p.image}" alt="${escapeHTML(p.title)}" loading="lazy" />
        <div class="badges">
          ${off > 0 ? `<span class="badge badge-discount">-${off}%</span>` : ""}
          <span class="badge badge-eco"><span class="material-symbols-outlined">recycling</span> ${escapeHTML(p.condition)}</span>
        </div>
        <button class="fav ${isFav ? "on" : ""}" data-fav="${p.id}" aria-label="Favorito" type="button"><span class="material-symbols-outlined">${isFav ? "favorite" : "favorite_border"}</span></button>
      </div>
      <div class="body">
        <p class="brand">${escapeHTML(p.brand)}</p>
        <h3>${escapeHTML(p.title)}</h3>
        <div class="rating">
          <span class="stars">${stars}</span>
          <span class="reviews">(${p.reviews})</span>
        </div>
        <div class="prices">
          <span class="price">${fmtPrice(p.price)}</span>
          ${p.oldPrice ? `<span class="old">${fmtPrice(p.oldPrice)}</span>` : ""}
        </div>
        <div class="meta">
          <span><span class="material-symbols-outlined">shield</span> ${p.warrantyMonths} meses</span>
          <span class="${low ? "low" : ""}">${p.stock > 0 ? `Em stock (${p.stock})` : "Indisponível"}</span>
        </div>
        <button class="btn btn-primary add" data-add="${p.id}" type="button" ${p.stock === 0 ? "disabled" : ""}><span class="material-symbols-outlined">shopping_cart</span> Adicionar ao carrinho</button>
      </div>
    </article>`;
}

function render() { renderGrid(); }

// ========== MODAL DE PRODUTO ==========
function openProductModal(id) {
  const p = getProduct(id);
  if (!p) return;
  const off = discountPct(p);
  const stars = Array.from({ length: 5 }).map((_, i) => `<span class="material-symbols-outlined ${i < Math.round(p.rating) ? "on" : ""}">star</span>`).join("");
  const gallery = p.gallery && p.gallery.length ? p.gallery : [p.image, p.image, p.image];

  const body = document.getElementById("modalBody");
  body.innerHTML = `
    <div class="modal-gallery">
      <div class="modal-main-img"><img id="mainImg" src="${gallery[0]}" alt="${escapeHTML(p.title)}" /></div>
      <div class="modal-thumbs">
        ${gallery.map((g, i) => `<button data-thumb="${i}" class="${i === 0 ? "on" : ""}"><img src="${g}" alt="" /></button>`).join("")}
      </div>
    </div>
    <div class="modal-info">
      <p class="brand">${escapeHTML(p.brand)}</p>
      <h2 id="modalTitle">${escapeHTML(p.title)}</h2>
      <div class="rating">
        <span class="stars">${stars}</span>
        <span class="reviews">(${p.reviews} avaliações)</span>
      </div>
      <div class="prices" style="margin: 12px 0;">
        <span class="price">${fmtPrice(p.price)}</span>
        ${p.oldPrice ? `<span class="old">${fmtPrice(p.oldPrice)}</span><span class="badge badge-discount">-${off}%</span>` : ""}
      </div>
      <p class="description">${escapeHTML(p.description)}</p>
      <div class="modal-specs">
        ${p.color ? `<div><span>Cor</span><strong>${escapeHTML(p.color)}</strong></div>` : ""}
        ${p.storage ? `<div><span>Armazenamento</span><strong>${escapeHTML(p.storage)}</strong></div>` : ""}
        <div><span>Estado</span><strong>${escapeHTML(p.condition)}</strong></div>
        <div><span>Garantia</span><strong>${p.warrantyMonths} meses</strong></div>
        <div><span>Stock</span><strong>${p.stock > 0 ? p.stock + " disponíveis" : "Indisponível"}</strong></div>
        <div><span>Categoria</span><strong>${escapeHTML(p.category)}</strong></div>
      </div>
      <div class="modal-actions">
        <div class="qty">
          <button id="qtyMinus" type="button">−</button>
          <input id="qtyInput" type="number" min="1" max="${p.stock}" value="1" />
          <button id="qtyPlus" type="button">+</button>
        </div>
        <button class="btn btn-primary" id="modalAdd" type="button" ${p.stock === 0 ? "disabled" : ""} style="flex: 1;">
          <span class="material-symbols-outlined">shopping_cart</span> Adicionar ao carrinho
        </button>
        <button class="btn btn-outline" id="modalFav" type="button">
          <span class="material-symbols-outlined">${favorites.has(p.id) ? "favorite" : "favorite_border"}</span>
        </button>
      </div>
    </div>
  `;

  // Galeria
  body.querySelectorAll("[data-thumb]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.thumb);
      document.getElementById("mainImg").src = gallery[i];
      body.querySelectorAll("[data-thumb]").forEach((b) => b.classList.toggle("on", b === btn));
    });
  });

  // Quantidade
  const qtyInput = document.getElementById("qtyInput");
  document.getElementById("qtyMinus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
  });
  document.getElementById("qtyPlus").addEventListener("click", () => {
    qtyInput.value = Math.min(p.stock, Number(qtyInput.value) + 1);
  });
  qtyInput.addEventListener("change", () => {
    let v = Number(qtyInput.value);
    if (isNaN(v) || v < 1) v = 1;
    if (v > p.stock) v = p.stock;
    qtyInput.value = v;
  });

  // Adicionar ao carrinho
  document.getElementById("modalAdd").addEventListener("click", () => {
    addToCart(p.id, Number(qtyInput.value));
    closeModal();
  });

  // Favorito
  document.getElementById("modalFav").addEventListener("click", (e) => {
    toggleFavorite(p.id);
    const icon = e.currentTarget.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = favorites.has(p.id) ? "favorite" : "favorite_border";
  });

  showModal();
}

function showModal() {
  const m = document.getElementById("productModal");
  m.classList.remove("hidden");
  m.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const m = document.getElementById("productModal");
  m.classList.add("hidden");
  m.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ========== CARRINHO ==========
function addToCart(id, qty = 1) {
  const p = getProduct(id);
  if (!p || p.stock === 0) return;
  const item = cart.find((i) => i.id === id);
  const current = item ? item.qty : 0;
  const newQty = Math.min(p.stock, current + qty);
  if (newQty === current) {
    toast(`Stock máximo atingido para ${p.title}`, "error");
    return;
  }
  if (item) item.qty = newQty;
  else cart.push({ id, qty: newQty });
  persistCart();
  updateCartUI();
  toast(`${p.title} adicionado ao carrinho`, "success");
}

function changeCartQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  const p = getProduct(id);
  const newQty = item.qty + delta;
  if (newQty <= 0) { removeFromCart(id); return; }
  if (newQty > p.stock) { toast("Stock máximo atingido", "error"); return; }
  item.qty = newQty;
  persistCart();
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  persistCart();
  updateCartUI();
}

function clearCart() {
  cart = [];
  persistCart();
  updateCartUI();
  toast("Carrinho esvaziado", "info");
}

function updateCartUI() {
  const count = cartCount();
  const el = document.getElementById("cartCount");
  el.textContent = count;
  el.classList.toggle("hidden", count === 0);

  document.getElementById("cartTitleCount").textContent = `(${count})`;

  const body = document.getElementById("cartBody");
  if (cart.length === 0) {
    body.innerHTML = `<div class="drawer-empty"><span class="icon material-symbols-outlined">shopping_cart</span><p>O teu carrinho está vazio.</p></div>`;
  } else {
    body.innerHTML = cart.map((item) => {
      const p = getProduct(item.id);
      if (!p) return "";
      return `
        <div class="line-item">
          <img src="${p.image}" alt="${escapeHTML(p.title)}" />
          <div class="info">
            <h4>${escapeHTML(p.title)}</h4>
            <div class="meta-line">${escapeHTML(p.brand)} · ${escapeHTML(p.condition)}</div>
            <div class="price">${fmtPrice(p.price)}</div>
          </div>
          <div class="controls">
            <div class="qty">
              <button data-cart-dec="${p.id}" type="button">−</button>
              <input type="text" value="${item.qty}" readonly />
              <button data-cart-inc="${p.id}" type="button">+</button>
            </div>
            <button class="remove" data-cart-rm="${p.id}" type="button">Remover</button>
          </div>
        </div>`;
    }).join("");
  }

  const sub = cartSubtotal();
  const ship = shippingCost();
  const total = sub + ship;
  document.getElementById("cartSubtotal").textContent = fmtPrice(sub);
  document.getElementById("cartShipping").textContent = ship === 0 ? "Grátis" : fmtPrice(ship);
  document.getElementById("cartTotal").textContent = fmtPrice(total);
  document.getElementById("cartFoot").classList.toggle("hidden", cart.length === 0);
}

// ========== FAVORITOS ==========
function toggleFavorite(id) {
  const p = getProduct(id);
  if (!p) return;
  if (favorites.has(id)) {
    favorites.delete(id);
    toast("Removido dos favoritos", "info");
  } else {
    favorites.add(id);
    toast(`${p.title} adicionado aos favoritos`, "success");
  }
  persistFavs();
  updateFavUI();
  renderGrid();
}

function updateFavUI() {
  const count = favorites.size;
  const el = document.getElementById("favCount");
  el.textContent = count;
  el.classList.toggle("hidden", count === 0);
  document.getElementById("favTitleCount").textContent = `(${count})`;

  const body = document.getElementById("favBody");
  if (count === 0) {
    body.innerHTML = `<div class="drawer-empty"><span class="icon material-symbols-outlined">favorite</span><p>Ainda não tens favoritos.</p><p>Carrega no ícone para guardar os teus favoritos aqui.</p></div>`;
    return;
  }
  const items = [...favorites].map(getProduct).filter(Boolean);
  body.innerHTML = items.map((p) => `
    <div class="line-item">
      <img src="${p.image}" alt="${escapeHTML(p.title)}" />
      <div class="info">
        <h4>${escapeHTML(p.title)}</h4>
        <div class="meta-line">${escapeHTML(p.brand)} · ${fmtPrice(p.price)}</div>
      </div>
      <div class="controls">
        <button class="btn btn-primary" data-fav-add="${p.id}" type="button" style="font-size: 12px; padding: 6px 10px;">Comprar</button>
        <button class="remove" data-fav-rm="${p.id}" type="button">Remover</button>
      </div>
    </div>
  `).join("");
}

// ========== DRAWERS ==========
function openDrawer(id) {
  const d = document.getElementById(id);
  d.classList.remove("hidden");
  d.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeDrawer(id) {
  const d = document.getElementById(id);
  d.classList.add("hidden");
  d.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ========== EVENTOS ==========
function bindEvents() {
  // Pesquisa
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");
  searchInput.value = state.search;
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    state.search = searchInput.value.trim();
    persistState();
    render();
    document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
  });

  // Filtros (delegação)
  document.getElementById("filterCategories").addEventListener("change", (e) => onCheckboxChange(e, "categories"));
  document.getElementById("filterConditions").addEventListener("change", (e) => onCheckboxChange(e, "conditions"));
  document.getElementById("filterBrands").addEventListener("change", (e) => onCheckboxChange(e, "brands"));

  // Preço
  const minEl = document.getElementById("minPrice");
  const maxEl = document.getElementById("maxPrice");
  const minLabel = document.getElementById("minPriceLabel");
  const maxLabel = document.getElementById("maxPriceLabel");
  minEl.value = state.filters.minPrice;
  maxEl.value = state.filters.maxPrice;
  minLabel.textContent = state.filters.minPrice + "€";
  maxLabel.textContent = state.filters.maxPrice + "€";
  function updatePrice() {
    let min = Number(minEl.value);
    let max = Number(maxEl.value);
    if (min > max) { [min, max] = [max, min]; }
    state.filters.minPrice = min;
    state.filters.maxPrice = max;
    minLabel.textContent = min + "€";
    maxLabel.textContent = max + "€";
    persistState();
    render();
  }
  minEl.addEventListener("input", updatePrice);
  maxEl.addEventListener("input", updatePrice);

  // Garantia
  const warrantyEl = document.getElementById("warranty");
  warrantyEl.value = String(state.filters.warranty);
  warrantyEl.addEventListener("change", (e) => {
    state.filters.warranty = Number(e.target.value);
    persistState();
    render();
  });

  // Outros
  const inStockEl = document.getElementById("inStock");
  inStockEl.checked = state.filters.inStock;
  inStockEl.addEventListener("change", (e) => { state.filters.inStock = e.target.checked; persistState(); render(); });

  const onlyDiscountEl = document.getElementById("onlyDiscount");
  onlyDiscountEl.checked = state.filters.onlyDiscount;
  onlyDiscountEl.addEventListener("change", (e) => { state.filters.onlyDiscount = e.target.checked; persistState(); render(); });

  // Pré-marcar checkboxes persistidos
  const mapKey = { categories: "category", conditions: "condition", brands: "brand" };
  Object.entries(mapKey).forEach(([key, filterType]) => {
    state.filters[key].forEach((val) => {
      const sel = `.filters [data-filter="${filterType}"][value="${CSS.escape(val)}"]`;
      const el = document.querySelector(sel);
      if (el) el.checked = true;
    });
  });

  // Ordenação
  const sortEl = document.getElementById("sort");
  sortEl.value = state.sort;
  sortEl.addEventListener("change", (e) => { state.sort = e.target.value; persistState(); render(); });

  // Reset
  document.getElementById("resetFilters").addEventListener("click", () => {
    state.filters = { ...defaultFilters };
    state.search = "";
    state.sort = "relevance";
    searchInput.value = "";
    minEl.value = 0;
    maxEl.value = 1500;
    minLabel.textContent = "0€";
    maxLabel.textContent = "1500€";
    document.querySelectorAll('.filters input[type="checkbox"]').forEach((c) => (c.checked = false));
    warrantyEl.value = "0";
    sortEl.value = "relevance";
    persistState();
    render();
  });

  // Grelha (delegação): card click, add, fav
  document.getElementById("productGrid").addEventListener("click", (e) => {
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn) { e.stopPropagation(); toggleFavorite(favBtn.dataset.fav); return; }
    const addBtn = e.target.closest("[data-add]");
    if (addBtn) { e.stopPropagation(); addToCart(addBtn.dataset.add); return; }
    const card = e.target.closest(".card");
    if (card) { openProductModal(card.dataset.id); }
  });
  document.getElementById("productGrid").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const card = e.target.closest(".card");
      if (card) { e.preventDefault(); openProductModal(card.dataset.id); }
    }
  });

  // Modal
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("productModal").addEventListener("click", (e) => {
    if (e.target.id === "productModal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeDrawer("cartDrawer");
      closeDrawer("favDrawer");
    }
  });

  // Scroll to top
  const scrollBtn = document.getElementById("scrollTop");
  if (scrollBtn) {
    const toggle = () => scrollBtn.classList.toggle("visible", window.scrollY > 400);
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
    scrollBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // Drawer carrinho
  document.getElementById("openCart").addEventListener("click", () => openDrawer("cartDrawer"));
  document.getElementById("closeCart").addEventListener("click", () => closeDrawer("cartDrawer"));
  document.getElementById("cartDrawer").addEventListener("click", (e) => {
    if (e.target.id === "cartDrawer") closeDrawer("cartDrawer");
  });
  document.getElementById("cartBody").addEventListener("click", (e) => {
    const inc = e.target.closest("[data-cart-inc]");
    const dec = e.target.closest("[data-cart-dec]");
    const rm = e.target.closest("[data-cart-rm]");
    if (inc) changeCartQty(inc.dataset.cartInc, +1);
    else if (dec) changeCartQty(dec.dataset.cartDec, -1);
    else if (rm) removeFromCart(rm.dataset.cartRm);
  });
  document.getElementById("clearCart").addEventListener("click", clearCart);
  document.getElementById("checkoutBtn").addEventListener("click", () => {
    if (cart.length === 0) return;
    toast("Compra simulada! (demo)", "success");
    cart = [];
    persistCart();
    updateCartUI();
    setTimeout(() => closeDrawer("cartDrawer"), 800);
  });

  // Drawer favoritos
  document.getElementById("openFavorites").addEventListener("click", () => openDrawer("favDrawer"));
  document.getElementById("closeFav").addEventListener("click", () => closeDrawer("favDrawer"));
  document.getElementById("favDrawer").addEventListener("click", (e) => {
    if (e.target.id === "favDrawer") closeDrawer("favDrawer");
  });
  document.getElementById("favBody").addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-fav-add]");
    const rmBtn = e.target.closest("[data-fav-rm]");
    if (addBtn) { addToCart(addBtn.dataset.favAdd); }
    else if (rmBtn) { toggleFavorite(rmBtn.dataset.favRm); }
  });
}

function onCheckboxChange(e, key) {
  if (e.target.type !== "checkbox") return;
  const value = e.target.value;
  const list = state.filters[key];
  const idx = list.indexOf(value);
  if (e.target.checked && idx === -1) list.push(value);
  if (!e.target.checked && idx !== -1) list.splice(idx, 1);
  persistState();
  render();
}

// ========== INIT ==========
renderNav();
renderFilterOptions();
bindEvents();
updateCartUI();
updateFavUI();
render();
