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

let isAdmin = false;
let categories = ["Dresses", "Makeup", "Jewelry"];
let products = [];
let currentCategory = 'all';
let currentImageIndexes = {};

// Sahi GitHub Live URL
const LIVE_SITE_URL = "https://shanzacode.github.io/Shanza-Store/";

const mainArea = document.getElementById('main-content-area');
const categoryBar = document.getElementById('category-bar');
const categorySelect = document.getElementById('p-category');

// Secret Admin Trigger: Click Logo 3 times quickly
let logoClicks = 0;
const logoEl = document.querySelector('.logo-container');
if(logoEl) {
    logoEl.addEventListener('click', () => {
        logoClicks++;
        if (logoClicks === 3) {
            let pwd = prompt("Enter Admin Secret Password:");
            if (pwd === "shanza123") {
                isAdmin = true;
                const manageBtn = document.getElementById('manage-btn');
                if(manageBtn) manageBtn.classList.remove('hidden-secure');
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
    window.location.hash = "";
    renderHomeView();
}

// Load Data from Firestore
function loadStoreData() {
    db.collection("settings").doc("categories").get().then((doc) => {
        if (doc.exists && doc.data().list) {
            categories = doc.data().list;
        }
        renderCategories();
    }).catch(() => {
        renderCategories();
    });

    db.collection("products").onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        checkUrlRoute();
    });
}

// Direct URL Route (#product=ID)
function checkUrlRoute() {
    const hash = window.location.hash;
    if (hash.startsWith('#product=')) {
        const productId = hash.replace('#product=', '');
        if (products.length > 0) {
            openProductDetail(productId, false);
        }
    } else {
        renderHomeView();
    }
}

window.addEventListener('hashchange', checkUrlRoute);

function renderCategories() {
    if(!categoryBar) return;
    categoryBar.innerHTML = `<button class="cat-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterProducts('all', this)">All Products</button>`;
    
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
        db.collection("settings").doc("categories").set({ list: categories }).then(() => {
            renderCategories();
            input.value = "";
            alert(`Category "${newCat}" added!`);
        });
    } else {
        alert("Category already exists or invalid.");
    }
}

// Render Home Grid (Client Clean View)
function renderHomeView(filteredList = null) {
    const listToDisplay = filteredList || products;
    
    mainArea.innerHTML = `
        <div id="product-grid" class="product-grid"></div>
        <div id="empty-state" class="empty-state ${listToDisplay.length > 0 ? 'hidden' : ''}">
            <i class="fa-solid fa-bag-shopping"></i>
            <p>No products found in this category yet.</p>
        </div>
    `;

    const grid = document.getElementById('product-grid');
    if(!grid) return;

    listToDisplay.forEach((product) => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        
        const deleteBtnHTML = isAdmin 
            ? `<button class="delete-card-btn" title="Delete Product" onclick="deleteProduct(event, '${product.id}')"><i class="fa-solid fa-trash"></i></button>` 
            : '';

        const saleBadgeHTML = product.onSale 
            ? `<span class="sale-badge">SALE</span>` 
            : '';

        let imgs = product.images && product.images.length > 0 ? product.images : [product.image];
        if(currentImageIndexes[product.id] === undefined) currentImageIndexes[product.id] = 0;
        let imgIdx = currentImageIndexes[product.id];

        card.innerHTML = `
            ${deleteBtnHTML}
            ${saleBadgeHTML}
            <span class="price-badge">${product.price}</span>
            <div class="card-img-container">
                <img src="${imgs[imgIdx]}" alt="${product.title}" class="product-image" onclick="openProductDetail('${product.id}')">
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
    if(!product) return;
    let imgs = product.images && product.images.length > 0 ? product.images : [product.image];
    
    let idx = currentImageIndexes[productId] || 0;
    idx += direction;
    if(idx < 0) idx = imgs.length - 1;
    if(idx >= imgs.length) idx = 0;
    currentImageIndexes[productId] = idx;

    renderHomeView();
}

// Product Detail View (Admin Link ONLY shown if isAdmin is true)
function openProductDetail(productId, updateHash = true) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (updateHash) {
        window.location.hash = `product=${productId}`;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    let imgs = product.images && product.images.length > 0 ? product.images : [product.image];
    window.currentDetailImages = imgs;
    window.currentDetailIdx = 0;

    let galleryThumbnails = "";
    if(imgs.length > 1) {
        imgs.forEach((imgUrl, i) => {
            galleryThumbnails += `<img src="${imgUrl}" class="thumb-img ${i === 0 ? 'active-thumb' : ''}" onclick="switchDetailImage(this, '${imgUrl}', ${i})">`;
        });
    }

    // ONLY Admin sees this box! Clients NEVER see it.
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
                <img src="${relImgs[0]}" alt="${rel.title}">
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
                        <img id="main-product-display" src="${imgs[0]}" alt="${product.title}">
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
    if(!imgsArray || imgsArray.length <= 1) return;

    window.currentDetailIdx += direction;
    if(window.currentDetailIdx < 0) window.currentDetailIdx = imgsArray.length - 1;
    if(window.currentDetailIdx >= imgsArray.length) window.currentDetailIdx = 0;

    document.getElementById('main-product-display').src = imgsArray[window.currentDetailIdx];
    const thumbs = document.querySelectorAll('.thumb-img');
    thumbs.forEach((t, i) => {
        if(i === window.currentDetailIdx) t.classList.add('active-thumb');
        else t.classList.remove('active-thumb');
    });
}

// Helper to compress multiple files selected from PC
function compressImageFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const maxWidth = 450;
                const scaleSize = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Add Product from PC (Up to 5 images)
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
    submitBtn.innerText = "Uploading & Compressing...";
    submitBtn.disabled = true;

    try {
        const compressedImages = [];
        for (let i = 0; i < filesInput.length; i++) {
            const base64 = await compressImageFile(filesInput[i]);
            compressedImages.push(base64);
        }

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
        
        const generatedPinLink = LIVE_SITE_URL + `#product=${docRef.id}`;
        prompt("Product Published! Yeh aapka valid Pinterest Link hai (Isko copy kar ke Pinterest par laga dein):", generatedPinLink);
        
        renderHomeView();
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
            alert("Product deleted!");
        }).catch((error) => {
            alert("Error: " + error.message);
        });
    }
}

filterProducts = function(category, btnElement = null) {
    currentCategory = category;
    window.location.hash = "";
    
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
