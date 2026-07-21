const STORE_KEYS = {
  products: "talomart_products_v1",
  cart: "talomart_cart_v1",
  wishlist: "talomart_wishlist_v1",
  users: "talomart_users_v1",
  currentUser: "talomart_current_user_v1",
  orders: "talomart_orders_v1"
};

const categories = [
  { name: "Phones", count: 86, art: "📱" },
  { name: "Audio", count: 124, art: "🎧" },
  { name: "Charging", count: 98, art: "🔋" },
  { name: "Storage", count: 56, art: "💾" },
  { name: "Cameras", count: 42, art: "📷" },
  { name: "Accessories", count: 173, art: "⌚" }
];

const defaultProducts = [
  {
    id: 1, category: "Phones", name: "Samsung Galaxy A15 128GB, 6GB RAM", price: 22999, oldPrice: 26999, discount: 15, rating: 4.8, reviews: 126, stock: 18,
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=700&q=85",
    description: "A dependable everyday smartphone with a vivid display, generous storage and a battery designed to keep up with work and entertainment.",
    features: ["128GB storage", "6GB RAM", "Dual SIM", "1-year warranty"]
  },
  {
    id: 2, category: "Audio", name: "AirBeats Pro Wireless Earbuds with ANC", price: 3499, oldPrice: 4999, discount: 30, rating: 4.7, reviews: 89, stock: 31,
    image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=700&q=85",
    description: "Compact wireless earbuds with active noise cancellation, crisp call quality and a pocket-sized charging case.",
    features: ["Active noise cancellation", "24-hour battery", "Touch controls", "Bluetooth 5.3"]
  },
  {
    id: 3, category: "Charging", name: "Oraimo 20,000mAh Fast-Charge Powerbank", price: 2899, oldPrice: 3799, discount: 24, rating: 4.9, reviews: 214, stock: 8,
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=700&q=85",
    description: "Reliable high-capacity backup power with fast charging and multiple outputs for phones, earbuds and other daily devices.",
    features: ["20,000mAh capacity", "22.5W fast charge", "Dual USB output", "LED battery display"]
  },
  {
    id: 4, category: "Audio", name: "Havit H630BT Hybrid Wireless Headphones", price: 4199, oldPrice: 5499, discount: 24, rating: 4.6, reviews: 68, stock: 14,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85",
    description: "Comfortable over-ear headphones with rich sound, soft cushions and enough battery for long listening sessions.",
    features: ["Deep bass drivers", "Foldable design", "35-hour battery", "Built-in microphone"]
  },
  {
    id: 5, category: "Storage", name: "SanDisk Ultra 128GB Dual USB Flash Drive", price: 1799, oldPrice: 2299, discount: 22, rating: 4.8, reviews: 152, stock: 26,
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=700&q=85",
    description: "Move photos, documents and videos easily between phones and computers with dual USB connectivity.",
    features: ["128GB capacity", "USB 3.1", "Dual connector", "5-year warranty"]
  },
  {
    id: 6, category: "Cameras", name: "Compact 4K Action Camera + Accessory Kit", price: 8999, oldPrice: 10999, discount: 18, rating: 4.5, reviews: 41, stock: 4,
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=85",
    description: "Capture sharp travel, sport and family footage with a compact 4K camera and a versatile mounting kit.",
    features: ["4K recording", "Waterproof housing", "Wi-Fi control", "Accessory bundle"]
  },
  {
    id: 7, category: "Accessories", name: "Type-C 6-in-1 Aluminium OTG Hub", price: 2399, oldPrice: 2999, discount: 20, rating: 4.7, reviews: 73, stock: 17,
    image: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=700&q=85",
    description: "Expand one USB-C port into the connections you need for storage, displays, charging and everyday productivity.",
    features: ["HDMI output", "USB 3.0 ports", "SD card reader", "Power delivery"]
  },
  {
    id: 8, category: "Charging", name: "65W GaN Fast Charger with USB-C Cable", price: 3299, oldPrice: 3999, discount: 18, rating: 4.9, reviews: 98, stock: 23,
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=700&q=85",
    description: "A compact GaN wall charger powerful enough for phones, tablets and compatible laptops, with intelligent power delivery.",
    features: ["65W USB-C PD", "GaN technology", "Overheat protection", "Cable included"]
  },
  {
    id: 9, category: "Storage", name: "Samsung EVO Plus 256GB Memory Card", price: 2999, oldPrice: 3699, discount: 19, rating: 4.8, reviews: 117, stock: 12,
    image: "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?auto=format&fit=crop&w=700&q=85",
    description: "Fast, dependable storage for Android phones, action cameras and other compatible devices.",
    features: ["256GB capacity", "U3 speed class", "4K-ready", "Adapter included"]
  },
  {
    id: 10, category: "Accessories", name: "Braided 100W USB-C to USB-C Cable", price: 899, oldPrice: 1299, discount: 31, rating: 4.7, reviews: 206, stock: 45,
    image: "https://images.unsplash.com/photo-1610438250910-01cb769c1334?auto=format&fit=crop&w=700&q=85",
    description: "A durable braided cable for rapid charging and dependable data transfer across USB-C devices.",
    features: ["100W power support", "2-metre length", "Braided finish", "Data transfer"]
  }
];

const defaultUsers = [
  { id: 1, firstName: "Amina", lastName: "Wanjiku", email: "customer@talomart.co.ke", phone: "0712 345 678", password: "shop123", role: "customer" }
];

const seedOrder = {
  id: "TLM-260628-1042",
  userId: 1,
  customer: "Amina Wanjiku",
  email: "customer@talomart.co.ke",
  phone: "0712 345 678",
  address: "Westlands, Nairobi",
  items: [{ id: 2, quantity: 1, price: 3499, name: "AirBeats Pro Wireless Earbuds with ANC", image: defaultProducts[1].image }],
  subtotal: 3499,
  delivery: 300,
  total: 3799,
  payment: "M-Pesa",
  status: "Delivered",
  createdAt: "2026-06-28T10:30:00.000Z"
};

function loadJSON(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

let products = loadJSON(STORE_KEYS.products, defaultProducts);
let cart = loadJSON(STORE_KEYS.cart, []);
let wishlist = new Set(loadJSON(STORE_KEYS.wishlist, []));
let users = loadJSON(STORE_KEYS.users, defaultUsers);
let orders = loadJSON(STORE_KEYS.orders, [seedOrder]);
let currentUserId = Number(localStorage.getItem(STORE_KEYS.currentUser)) || null;
let activeFilter = "all";
let pendingAction = null;
let adminSession = false;
let adminView = "dashboard";

const categoryGrid = document.querySelector("#category-grid");
const productGrid = document.querySelector("#product-grid");
const noResults = document.querySelector("#no-results");
const searchInput = document.querySelector("#search-input");
const priceFilter = document.querySelector("#price-filter");
const sortProducts = document.querySelector("#sort-products");
const overlay = document.querySelector("#overlay");
const formatPrice = value => new Intl.NumberFormat("en-KE").format(value);
const currentUser = () => users.find(user => user.id === currentUserId) || null;

function persist() {
  localStorage.setItem(STORE_KEYS.products, JSON.stringify(products));
  localStorage.setItem(STORE_KEYS.cart, JSON.stringify(cart));
  localStorage.setItem(STORE_KEYS.wishlist, JSON.stringify([...wishlist]));
  localStorage.setItem(STORE_KEYS.users, JSON.stringify(users));
  localStorage.setItem(STORE_KEYS.orders, JSON.stringify(orders));
  if (currentUserId) localStorage.setItem(STORE_KEYS.currentUser, String(currentUserId));
  else localStorage.removeItem(STORE_KEYS.currentUser);
}

function renderCategories() {
  categoryGrid.innerHTML = categories.map(category => `
    <button class="category-card" data-category="${category.name}" aria-label="Shop ${category.name}">
      <span class="category-art"><span class="emoji-art" aria-hidden="true">${category.art}</span></span>
      <strong>${category.name}</strong>
      <small>${category.count} products</small>
    </button>
  `).join("");
}

function getVisibleProducts(filter = activeFilter, query = searchInput.value) {
  const normalizedQuery = query.trim().toLowerCase();
  let visible = products.filter(product => {
    const matchesCategory = filter === "all" || product.category === filter;
    const matchesSearch = !normalizedQuery || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(normalizedQuery);
    const price = priceFilter.value;
    const matchesPrice =
      price === "all" ||
      (price === "under-3000" && product.price < 3000) ||
      (price === "3000-10000" && product.price >= 3000 && product.price <= 10000) ||
      (price === "over-10000" && product.price > 10000);
    return matchesCategory && matchesSearch && matchesPrice;
  });

  const sort = sortProducts.value;
  if (sort === "price-low") visible.sort((a, b) => a.price - b.price);
  if (sort === "price-high") visible.sort((a, b) => b.price - a.price);
  if (sort === "rating") visible.sort((a, b) => b.rating - a.rating);
  return visible;
}

function renderProducts(filter = activeFilter, query = searchInput.value) {
  activeFilter = filter;
  const visible = getVisibleProducts(filter, query);
  const filterLabel = filter === "all" ? (query ? `Results for “${query.trim()}”` : "Curated deals for you") : `${filter} collection`;

  document.querySelector("#results-count").textContent = `${visible.length} product${visible.length === 1 ? "" : "s"}`;
  document.querySelector("#active-filter-label").textContent = filterLabel;
  productGrid.innerHTML = visible.map(product => `
    <article class="product-card">
      <span class="discount">-${product.discount}%</span>
      <button class="wish-button ${wishlist.has(product.id) ? "active" : ""}" data-wish="${product.id}" aria-label="Save ${product.name}">
        <svg><use href="#icon-heart"></use></svg>
      </button>
      <div class="product-image" data-product="${product.id}" role="button" tabindex="0" aria-label="View ${product.name}">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        <span class="product-stock">${product.stock > 5 ? "In stock" : `Only ${product.stock} left`}</span>
      </div>
      <div class="product-info">
        <span class="product-category">${product.category}</span>
        <h3 data-product="${product.id}" tabindex="0">${product.name}</h3>
        <div class="rating"><span class="stars">★★★★★</span> ${product.rating} (${product.reviews})</div>
        <div class="price-line"><strong>KSh ${formatPrice(product.price)}</strong><del>KSh ${formatPrice(product.oldPrice)}</del></div>
      </div>
      <button class="add-button" data-add="${product.id}" aria-label="Add ${product.name} to cart">+</button>
    </article>
  `).join("");

  noResults.classList.toggle("show", visible.length === 0);
}

function cartQuantity() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartSubtotal() {
  return cart.reduce((sum, item) => {
    const product = products.find(candidate => candidate.id === item.id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
}

function updateCart() {
  cart = cart.filter(item => products.some(product => product.id === item.id) && item.quantity > 0);
  const total = cartSubtotal();
  const count = cartQuantity();
  document.querySelector("#cart-count").textContent = count;
  document.querySelector("#cart-total").textContent = formatPrice(total);
  document.querySelector("#drawer-total").textContent = formatPrice(total);
  document.querySelector("#drawer-empty").classList.toggle("hidden", cart.length > 0);
  document.querySelector("#drawer-footer").classList.toggle("hidden", cart.length === 0);
  document.querySelector("#drawer-items").innerHTML = cart.map(item => {
    const product = products.find(candidate => candidate.id === item.id);
    return `
      <div class="drawer-item">
        <img src="${product.image}" alt="">
        <div>
          <h4>${product.name}</h4>
          <p>KSh ${formatPrice(product.price * item.quantity)}</p>
          <div class="item-quantity">
            <button data-quantity="${product.id}" data-delta="-1" aria-label="Decrease ${product.name} quantity">−</button>
            <span>${item.quantity}</span>
            <button data-quantity="${product.id}" data-delta="1" aria-label="Increase ${product.name} quantity">+</button>
          </div>
        </div>
        <button data-remove="${product.id}" aria-label="Remove ${product.name}">×</button>
      </div>
    `;
  }).join("");
  persist();
}

function addToCart(productId, quantity = 1) {
  const product = products.find(item => item.id === productId);
  if (!product || product.stock < 1) return;
  const existing = cart.find(item => item.id === productId);
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, product.stock);
  else cart.push({ id: productId, quantity: Math.min(quantity, product.stock) });
  updateCart();
  showToast(`${product.name.split(" ").slice(0, 4).join(" ")} added to cart`);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.querySelector("span").textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function openCart() {
  closeAll(false);
  document.querySelector("#cart-drawer").classList.add("open");
  document.querySelector("#cart-drawer").setAttribute("aria-hidden", "false");
  overlay.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeAll(clearPending = true) {
  document.querySelector("#cart-drawer").classList.remove("open");
  document.querySelector("#cart-drawer").setAttribute("aria-hidden", "true");
  document.querySelectorAll(".app-modal.open").forEach(modal => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  });
  overlay.classList.remove("show");
  document.body.style.overflow = "";
  if (clearPending) pendingAction = null;
}

function openModal(id) {
  closeAll(false);
  const modal = document.querySelector(`#${id}`);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  overlay.classList.add("show");
  document.body.style.overflow = "hidden";
}

function renderProductDetail(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;
  document.querySelector("#product-modal-content").innerHTML = `
    <div class="product-detail">
      <div class="product-gallery">
        <span class="discount">Save ${product.discount}%</span>
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="product-detail-copy">
        <span class="product-category">${product.category}</span>
        <h2 id="product-modal-title">${product.name}</h2>
        <div class="product-detail-rating"><span class="stars">★★★★★</span><strong>${product.rating}</strong><span>${product.reviews} verified reviews</span></div>
        <div class="detail-price"><strong>KSh ${formatPrice(product.price)}</strong><del>KSh ${formatPrice(product.oldPrice)}</del></div>
        <p class="detail-description">${product.description}</p>
        <ul class="detail-features">
          ${product.features.map(feature => `<li><svg><use href="#icon-check"></use></svg>${feature}</li>`).join("")}
        </ul>
        <div class="stock-status">${product.stock} units available</div>
        <div class="detail-actions">
          <button class="primary-button" data-add="${product.id}"><svg><use href="#icon-bag"></use></svg> Add to cart</button>
          <button class="detail-wish ${wishlist.has(product.id) ? "active" : ""}" data-wish="${product.id}" aria-label="Save ${product.name}"><svg><use href="#icon-heart"></use></svg></button>
        </div>
        <div class="detail-meta">
          <span><svg><use href="#icon-delivery"></use></svg> Countrywide delivery</span>
          <span><svg><use href="#icon-shield"></use></svg> Genuine guarantee</span>
          <span><svg><use href="#icon-refresh"></use></svg> 7-day returns</span>
        </div>
      </div>
    </div>
  `;
  openModal("product-modal");
}

function updateAccountHeader() {
  const user = currentUser();
  const accountButton = document.querySelector("#account-button");
  if (user) {
    accountButton.querySelector("small").textContent = `Hello, ${user.firstName}`;
    accountButton.querySelector("strong").textContent = "My orders";
  } else {
    accountButton.querySelector("small").textContent = "Hello, sign in";
    accountButton.querySelector("strong").textContent = "My Account";
  }
  document.querySelector("#wish-count").textContent = wishlist.size;
}

function switchAuthTab(tabName) {
  document.querySelectorAll("[data-auth-tab]").forEach(button => button.classList.toggle("active", button.dataset.authTab === tabName));
  document.querySelectorAll("[data-auth-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.authPanel === tabName));
}

function openAuth(action = null) {
  pendingAction = action;
  switchAuthTab("login");
  openModal("auth-modal");
}

function handleAuthenticated() {
  updateAccountHeader();
  persist();
  const action = pendingAction;
  pendingAction = null;
  if (action === "checkout") renderCheckout();
  else renderAccount();
}

function renderCheckout() {
  const user = currentUser();
  if (!user) {
    openAuth("checkout");
    showToast("Please sign in to continue to checkout");
    return;
  }
  if (!cart.length) {
    showToast("Your cart is empty");
    return;
  }

  const subtotal = cartSubtotal();
  const delivery = subtotal >= 5000 ? 0 : 300;
  const total = subtotal + delivery;
  document.querySelector("#checkout-content").innerHTML = `
    <form class="checkout-form" id="checkout-form">
      <div class="checkout-grid">
        <div>
          <div class="checkout-block">
            <h3><span>1</span> Delivery details</h3>
            <div class="form-row">
              <label>First name<input name="firstName" value="${user.firstName}" required></label>
              <label>Last name<input name="lastName" value="${user.lastName}" required></label>
            </div>
            <div class="form-row">
              <label>Phone number<input name="phone" value="${user.phone || ""}" placeholder="0712 345 678" required></label>
              <label>County
                <select name="county" required>
                  <option value="Nairobi">Nairobi</option>
                  <option value="Kiambu">Kiambu</option>
                  <option value="Mombasa">Mombasa</option>
                  <option value="Nakuru">Nakuru</option>
                  <option value="Kisumu">Kisumu</option>
                  <option value="Other">Other county</option>
                </select>
              </label>
            </div>
            <label>Delivery address<input name="address" placeholder="Estate, street, building or landmark" required></label>
          </div>
          <div class="checkout-block">
            <h3><span>2</span> Payment method</h3>
            <div class="payment-options">
              <label class="payment-option">
                <input type="radio" name="payment" value="M-Pesa" checked>
                <span><strong>M-Pesa</strong><small>Enter the number you will use to pay</small></span>
              </label>
              <label class="payment-option">
                <input type="radio" name="payment" value="Cash on Delivery">
                <span><strong>Cash on Delivery</strong><small>Pay when your order arrives</small></span>
              </label>
            </div>
          </div>
        </div>
        <aside class="order-summary">
          <h3>Order summary</h3>
          <div class="summary-items">
            ${cart.map(item => {
              const product = products.find(candidate => candidate.id === item.id);
              return `<div class="summary-item"><img src="${product.image}" alt=""><div><strong>${product.name}</strong><small>Qty ${item.quantity}</small></div><span>KSh ${formatPrice(product.price * item.quantity)}</span></div>`;
            }).join("")}
          </div>
          <div class="summary-totals">
            <div><span>Subtotal</span><strong>KSh ${formatPrice(subtotal)}</strong></div>
            <div><span>Delivery</span><strong>${delivery ? `KSh ${formatPrice(delivery)}` : "FREE"}</strong></div>
            <div class="grand-total"><span>Total</span><strong>KSh ${formatPrice(total)}</strong></div>
          </div>
          <button class="primary-button place-order" type="submit"><svg><use href="#icon-shield"></use></svg> Place order</button>
          <p class="checkout-terms">By placing this order, you agree to Talomart's terms of sale and return policy.</p>
        </aside>
      </div>
    </form>
  `;
  openModal("checkout-modal");
}

function createOrder(form) {
  const formData = new FormData(form);
  const user = currentUser();
  const subtotal = cartSubtotal();
  const delivery = subtotal >= 5000 ? 0 : 300;
  const orderId = `TLM-${String(new Date().getFullYear()).slice(-2)}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${String(1000 + orders.length + 1)}`;
  const order = {
    id: orderId,
    userId: user.id,
    customer: `${formData.get("firstName")} ${formData.get("lastName")}`,
    email: user.email,
    phone: formData.get("phone"),
    address: `${formData.get("address")}, ${formData.get("county")}`,
    items: cart.map(item => {
      const product = products.find(candidate => candidate.id === item.id);
      product.stock = Math.max(0, product.stock - item.quantity);
      return { id: product.id, quantity: item.quantity, price: product.price, name: product.name, image: product.image };
    }),
    subtotal,
    delivery,
    total: subtotal + delivery,
    payment: formData.get("payment"),
    status: formData.get("payment") === "M-Pesa" ? "Pending Payment" : "Processing",
    createdAt: new Date().toISOString()
  };
  orders.unshift(order);
  cart = [];
  updateCart();
  persist();
  renderProducts();
  renderOrderSuccess(order);
}

function renderOrderSuccess(order) {
  document.querySelector("#checkout-content").innerHTML = `
    <div class="order-success">
      <span class="success-check"><svg><use href="#icon-check"></use></svg></span>
      <span class="section-kicker">ORDER RECEIVED</span>
      <h2>Thank you, ${order.customer.split(" ")[0]}!</h2>
      <p>Your order has been placed successfully. We’ll send updates to <strong>${order.phone}</strong> as it moves through delivery.</p>
      <div class="order-number-card">
        <svg><use href="#icon-bag"></use></svg>
        <div><span>Order number</span><strong>${order.id}</strong></div>
      </div>
      <div class="success-actions">
        <button class="primary-button" data-track-order="${order.id}"><svg><use href="#icon-delivery"></use></svg> Track this order</button>
        <button class="secondary-button" data-close-modal>Continue shopping</button>
      </div>
    </div>
  `;
}

const statusFlow = ["Pending Payment", "Payment Confirmed", "Processing", "Packed", "Out for Delivery", "Delivered"];

function renderTracking(orderId) {
  const normalized = orderId.trim().toUpperCase();
  const order = orders.find(item => item.id.toUpperCase() === normalized);
  const result = document.querySelector("#tracking-result");
  if (!order) {
    result.innerHTML = `<div class="tracking-empty">We couldn’t find that order. Check the order number and try again.</div>`;
    return;
  }
  const statusIndex = statusFlow.indexOf(order.status);
  result.innerHTML = `
    <article class="track-card">
      <div class="track-card-head">
        <div><strong>${order.id}</strong><span>Placed ${new Date(order.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · ${order.items.length} item${order.items.length === 1 ? "" : "s"}</span></div>
        <b class="status-pill">${order.status}</b>
      </div>
      ${["Cancelled", "Returned"].includes(order.status)
        ? `<div class="tracking-empty">This order is marked as <strong>${order.status}</strong>. Contact Customer Care if you need help.</div>`
        : `<div class="status-track">${statusFlow.map((status, index) => `<div class="status-step ${index <= statusIndex ? "done" : ""}"><i></i><span>${status}</span></div>`).join("")}</div>`}
    </article>
  `;
}

function openTracking(orderId = "") {
  document.querySelector("#tracking-input").value = orderId;
  document.querySelector("#tracking-result").innerHTML = orderId ? "" : `<div class="tracking-empty">Enter the order number from your confirmation message.</div>`;
  if (orderId) renderTracking(orderId);
  openModal("tracking-modal");
}

function renderAccount() {
  const user = currentUser();
  if (!user) return openAuth();
  const userOrders = orders.filter(order => order.userId === user.id || order.email === user.email);
  const totalSpent = userOrders.reduce((sum, order) => sum + order.total, 0);
  document.querySelector("#account-content").innerHTML = `
    <div class="account-hero">
      <span class="account-avatar">${user.firstName[0]}${user.lastName[0]}</span>
      <div><h2 id="account-title">${user.firstName} ${user.lastName}</h2><p>${user.email} · ${user.phone || "No phone saved"}</p></div>
      <button class="secondary-button" data-logout>Sign out</button>
    </div>
    <div class="account-body">
      <div class="account-stats">
        <div class="account-stat"><strong>${userOrders.length}</strong><span>Total orders</span></div>
        <div class="account-stat"><strong>KSh ${formatPrice(totalSpent)}</strong><span>Lifetime spend</span></div>
        <div class="account-stat"><strong>${wishlist.size}</strong><span>Saved products</span></div>
      </div>
      <div class="account-section-title"><h3>Order history</h3><button data-open-tracking>Track an order</button></div>
      ${userOrders.length ? `
        <div class="account-orders-wrap">
          <table class="orders-table">
            <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>${userOrders.map(order => `<tr><td><strong>${order.id}</strong></td><td>${new Date(order.createdAt).toLocaleDateString("en-KE")}</td><td>${order.items.length}</td><td>KSh ${formatPrice(order.total)}</td><td><span class="status-pill">${order.status}</span></td><td><button data-track-order="${order.id}">Track</button></td></tr>`).join("")}</tbody>
          </table>
        </div>` : `<div class="orders-empty">You haven’t placed an order yet. Your purchases will appear here.</div>`}
    </div>
  `;
  openModal("account-modal");
}

function renderAdminPortal() {
  if (!adminSession) {
    document.querySelector("#admin-content").innerHTML = `
      <div class="admin-shell">
        <form class="admin-login" id="admin-login-form">
          <span class="secure-badge"><svg><use href="#icon-shield"></use></svg></span>
          <span class="section-kicker">STAFF ACCESS</span>
          <h2 id="admin-title">Talomart Admin</h2>
          <p>Sign in to manage store operations.</p>
          <label>Email<input type="email" name="email" value="admin@talomart.co.ke" required></label>
          <label>Password<input type="password" name="password" value="admin123" required></label>
          <p class="form-error" data-admin-error></p>
          <button class="primary-button" type="submit">Open dashboard</button>
          <p class="demo-hint">Demo access: admin@talomart.co.ke / admin123</p>
        </form>
      </div>
    `;
  } else {
    document.querySelector("#admin-content").innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar">
          <a class="brand footer-brand" href="#"><span class="brand-mark"><span></span></span><span class="brand-name">Talo<span>mart</span><small>ADMIN</small></span></a>
          <nav>
            <button class="${adminView === "dashboard" ? "active" : ""}" data-admin-view="dashboard">Dashboard</button>
            <button class="${["products", "add-product"].includes(adminView) ? "active" : ""}" data-admin-view="products">Products</button>
            <button class="${adminView === "orders" ? "active" : ""}" data-admin-view="orders">Orders</button>
            <button class="${adminView === "customers" ? "active" : ""}" data-admin-view="customers">Customers</button>
            <button class="${adminView === "reports" ? "active" : ""}" data-admin-view="reports">Reports</button>
            <button class="admin-logout" data-admin-logout>Sign out</button>
          </nav>
        </aside>
        <main class="admin-main" id="admin-main-content"></main>
      </div>
    `;
    renderAdminView();
  }
  openModal("admin-modal");
}

function adminHeader(title, subtitle) {
  return `<header><div><h2 id="admin-title">${title}</h2><p>${subtitle}</p></div><span class="admin-avatar">AD</span></header>`;
}

function orderRows(data) {
  return data.map(order => `
    <tr>
      <td><strong>${order.id}</strong></td>
      <td>${order.customer}</td>
      <td>KSh ${formatPrice(order.total)}</td>
      <td>${order.payment}</td>
      <td>
        <select data-order-status="${order.id}">
          ${[...statusFlow, "Cancelled", "Returned"].map(status => `<option ${order.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </td>
    </tr>
  `).join("");
}

function renderAdminView() {
  const main = document.querySelector("#admin-main-content");
  if (!main) return;
  const revenue = orders.filter(order => order.status !== "Cancelled").reduce((sum, order) => sum + order.total, 0);
  const lowStock = products.filter(product => product.stock <= 8);

  if (adminView === "dashboard") {
    main.innerHTML = `
      ${adminHeader("Store overview", "Live operational snapshot")}
      <div class="admin-metrics">
        <div class="metric-card"><span>Total sales</span><strong>KSh ${formatPrice(revenue)}</strong><small>Across ${orders.length} orders</small></div>
        <div class="metric-card"><span>Orders</span><strong>${orders.length}</strong><small>${orders.filter(order => order.status !== "Delivered").length} need attention</small></div>
        <div class="metric-card"><span>Customers</span><strong>${users.length}</strong><small>Registered accounts</small></div>
        <div class="metric-card"><span>Low stock</span><strong>${lowStock.length}</strong><small>Products to replenish</small></div>
      </div>
      <div class="admin-table-wrap">
        <div class="admin-table-head"><h3>Recent orders</h3><button data-admin-view="orders">Manage all</button></div>
        <table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>${orderRows(orders.slice(0, 6))}</tbody></table>
      </div>
    `;
  }

  if (adminView === "products") {
    main.innerHTML = `
      ${adminHeader("Products", "Manage catalogue and inventory")}
      <div class="admin-table-wrap">
        <div class="admin-table-head"><h3>${products.length} catalogue products</h3><button data-admin-add-product>+ Add product</button></div>
        <table class="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Health</th></tr></thead>
          <tbody>${products.map(product => `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>KSh ${formatPrice(product.price)}</td><td><input class="stock-input" type="number" min="0" value="${product.stock}" data-stock-input="${product.id}"></td><td class="${product.stock <= 8 ? "low-stock" : ""}">${product.stock <= 8 ? "Low stock" : "Healthy"}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    `;
  }

  if (adminView === "add-product") {
    main.innerHTML = `
      ${adminHeader("Add product", "Create a new catalogue item")}
      <form class="checkout-form checkout-block" id="admin-product-form">
        <div class="form-row">
          <label>Product name<input name="name" required></label>
          <label>Category<select name="category">${categories.map(category => `<option>${category.name}</option>`).join("")}</select></label>
        </div>
        <div class="form-row">
          <label>Selling price (KSh)<input type="number" min="1" name="price" required></label>
          <label>Original price (KSh)<input type="number" min="1" name="oldPrice" required></label>
        </div>
        <div class="form-row">
          <label>Opening stock<input type="number" min="0" name="stock" required></label>
          <label>Image URL<input type="url" name="image" placeholder="https://..." required></label>
        </div>
        <label>Description<input name="description" required></label>
        <div class="detail-actions"><button type="button" class="secondary-button" data-admin-view="products">Cancel</button><button class="primary-button" type="submit">Save product</button></div>
      </form>
    `;
  }

  if (adminView === "orders") {
    main.innerHTML = `
      ${adminHeader("Orders", "Update fulfilment and payment progress")}
      <div class="admin-table-wrap">
        <div class="admin-table-head"><h3>All orders</h3></div>
        <table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>${orderRows(orders)}</tbody></table>
      </div>
    `;
  }

  if (adminView === "customers") {
    main.innerHTML = `
      ${adminHeader("Customers", "Registered customer records")}
      <div class="admin-table-wrap">
        <div class="admin-table-head"><h3>${users.length} customers</h3></div>
        <table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Spend</th></tr></thead>
          <tbody>${users.map(user => {
            const userOrders = orders.filter(order => order.userId === user.id || order.email === user.email);
            return `<tr><td><strong>${user.firstName} ${user.lastName}</strong></td><td>${user.email}</td><td>${user.phone || "—"}</td><td>${userOrders.length}</td><td>KSh ${formatPrice(userOrders.reduce((sum, order) => sum + order.total, 0))}</td></tr>`;
          }).join("")}</tbody>
        </table>
      </div>
    `;
  }

  if (adminView === "reports") {
    const average = orders.length ? Math.round(revenue / orders.length) : 0;
    main.innerHTML = `
      ${adminHeader("Sales reports", "Performance and inventory insights")}
      <div class="admin-metrics">
        <div class="metric-card"><span>Gross revenue</span><strong>KSh ${formatPrice(revenue)}</strong><small>All recorded orders</small></div>
        <div class="metric-card"><span>Average order</span><strong>KSh ${formatPrice(average)}</strong><small>Per transaction</small></div>
        <div class="metric-card"><span>Delivered</span><strong>${orders.filter(order => order.status === "Delivered").length}</strong><small>Completed orders</small></div>
        <div class="metric-card"><span>Stock units</span><strong>${products.reduce((sum, product) => sum + product.stock, 0)}</strong><small>Across the catalogue</small></div>
      </div>
      <div class="admin-table-wrap">
        <div class="admin-table-head"><h3>Low-stock report</h3><button data-admin-view="products">Manage stock</button></div>
        <table class="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Units left</th><th>Value</th></tr></thead>
          <tbody>${lowStock.length ? lowStock.map(product => `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td class="low-stock">${product.stock}</td><td>KSh ${formatPrice(product.stock * product.price)}</td></tr>`).join("") : `<tr><td colspan="4">All products are sufficiently stocked.</td></tr>`}</tbody>
        </table>
      </div>
    `;
  }
}

document.addEventListener("click", event => {
  const addButton = event.target.closest("[data-add]");
  const wishButton = event.target.closest("[data-wish]");
  const categoryButton = event.target.closest("[data-category], [data-filter]");
  const filterJump = event.target.closest("[data-filter-jump]");
  const removeButton = event.target.closest("[data-remove]");
  const quantityButton = event.target.closest("[data-quantity]");
  const productTrigger = event.target.closest("[data-product]");
  const trackingTrigger = event.target.closest("[data-open-tracking]");
  const trackOrderButton = event.target.closest("[data-track-order]");
  const adminTrigger = event.target.closest("[data-open-admin]");
  const adminViewButton = event.target.closest("[data-admin-view]");

  if (addButton) addToCart(Number(addButton.dataset.add));

  if (wishButton) {
    const id = Number(wishButton.dataset.wish);
    wishlist.has(id) ? wishlist.delete(id) : wishlist.add(id);
    document.querySelectorAll(`[data-wish="${id}"]`).forEach(button => button.classList.toggle("active", wishlist.has(id)));
    updateAccountHeader();
    persist();
    showToast(wishlist.has(id) ? "Saved to your wishlist" : "Removed from wishlist");
  }

  if (categoryButton) {
    const filter = categoryButton.dataset.category || categoryButton.dataset.filter;
    searchInput.value = "";
    renderProducts(filter);
    document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
  }

  if (filterJump) {
    renderProducts(filterJump.dataset.filterJump);
    document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
  }

  if (removeButton) {
    cart = cart.filter(item => item.id !== Number(removeButton.dataset.remove));
    updateCart();
  }

  if (quantityButton) {
    const item = cart.find(candidate => candidate.id === Number(quantityButton.dataset.quantity));
    const product = products.find(candidate => candidate.id === item.id);
    item.quantity = Math.max(0, Math.min(product.stock, item.quantity + Number(quantityButton.dataset.delta)));
    updateCart();
  }

  if (productTrigger && !event.target.closest("[data-add], [data-wish]")) renderProductDetail(Number(productTrigger.dataset.product));
  if (trackingTrigger) {
    event.preventDefault();
    openTracking();
  }
  if (trackOrderButton) openTracking(trackOrderButton.dataset.trackOrder);
  if (adminTrigger) {
    event.preventDefault();
    renderAdminPortal();
  }

  if (event.target.closest("[data-close-modal]")) closeAll();
  if (event.target.closest("[data-logout]")) {
    currentUserId = null;
    persist();
    updateAccountHeader();
    closeAll();
    showToast("You have signed out");
  }
  if (event.target.closest("[data-admin-logout]")) {
    adminSession = false;
    adminView = "dashboard";
    renderAdminPortal();
  }
  if (adminViewButton) {
    adminView = adminViewButton.dataset.adminView;
    renderAdminPortal();
  }
  if (event.target.closest("[data-admin-add-product]")) {
    adminView = "add-product";
    renderAdminPortal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeAll();
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-product]")) {
    event.preventDefault();
    renderProductDetail(Number(event.target.dataset.product));
  }
});

document.addEventListener("change", event => {
  if (event.target.matches("[data-order-status]")) {
    const order = orders.find(item => item.id === event.target.dataset.orderStatus);
    if (order) {
      order.status = event.target.value;
      persist();
      showToast(`${order.id} updated to ${order.status}`);
      if (adminSession) renderAdminView();
    }
  }
  if (event.target.matches("[data-stock-input]")) {
    const product = products.find(item => item.id === Number(event.target.dataset.stockInput));
    if (product) {
      product.stock = Math.max(0, Number(event.target.value));
      persist();
      renderProducts();
      renderAdminView();
      showToast(`${product.name} stock updated`);
    }
  }
});

document.addEventListener("submit", event => {
  event.preventDefault();

  if (event.target.id === "search-form") {
    renderProducts("all", searchInput.value);
    document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
  }

  if (event.target.id === "login-form") {
    const data = new FormData(event.target);
    const user = users.find(item => item.email.toLowerCase() === String(data.get("email")).toLowerCase() && item.password === data.get("password"));
    if (!user) {
      document.querySelector("[data-login-error]").textContent = "That email and password combination is not valid.";
      return;
    }
    currentUserId = user.id;
    handleAuthenticated();
    showToast(`Welcome back, ${user.firstName}`);
  }

  if (event.target.id === "register-form") {
    const data = new FormData(event.target);
    const email = String(data.get("email")).toLowerCase();
    if (users.some(user => user.email.toLowerCase() === email)) {
      document.querySelector("[data-register-error]").textContent = "An account with this email already exists.";
      return;
    }
    const user = {
      id: Math.max(0, ...users.map(item => item.id)) + 1,
      firstName: data.get("firstName"),
      lastName: data.get("lastName"),
      email,
      phone: data.get("phone"),
      password: data.get("password"),
      role: "customer"
    };
    users.push(user);
    currentUserId = user.id;
    handleAuthenticated();
    showToast("Your Talomart account is ready");
  }

  if (event.target.id === "checkout-form") createOrder(event.target);
  if (event.target.id === "tracking-form") renderTracking(document.querySelector("#tracking-input").value);

  if (event.target.id === "admin-login-form") {
    const data = new FormData(event.target);
    if (data.get("email") === "admin@talomart.co.ke" && data.get("password") === "admin123") {
      adminSession = true;
      adminView = "dashboard";
      renderAdminPortal();
      showToast("Admin access granted");
    } else {
      document.querySelector("[data-admin-error]").textContent = "Invalid administrator credentials.";
    }
  }

  if (event.target.id === "admin-product-form") {
    const data = new FormData(event.target);
    const price = Number(data.get("price"));
    const oldPrice = Number(data.get("oldPrice"));
    products.unshift({
      id: Math.max(0, ...products.map(product => product.id)) + 1,
      category: data.get("category"),
      name: data.get("name"),
      price,
      oldPrice,
      discount: Math.max(0, Math.round((1 - price / oldPrice) * 100)),
      rating: 5,
      reviews: 0,
      stock: Number(data.get("stock")),
      image: data.get("image"),
      description: data.get("description"),
      features: ["Genuine product", "Quality checked", "Talomart support", "7-day returns"]
    });
    persist();
    renderProducts();
    adminView = "products";
    renderAdminPortal();
    showToast("Product added to the catalogue");
  }
});

document.querySelectorAll("[data-auth-tab]").forEach(button => button.addEventListener("click", () => switchAuthTab(button.dataset.authTab)));
document.querySelector("[data-forgot-password]").addEventListener("click", () => showToast("Password reset instructions will be sent by email"));
searchInput.addEventListener("input", () => { if (!searchInput.value) renderProducts("all", ""); });
priceFilter.addEventListener("change", () => renderProducts());
sortProducts.addEventListener("change", () => renderProducts());
document.querySelector("#reset-search").addEventListener("click", () => {
  searchInput.value = "";
  priceFilter.value = "all";
  sortProducts.value = "featured";
  renderProducts("all", "");
});
document.querySelector("#cart-button").addEventListener("click", openCart);
document.querySelector("#close-cart").addEventListener("click", closeAll);
document.querySelector("#checkout-button").addEventListener("click", renderCheckout);
document.querySelector("#account-button").addEventListener("click", () => currentUser() ? renderAccount() : openAuth());
overlay.addEventListener("click", closeAll);
document.querySelector("[data-scroll-products]").addEventListener("click", () => document.querySelector("#products").scrollIntoView({ behavior: "smooth" }));
document.querySelector("[data-scroll-categories]").addEventListener("click", () => document.querySelector("#categories").scrollIntoView({ behavior: "smooth" }));

let secondsRemaining = 4 * 3600 + 26 * 60 + 18;
setInterval(() => {
  secondsRemaining = secondsRemaining > 0 ? secondsRemaining - 1 : 6 * 3600;
  const hours = String(Math.floor(secondsRemaining / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((secondsRemaining % 3600) / 60)).padStart(2, "0");
  const seconds = String(secondsRemaining % 60).padStart(2, "0");
  document.querySelector("#countdown").innerHTML = `<b>${hours}</b><i>:</i><b>${minutes}</b><i>:</i><b>${seconds}</b>`;
}, 1000);

renderCategories();
renderProducts();
updateCart();
updateAccountHeader();
document.querySelector("#footer-year").textContent = new Date().getFullYear();
