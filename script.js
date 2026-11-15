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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let isAdmin = false;
let categories = ["Dresses", "Makeup", "Jewelry"];
let products = [];
let currentCategory = 'all';

const grid = document.getElementById('product-grid');
const emptyState = document.getElementById('empty-state');
const categoryBar = document.getElementById('category-bar');
const categorySelect = document.getElementById('p-category');

// Secret Admin Trigger: Click Logo 3 times quickly
let logoClicks = 0;
const logoEl = document.querySelector('.logo');
if(logoEl) {
    logoEl.addEventListener('click', () => {
        logoClicks++;
        if (logoClicks === 3) {
            let pwd = prompt("Enter Admin Secret Password:");
            if (pwd === "shanza123") {
                isAdmin = true;
                document.getElementById('manage-btn').classList.remove('hidden-secure');
                renderProductsUI();
                alert("Admin Mode Unlocked! Ab aap products add ya delete kar sakti hain.");
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

// Fetch Categories and Products from Firestore Real-time
function loadStoreData() {
    // Load Categories
    db.collection("settings").doc("categories").get().then((doc) => {
        if (doc.exists && doc.data().list) {
            categories = doc.data().list;
        }
        renderCategories();
    }).catch(() => {
        renderCategories();
    });

    // Load Products in Real-time
    db.collection("products").onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        filterProducts(currentCategory);
    });
}

// Render Categories
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

// Add New Category
function addNewCategory(event) {
    event.preventDefault();
    const input = document.getElementById('new-cat-name');
    const newCat = input.value.trim();

    if (newCat && !categories.some(c => c.toLowerCase() === newCat.toLowerCase())) {
        categories.push(newCat);
        db.collection("settings").doc("categories").set({ list: categories }).then(() => {
            renderCategories();
            input.value = "";
            alert(`Category "${newCat}" added successfully!`);
        });
    } else {
        alert("Category already exists or is invalid.");
    }
}

// Display Products on Screen
function renderProductsUI() {
    filterProducts(currentCategory);
}

function displayProducts(productsToDisplay) {
    if(!grid) return;
    grid.innerHTML = "";
    
    if (productsToDisplay.length === 0) {
        if(emptyState) emptyState.classList.remove('hidden');
        return;
    } else {
        if(emptyState) emptyState.classList.add('hidden');
    }

    productsToDisplay.forEach((product) => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        
        const deleteBtnHTML = isAdmin 
            ? `<button class="delete-card-btn" title="Delete Product" onclick="deleteProduct('${product.id}')"><i class="fa-solid fa-trash"></i></button>` 
            : '';

        card.innerHTML = `
            ${deleteBtnHTML}
            <span class="price-badge">${product.price}</span>
            <img src="${product.image}" alt="${product.title}" class="product-image">
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <a href="${product.affiliateLink}" target="_blank" class="buy-btn">
                    <i class="fa-solid fa-cart-shopping"></i> Buy on AliExpress
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Delete a Product from Database (Admin only)
function deleteProduct(id) {
    if (confirm("Kya aap waqai is product ko delete karna chahti hain?")) {
        db.collection("products").doc(id).delete().then(() => {
            alert("Product deleted successfully!");
        }).catch((error) => {
            alert("Error deleting product: " + error.message);
        });
    }
}

// Add New Product & Save to Cloud Database
function addNewProduct(event) {
    event.preventDefault();

    const title = document.getElementById('p-title').value;
    const category = document.getElementById('p-category').value;
    const price = document.getElementById('p-price').value;
    const imageFile = document.getElementById('p-image-file').files[0];
    const link = document.getElementById('p-link').value;

    const reader = new FileReader();
    reader.onload = function(uploadEvent) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const scaleSize = 400 / img.width;
            canvas.width = 400;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedImage = canvas.toDataURL('image/jpeg', 0.8);

            const newProduct = {
                title: title,
                category: category,
                price: price,
                image: compressedImage,
                affiliateLink: link,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            db.collection("products").add(newProduct).then(() => {
                document.getElementById('product-form').reset();
                alert('Product published successfully! Ab ye har mobile aur laptop par live nazar aa raha hai.');
            }).catch((error) => {
                alert("Error adding product: " + error.message);
            });
        };
        img.src = uploadEvent.target.result;
    };

    if (imageFile) {
        reader.readAsDataURL(imageFile);
    }
}

// Filter by Category
function filterProducts(category, btnElement = null) {
    currentCategory = category;
    
    if (btnElement) {
        document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    if (category === 'all') {
        displayProducts(products);
    } else {
        const filtered = products.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
        displayProducts(filtered);
    }
}

// Search Products
function searchProducts() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = products.filter(p => p.title && p.title.toLowerCase().includes(query));
    displayProducts(filtered);
}

// Initialize Store on load
loadStoreData();
