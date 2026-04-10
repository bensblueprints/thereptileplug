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
  'supplies': 'fa-box-open',
  'turtles': 'fa-turtle',
  'tortoises': 'fa-shield-alt',
  'chameleons': 'fa-eye',
  'frogs-toads': 'fa-frog',
  'salamanders-newts': 'fa-water',
  'monitors-tegus': 'fa-dragon',
  'bearded-dragons': 'fa-dragon',
  'tarantulas-spiders': 'fa-spider',
  'scorpions': 'fa-skull',
  'insects-invertebrates': 'fa-bug',
  'agamas-water-dragons': 'fa-dragon',
  'skinks': 'fa-paw',
  'uromastyx': 'fa-sun',
  'other-lizards-iguanas': 'fa-leaf',
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
  else if (path === '/shipping-policy') renderShippingPolicy();
  else if (path === '/live-arrival-guarantee') renderLiveArrival();
  else if (path === '/terms') renderTerms();
  else if (path === '/blog') renderBlog();
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

function toggleMega() {
  const menu = document.getElementById('megaMenu');
  const trigger = document.getElementById('megaTrigger');
  const isOpen = menu.classList.contains('open');
  menu.classList.toggle('open');
  trigger.classList.toggle('active');
  if (!isOpen) {
    // Stagger-animate the links
    const cols = menu.querySelectorAll('.mega-col');
    cols.forEach((col, i) => {
      col.style.opacity = '0';
      col.style.transform = 'translateY(12px)';
      setTimeout(() => {
        col.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        col.style.opacity = '1';
        col.style.transform = 'translateY(0)';
      }, 80 + i * 70);
    });
  }
}
function closeMega() {
  document.getElementById('megaMenu')?.classList.remove('open');
  document.getElementById('megaTrigger')?.classList.remove('active');
}
// Close mega on click outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.mega-menu') && !e.target.closest('.mega-trigger')) closeMega();
});

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

function setTitle(title) {
  document.title = title + ' | Buy Reptiles Online | The Reptile Plug';
}

// ==================== HOME PAGE ====================
async function renderHome() {
  document.title = 'Buy Reptiles Online | Live Snakes, Geckos, Lizards & More | The Reptile Plug';
  const app = document.getElementById('app');
  const [categories, products] = await Promise.all([
    fetch('/api/shop/categories').then(r => r.json()),
    fetch('/api/shop/products?featured=1').then(r => r.json())
  ]);

  app.innerHTML = `
    <!-- HERO -->
    <section class="hero">
      <video class="hero-video" autoplay muted loop playsinline>
        <source src="/hero-bg.mp4" type="video/mp4">
      </video>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-badge"><i class="fas fa-circle"></i> Now Shipping Nationwide</div>
          <h1>
            <span class="script">Buy</span>
            <span class="accent">Reptiles</span> Online<br>
            Delivered to Your Door
          </h1>
          <p class="hero-desc">Captive bred, ethically sourced snakes, geckos, turtles, chameleons, and more. Every animal ships with our live arrival guarantee.</p>
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
        <div class="hero-visual"></div>
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

    <!-- SEO BODY COPY -->
    <section class="section">
      <div class="seo-content" style="margin-top:0;">
        <h2>Buy Reptiles Online from The Reptile Plug</h2>
        <p>Welcome to <strong>The Reptile Plug</strong> — your trusted source to <strong>buy reptiles online</strong> with confidence. We specialize in captive bred, ethically sourced reptiles, amphibians, and invertebrates shipped safely to your door anywhere in the United States. With over <strong>300 species</strong> available including snakes, geckos, turtles, tortoises, chameleons, bearded dragons, monitors, frogs, tarantulas, and more, we carry one of the largest selections of live reptiles for sale online.</p>

        <h3>Why Buy From Us?</h3>
        <p>Every animal we sell is backed by our <strong>unconditional live arrival guarantee</strong>. We use insulated shipping boxes with temperature-controlled heat or cold packs and ship via overnight carriers to ensure your new pet arrives safe, healthy, and stress-free. Our team has decades of combined experience in reptile husbandry, and we're available to answer questions before and after your purchase.</p>

        <h3>Captive Bred, Ethically Sourced</h3>
        <p>We prioritize captive bred animals whenever possible. Captive bred reptiles are healthier, better adapted to life in captivity, and come with known genetics and feeding histories. When we do offer field-collected specimens, they are legally obtained through licensed channels and properly acclimated before being offered for sale.</p>

        <h3>We Ship Nationwide</h3>
        <p>We ship live reptiles, amphibians, and invertebrates to all 50 states via FedEx and UPS overnight services. Orders over $100 qualify for <strong>free shipping</strong>. Every shipment is carefully packed with your animal's safety as the top priority. We monitor weather conditions closely and will hold shipments during temperature extremes to protect your new pet.</p>

        <h3>Expert Support</h3>
        <p>Not sure which reptile is right for you? Our team is here to help. Whether you're a first-time keeper looking for a beginner-friendly species or an experienced breeder searching for specific genetics, we'll guide you to the perfect animal. Reach us at <strong>562-248-6940</strong> or <strong>info@thereptileplug.com</strong> — we respond to every inquiry within 24 hours.</p>

        <p>Browse our categories above or use the search bar to find exactly what you're looking for. From <a href="/shop?category=snakes" data-link>ball pythons</a> and <a href="/shop?category=geckos" data-link>leopard geckos</a> to <a href="/shop?category=turtles" data-link>turtles</a>, <a href="/shop?category=chameleons" data-link>chameleons</a>, and <a href="/shop?category=tarantulas-spiders" data-link>tarantulas</a> — your next pet is just a click away.</p>
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
          ? `<img src="${p.image}" alt="${p.name}">`
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
        ${p.scientific_name ? `<div class="product-sci-name"><em>${p.scientific_name}</em></div>` : ''}
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

  const fetches = [
    fetch('/api/shop/categories').then(r => r.json()),
    fetch(`/api/shop/products?category=${category}&search=${search}&sort=${sort}`).then(r => r.json())
  ];
  if (category) fetches.push(fetch(`/api/shop/categories/${category}`).then(r => r.json()).catch(() => null));
  const [categories, products, catDetail] = await Promise.all(fetches);

  const app = document.getElementById('app');
  const activeCategory = categories.find(c => c.slug === category);
  const seoContent = catDetail?.seo_content || '';

  if (activeCategory) setTitle(activeCategory.name + ' for Sale');
  else if (search) setTitle('Search: ' + search);
  else setTitle('Shop All Reptiles');

  app.innerHTML = `
    <div class="shop-hero">
      <h1>${activeCategory ? 'Buy ' + activeCategory.name + ' Online' : search ? `Search: "${search}"` : 'Buy Reptiles Online — Shop All'}</h1>
      <p>${activeCategory ? activeCategory.description + '. Captive bred with live arrival guarantee. Shipped overnight to your door.' : `${products.length} products available — captive bred, ethically sourced, shipped overnight.`}</p>
      <div class="shop-search">
        <i class="fas fa-search"></i>
        <input type="text" id="shopSearchInput" placeholder="Search by name, species, or scientific name..." value="${search}" onkeydown="if(event.key==='Enter'){const v=this.value.trim();if(v)navigate('/shop?search='+encodeURIComponent(v));else navigate('/shop')}">
        ${search ? '<button class="shop-search-clear" onclick="navigate(\'/shop\')"><i class="fas fa-times"></i></button>' : ''}
      </div>
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
    ${seoContent ? `<div class="seo-content">${seoContent}</div>` : ''}
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
            ${p.scientific_name ? `<div class="detail-sci-name"><em>${p.scientific_name}</em></div>` : ''}
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

        ${p.seo_content ? `
          <div class="product-seo-content">
            <div class="seo-tabs">
              <button class="seo-tab active" onclick="switchSeoTab(this, 'overview')">Overview</button>
              <button class="seo-tab" onclick="switchSeoTab(this, 'habitat')">Habitat Setup</button>
              <button class="seo-tab" onclick="switchSeoTab(this, 'diet')">Diet & Feeding</button>
              <button class="seo-tab" onclick="switchSeoTab(this, 'temperament')">Temperament</button>
              <button class="seo-tab" onclick="switchSeoTab(this, 'handling')">Handling</button>
              <button class="seo-tab" onclick="switchSeoTab(this, 'health')">Health</button>
            </div>
            <div class="seo-tab-content">${p.seo_content}</div>
          </div>
        ` : ''}

        ${p.blog_content ? `
          <div class="product-blog-content">
            ${p.blog_content}
          </div>
        ` : ''}

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

// ==================== SHIPPING POLICY ====================
function renderShippingPolicy() {
  setTitle('Shipping Policy');
  document.getElementById('app').innerHTML = `
    <div class="policy-page">
      <h1>Shipping Policy</h1>
      <div class="seo-content" style="margin-top:24px;">
        <h2>How We Ship Live Reptiles</h2>
        <p>At The Reptile Plug, the safety of your animal is our top priority. We've shipped thousands of live reptiles, amphibians, and invertebrates across the United States with an exceptional survival rate, and we stand behind every shipment with our <a href="/live-arrival-guarantee" data-link>live arrival guarantee</a>.</p>

        <h3>Shipping Methods</h3>
        <p>All live animals are shipped via <strong>FedEx Priority Overnight</strong> or <strong>UPS Next Day Air</strong>. We do not ship live animals via ground or economy services. Your animal will typically arrive by 10:30 AM the morning after shipment.</p>

        <h3>Shipping Days</h3>
        <p>We ship live animals <strong>Monday through Wednesday</strong> to avoid animals sitting in transit facilities over weekends. Orders placed after Wednesday will ship the following Monday unless you request Saturday delivery (additional charges apply).</p>

        <h3>Packaging</h3>
        <p>Every shipment is carefully packed in insulated shipping boxes with:</p>
        <ul>
          <li><strong>Insulated foam-lined boxes</strong> to maintain stable temperatures</li>
          <li><strong>Heat packs or cold packs</strong> depending on weather conditions</li>
          <li><strong>Secure deli cups or cloth bags</strong> appropriate to the species</li>
          <li><strong>Cushioning material</strong> to prevent shifting during transit</li>
          <li><strong>"LIVE ANIMAL" labels</strong> on all sides of the box</li>
        </ul>

        <h3>Shipping Costs</h3>
        <ul>
          <li><strong>Orders over $100:</strong> FREE overnight shipping</li>
          <li><strong>Orders under $100:</strong> Flat rate $39.99 overnight shipping</li>
          <li><strong>Supplies only:</strong> $7.99 standard shipping (no live animals)</li>
        </ul>

        <h3>Weather Holds</h3>
        <p>We monitor weather conditions at both our facility and your delivery location. If temperatures at either end are below 35°F or above 100°F, we will hold your shipment until conditions are safe. We will notify you via email if a weather hold is placed on your order. Your animal's safety always comes first.</p>

        <h3>Tracking</h3>
        <p>You will receive a tracking number via email as soon as your order ships. We recommend signing up for FedEx/UPS delivery notifications so you can be home to receive your animal promptly.</p>

        <h3>Upon Delivery</h3>
        <p>When your animal arrives, open the box immediately and allow your new pet to acclimate to room temperature for 15-20 minutes before handling. Prepare their enclosure in advance so they can be moved into their new home quickly. If there are any issues with your delivery, contact us immediately at <strong>562-248-6940</strong> or <strong>info@thereptileplug.com</strong>.</p>

        <h3>Ship-to Restrictions</h3>
        <p>We ship to all 50 states. Some species may have restrictions in certain states (e.g., certain turtle species in some states). If your order contains a restricted species, we will contact you before shipping to discuss alternatives.</p>
      </div>
    </div>`;
}

// ==================== LIVE ARRIVAL GUARANTEE ====================
function renderLiveArrival() {
  setTitle('Live Arrival Guarantee');
  document.getElementById('app').innerHTML = `
    <div class="policy-page">
      <h1>Live Arrival Guarantee</h1>
      <div class="seo-content" style="margin-top:24px;">
        <h2>Our 100% Live Arrival Guarantee</h2>
        <p>When you buy reptiles online from The Reptile Plug, every animal is backed by our <strong>unconditional live arrival guarantee</strong>. If your animal does not arrive alive and in good health, we will replace it or issue a full refund — no questions asked.</p>

        <h3>What's Covered</h3>
        <ul>
          <li>Dead on arrival (DOA)</li>
          <li>Animal arrives visibly injured or in critical condition</li>
          <li>Wrong animal shipped</li>
          <li>Carrier delay resulting in animal death (we cover this — not your problem)</li>
        </ul>

        <h3>How to File a Claim</h3>
        <p>If there is any issue with your delivery, you must:</p>
        <ol>
          <li><strong>Contact us within 2 hours</strong> of delivery confirmation</li>
          <li><strong>Send clear photos</strong> of the animal and the packaging as received</li>
          <li><strong>Do not discard</strong> the animal or shipping materials until we confirm your claim</li>
        </ol>
        <p>Contact us at <strong>562-248-6940</strong> (call or text) or <strong>info@thereptileplug.com</strong>. We respond to all DOA claims within 1 hour during business hours.</p>

        <h3>Replacement or Refund</h3>
        <p>Once your claim is confirmed, you choose: a <strong>full replacement</strong> shipped at no additional cost, or a <strong>complete refund</strong> to your original payment method. Replacements ship on the next available shipping day.</p>

        <h3>Conditions</h3>
        <ul>
          <li>Someone must be available to accept the package on the delivery date. If the carrier attempts delivery and no one is home, and the animal is left in extreme conditions, the guarantee is void.</li>
          <li>If we place a weather hold on your order and you request we ship anyway, the guarantee is void for weather-related issues.</li>
          <li>The guarantee covers the animal's arrival only — it does not cover issues arising from improper husbandry after receipt.</li>
        </ul>

        <h3>Our Track Record</h3>
        <p>We maintain a <strong>99.8% live arrival rate</strong> across all shipments. We achieve this through careful packaging, weather monitoring, and working only with overnight carriers. When you buy reptiles online from The Reptile Plug, you're buying with confidence.</p>
      </div>
    </div>`;
}

// ==================== TERMS ====================
function renderTerms() {
  setTitle('Terms & Conditions');
  document.getElementById('app').innerHTML = `
    <div class="policy-page">
      <h1>Terms & Conditions</h1>
      <div class="seo-content" style="margin-top:24px;">
        <h2>Terms of Service</h2>
        <p>By placing an order on buyreptilesonline.com ("The Reptile Plug"), you agree to the following terms and conditions. Please read them carefully before making a purchase.</p>

        <h3>Age Requirement</h3>
        <p>You must be at least 18 years old to purchase live animals from our website. By placing an order, you confirm that you are of legal age and that the purchase and ownership of the species you are ordering is legal in your state and local jurisdiction.</p>

        <h3>Legal Compliance</h3>
        <p>It is the buyer's responsibility to ensure that the species they are purchasing is legal to own in their state, county, and municipality. We make every effort to stay current on state regulations, but local laws vary widely. If we identify that a species is restricted in your area, we will cancel and refund that portion of your order.</p>

        <h3>Animal Health</h3>
        <p>All animals are inspected for health before shipping. However, reptiles are living creatures and we cannot guarantee the long-term health of any animal after delivery. Our <a href="/live-arrival-guarantee" data-link>live arrival guarantee</a> covers the animal's condition upon arrival only. We strongly recommend having a reptile-experienced veterinarian examine any new animal within the first week.</p>

        <h3>Returns & Refunds</h3>
        <p>Due to the nature of live animal sales, we do not accept returns. All sales are final. Refunds are only issued under our live arrival guarantee or if we are unable to fulfill your order. Supplies and non-living products may be returned within 14 days if unused and in original packaging.</p>

        <h3>Pricing</h3>
        <p>All prices are listed in US dollars. We reserve the right to change prices at any time without notice. Prices are locked in at the time of your order confirmation.</p>

        <h3>Order Cancellation</h3>
        <p>Orders may be cancelled within 2 hours of placement for a full refund. After that window, orders that have not yet shipped may be cancelled for store credit minus a 10% restocking fee. Orders that have already shipped cannot be cancelled.</p>

        <h3>Privacy</h3>
        <p>We collect only the information necessary to process your order and ship your animal. We do not sell or share your personal information with third parties. Payment processing is handled securely through Stripe.</p>

        <h3>Contact</h3>
        <p>Questions about these terms? Contact us at <strong>info@thereptileplug.com</strong> or <strong>562-248-6940</strong>.</p>
      </div>
    </div>`;
}

// ==================== BLOG ====================
function renderBlog() {
  setTitle('Reptile Care Blog');
  document.getElementById('app').innerHTML = `
    <div class="policy-page">
      <h1>Reptile Care Blog</h1>
      <p style="color:var(--text-dim);margin-bottom:48px;font-size:16px;">Care guides, species spotlights, and expert tips for reptile keepers of all levels.</p>
      <div class="blog-grid">
        <div class="blog-card" onclick="navigate('/shop?category=snakes')">
          <div class="blog-icon"><i class="fas fa-worm"></i></div>
          <h3>Ball Python Care Guide: Everything You Need to Know</h3>
          <p>Ball pythons are the most popular pet snake in the world — and for good reason. Learn about housing, feeding, handling, morphs, and common health issues in our comprehensive guide.</p>
          <span class="blog-link">Read Full Guide <i class="fas fa-arrow-right"></i></span>
        </div>
        <div class="blog-card" onclick="navigate('/shop?category=geckos')">
          <div class="blog-icon"><i class="fas fa-frog"></i></div>
          <h3>Leopard Gecko Morph Guide: Understanding Genetics</h3>
          <p>From Mack Snows to Blazing Blizzards, leopard gecko morphs are endlessly fascinating. This guide breaks down the genetics behind the most popular morphs and how to breed for them.</p>
          <span class="blog-link">Read Full Guide <i class="fas fa-arrow-right"></i></span>
        </div>
        <div class="blog-card" onclick="navigate('/shop?category=bearded-dragons')">
          <div class="blog-icon"><i class="fas fa-dragon"></i></div>
          <h3>Bearded Dragon Setup Guide: Building the Perfect Enclosure</h3>
          <p>The right setup is everything for bearded dragons. Learn about tank size, lighting, UVB requirements, substrate options, temperature gradients, and diet for a thriving beardie.</p>
          <span class="blog-link">Read Full Guide <i class="fas fa-arrow-right"></i></span>
        </div>
        <div class="blog-card" onclick="navigate('/shop?category=chameleons')">
          <div class="blog-icon"><i class="fas fa-eye"></i></div>
          <h3>Chameleon Care for Beginners: Veiled vs. Panther</h3>
          <p>Chameleons are incredible but demanding pets. We compare veiled and panther chameleons and cover screen cages, dripper systems, misting, gut-loading feeders, and UVB essentials.</p>
          <span class="blog-link">Read Full Guide <i class="fas fa-arrow-right"></i></span>
        </div>
        <div class="blog-card" onclick="navigate('/shop?category=turtles')">
          <div class="blog-icon"><i class="fas fa-shield-alt"></i></div>
          <h3>Turtle vs. Tortoise: Which Is Right for You?</h3>
          <p>Aquatic turtles and land tortoises have completely different care requirements. Learn the key differences, space needs, diet, lifespan expectations, and which species make the best pets.</p>
          <span class="blog-link">Read Full Guide <i class="fas fa-arrow-right"></i></span>
        </div>
        <div class="blog-card" onclick="navigate('/shop?category=tarantulas-spiders')">
          <div class="blog-icon"><i class="fas fa-spider"></i></div>
          <h3>Best Beginner Tarantulas: 5 Species Perfect for New Keepers</h3>
          <p>Not all tarantulas are created equal. We break down the five best species for first-time tarantula owners, covering temperament, size, housing, feeding, and handling tips.</p>
          <span class="blog-link">Read Full Guide <i class="fas fa-arrow-right"></i></span>
        </div>
      </div>
    </div>`;

  gsap.from('.blog-card', { y: 30, opacity: 0, stagger: 0.1, duration: 0.5 });
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

function switchSeoTab(btn, section) {
  document.querySelectorAll('.seo-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.seo-section').forEach(s => {
    s.style.display = s.dataset.section === section ? 'block' : 'none';
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
