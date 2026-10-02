import { PRODUCTS, LINES, MAX_QTY, findProduct } from "./catalog.js";

const STORAGE_KEY = "pure-cart";
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const formatPrice = (cents) => currency.format(cents / 100);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/* ------------------------------------------------------------------ */
/* Cart state                                                          */
/* ------------------------------------------------------------------ */

// Merge duplicate lines, drop products that no longer exist, clamp quantities.
function normalize(items) {
  if (!Array.isArray(items)) return [];
  const merged = new Map();
  for (const item of items) {
    if (!item || !findProduct(item.id)) continue;
    const qty = Math.floor(Number(item.qty));
    if (!(qty > 0)) continue;
    merged.set(item.id, Math.min(MAX_QTY, (merged.get(item.id) ?? 0) + qty));
  }
  return [...merged].map(([id, qty]) => ({ id, qty }));
}

function readCart() {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

let cart = readCart();

function saveCart(next) {
  cart = normalize(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage blocked (private mode, full quota): the bag still works for this page view.
  }
  renderCart();
}

const qtyOf = (id) => cart.find((item) => item.id === id)?.qty ?? 0;

function setQty(id, qty) {
  const others = cart.filter((item) => item.id !== id);
  saveCart(qty > 0 ? [...others, { id, qty }].sort(byCatalogOrder) : others);
}

const catalogIndex = new Map(PRODUCTS.map((p, i) => [p.id, i]));
const byCatalogOrder = (a, b) => catalogIndex.get(a.id) - catalogIndex.get(b.id);

/* ------------------------------------------------------------------ */
/* Cart drawer                                                         */
/* ------------------------------------------------------------------ */

const drawer = $("#cart");
const cartStatus = $("[data-cart-status]");
const defaultCartNote = cartStatus?.textContent ?? "";

function cartLine({ id, qty }) {
  const p = findProduct(id);
  return `
    <li class="cart-line">
      <img src="/img/${p.image}-640.webp" alt="" width="72" height="72" loading="lazy">
      <div class="cart-line-info">
        <p class="cart-line-name">${p.name}</p>
        <p class="cart-line-pack">${p.pack}</p>
        <div class="stepper" role="group" aria-label="Quantity of ${p.name}, ${p.pack}">
          <button type="button" data-step="-1" data-id="${id}" aria-label="Remove one">&minus;</button>
          <output aria-live="polite">${qty}</output>
          <button type="button" data-step="1" data-id="${id}" aria-label="Add one"${qty >= MAX_QTY ? " disabled" : ""}>+</button>
        </div>
      </div>
      <div class="cart-line-end">
        <p class="cart-line-price">${formatPrice(p.price * qty)}</p>
        <button type="button" class="text-btn" data-remove="${id}">Remove</button>
      </div>
    </li>`;
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  $$("[data-cart-count]").forEach((el) => {
    el.textContent = count;
    el.hidden = count === 0;
  });
  $$("[data-cart-open]").forEach((el) => {
    el.setAttribute("aria-label", count ? `Open bag, ${count} item${count === 1 ? "" : "s"}` : "Open bag");
  });

  if (!drawer) return;
  const list = $("[data-cart-items]", drawer);
  const subtotal = cart.reduce((sum, item) => sum + findProduct(item.id).price * item.qty, 0);

  list.innerHTML = cart.length
    ? `<ul class="cart-lines">${cart.map(cartLine).join("")}</ul>`
    : `<div class="cart-empty"><p>Your bag is empty.</p><a class="btn btn-primary" href="/shop.html">Shop the lineup</a></div>`;
  $("[data-cart-subtotal]", drawer).textContent = formatPrice(subtotal);
  $("[data-checkout]", drawer).disabled = cart.length === 0;
}

function addToCart(id) {
  const current = qtyOf(id);
  if (current >= MAX_QTY) {
    showCartNote(`Online orders are limited to ${MAX_QTY} of each item. For larger orders, open a wholesale account.`);
  } else {
    setQty(id, current + 1);
    showCartNote(defaultCartNote);
  }
  if (drawer && !drawer.open) drawer.showModal();
}

function showCartNote(text) {
  if (cartStatus) cartStatus.textContent = text;
}

async function checkout(button) {
  if (!cart.length) return;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Opening checkout…";
  showCartNote(defaultCartNote);

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) {
      throw new Error(data.error ?? "Checkout is unavailable right now. Please try again shortly.");
    }
    window.location.assign(data.url);
    return;
  } catch (error) {
    showCartNote(
      error instanceof TypeError
        ? "We couldn't reach checkout. Check your connection and try again."
        : error.message,
    );
  }
  button.disabled = false;
  button.textContent = label;
}

function initCart() {
  renderCart();
  if (!drawer) return;

  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add]");
    if (add) addToCart(add.dataset.add);
  });

  drawer.addEventListener("click", (event) => {
    const step = event.target.closest("[data-step]");
    if (step) {
      const { id } = step.dataset;
      setQty(id, qtyOf(id) + Number(step.dataset.step));
      const sameButton = $(`[data-id="${id}"][data-step="${step.dataset.step}"]:not(:disabled)`, drawer);
      (sameButton ?? $("[data-close]", drawer)).focus();
      return;
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      setQty(remove.dataset.remove, 0);
      $("[data-close]", drawer).focus();
      return;
    }
    const checkoutButton = event.target.closest("[data-checkout]");
    if (checkoutButton) checkout(checkoutButton);
  });

  // Keep the bag in sync across open tabs.
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      cart = readCart();
      renderCart();
    }
  });

  // Returning from Stripe with the back button restores this page from cache;
  // reset the checkout button so it isn't stuck in its loading state.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    cart = readCart();
    const button = $("[data-checkout]", drawer);
    button.textContent = "Check out";
    renderCart();
  });
}

/* ------------------------------------------------------------------ */
/* Dialogs (bag + mobile menu)                                         */
/* ------------------------------------------------------------------ */

function initDialogs() {
  const pairs = [
    ["#cart", "[data-cart-open]"],
    ["#menu", "[data-menu-open]"],
  ];
  for (const [dialogSelector, openerSelector] of pairs) {
    const dialog = $(dialogSelector);
    if (!dialog) continue;
    $$(openerSelector).forEach((opener) => opener.addEventListener("click", () => dialog.showModal()));
    dialog.addEventListener("click", (event) => {
      // A click on the dialog element itself is a click on the backdrop.
      if (event.target === dialog || event.target.closest("[data-close]")) dialog.close();
    });
  }
}

/* ------------------------------------------------------------------ */
/* Product grids                                                       */
/* ------------------------------------------------------------------ */

function productCard(p) {
  const action = p.comingSoon
    ? `<a class="btn btn-outline" href="#newsletter">Get notified</a>`
    : `<button class="btn btn-primary" type="button" data-add="${p.id}">Add to bag</button>`;
  return `
    <article class="product" data-line="${p.line}">
      <div class="product-media">
        <img src="/img/${p.image}-640.webp"
             srcset="/img/${p.image}-640.webp 640w, /img/${p.image}-1024.webp 1024w"
             sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 400px"
             width="640" height="640" alt="${p.alt}" loading="lazy" decoding="async">
      </div>
      <div class="product-body">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-pack">${p.pack}</p>
        <div class="product-buy">
          <p class="product-price">${p.comingSoon ? "Coming soon" : formatPrice(p.price)}</p>
          ${action}
        </div>
      </div>
    </article>`;
}

function initProductGrids() {
  $$("[data-products]").forEach((grid) => {
    const lines = grid.dataset.products.split(/\s+/);
    const items = lines.includes("all") ? PRODUCTS : PRODUCTS.filter((p) => lines.includes(p.line));
    grid.innerHTML = items.map(productCard).join("");
  });
}

function initShopFilter() {
  const buttons = $$("[data-filter]");
  if (!buttons.length) return;
  const grid = $("[data-products]");
  const status = $("[data-filter-status]");

  const apply = (filter) => {
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === filter)));
    let shown = 0;
    $$(".product", grid).forEach((card) => {
      const match = filter === "all" || card.dataset.line === filter;
      card.hidden = !match;
      if (match) shown += 1;
    });
    if (status) {
      status.textContent = `Showing ${shown} ${filter === "all" ? "products" : `${LINES[filter]} products`}`;
    }
  };

  buttons.forEach((b) => b.addEventListener("click", () => apply(b.dataset.filter)));
  const fromHash = location.hash.slice(1);
  apply(LINES[fromHash] ? fromHash : "all");
}

/* ------------------------------------------------------------------ */
/* "What do you need?" finder                                          */
/* ------------------------------------------------------------------ */

const FINDER = {
  energy: {
    title: "Pure Energy",
    text: "200 mg of caffeine with L-theanine and zero sugar. For early sets, long shifts and the drive home.",
    image: "energy-tennis",
    alt: "Woman holding a Pure Energy can on a hillside",
    href: "/energy.html",
    cta: "Shop Pure Energy",
  },
  protein: {
    title: "Perry's Protein",
    text: "30 grams of protein in Vanilla, Chocolate, Strawberry and Matcha. Breakfast, post-workout, or the 3 p.m. slump.",
    image: "protein-matcha",
    alt: "Perry's Protein Matcha bottle and carton",
    href: "/protein.html",
    cta: "Shop Perry's Protein",
  },
  pop: {
    title: "Pure Pop",
    text: "Caffeine-free sparkling soda with prebiotics, postbiotics and vitamins. Good with lunch, dinner, or nothing at all.",
    image: "pop-lineup",
    alt: "Pure Pop cans in four flavors",
    href: "/pop.html",
    cta: "Shop Pure Pop",
  },
};

function initFinder() {
  const root = $("[data-finder]");
  if (!root) return;
  const options = $$("[data-finder-option]", root);
  const img = $("[data-finder-image]", root);
  const title = $("[data-finder-title]", root);
  const text = $("[data-finder-text]", root);
  const link = $("[data-finder-link]", root);

  options.forEach((option) =>
    option.addEventListener("click", () => {
      const key = option.dataset.finderOption;
      const result = FINDER[key];
      options.forEach((o) => o.setAttribute("aria-pressed", String(o === option)));
      img.src = `/img/${result.image}-640.webp`;
      img.srcset = `/img/${result.image}-640.webp 640w, /img/${result.image}-1024.webp 1024w`;
      img.alt = result.alt;
      title.textContent = result.title;
      text.textContent = result.text;
      link.href = result.href;
      link.textContent = result.cta;
      root.dataset.finderLine = key;
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Forms (Netlify Forms, submitted in place)                           */
/* ------------------------------------------------------------------ */

function initForms() {
  $$("form[data-netlify]").forEach((form) => {
    const status = $("[data-form-status]", form);
    const button = $("button[type=submit]", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const label = button.textContent;
      button.disabled = true;
      button.textContent = "Sending…";
      status.textContent = "";
      status.classList.remove("is-error");

      try {
        const response = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(new FormData(form)).toString(),
        });
        if (!response.ok) throw new Error(String(response.status));
        form.reset();
        status.textContent = form.dataset.success;
      } catch {
        status.textContent = "That didn't go through. Check your connection and try again.";
        status.classList.add("is-error");
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Order confirmation                                                  */
/* ------------------------------------------------------------------ */

function initSuccessPage() {
  if (document.body.dataset.page === "success" && new URLSearchParams(location.search).has("session_id")) {
    saveCart([]);
  }
}

initProductGrids();
initDialogs();
initCart();
initShopFilter();
initFinder();
initForms();
initSuccessPage();
