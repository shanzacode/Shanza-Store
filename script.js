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

const CACHE_PRODUCTS_KEY = "shanza_store_products_cache_v1";
const CACHE_CATEGORIES_KEY = "shanza_store_categories_cache_v1";

let isAdmin = false;
let categories = ["Dresses", "Makeup", "Jewelry"];
let products = [];
let currentCategory = 'all';
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

function goHome() {
    activeDetailId = null;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    renderHomeView();
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

    // 1. If opened via a direct product link, try opening immediately from cache or single-doc fetch
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

    // 2. Background sync for categories
    db.collection("settings").doc("categories").get().then((doc) => {
        if (doc.exists && Array.isArray(doc.data().list)) {
            categories = doc.data().list;
            saveCache(CACHE_CATEGORIES_KEY, categories);
            renderCategories();
        }
    }).catch(() => {});

    // 3. Background real-time sync for all products
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
    categoryBar.innerHTML = `<button class="cat-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterProducts('all', this)">✨ All Finds</button>`;
    
    categories.forEach(cat => {
        const isActive = currentCategory.toLowerCase() === cat.toLowerCase() ? 'active' : '';
        categoryBar.innerHTML += `<button class="cat-btn ${isActive}" onclick="filterProducts('${cat}', this)">${cat}</button>`;
    });

    if (categorySelect) {
        categorySelect.innerHTML = "";
        categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }
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

function renderHomeView(filteredList = null) {
    let listToDisplay = filteredList || products;

    mainArea.innerHTML = `
        <div id="product-grid" class="product-grid"></div>
        <div id="empty-state" class="empty-state ${listToDisplay.length > 0 ? 'hidden' : ''}">
            <i class="fa-solid fa-bag-shopping"></i>
            <p>No products found in this section yet.</p>
        </div>
    `;

    const grid = document.getElementById('product-grid');
    if (!grid) return;

    listToDisplay.forEach((product, idx) => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        
        const deleteBtnHTML = isAdmin 
            ? `<button class="delete-card-btn" title="Delete Product" onclick="deleteProduct(event, '${product.id}')"><i class="fa-solid fa-trash"></i></button>` 
            : '';

        const saleBadgeHTML = product.onSale 
            ? `<span class="sale-badge">SALE</span>` 
            : '';

        let imgs = product.images && product.images.length > 0 ? product.images : [product.image];
        if (currentImageIndexes[product.id] === undefined) currentImageIndexes[product.id] = 0;
        let imgIdx = currentImageIndexes[product.id];
        const loadingAttr = idx < 4 ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';

        card.innerHTML = `
            ${deleteBtnHTML}
            ${saleBadgeHTML}
            <span class="price-badge">${product.price}</span>
            <div class="card-img-container">
                <img src="${imgs[imgIdx]}" alt="${product.title}" class="product-image" ${loadingAttr} onclick="openProductDetail('${product.id}')">
                ${imgs.length > 1 ? `
                    <button class="slider-arrow prev-arrow" onclick="slideCardImage(event, '${product.id}', -1)"><i class="fa-solid fa-chevron-left"></i></button>
                    <button class="slider-arrow next-arrow" onclick="slideCardImage(event, '${product.id}', 1)"><i class="fa-solid fa-chevron-right"></i></button>
                ` : ''}
            </div>
            <div class="product-info" onclick="openProductDetail('${product.id}')" style="cursor:pointer;">
                <h3 class="product-title">${product.title}</h3>
                <p class="store-hint"><i class="fa-solid fa-eye"></i> View Details</p>
            </div>
            <div class="card-footer-action">
                <a href="${product.affiliateLink}" target="_blank" class="buy-btn">
                    <i class="fa-solid fa-cart-shopping"></i> Buy on AliExpress
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

    const relatedProducts = products.filter(p => p.id !== productId).slice(0, 2);
    let relatedHTML = "";
    relatedProducts.forEach(rel => {
        let relImgs = rel.images && rel.images.length > 0 ? rel.images : [rel.image];
        relatedHTML += `
            <div class="related-card" onclick="openProductDetail('${rel.id}')">
                ${rel.onSale ? '<span class="rel-sale-badge">SALE</span>' : ''}
                <img src="${relImgs[0]}" alt="${rel.title}" loading="lazy" decoding="async">
                <h4>${rel.title}</h4>
                <span class="rel-price">${rel.price}</span>
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
                        <img id="main-product-display" src="${imgs[0]}" alt="${product.title}" fetchpriority="high" decoding="async">
                        ${imgs.length > 1 ? `<button class="detail-arrow detail-next" onclick="changeDetailSlider(1)"><i class="fa-solid fa-chevron-right"></i></button>` : ''}
                    </div>
                    <div class="thumbnail-row">
                        ${galleryThumbnails}
                    </div>
                </div>

                <div class="product-spec-section">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span class="cat-tag">${product.category || 'Featured'}</span>
                        ${saleTagDetail}
                    </div>
                    <h1 class="detail-title">${product.title}</h1>
                    <div class="detail-price">${product.price}</div>
                    
                    <div class="description-box">
                        <h3><i class="fa-solid fa-circle-info"></i> Product Details</h3>
                        <p>${product.desc || 'Premium quality product available on AliExpress.'}</p>
                    </div>

                    <div class="action-box">
                        <a href="${product.affiliateLink}" target="_blank" class="prominent-buy-btn">
                            <i class="fa-solid fa-cart-shopping"></i> Buy Now on AliExpress
                        </a>
                        <p class="affiliate-notice"><i class="fa-solid fa-shield-halved"></i> Secure checkout via AliExpress official store.</p>
                    </div>
                </div>
            </div>

            <div class="related-section">
                <h3>You Might Also Like</h3>
                <div class="related-grid">
                    ${relatedHTML.length > 0 ? relatedHTML : '<p>More amazing products coming soon!</p>'}
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

async function addNewProduct(event) {
    event.preventDefault();

    const title = document.getElementById('p-title').value;
    const category = document.getElementById('p-category').value;
    const price = document.getElementById('p-price').value;
    const onSale = document.getElementById('p-sale').checked;
    const filesInput = document.getElementById('p-image-files').files;
    const desc = document.getElementById('p-desc').value;
    const link = document.getElementById('p-link').value;

    if (filesInput.length === 0) {
        alert("Please select at least 1 image from your PC.");
        return;
    }
    if (filesInput.length > 5) {
        alert("Maximum 5 images allowed per product!");
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "Publishing...";
    submitBtn.disabled = true;

    try {
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
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        submitBtn.innerText = "Publish Product";
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
    
    if (btnElement) {
        document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    if (category === 'all') {
        renderHomeView(products);
    } else {
        const filtered = products.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
        renderHomeView(filtered);
    }
};

function searchProducts() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = products.filter(p => p.title && p.title.toLowerCase().includes(query));
    renderHomeView(filtered);
}

loadStoreData();
