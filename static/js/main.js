(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const state = { menu: [], settings: {}, category: 'All', search: '', cart: {} };
  const fallbackImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80';
  let toastTimer;

  const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  function toast(message) {
    const el = $('#toast'); if (!el) return;
    el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }
  function imageURL(url) { return url && /^https?:\/\//i.test(url) ? url : fallbackImage; }
  function itemCard(item, badge = false) {
    return `<article class="food-card"><div class="food-image-wrap"><img loading="lazy" src="${escapeHTML(imageURL(item.image))}" alt="${escapeHTML(item.name)}" onerror="this.onerror=null;this.src='${fallbackImage}'">${badge && item.featured ? '<span class="food-badge">HOUSE FAVOURITE</span>' : ''}</div><div class="food-content"><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.description || 'Made fresh and full of flavour.')}</p><div class="food-bottom"><strong class="food-price">${money(item.price)}</strong><button class="food-add" data-add="${Number(item.id)}"><span>＋</span> Add to order</button></div></div></article>`;
  }
  function renderSpecials() {
    const featured = state.menu.filter(item => item.featured).slice(0, 4);
    const items = featured.length ? featured : state.menu.slice(0, 4);
    $('#specialsGrid').innerHTML = items.length ? items.map(item => itemCard(item, true)).join('') : '<div class="empty-state">The menu is being updated. Check back soon.</div>';
  }
  function renderCategories() {
    const categories = ['All', ...new Set(state.menu.map(item => item.category).filter(Boolean))];
    $('#categoryRow').innerHTML = categories.map(cat => `<button class="category-chip ${state.category === cat ? 'active' : ''}" data-category="${escapeHTML(cat)}">${escapeHTML(cat === 'All' ? 'All items' : cat)}</button>`).join('');
  }
  function renderMenu() {
    const q = state.search.trim().toLowerCase();
    const items = state.menu.filter(item => (state.category === 'All' || item.category === state.category) && (!q || `${item.name} ${item.category} ${item.description || ''}`.toLowerCase().includes(q)));
    $('#menuGrid').innerHTML = items.length ? items.map(item => itemCard(item)).join('') : '<div class="empty-state">No dishes match that search. Try another name or category.</div>';
  }
  function goToDeliveryOptions() {
    const contact = $('#contact');
    if (contact) contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Choose Swiggy or Zomato to place your order.');
  }
  function showCart() {
    const items = Object.values(state.cart).filter(row => row.qty > 0);
    $('#cartCount').textContent = items.reduce((sum, row) => sum + row.qty, 0);
    $('#cartItems').innerHTML = items.length ? items.map(row => `<div class="cart-line"><div><h4>${escapeHTML(row.item.name)}</h4><small>${money(row.item.price)} each</small></div><div class="cart-line-right"><strong>${money(row.item.price * row.qty)}</strong><div class="quantity-control"><button data-cart-minus="${row.item.id}" aria-label="Decrease quantity">−</button><span>${row.qty}</span><button data-cart-plus="${row.item.id}" aria-label="Increase quantity">+</button></div></div></div>`).join('') : '<div class="empty-cart">Your basket is waiting for something delicious. 🍗</div>';
    $('#cartTotal').textContent = money(items.reduce((sum, row) => sum + row.qty * Number(row.item.price), 0));
  }
  function setCartOpen(open) {
    $('#cartDrawer').classList.toggle('open', open);
    $('#cartDrawer').setAttribute('aria-hidden', String(!open));
    $('#drawerBackdrop').classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  function addToCart(id, delta = 1) {
    const item = state.menu.find(row => Number(row.id) === Number(id)); if (!item) return;
    const current = state.cart[id]?.qty || 0; const qty = current + delta;
    if (qty <= 0) delete state.cart[id]; else state.cart[id] = { item, qty };
    showCart(); if (delta > 0) toast(`${item.name} added to your order.`);
  }
  function brandHTML(name, tag = 'em') {
    const words = String(name || 'Namma Spot').trim().split(/\s+/);
    if (words.length < 2) return escapeHTML(words[0] || 'Namma Spot');
    const last = words.pop();
    return `${escapeHTML(words.join(' '))} <${tag}>${escapeHTML(last)}</${tag}>`;
  }
  function applySettings(s) {
    state.settings = s || {};
    document.title = `${s.name || 'Namma Spot'} | Good Food, Good Mood`;
    $('#heroShopName').innerHTML = brandHTML(s.name || 'Namma Spot', 'em');
    $('#heroTagline').textContent = s.tagline || 'Food Brings People Together';
    $('#heroSubtitle').textContent = s.subtitle || 'Delicious food · Great taste · Good vibes';
    $('#aboutText').textContent = s.about || 'Good food, great taste and a warm welcome.';
    $('#shopAddress').textContent = s.address || 'Add your shop address in Admin Settings';
    $('#openingHours').textContent = s.opening_hours || 'Add opening hours in Admin Settings';
    $('#mapLink').href = s.map_url || 'https://maps.app.goo.gl/Z97j3JiXZvpqCGHx5';
    $('#mapLink').target = '_blank'; $('#mapLink').rel = 'noopener';
    $('#heroImage').src = imageURL(s.hero_image);
    $$('.brand b').forEach(el => { el.innerHTML = brandHTML(s.name || 'Namma Spot', 'i'); });
    $('#year').textContent = new Date().getFullYear();
    const swiggyUrl = s.swiggy_url || 'https://www.swiggy.com/search?query=Namma%20Spot%20Manavalanagar';
    const zomatoUrl = s.zomato_url || 'https://www.zomato.com/search?q=Namma%20Spot%20Manavalanagar';
    $('#contactSwiggy').href = swiggyUrl;
    $('#contactZomato').href = zomatoUrl;
    $('#contactDirections').href = s.map_url || 'https://maps.app.goo.gl/Z97j3JiXZvpqCGHx5';
    ['contactSwiggy','contactZomato','contactDirections'].forEach(id => { const el = $('#' + id); el.target = '_blank'; el.rel = 'noopener'; });
    $('#contactInstagram').href = s.instagram_url || '#contact';
    $('#contactInstagram').target = s.instagram_url ? '_blank' : '_self';
    $('#contactInstagram').hidden = !s.instagram_url;
    $('#contactInstagram').onclick = s.instagram_url ? null : (e) => { e.preventDefault(); toast('Instagram link will be added soon.'); };
    $('#headerOrder').onclick = goToDeliveryOptions;
    $('#heroOrder').onclick = goToDeliveryOptions;
    $('#bannerOrder').onclick = goToDeliveryOptions;
  }
  function checkout() {
    const rows = Object.values(state.cart).filter(row => row.qty > 0);
    if (!rows.length) { goToDeliveryOptions(); return; }
    setCartOpen(false);
    goToDeliveryOptions();
    toast('Your basket is a preview only. Add the items again inside Swiggy or Zomato.');
  }
  async function init() {
    try {
      const [menuResponse, settingsResponse] = await Promise.all([fetch('/api/menu'), fetch('/api/settings')]);
      if (!menuResponse.ok || !settingsResponse.ok) throw new Error('Could not load website data.');
      state.menu = await menuResponse.json();
      applySettings(await settingsResponse.json());
      renderSpecials(); renderCategories(); renderMenu(); showCart();
    } catch (error) {
      $('#specialsGrid').innerHTML = '<div class="empty-state">We could not load the menu. Please refresh the page.</div>';
      $('#menuGrid').innerHTML = '<div class="empty-state">Menu is temporarily unavailable. Please refresh the page.</div>';
      console.error(error);
    }
  }
  document.addEventListener('click', event => {
    const add = event.target.closest('[data-add]'); if (add) addToCart(Number(add.dataset.add));
    const category = event.target.closest('[data-category]'); if (category) { state.category = category.dataset.category; renderCategories(); renderMenu(); }
    const plus = event.target.closest('[data-cart-plus]'); if (plus) addToCart(Number(plus.dataset.cartPlus));
    const minus = event.target.closest('[data-cart-minus]'); if (minus) addToCart(Number(minus.dataset.cartMinus), -1);
  });
  $('#menuSearch').addEventListener('input', e => { state.search = e.target.value; renderMenu(); });
  $('#cartOpen').addEventListener('click', () => setCartOpen(true));
  $('#cartClose').addEventListener('click', () => setCartOpen(false));
  $('#drawerBackdrop').addEventListener('click', () => setCartOpen(false));
  $('#checkoutButton').addEventListener('click', checkout);
  $('#clearCart').addEventListener('click', () => { state.cart = {}; showCart(); toast('Basket cleared.'); });
  $('#mobileMenuToggle').addEventListener('click', () => $('#mainNav').classList.toggle('open'));
  $$('#mainNav a').forEach(a => a.addEventListener('click', () => $('#mainNav').classList.remove('open')));
  init();
})();
