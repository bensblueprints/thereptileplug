// ==================== SPA ROUTER ====================
let cartCount = 0;

async function subscribeEmail(form) {
  const email = form.querySelector('input').value;
  try {
    await fetch('/api/subscribers/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'footer' })
    });
    form.querySelector('input').value = '';
    showToast('Subscribed! You\'ll get updates & deals.');
  } catch(e) { showToast('Error subscribing'); }
}

const categoryIcons = {
  'new-restock': 'fa-fire',
  'snakes': 'fa-worm',
  'geckos': 'fa-frog',
  'isopods': 'fa-bug',
  'feeders': 'fa-drumstick-bite',
  'supplies': 'fa-box-open'
};

// Init
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => document.getElementById('loader').classList.add('hidden'), 1400);
  handleRoute();
  updateCartCount();
  initHeader();
  initLinks();
});

window.addEventListener('popstate', handleRoute);

function initLinks() {
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-link]');
    if (link) {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href && href !== window.location.pathname + window.location.search) {
        history.pushState(null, '', href);
        handleRoute();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });
}

function navigate(path) {
  history.pushState(null, '', path);
  handleRoute();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleRoute() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Update active nav
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === path ||
      (path === '/shop' && l.getAttribute('href')?.includes('/shop')));
  });

  if (path === '/' || path === '') renderHome();
  else if (path === '/shop') renderShop(params);
  else if (path.startsWith('/product/')) renderProduct(path.split('/product/')[1]);
  else if (path === '/cart') renderCart();
  else if (path === '/checkout') renderCheckout();
  else if (path === '/contact') renderContact();
  else if (path.startsWith('/order/')) renderOrderConfirm(path.split('/order/')[1]);
  else renderHome();
}

function initHeader() {
  window.addEventListener('scroll', () => {
    document.getElementById('header').classList.toggle('scrolled', window.scrollY > 50);
  });
}

function toggleSearch() {
  document.getElementById('searchBar').classList.toggle('active');
  if (document.getElementById('searchBar').classList.contains('active')) {
    document.getElementById('searchInput').focus();
  }
}

function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (q) { navigate('/shop?search=' + encodeURIComponent(q)); toggleSearch(); }
}

function toggleMobile() { document.getElementById('mobileNav').classList.toggle('active'); }
function closeMobile() { document.getElementById('mobileNav').classList.remove('active'); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function updateCartCount() {
  try {
    const res = await fetch('/api/cart');
    const items = await res.json();
    cartCount = items.reduce((a, b) => a + b.quantity, 0);
    document.getElementById('cartCount').textContent = cartCount;
  } catch(e) {}
}

// ==================== HOME PAGE ====================
async function renderHome() {
  const app = document.getElementById('app');
  const [categories, products] = await Promise.all([
    fetch('/api/shop/categories').then(r => r.json()),
    fetch('/api/shop/products?featured=1').then(r => r.json())
  ]);

  app.innerHTML = `
    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-particles" id="particles"></div>
      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-badge"><i class="fas fa-circle"></i> Now Shipping Nationwide</div>
          <h1>
            <span class="script">Your Ultimate</span>
            Premium <span class="accent">Reptiles</span><br>
            Delivered to Your Door
          </h1>
          <p class="hero-desc">Captive bred, ethically sourced snakes, geckos, isopods, and more. Every animal comes with our live arrival guarantee.</p>
          <div class="hero-actions">
            <a href="/shop" class="btn btn-primary" data-link><i class="fas fa-shopping-bag"></i> Shop Now</a>
            <a href="/shop?category=snakes" class="btn btn-outline" data-link>View Snakes</a>
          </div>
          <div class="hero-stats">
            <div class="stat"><div class="stat-num" data-count="500">0</div><div class="stat-label">Animals Sold</div></div>
            <div class="stat"><div class="stat-num" data-count="50">0</div><div class="stat-label">Species</div></div>
            <div class="stat"><div class="stat-num" data-count="100">0</div><div class="stat-label">5-Star Reviews</div></div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-glow"></div>
        </div>
      </div>
    </section>

    <!-- MARQUEE -->
    <div class="marquee">
      <div class="marquee-track">
        ${Array(2).fill(`
          <span class="marquee-item"><i class="fas fa-circle"></i> Live Arrival Guarantee</span>
          <span class="marquee-item"><i class="fas fa-circle"></i> Captive Bred Only</span>
          <span class="marquee-item"><i class="fas fa-circle"></i> Free Shipping Over $100</span>
          <span class="marquee-item"><i class="fas fa-circle"></i> Overnight Shipping Available</span>
          <span class="marquee-item"><i class="fas fa-circle"></i> Expert Support</span>
          <span class="marquee-item"><i class="fas fa-circle"></i> Ethically Sourced</span>
        `).join('')}
      </div>
    </div>

    <!-- CATEGORIES -->
    <section class="section">
      <div class="section-header">
        <div class="section-tag">Browse</div>
        <h2 class="section-title">Shop by Category</h2>
        <p class="section-desc">Find exactly what you're looking for</p>
      </div>
      <div class="categories-grid">
        ${categories.map(c => `
          <div class="category-card" onclick="navigate('/shop?category=${c.slug}')">
            <div class="category-icon"><i class="fas ${categoryIcons[c.slug] || 'fa-paw'}"></i></div>
            <h3>${c.name}</h3>
            <p>${c.description || ''}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- FEATURED -->
    <section class="section" style="padding-top: 0;">
      <div class="section-header">
        <div class="section-tag">Hot Right Now</div>
        <h2 class="section-title">Featured Animals</h2>
        <p class="section-desc">Hand-picked premium specimens</p>
      </div>
      <div class="products-grid">
        ${products.slice(0, 8).map(p => productCard(p)).join('')}
      </div>
      <div style="text-align: center; margin-top: 48px;">
        <a href="/shop" class="btn btn-outline" data-link>View All Products <i class="fas fa-arrow-right"></i></a>
      </div>
    </section>

    <!-- BANNER -->
    <section class="featured-banner">
      <div class="banner-inner">
        <div class="banner-glow"></div>
        <div class="banner-text">
          <h2>Live Arrival<br>Guaranteed</h2>
          <p>Every animal ships with our unconditional live arrival guarantee. We use insulated boxes with heat/cold packs and overnight shipping to ensure your new pet arrives safe and healthy.</p>
          <a href="/shop" class="btn btn-primary" data-link>Shop with Confidence</a>
        </div>
        <div style="position:relative;z-index:2;text-align:center;">
          <div style="font-size:120px;color:var(--accent);opacity:0.3;"><i class="fas fa-shield-alt"></i></div>
        </div>
      </div>
    </section>

    <!-- MORE PRODUCTS -->
    <section class="section">
      <div class="section-header">
        <div class="section-tag">Just Added</div>
        <h2 class="section-title">New Arrivals</h2>
      </div>
      <div class="products-grid">
        ${products.slice(8, 12).map(p => productCard(p)).join('')}
      </div>
    </section>
  `;

  animateHome();
  createParticles();
}

function productCard(p) {
  const hasSale = p.compare_price && p.compare_price > p.price;
  const isNew = (Date.now() - new Date(p.created_at).getTime()) < 7 * 86400000;
  const outOfStock = p.stock <= 0;

  return `
    <div class="product-card" onclick="navigate('/product/${p.slug}')">
      <div class="product-image">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" loading="lazy">`
          : `<div class="product-placeholder"><i class="fas ${p.category_slug === 'snakes' ? 'fa-worm' : p.category_slug === 'geckos' ? 'fa-frog' : p.category_slug === 'isopods' ? 'fa-bug' : p.category_slug === 'feeders' ? 'fa-drumstick-bite' : p.category_slug === 'supplies' ? 'fa-box-open' : 'fa-paw'}"></i></div>`
        }
        <div class="product-badges">
          ${hasSale ? `<span class="badge badge-sale">Sale</span>` : ''}
          ${isNew ? `<span class="badge badge-new">New</span>` : ''}
          ${outOfStock ? `<span class="badge badge-soldout">Sold Out</span>` : ''}
        </div>
        ${!outOfStock ? `
          <div class="product-quick-add">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();addToCart(${p.id})">
              <i class="fas fa-plus"></i> Add
            </button>
          </div>
        ` : ''}
      </div>
      <div class="product-info">
        <div class="product-category">${p.category_name || ''}</div>
        <h3 class="product-name">${p.name}</h3>
        <div class="product-meta">
          ${p.sex ? `<span><i class="fas fa-venus-mars"></i> ${p.sex}</span>` : ''}
          ${p.morph ? `<span><i class="fas fa-palette"></i> ${p.morph}</span>` : ''}
        </div>
        <div class="product-pricing">
          <span class="product-price">$${p.price.toFixed(2)}</span>
          ${hasSale ? `<span class="product-compare">$${p.compare_price.toFixed(2)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ==================== SHOP PAGE ====================
async function renderShop(params) {
  const category = params?.get('category') || '';
  const search = params?.get('search') || '';
  const sort = params?.get('sort') || '';

  const [categories, products] = await Promise.all([
    fetch('/api/shop/categories').then(r => r.json()),
    fetch(`/api/shop/products?category=${category}&search=${search}&sort=${sort}`).then(r => r.json())
  ]);

  const app = document.getElementById('app');
  const activeCategory = categories.find(c => c.slug === category);

  app.innerHTML = `
    <div class="shop-hero">
      <h1>${activeCategory ? activeCategory.name : search ? `Search: "${search}"` : 'Shop All'}</h1>
      <p>${activeCategory ? activeCategory.description : `${products.length} products available`}</p>
    </div>
    <div class="shop-filters">
      <div class="filter-tabs">
        <button class="filter-tab ${!category ? 'active' : ''}" onclick="navigate('/shop')">All</button>
        ${categories.map(c => `
          <button class="filter-tab ${category === c.slug ? 'active' : ''}" onclick="navigate('/shop?category=${c.slug}')">${c.name}</button>
        `).join('')}
      </div>
      <select class="sort-select" onchange="navigate('/shop?category=${category}&sort=' + this.value)">
        <option value="" ${!sort ? 'selected' : ''}>Newest First</option>
        <option value="price_asc" ${sort === 'price_asc' ? 'selected' : ''}>Price: Low to High</option>
        <option value="price_desc" ${sort === 'price_desc' ? 'selected' : ''}>Price: High to Low</option>
        <option value="name" ${sort === 'name' ? 'selected' : ''}>Name: A-Z</option>
      </select>
    </div>
    <div class="shop-content">
      ${products.length ? `
        <div class="products-grid">
          ${products.map(p => productCard(p)).join('')}
        </div>
      ` : `
        <div class="cart-empty">
          <i class="fas fa-search"></i>
          <h2>No products found</h2>
          <p>Try adjusting your filters or search terms</p>
        </div>
      `}
    </div>
  `;

  animateProducts();
}

// ==================== PRODUCT DETAIL ====================
async function renderProduct(slug) {
  const app = document.getElementById('app');
  try {
    const { product: p, related } = await fetch(`/api/shop/products/${slug}`).then(r => r.json());

    const hasSale = p.compare_price && p.compare_price > p.price;
    const savings = hasSale ? (p.compare_price - p.price).toFixed(2) : 0;
    const stockClass = p.stock <= 0 ? 'out-stock' : p.stock <= 3 ? 'low-stock' : 'in-stock';
    const stockText = p.stock <= 0 ? 'Out of Stock' : p.stock <= 3 ? `Only ${p.stock} left!` : 'In Stock';

    app.innerHTML = `
      <div class="product-detail">
        <div class="product-detail-grid">
          <div class="detail-image">
            ${p.image
              ? `<img src="${p.image}" alt="${p.name}">`
              : `<div class="detail-image-placeholder"><i class="fas ${p.category_slug === 'snakes' ? 'fa-worm' : p.category_slug === 'geckos' ? 'fa-frog' : 'fa-paw'}"></i></div>`
            }
          </div>
          <div class="detail-info">
            <div class="detail-breadcrumb">
              <a href="/" data-link>Home</a> <i class="fas fa-chevron-right" style="font-size:10px"></i>
              <a href="/shop" data-link>Shop</a> <i class="fas fa-chevron-right" style="font-size:10px"></i>
              <a href="/shop?category=${p.category_slug}" data-link>${p.category_name}</a> <i class="fas fa-chevron-right" style="font-size:10px"></i>
              <span>${p.name}</span>
            </div>
            <h1 class="detail-title">${p.name}</h1>
            <div class="detail-price">
              $${p.price.toFixed(2)}
              ${hasSale ? `<span class="detail-compare">$${p.compare_price.toFixed(2)}</span><span class="detail-save">Save $${savings}</span>` : ''}
            </div>
            <p class="detail-desc">${p.description || ''}</p>
            <div class="detail-specs">
              ${p.sex ? `<div class="spec"><div class="spec-label">Sex</div><div class="spec-value">${p.sex}</div></div>` : ''}
              ${p.age ? `<div class="spec"><div class="spec-label">Age</div><div class="spec-value">${p.age}</div></div>` : ''}
              ${p.morph ? `<div class="spec"><div class="spec-label">Morph</div><div class="spec-value">${p.morph}</div></div>` : ''}
              ${p.weight ? `<div class="spec"><div class="spec-label">Weight</div><div class="spec-value">${p.weight}</div></div>` : ''}
            </div>
            <div class="detail-stock">
              <span class="stock-dot ${stockClass}"></span>
              <span>${stockText}</span>
            </div>
            ${p.stock > 0 ? `
              <div class="qty-selector">
                <button class="qty-btn" onclick="changeQty(-1)">-</button>
                <input type="number" class="qty-value" id="qtyInput" value="1" min="1" max="${p.stock}" readonly>
                <button class="qty-btn" onclick="changeQty(1)">+</button>
              </div>
              <div class="detail-actions">
                <button class="btn btn-primary" onclick="addToCartQty(${p.id})"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
              </div>
            ` : `
              <div class="detail-actions">
                <button class="btn btn-outline" disabled style="opacity:0.5;cursor:not-allowed;flex:1;justify-content:center;">Sold Out</button>
              </div>
            `}
            <div class="detail-features">
              <div class="feature"><i class="fas fa-truck"></i><span>Free shipping over $100</span></div>
              <div class="feature"><i class="fas fa-shield-alt"></i><span>Live arrival guarantee</span></div>
              <div class="feature"><i class="fas fa-headset"></i><span>Expert support</span></div>
            </div>
          </div>
        </div>

        ${related.length ? `
          <div style="margin-top: 80px;">
            <div class="section-header">
              <div class="section-tag">You May Also Like</div>
              <h2 class="section-title">Related Animals</h2>
            </div>
            <div class="products-grid">
              ${related.map(p => productCard(p)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    animateDetail();
  } catch(e) {
    app.innerHTML = `<div class="cart-empty" style="padding-top:200px;"><h2>Product not found</h2><a href="/shop" class="btn btn-primary" data-link style="margin-top:20px;">Back to Shop</a></div>`;
  }
}

function changeQty(delta) {
  const input = document.getElementById('qtyInput');
  const newVal = parseInt(input.value) + delta;
  if (newVal >= 1 && newVal <= parseInt(input.max)) input.value = newVal;
}

// ==================== CART ====================
async function renderCart() {
  const app = document.getElementById('app');
  const items = await fetch('/api/cart').then(r => r.json());

  if (!items.length) {
    app.innerHTML = `
      <div class="cart-page">
        <div class="cart-empty">
          <i class="fas fa-shopping-cart"></i>
          <h2>Your Cart is Empty</h2>
          <p>Looks like you haven't added any animals yet!</p>
          <a href="/shop" class="btn btn-primary" data-link style="margin-top:24px;"><i class="fas fa-shopping-bag"></i> Start Shopping</a>
        </div>
      </div>
    `;
    return;
  }

  const subtotal = items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
  const shipping = subtotal >= 100 ? 0 : 14.99;
  const total = subtotal + shipping;

  app.innerHTML = `
    <div class="cart-page">
      <h1>Shopping Cart <span style="color:var(--text-muted);font-size:20px;">(${items.reduce((a, b) => a + b.quantity, 0)} items)</span></h1>
      ${items.map(i => `
        <div class="cart-item">
          <div class="cart-item-img">
            ${i.product.image ? `<img src="${i.product.image}" alt="${i.product.name}">` : `<i class="fas fa-paw"></i>`}
          </div>
          <div class="cart-item-info">
            <h3>${i.product.name}</h3>
            <p>$${i.product.price.toFixed(2)} each</p>
          </div>
          <div class="cart-item-qty">
            <button onclick="updateCartItem(${i.productId}, ${i.quantity - 1})">-</button>
            <span>${i.quantity}</span>
            <button onclick="updateCartItem(${i.productId}, ${i.quantity + 1})">+</button>
          </div>
          <div class="cart-item-price">$${(i.product.price * i.quantity).toFixed(2)}</div>
          <button class="cart-remove" onclick="removeCartItem(${i.productId})"><i class="fas fa-trash"></i></button>
        </div>
      `).join('')}

      <div class="cart-summary">
        <div class="cart-summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
        <div class="cart-summary-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span></div>
        ${shipping > 0 ? `<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">Free shipping on orders over $100!</div>` : ''}
        <div class="cart-summary-row"><span>Total</span><span>$${total.toFixed(2)}</span></div>
      </div>
      <div style="margin-top:24px;display:flex;gap:12px;">
        <a href="/shop" class="btn btn-outline" data-link>Continue Shopping</a>
        <a href="/checkout" class="btn btn-primary" data-link style="flex:1;justify-content:center;"><i class="fas fa-lock"></i> Checkout</a>
      </div>
    </div>
  `;

  gsap.from('.cart-item', { y: 20, opacity: 0, stagger: 0.1, duration: 0.5 });
}

async function addToCart(productId) {
  await fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity: 1 })
  });
  updateCartCount();
  showToast('Added to cart!');
}

async function addToCartQty(productId) {
  const qty = parseInt(document.getElementById('qtyInput')?.value || 1);
  await fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity: qty })
  });
  updateCartCount();
  showToast('Added to cart!');
}

async function updateCartItem(productId, quantity) {
  await fetch('/api/cart/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity })
  });
  updateCartCount();
  renderCart();
}

async function removeCartItem(productId) {
  await fetch(`/api/cart/remove/${productId}`, { method: 'DELETE' });
  updateCartCount();
  renderCart();
  showToast('Removed from cart');
}

// ==================== CHECKOUT ====================
let paymentConfig = null;

async function renderCheckout() {
  const [items, config] = await Promise.all([
    fetch('/api/cart').then(r => r.json()),
    fetch('/api/payment/config').then(r => r.json())
  ]);
  if (!items.length) { navigate('/cart'); return; }
  paymentConfig = config;

  const subtotal = items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
  const shipping = subtotal >= 100 ? 0 : 14.99;
  const total = subtotal + shipping;

  let paymentSection = '';
  if (config.provider === 'stripe') {
    paymentSection = `
      <h2 style="font-family:var(--font-heading);margin:32px 0 8px;">Payment</h2>
      <p style="color:var(--text-dim);font-size:14px;margin-bottom:16px;">Secure payment via Stripe</p>
      <div id="stripe-card-element" style="background:var(--bg-input);border:1px solid var(--border);padding:16px;border-radius:var(--radius-sm);margin-bottom:8px;"></div>
      <div id="card-errors" style="color:var(--accent);font-size:13px;margin-bottom:16px;"></div>`;
  } else if (config.provider === 'authorizenet') {
    paymentSection = `
      <h2 style="font-family:var(--font-heading);margin:32px 0 8px;">Payment</h2>
      <p style="color:var(--text-dim);font-size:14px;margin-bottom:16px;">Secure credit card payment</p>
      <div class="form-group"><label>Card Number *</label><input type="text" name="cardNumber" required placeholder="4111111111111111" maxlength="16"></div>
      <div class="form-group"><label>Expiration (MM/YY) *</label><input type="text" name="expDate" required placeholder="12/25"></div>
      <div class="form-group"><label>CVV *</label><input type="text" name="cvv" required placeholder="123" maxlength="4"></div>`;
  } else {
    paymentSection = `<p style="color:var(--text-dim);font-size:14px;margin-top:24px;"><i class="fas fa-info-circle"></i> We will contact you for payment after order placement.</p>`;
  }

  document.getElementById('app').innerHTML = `
    <div class="cart-page">
      <h1>Checkout</h1>
      <div class="cart-summary" style="margin-top:0;margin-bottom:32px;">
        ${items.map(i => `
          <div class="cart-summary-row">
            <span>${i.product.name} x${i.quantity}</span>
            <span>$${(i.product.price * i.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
        <div class="cart-summary-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span></div>
        <div class="cart-summary-row"><span>Total</span><span>$${total.toFixed(2)}</span></div>
      </div>

      <h2 style="font-family:var(--font-heading);margin-bottom:8px;">Shipping Information</h2>

      <form class="checkout-form" id="checkoutForm" onsubmit="submitOrder(event)">
        <div class="form-group"><label>Full Name *</label><input type="text" name="name" required placeholder="John Doe"></div>
        <div class="form-group"><label>Email *</label><input type="email" name="email" required placeholder="john@example.com"></div>
        <div class="form-group"><label>Phone</label><input type="tel" name="phone" placeholder="(555) 123-4567"></div>
        <div class="form-group"><label>Street Address *</label><input type="text" name="address" required placeholder="123 Main St"></div>
        <div class="form-group"><label>City *</label><input type="text" name="city" required placeholder="Los Angeles"></div>
        <div class="form-group"><label>State *</label><input type="text" name="state" required placeholder="CA"></div>
        <div class="form-group"><label>ZIP Code *</label><input type="text" name="zip" required placeholder="90001"></div>
        <div class="form-group"></div>
        <div class="full-width">${paymentSection}</div>
        <div class="full-width" style="margin-top:16px;">
          <button type="submit" class="btn btn-primary" id="checkoutBtn" style="width:100%;justify-content:center;">
            <i class="fas fa-lock"></i> ${config.provider !== 'none' ? 'Pay' : 'Place Order'} - $${total.toFixed(2)}
          </button>
        </div>
        <div id="checkoutError" class="full-width" style="color:var(--accent);font-size:13px;text-align:center;margin-top:8px;"></div>
      </form>
    </div>
  `;

  // Initialize Stripe Elements if active
  if (config.provider === 'stripe' && config.stripePublishableKey) {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => {
      window.stripeInstance = Stripe(config.stripePublishableKey);
      const elements = window.stripeInstance.elements();
      window.stripeCard = elements.create('card', {
        style: { base: { color: '#fff', fontSize: '16px', '::placeholder': { color: '#666' } } }
      });
      window.stripeCard.mount('#stripe-card-element');
      window.stripeCard.on('change', (e) => {
        document.getElementById('card-errors').textContent = e.error ? e.error.message : '';
      });
    };
    document.head.appendChild(script);
  }

  gsap.from('.checkout-form .form-group', { y: 20, opacity: 0, stagger: 0.05, duration: 0.4 });
}

async function submitOrder(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const btn = document.getElementById('checkoutBtn');
  const errDiv = document.getElementById('checkoutError');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  errDiv.textContent = '';

  try {
    // First create the order
    const res = await fetch('/api/cart/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (!result.success) {
      errDiv.textContent = result.error || 'Error placing order';
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Retry';
      return;
    }

    // Process payment if configured
    if (paymentConfig.provider === 'stripe' && window.stripeInstance && window.stripeCard) {
      // Create payment intent
      const intentRes = await fetch('/api/payment/stripe/create-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: result.total, orderId: result.orderNumber })
      });
      const intentData = await intentRes.json();
      if (intentData.error) { errDiv.textContent = intentData.error; btn.disabled = false; return; }

      // Confirm payment
      const { error, paymentIntent } = await window.stripeInstance.confirmCardPayment(intentData.clientSecret, {
        payment_method: { card: window.stripeCard, billing_details: { name: data.name, email: data.email } }
      });

      if (error) { errDiv.textContent = error.message; btn.disabled = false; return; }

      // Confirm on server
      await fetch('/api/payment/stripe/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id, orderId: result.orderNumber })
      });
    } else if (paymentConfig.provider === 'authorizenet') {
      const chargeRes = await fetch('/api/payment/authorizenet/charge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: result.total, orderId: result.orderNumber,
          cardNumber: data.cardNumber, expDate: data.expDate, cvv: data.cvv,
          customerName: data.name, customerEmail: data.email
        })
      });
      const chargeData = await chargeRes.json();
      if (!chargeData.success) { errDiv.textContent = chargeData.error || 'Payment failed'; btn.disabled = false; return; }
    }

    updateCartCount();
    navigate('/order/' + result.orderNumber);
  } catch(e) {
    errDiv.textContent = 'Error processing order. Please try again.';
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Retry';
  }
}

function renderOrderConfirm(orderNum) {
  document.getElementById('app').innerHTML = `
    <div class="order-confirm">
      <div class="check-circle"><i class="fas fa-check"></i></div>
      <h1>Order Placed!</h1>
      <div class="order-num">${orderNum}</div>
      <p style="color:var(--text-dim);margin-bottom:32px;">Thank you for your order! We'll send you an email with payment and shipping details shortly.</p>
      <a href="/shop" class="btn btn-primary" data-link><i class="fas fa-shopping-bag"></i> Continue Shopping</a>
    </div>
  `;

  gsap.from('.order-confirm > *', { y: 30, opacity: 0, stagger: 0.1, duration: 0.6 });
}

// ==================== CONTACT ====================
function renderContact() {
  document.getElementById('app').innerHTML = `
    <div class="contact-page">
      <h1>Contact Us</h1>
      <p>Have questions about an animal or order? We're here to help!</p>
      <div class="contact-info-grid">
        <div class="contact-info-card">
          <i class="fas fa-phone"></i>
          <h3>Phone</h3>
          <p>562-248-6940</p>
        </div>
        <div class="contact-info-card">
          <i class="fas fa-envelope"></i>
          <h3>Email</h3>
          <p>info@thereptileplug.com</p>
        </div>
        <div class="contact-info-card">
          <i class="fas fa-clock"></i>
          <h3>Hours</h3>
          <p>Mon-Sat 9am-6pm PST</p>
        </div>
      </div>
      <form class="contact-form" onsubmit="event.preventDefault();showToast('Message sent! We\\'ll get back to you soon.');this.reset();">
        <div class="form-group">
          <label>Name</label>
          <input type="text" required placeholder="Your name">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" required placeholder="your@email.com">
        </div>
        <div class="form-group full-width">
          <label>Message</label>
          <textarea placeholder="How can we help?" required></textarea>
        </div>
        <div class="full-width">
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">
            <i class="fas fa-paper-plane"></i> Send Message
          </button>
        </div>
      </form>
    </div>
  `;

  gsap.from('.contact-info-card', { y: 30, opacity: 0, stagger: 0.1, duration: 0.5 });
  gsap.from('.contact-form > *', { y: 20, opacity: 0, stagger: 0.05, duration: 0.4, delay: 0.3 });
}

// ==================== ANIMATIONS ====================
function animateHome() {
  gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({ delay: 1.5 });
  tl.from('.hero-badge', { y: 20, opacity: 0, duration: 0.6 })
    .from('.hero h1', { y: 40, opacity: 0, duration: 0.8 }, '-=0.3')
    .from('.hero-desc', { y: 20, opacity: 0, duration: 0.6 }, '-=0.4')
    .from('.hero-actions', { y: 20, opacity: 0, duration: 0.6 }, '-=0.3')
    .from('.hero-stats .stat', { y: 20, opacity: 0, stagger: 0.1, duration: 0.5 }, '-=0.2');

  // Counter animation
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    gsap.to(el, {
      textContent: target,
      duration: 2,
      delay: 2,
      snap: { textContent: 1 },
      onUpdate: function() { el.textContent = Math.round(parseFloat(el.textContent)) + '+'; }
    });
  });

  // Scroll animations
  gsap.utils.toArray('.category-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 85%' },
      y: 40, opacity: 0, duration: 0.6, delay: i * 0.08
    });
  });

  animateProducts();

  gsap.from('.banner-inner', {
    scrollTrigger: { trigger: '.featured-banner', start: 'top 80%' },
    y: 40, opacity: 0, duration: 0.8
  });
}

function animateProducts() {
  gsap.utils.toArray('.product-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 90%' },
      y: 40, opacity: 0, duration: 0.5, delay: i * 0.06
    });
  });
}

function animateDetail() {
  gsap.from('.detail-image', { x: -40, opacity: 0, duration: 0.7 });
  gsap.from('.detail-info > *', { y: 20, opacity: 0, stagger: 0.08, duration: 0.5, delay: 0.2 });
}

function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    container.appendChild(p);

    gsap.to(p, {
      opacity: Math.random() * 0.5 + 0.1,
      duration: Math.random() * 3 + 2,
      repeat: -1,
      yoyo: true,
      delay: Math.random() * 3
    });
    gsap.to(p, {
      y: -100 - Math.random() * 200,
      x: (Math.random() - 0.5) * 100,
      duration: Math.random() * 10 + 10,
      repeat: -1,
      ease: 'none'
    });
  }
}
