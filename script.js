// === FIREBASE CONFIGURATION ===
const firebaseConfig = {
    apiKey: "AIzaSyA9z8IsxGWjCmhBOgvdSVdnQBWsO-6av5o",
    authDomain: "shanza-store-1a876.firebaseapp.com",
    projectId: "shanza-store-1a876",
    storageBucket: "shanza-store-1a876.firebasestorage.app",
    messagingSenderId: "494631571414",
    appId: "1:494631571414:web:780e0be4a3e149c947de77",
    measurementId: "G-F82YHHQB2B"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

const CACHE_PRODUCTS_KEY = "veloura_store_products_cache_v1";
const CACHE_CATEGORIES_KEY = "veloura_store_categories_cache_v1";

let isAdmin = false;
let categories = ["Dresses", "Makeup", "Jewelry"];
let products = [];
let currentCategory = 'all';
let currentSearchQuery = '';
let currentImageIndexes = {};
let activeDetailId = null;

const LIVE_SITE_URL = "https://shanzacode.github.io/Shanza-Store/";

const mainArea = document.getElementById('main-content-area');
const categoryBar = document.getElementById('category-bar');
const categorySelect = document.getElementById('p-category');

let logoClicks = 0;
const logoEl = document.querySelector('.logo-container');
if (logoEl) {
    logoEl.addEventListener('click', () => {
        logoClicks++;
        if (logoClicks === 3) {
            let pwd = prompt("Enter Admin Secret Password:");
            if (pwd === "shanza123") {
                isAdmin = true;
                const manageBtn = document.getElementById('manage-btn');
                if (manageBtn) manageBtn.classList.remove('hidden-secure');
                checkUrlRoute();
                alert("Admin Mode Unlocked!");
            } else {
                alert("Wrong Password!");
            }
            logoClicks = 0;
        }
        setTimeout(() => { logoClicks = 0; }, 2000);
    });
}

function toggleAdminPanel() {
    document.getElementById('admin-panel').classList.toggle('hidden');
}

function toggleSearchBar() {
    const searchBox = document.getElementById('search-box');
    const searchBtn = document.getElementById('search-toggle-btn');
    const searchInput = document.getElementById('search-input');
    if (!searchBox || !searchInput) return;

    const isOpen = searchBox.classList.toggle('open');
    searchBox.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (searchBtn) searchBtn.classList.toggle('active', isOpen);

    if (isOpen) {
        setTimeout(() => searchInput.focus(), 120);
    } else if (!searchInput.value.trim()) {
        currentSearchQuery = '';
        renderHomeView();
    }
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    currentSearchQuery = '';
    renderHomeView();
}

function scrollToSection(sectionId) {
    if (activeDetailId) {
        activeDetailId = null;
        history.replaceState(null, "", window.location.pathname + window.location.search);
        renderHomeView();
        setTimeout(() => {
            const el = document.getElementById(sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
        return;
    }
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goHome() {
    currentCategory = 'all';
    currentSearchQuery = '';
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');

    activeDetailId = null;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    renderCategories();
    renderHomeView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
}

function readCache(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

// Extract product ID even when Pinterest adds ?utm_source=... before #product=ID
function getProductIdFromUrl() {
    const fullUrl = window.location.href;
    const match = fullUrl.match(/#product=([^&?#]+)/);
    return match ? decodeURIComponent(match[1]).trim() : null;
}

function loadStoreData() {
    const cachedCats = readCache(CACHE_CATEGORIES_KEY);
    if (Array.isArray(cachedCats) && cachedCats.length > 0) {
        categories = cachedCats;
    }
    renderCategories();

    const cachedProducts = readCache(CACHE_PRODUCTS_KEY);
    if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
        products = cachedProducts;
    }

    const requestedProductId = getProductIdFromUrl();

    if (requestedProductId) {
        activeDetailId = requestedProductId;
        const cachedMatch = products.find(p => p.id === requestedProductId);
        if (cachedMatch) {
            openProductDetail(requestedProductId, false);
        } else {
            db.collection("products").doc(requestedProductId).get().then((doc) => {
                if (doc.exists) {
                    const singleProd = { id: doc.id, ...doc.data() };
                    if (!products.some(p => p.id === singleProd.id)) {
                        products.unshift(singleProd);
                    }
                    if (activeDetailId === singleProd.id) {
                        openProductDetail(singleProd.id, false);
                    }
                } else if (products.length > 0) {
                    renderHomeView();
                } else {
                    renderHomeView([]);
                }
            }).catch(() => {
                if (products.length > 0) {
                    renderHomeView();
                } else {
                    renderHomeView([]);
                }
            });
        }
    } else if (products.length > 0) {
        renderHomeView();
    } else {
        renderHomeView([]);
    }

    // Background sync for categories
    db.collection("settings").doc("categories").get().then((doc) => {
        if (doc.exists && Array.isArray(doc.data().list)) {
            categories = doc.data().list;
            saveCache(CACHE_CATEGORIES_KEY, categories);
            renderCategories();
        }
    }).catch(() => {});

    // Background real-time sync for all products
    db.collection("products").onSnapshot((snapshot) => {
        const updatedProducts = [];
        snapshot.forEach((doc) => {
            updatedProducts.push({ id: doc.id, ...doc.data() });
        });
        products = updatedProducts;
        saveCache(CACHE_PRODUCTS_KEY, products);
        checkUrlRoute();
    });
}

function checkUrlRoute() {
    const productId = getProductIdFromUrl();
    if (productId) {
        activeDetailId = productId;
        if (products.some(p => p.id === productId)) {
            openProductDetail(productId, false);
        }
        return;
    }
    activeDetailId = null;
    renderHomeView();
}

window.addEventListener('hashchange', checkUrlRoute);

function renderCategories() {
    if (!categoryBar) return;
    categoryBar.innerHTML = `<button class="cat-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterProducts('all', this)">Storefront</button>`;

    categories.forEach(cat => {
        const isActive = currentCategory.toLowerCase() === cat.toLowerCase() ? 'active' : '';
        categoryBar.innerHTML += `<button class="cat-btn ${isActive}" onclick="filterProducts('${escapeHtmlAttr(cat)}', this)">${escapeHtml(cat)}</button>`;
    });

    if (categorySelect) {
        categorySelect.innerHTML = "";
        categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${escapeHtmlAttr(cat)}">${escapeHtml(cat)}</option>`;
        });
    }
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeHtmlAttr(str) {
    return String(str || '').replace(/'/g, "\\'");
}

function addNewCategory(event) {
    event.preventDefault();
    const input = document.getElementById('new-cat-name');
    const newCat = input.value.trim();

    if (newCat && !categories.some(c => c.toLowerCase() === newCat.toLowerCase())) {
        categories.push(newCat);
        saveCache(CACHE_CATEGORIES_KEY, categories);
        renderCategories();
        db.collection("settings").doc("categories").set({ list: categories }).then(() => {
            input.value = "";
            alert(`Category "${newCat}" added!`);
        });
    } else {
        alert("Category already exists or invalid.");
    }
}

function getFilteredProducts() {
    let list = products;
    if (currentCategory !== 'all') {
        list = list.filter(p => p.category && p.category.toLowerCase() === currentCategory.toLowerCase());
    }
    if (currentSearchQuery) {
        const q = currentSearchQuery.toLowerCase();
        list = list.filter(p =>
            (p.title && p.title.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q))
        );
    }
    return list;
}

function renderHomeView(filteredList = null) {
    const listToDisplay = filteredList !== null ? filteredList : getFilteredProducts();
    const isFiltered = currentCategory !== 'all' || Boolean(currentSearchQuery) || filteredList !== null;

    const collectionsHTML = categories.map(cat => {
        const count = products.filter(p => p.category && p.category.toLowerCase() === cat.toLowerCase()).length;
        const activeClass = currentCategory.toLowerCase() === cat.toLowerCase() ? 'active' : '';
        return `
            <button type="button" class="collection-tile ${activeClass}" onclick="filterProducts('${escapeHtmlAttr(cat)}')">
                <span class="collection-tile-name">${escapeHtml(cat)}</span>
                <span class="collection-tile-count">${count} items</span>
            </button>
        `;
    }).join('');

    const filterBannerHTML = isFiltered ? `
        <div class="active-filter-banner">
            <div>
                <strong>${currentSearchQuery ? `Search: "${escapeHtml(currentSearchQuery)}"` : `Collection: ${escapeHtml(currentCategory)}`}</strong>
                <span class="section-sub"> (${listToDisplay.length} ${listToDisplay.length === 1 ? 'item' : 'items'})</span>
            </div>
            <button type="button" class="reset-filter-btn" onclick="goHome()">Show Full Store</button>
        </div>
    ` : '';

    const gridHeading = isFiltered
        ? (currentSearchQuery ? 'Search Results' : `${currentCategory} Collection`)
        : 'Featured Products';

    mainArea.innerHTML = `
        <section id="store-top" class="store-hero">
            <div>
                <span class="store-hero-eyebrow">Curated Online Boutique</span>
                <h1 class="store-hero-title">Discover Trending Picks & Everyday Essentials</h1>
                <p class="store-hero-sub">Browse organized collections, compare standout finds, and shop directly through trusted partner links.</p>
                <div class="store-hero-actions">
                    <button type="button" class="hero-primary-btn" onclick="scrollToSection('products-section')">Explore Products</button>
                    <button type="button" class="hero-secondary-btn" onclick="scrollToSection('collections-section')">Browse Collections</button>
                </div>
            </div>
            <div class="store-hero-stats">
                <div class="hero-stat-box">
                    <div class="hero-stat-num">${products.length}+</div>
                    <div class="hero-stat-label">Curated Finds</div>
                </div>
                <div class="hero-stat-box">
                    <div class="hero-stat-num">${categories.length}</div>
                    <div class="hero-stat-label">Collections</div>
                </div>
            </div>
        </section>

        <section id="collections-section" class="collections-section">
            <div class="section-header-row">
                <h2 class="section-heading">Shop by Collection</h2>
                <span class="section-sub">Select a category to filter</span>
            </div>
            <div class="collections-grid">
                ${collectionsHTML}
            </div>
        </section>

        <section id="products-section">
            <div class="section-header-row">
                <h2 class="section-heading">${escapeHtml(gridHeading)}</h2>
                <span class="section-sub">${listToDisplay.length} available</span>
            </div>
            ${filterBannerHTML}
            <div id="product-grid" class="product-grid"></div>
            <div id="empty-state" class="empty-state ${listToDisplay.length > 0 ? 'hidden' : ''}">
                <i class="fa-solid fa-bag-shopping"></i>
                <p>No products found in this section yet.</p>
            </div>
        </section>
    `;

    const grid = document.getElementById('product-grid');
    if (!grid) return;

    listToDisplay.forEach((product, idx) => {
        const card = document.createElement('div');
        card.classList.add('product-card');

        const adminControlsHTML = isAdmin
            ? `
                <div class="admin-card-actions">
                    <button type="button" class="edit-card-btn" title="Edit Product" onclick="startEditProduct(event, '${product.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="delete-card-btn" title="Delete Product" onclick="deleteProduct(event, '${product.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            `
            : '';

        const saleBadgeHTML = product.onSale
            ? `<span class="sale-badge">SALE</span>`
            : '';

        const priceBadgeHTML = !isAdmin
            ? `<span class="price-badge">${escapeHtml(product.price)}</span>`
            : '';

        let imgs = product.images && product.images.length > 0 ? product.images : [product.image];
        if (currentImageIndexes[product.id] === undefined) currentImageIndexes[product.id] = 0;
        let imgIdx = currentImageIndexes[product.id];
        const loadingAttr = idx < 4 ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';

        card.innerHTML = `
            ${adminControlsHTML}
            ${saleBadgeHTML}
            ${priceBadgeHTML}
            <div class="card-img-container">
                <img src="${imgs[imgIdx]}" alt="${escapeHtml(product.title)}" class="product-image" ${loadingAttr} onclick="openProductDetail('${product.id}')">
                ${imgs.length > 1 ? `
                    <button class="slider-arrow prev-arrow" onclick="slideCardImage(event, '${product.id}', -1)"><i class="fa-solid fa-chevron-left"></i></button>
                    <button class="slider-arrow next-arrow" onclick="slideCardImage(event, '${product.id}', 1)"><i class="fa-solid fa-chevron-right"></i></button>
                ` : ''}
            </div>
            <div class="product-info" onclick="openProductDetail('${product.id}')" style="cursor:pointer;">
                <h3 class="product-title">${escapeHtml(product.title)}</h3>
                <p class="store-hint"><i class="fa-solid fa-eye"></i> View Details ${isAdmin ? `• ${escapeHtml(product.price)}` : ''}</p>
            </div>
            <div class="card-footer-action">
                <a href="${product.affiliateLink}" target="_blank" rel="noopener noreferrer" class="buy-btn">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Shop on AliExpress
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
}

function slideCardImage(event, productId, direction) {
    event.stopPropagation();
    const product = products.find(p => p.id === productId);
    if (!product) return;
    let imgs = product.images && product.images.length > 0 ? product.images : [product.image];

    let idx = currentImageIndexes[productId] || 0;
    idx += direction;
    if (idx < 0) idx = imgs.length - 1;
    if (idx >= imgs.length) idx = 0;
    currentImageIndexes[productId] = idx;

    const imgEl = event.currentTarget.closest('.card-img-container')?.querySelector('.product-image');
    if (imgEl) {
        imgEl.src = imgs[idx];
    } else {
        renderHomeView();
    }
}

function openProductDetail(productId, updateHash = true) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    activeDetailId = productId;

    if (updateHash) {
        window.location.hash = `product=${productId}`;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });

    let imgs = product.images && product.images.length > 0 ? product.images : [product.image];
    window.currentDetailImages = imgs;
    window.currentDetailIdx = 0;

    let galleryThumbnails = "";
    if (imgs.length > 1) {
        imgs.forEach((imgUrl, i) => {
            galleryThumbnails += `<img src="${imgUrl}" class="thumb-img ${i === 0 ? 'active-thumb' : ''}" onclick="switchDetailImage(this, '${imgUrl}', ${i})">`;
        });
    }

    let adminLinkBox = "";
    if (isAdmin) {
        const fullPinUrl = LIVE_SITE_URL + `#product=${productId}`;
        adminLinkBox = `
            <div class="admin-pin-box">
                <h4><i class="fa-solid fa-lock"></i> Admin Only: Direct Product Link (For Pinterest)</h4>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <input type="text" id="pin-share-link" value="${fullPinUrl}" readonly onclick="this.select()">
                    <button onclick="navigator.clipboard.writeText(document.getElementById('pin-share-link').value); alert('Link Copied!');">Copy Link</button>
                </div>
            </div>
        `;
    }

    const saleTagDetail = product.onSale ? `<span class="sale-tag-detail">ON SALE</span>` : '';

    const relatedProducts = products.filter(p => p.id !== productId).slice(0, 4);
    let relatedHTML = "";
    relatedProducts.forEach(rel => {
        let relImgs = rel.images && rel.images.length > 0 ? rel.images : [rel.image];
        relatedHTML += `
            <div class="related-card" onclick="openProductDetail('${rel.id}')">
                ${rel.onSale ? '<span class="rel-sale-badge">SALE</span>' : ''}
                <img src="${relImgs[0]}" alt="${escapeHtml(rel.title)}" loading="lazy" decoding="async">
                <h4>${escapeHtml(rel.title)}</h4>
                <span class="rel-price">${escapeHtml(rel.price)}</span>
            </div>
        `;
    });

    mainArea.innerHTML = `
        <div class="detail-container">
            <button class="back-btn" onclick="goHome()"><i class="fa-solid fa-arrow-left"></i> Back to Store</button>

            ${adminLinkBox}

            <div class="detail-grid">
                <div class="image-gallery-section">
                    <div class="main-image-wrapper">
                        ${imgs.length > 1 ? `<button class="detail-arrow detail-prev" onclick="changeDetailSlider(-1)"><i class="fa-solid fa-chevron-left"></i></button>` : ''}
                        <img id="main-product-display" src="${imgs[0]}" alt="${escapeHtml(product.title)}" fetchpriority="high" decoding="async">
                        ${imgs.length > 1 ? `<button class="detail-arrow detail-next" onclick="changeDetailSlider(1)"><i class="fa-solid fa-chevron-right"></i></button>` : ''}
                    </div>
                    <div class="thumbnail-row">
                        ${galleryThumbnails}
                    </div>
                </div>

                <div class="product-spec-section">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span class="cat-tag">${escapeHtml(product.category || 'Featured')}</span>
                        ${saleTagDetail}
                    </div>
                    <h1 class="detail-title">${escapeHtml(product.title)}</h1>
                    <div class="detail-price">${escapeHtml(product.price)}</div>

                    <div class="description-box">
                        <h3><i class="fa-solid fa-circle-info"></i> Product Details</h3>
                        <p>${escapeHtml(product.desc || 'Curated product available on AliExpress.')}</p>
                    </div>

                    <div class="action-box">
                        <a href="${product.affiliateLink}" target="_blank" rel="noopener noreferrer" class="prominent-buy-btn">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Continue to AliExpress
                        </a>
                        <p class="affiliate-notice"><i class="fa-solid fa-shield-halved"></i> Redirects to official AliExpress partner listing.</p>
                    </div>
                </div>
            </div>

            <div class="related-section">
                <h3>You Might Also Like</h3>
                <div class="related-grid">
                    ${relatedHTML.length > 0 ? relatedHTML : '<p>More curated items coming soon.</p>'}
                </div>
            </div>
        </div>
    `;
}

function switchDetailImage(thumbEl, url, idx) {
    document.getElementById('main-product-display').src = url;
    window.currentDetailIdx = idx;
    document.querySelectorAll('.thumb-img').forEach(el => el.classList.remove('active-thumb'));
    thumbEl.classList.add('active-thumb');
}

function changeDetailSlider(direction) {
    const imgsArray = window.currentDetailImages;
    if (!imgsArray || imgsArray.length <= 1) return;

    window.currentDetailIdx += direction;
    if (window.currentDetailIdx < 0) window.currentDetailIdx = imgsArray.length - 1;
    if (window.currentDetailIdx >= imgsArray.length) window.currentDetailIdx = 0;

    document.getElementById('main-product-display').src = imgsArray[window.currentDetailIdx];
    const thumbs = document.querySelectorAll('.thumb-img');
    thumbs.forEach((t, i) => {
        if (i === window.currentDetailIdx) t.classList.add('active-thumb');
        else t.classList.remove('active-thumb');
    });
}

function compressImageFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const maxWidth = img.width > 500 ? 500 : img.width;
                const scaleSize = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = Math.round(img.height * scaleSize);
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.65));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Start editing an existing published product
function startEditProduct(event, productId) {
    event.stopPropagation();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.classList.remove('hidden');

    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('product-form-heading').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Published Product`;
    document.getElementById('p-title').value = product.title || '';

    // Ensure category exists in dropdown
    if (product.category && !categories.some(c => c.toLowerCase() === product.category.toLowerCase())) {
        categories.push(product.category);
        renderCategories();
    }
    document.getElementById('p-category').value = product.category || categories[0] || '';
    document.getElementById('p-price').value = product.price || '';
    document.getElementById('p-sale').checked = Boolean(product.onSale);
    document.getElementById('p-desc').value = product.desc || '';
    document.getElementById('p-link').value = product.affiliateLink || '';

    // Image input is optional when editing
    const fileInput = document.getElementById('p-image-files');
    fileInput.value = '';
    fileInput.required = false;
    document.getElementById('p-image-label').innerText = "Replace Images (Optional, 1 to 5 images):";
    document.getElementById('p-image-help').classList.remove('hidden');

    document.getElementById('product-submit-btn').innerText = "Save Changes";
    document.getElementById('cancel-edit-btn').classList.remove('hidden');

    adminPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEditProduct() {
    document.getElementById('edit-product-id').value = '';
    document.getElementById('product-form-heading').innerHTML = `<i class="fa-solid fa-box-open"></i> Add New Product`;
    document.getElementById('product-form').reset();

    const fileInput = document.getElementById('p-image-files');
    fileInput.required = true;
    document.getElementById('p-image-label').innerText = "Select Images from PC (1 to 5 images):";
    document.getElementById('p-image-help').classList.add('hidden');

    document.getElementById('product-submit-btn').innerText = "Publish Product";
    document.getElementById('cancel-edit-btn').classList.add('hidden');
}

async function handleProductSubmit(event) {
    event.preventDefault();

    const editingId = document.getElementById('edit-product-id').value.trim();
    const title = document.getElementById('p-title').value.trim();
    const category = document.getElementById('p-category').value;
    const price = document.getElementById('p-price').value.trim();
    const onSale = document.getElementById('p-sale').checked;
    const filesInput = document.getElementById('p-image-files').files;
    const desc = document.getElementById('p-desc').value.trim();
    const link = document.getElementById('p-link').value.trim();

    if (filesInput.length > 5) {
        alert("Maximum 5 images allowed per product!");
        return;
    }

    if (!editingId && filesInput.length === 0) {
        alert("Please select at least 1 image from your PC.");
        return;
    }

    const submitBtn = document.getElementById('product-submit-btn');
    const prevBtnText = submitBtn.innerText;
    submitBtn.innerText = editingId ? "Saving..." : "Publishing...";
    submitBtn.disabled = true;

    try {
        if (editingId) {
            const existingProduct = products.find(p => p.id === editingId) || {};
            let updatedImages = existingProduct.images && existingProduct.images.length > 0
                ? existingProduct.images
                : [existingProduct.image];

            if (filesInput.length > 0) {
                updatedImages = await Promise.all(
                    Array.from(filesInput).map(file => compressImageFile(file))
                );
            }

            const updatedFields = {
                title: title,
                category: category,
                price: price,
                onSale: onSale,
                image: updatedImages[0],
                images: updatedImages,
                desc: desc,
                affiliateLink: link,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection("products").doc(editingId).update(updatedFields);

            products = products.map(p => p.id === editingId ? { ...p, ...updatedFields } : p);
            saveCache(CACHE_PRODUCTS_KEY, products);
            cancelEditProduct();
            renderHomeView();
            alert("Product updated successfully!");
        } else {
            const compressedImages = await Promise.all(
                Array.from(filesInput).map(file => compressImageFile(file))
            );

            const newProduct = {
                title: title,
                category: category,
                price: price,
                onSale: onSale,
                image: compressedImages[0],
                images: compressedImages,
                desc: desc,
                affiliateLink: link,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await db.collection("products").add(newProduct);
            document.getElementById('product-form').reset();

            const localProduct = { ...newProduct, id: docRef.id };
            products.unshift(localProduct);
            saveCache(CACHE_PRODUCTS_KEY, products);
            renderHomeView();

            const generatedPinLink = LIVE_SITE_URL + `#product=${docRef.id}`;
            prompt("Product Published! Yeh aapka valid Pinterest Link hai (Isko copy kar ke Pinterest par laga dein):", generatedPinLink);
        }
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        submitBtn.innerText = prevBtnText;
        submitBtn.disabled = false;
    }
}

function deleteProduct(event, id) {
    event.stopPropagation();
    if (confirm("Are you sure you want to delete this product?")) {
        db.collection("products").doc(id).delete().then(() => {
            products = products.filter(p => p.id !== id);
            saveCache(CACHE_PRODUCTS_KEY, products);
            renderHomeView();
            alert("Product deleted!");
        }).catch((error) => {
            alert("Error: " + error.message);
        });
    }
}

filterProducts = function(category, btnElement = null) {
    currentCategory = category;
    activeDetailId = null;
    history.replaceState(null, "", window.location.pathname + window.location.search);

    renderCategories();

    if (category === 'all') {
        renderHomeView(currentSearchQuery ? getFilteredProducts() : products);
    } else {
        const filtered = getFilteredProducts();
        renderHomeView(filtered);
        const prodSec = document.getElementById('products-section');
        if (prodSec) prodSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

function searchProducts() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    currentSearchQuery = input ? input.value.trim() : '';

    if (clearBtn) {
        clearBtn.classList.toggle('hidden', currentSearchQuery.length === 0);
    }

    activeDetailId = null;
    renderHomeView(getFilteredProducts());
}

// Footer Info Modal Pages
const INFO_PAGES = {
   about: {
    title: "About Veloura",
    body: "<p>Veloura is a curated online storefront highlighting practical, stylish, and trending everyday products across organized collections.</p><p>Each item is selected to help shoppers discover useful finds quickly with clear details and direct access to official listings.</p>"
},
    disclosure: {
        title: "Affiliate Disclosure",
        body: "<p>This storefront participates in affiliate programs, including AliExpress affiliate links. When you click a product link and complete a purchase on a partner site, a small commission may be earned at no extra cost to you.</p>"
    },
    shopping: {
        title: "Shopping Guide",
        body: "<p>Select any collection or product card to view details and multiple angles. Clicking the store button takes you directly to the partner listing where shipping options, seller ratings, and checkout are handled.</p>"
    },
    privacy: {
        title: "Privacy & Terms",
        body: "<p>We do not require account registration or collect payment details directly on this storefront. External partner websites operate under their own privacy policies and terms of service.</p>"
    }
};

function openInfoModal(pageKey) {
    const data = INFO_PAGES[pageKey];
    const modal = document.getElementById('store-info-modal');
    if (!data || !modal) return;
    document.getElementById('info-modal-title').innerText = data.title;
    document.getElementById('info-modal-body').innerHTML = data.body;
    modal.classList.remove('hidden');
}

function closeInfoModal(event) {
    if (event && event.target && !event.target.classList.contains('info-modal')) return;
    const modal = document.getElementById('store-info-modal');
    if (modal) modal.classList.add('hidden');
}

loadStoreData();
