// Load saved categories & products from LocalStorage (Starts completely empty of products)
let categories = JSON.parse(localStorage.getItem('shanza_categories')) || ["Dresses", "Makeup"];
let products = JSON.parse(localStorage.getItem('shanza_products')) || [];
let currentCategory = 'all';

const grid = document.getElementById('product-grid');
const emptyState = document.getElementById('empty-state');
const categoryBar = document.getElementById('category-bar');
const categorySelect = document.getElementById('p-category');

// Toggle Admin Panel
function toggleAdminPanel() {
    document.getElementById('admin-panel').classList.toggle('hidden');
}

// Render Categories in both Filter Bar and Add Product Dropdown
function renderCategories() {
    // 1. Update Filter Buttons
    categoryBar.innerHTML = `<button class="cat-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterProducts('all', this)">All Products</button>`;
    
    categories.forEach(cat => {
        const isActive = currentCategory.toLowerCase() === cat.toLowerCase() ? 'active' : '';
        categoryBar.innerHTML += `<button class="cat-btn ${isActive}" onclick="filterProducts('${cat}', this)">${cat}</button>`;
    });

    // 2. Update Dropdown in Add Product Form
    categorySelect.innerHTML = "";
    categories.forEach(cat => {
        categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

// Add New Custom Category
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

// Display Products
function displayProducts(productsToDisplay) {
    grid.innerHTML = "";
    
    if (productsToDisplay.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    productsToDisplay.forEach(product => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        
        card.innerHTML = `
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

// Add New Product
function addNewProduct(event) {
    event.preventDefault();

    const title = document.getElementById('p-title').value;
    const category = document.getElementById('p-category').value;
    const price = document.getElementById('p-price').value;
    const imageFile = document.getElementById('p-image-file').files[0];
    const link = document.getElementById('p-link').value;

    const reader = new FileReader();
    reader.onload = function(uploadEvent) {
        const newProduct = {
            title: title,
            category: category,
            price: price,
            image: uploadEvent.target.result,
            affiliateLink: link
        };

        products.unshift(newProduct);
        localStorage.setItem('shanza_products', JSON.stringify(products));
        
        filterProducts(currentCategory);
        document.getElementById('product-form').reset();
        toggleAdminPanel();
        alert('Product published successfully!');
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

// Initialize on load
renderCategories();
displayProducts(products);