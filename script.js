// یہاں آپ جتنے چاہیں اپنے پرمنेंट پروڈکٹس خود ایڈ کر سکتی ہیں!
// یہ لسٹ گিট ہب پر اپ ڈیٹ ہوتے ہی موبائل اور لیپ ٹاپ دونوں پر سب کو نظر آئے گی۔
let products = [
    {
        title: "Elegant Golden Jewelry Set",
        category: "Jewelry",
        price: "Rs. 1,299",
        image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=500&q=80", // یہاں اپنی تصویر کا لنک یا نام دے سکتی ہیں
        affiliateLink: "https://s.click.aliexpress.com/e/_your_link_here"
    }
    // اگر اور پروڈکٹ ڈالنے ہوں تو نیچے کوما (,) لگا کر دوسرا لکھ سکتی ہیں:
    // {
    //     title: "Another Product Name",
    //     category: "Makeup",
    //     price: "Rs. 850",
    //     image: "IMAGE_URL_HERE",
    //     affiliateLink: "ALIEXPRESS_LINK_HERE"
    // }
];

let categories = ["Dresses", "Makeup", "Jewelry"];
let currentCategory = 'all';

const grid = document.getElementById('product-grid');
const emptyState = document.getElementById('empty-state');
const categoryBar = document.getElementById('category-bar');

// Secret Admin Trigger: Click Logo 3 times quickly
let logoClicks = 0;
const logoEl = document.querySelector('.logo');
if(logoEl) {
    logoEl.addEventListener('click', () => {
        logoClicks++;
        if (logoClicks === 3) {
            let pwd = prompt("Enter Admin Secret Password:");
            if (pwd === "shanza123") {
                document.getElementById('manage-btn').classList.remove('hidden-secure');
                alert("Admin Access Granted!");
            } else {
                alert("Wrong Password!");
            }
            logoClicks = 0;
        }
        setTimeout(() => { logoClicks = 0; }, 2000);
    });
}

function toggleAdminPanel() {
    const panel = document.getElementById('admin-panel');
    if(panel) panel.classList.toggle('hidden');
}

function verifyAdmin() {
    toggleAdminPanel();
}

// Render Categories Bar dynamically
function renderCategories() {
    if(!categoryBar) return;
    categoryBar.innerHTML = `<button class="cat-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterProducts('all', this)">All Products</button>`;
    
    categories.forEach(cat => {
        const isActive = currentCategory.toLowerCase() === cat.toLowerCase() ? 'active' : '';
        categoryBar.innerHTML += `<button class="cat-btn ${isActive}" onclick="filterProducts('${cat}', this)">${cat}</button>`;
    });
}

// Display Products on Screen
function displayProducts(productsToDisplay) {
    if(!grid) return;
    grid.innerHTML = "";
    
    if (productsToDisplay.length === 0) {
        if(emptyState) emptyState.classList.remove('hidden');
        return;
    } else {
        if(emptyState) emptyState.classList.add('hidden');
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
    const searchInput = document.getElementById('search-input');
    if(!searchInput) return;
    const query = searchInput.value.toLowerCase();
    const filtered = products.filter(p => p.title.toLowerCase().includes(query));
    displayProducts(filtered);
}

// Initialize on load
renderCategories();
displayProducts(products);
