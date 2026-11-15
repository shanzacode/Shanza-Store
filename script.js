// === GLOBAL STORE DATA (Har device par yehi show hoga) ===
const defaultCategories = ["Dresses", "Makeup"];
const defaultProducts = [];
// =========================================================

let isAdmin = false;
let categories = JSON.parse(localStorage.getItem('shanza_categories')) || defaultCategories;
let products = JSON.parse(localStorage.getItem('shanza_products')) || defaultProducts;
let currentCategory = 'all';

const grid = document.getElementById('product-grid');
const emptyState = document.getElementById('empty-state');
const categoryBar = document.getElementById('category-bar');
const categorySelect = document.getElementById('p-category');

// Secret Admin Trigger: Click Logo 3 times quickly
let logoClicks = 0;
document.querySelector('.logo').addEventListener('click', () => {
    logoClicks++;
    if (logoClicks === 3) {
        let pwd = prompt("Enter Admin Secret Password:");
        if (pwd === "shanza123") {
            isAdmin = true;
            document.getElementById('manage-btn').classList.remove('hidden-secure');
            filterProducts(currentCategory); // Refresh cards to show Delete buttons
            alert("Admin Mode Unlocked! Ab aap products add ya delete kar sakti hain.");
        } else {
            alert("Wrong Password!");
        }
        logoClicks = 0;
    }
    setTimeout(() => { logoClicks = 0; }, 2000);
});

function toggleAdminPanel() {
    document.getElementById('admin-panel').classList.toggle('hidden');
}

// Render Categories
function renderCategories() {
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
        localStorage.setItem('shanza_categories', JSON.stringify(categories));
        renderCategories();
        input.value = "";
        alert(`Category "${newCat}" added!`);
    } else {
        alert("Category already exists or is invalid.");
    }
}

// Display Products (Includes Delete button ONLY when Admin is unlocked)
function displayProducts(productsToDisplay) {
    grid.innerHTML = "";
    
    if (productsToDisplay.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    productsToDisplay.forEach((product) => {
        // Find exact index in main products array for accurate deletion
        const realIndex = products.indexOf(product);
        const card = document.createElement('div');
        card.classList.add('product-card');
        
        const deleteBtnHTML = isAdmin 
            ? `<button class="delete-card-btn" title="Delete Product" onclick="deleteProduct(${realIndex})"><i class="fa-solid fa-trash"></i></button>` 
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

// Delete a Product (Admin only)
function deleteProduct(index) {
    if (confirm("Kya aap waqai is product ko delete karna chahti hain?")) {
        products.splice(index, 1);
        localStorage.setItem('shanza_products', JSON.stringify(products));
        filterProducts(currentCategory);
    }
}

// Compress Image so it saves cleanly and stays lightweight for GitHub
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
            // Resize image to max 400px width so file size stays small for all devices
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
                affiliateLink: link
            };

            products.unshift(newProduct);
            localStorage.setItem('shanza_products', JSON.stringify(products));
            
            filterProducts(currentCategory);
            document.getElementById('product-form').reset();
            alert('Product published! Agar aap chahti hain ke ye har mobile aur laptop par nazar aaye to "Copy Code for GitHub" dabayein.');
        };
        img.src = uploadEvent.target.result;
    };

    if (imageFile) {
        reader.readAsDataURL(imageFile);
    }
}

// Copy updated code so user can paste in GitHub script.js to show on ALL devices
function copyStoreCode() {
    const codeToCopy = `// === GLOBAL STORE DATA (Har device par yehi show hoga) ===
const defaultCategories = ${JSON.stringify(categories)};
const defaultProducts = ${JSON.stringify(products)};
// =========================================================`;

    navigator.clipboard.writeText(codeToCopy).then(() => {
        alert("Code Copy ho gaya! Ab GitHub par apni 'script.js' file khol kar upar wali 4 lines ki jagah isay paste karke Commit kar dein. Phir har mobile aur laptop par yehi products dikhenge!");
    }).catch(() => {
        alert("Copy failed! Please allow clipboard permissions.");
    });
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
        const filtered = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
        displayProducts(filtered);
    }
}

// Search Products
function searchProducts() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = products.filter(p => p.title.toLowerCase().includes(query));
    displayProducts(filtered);
}

// Initialize
renderCategories();
displayProducts(products);
