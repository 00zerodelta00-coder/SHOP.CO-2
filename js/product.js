import { getProducts, IMAGE_BASE_URL } from './api.js';

const ITEMS_PER_PAGE = 9;
const REQUIRED_FIELDS = ['id', 'name', 'price', 'rating', 'image'];
let currentPage = 1;

// Проверка структуры данных от бэкенда
function validateProduct(product, index) {
    const missingFields = REQUIRED_FIELDS.filter(
        field => product[field] === undefined || product[field] === null
    );

    if (missingFields.length > 0) {
        console.warn(
            `[API Schema Warning] Товар #${index} (id: ${product.id ?? 'нет'}) — отсутствуют поля: [${missingFields.join(', ')}]`,
            product
        );
    }
}

// Генерация SVG-звезд с классом .star-icon из _cards.scss
function renderStars(rating = 0) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let starsHtml = '';

    const starFull = './assest/icons/Star.svg';
    const starHalf = './assest/icons/HalfStar.svg';

    for (let i = 0; i < fullStars; i++) {
        starsHtml += `<img class="star-icon" src="${starFull}" alt="star">`;
    }

    if (hasHalf) {
        starsHtml += `<img class="star-icon" src="${starHalf}" alt="half star">`;
    }

    return starsHtml;
}

// Обработка 404 для отсутствующих фото (10–24) с SVG-заглушкой
window.handleImageError = function(imgElement, productId, productName, requestedSrc) {
    imgElement.onerror = null;
    console.warn(`[Asset 404] Нет фото для товара #${productId} ("${productName}"): ${requestedSrc}`);

    imgElement.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22295%22%20height%3D%22298%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F0EEED%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23888888%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
    imgElement.alt = `Нет изображения (${productName})`;
};

// Шаблон карточки строго под БЭМ-классы из _cards.scss и index.html
function createProductCard(product, index) {
    validateProduct(product, index);

    const imageName = product.image
        ? (product.image.includes('.') ? product.image : `${product.image}.png`)
        : '';
    const imageSrc = imageName ? `${IMAGE_BASE_URL}/${imageName}` : '';
    const hasDiscount = Boolean(product.discount && product.oldPrice);
    const safeName = (product.name || 'Товар').replace(/'/g, "\\'");

    return `
        <li class="product-grid__item" data-id="${product.id}">
            <article class="product-card">
                <div class="product-card__thumb">
                    <img 
                        src="${imageSrc}" 
                        alt="${product.alt || product.name || 'Товар'}"
                        onerror="window.handleImageError(this, ${product.id}, '${safeName}', '${imageSrc}')"
                    >
                </div>
                <h3 class="product-card__title">
                    <a href="Product.html?id=${product.id}">${product.name || 'Без названия'}</a>
                </h3>
                <div class="product-card__rating">
                    <div class="product-card__stars">
                        ${renderStars(product.rating || 0)}
                    </div>
                    <span class="product-card__score">${product.rating ?? 0}/5</span>
                </div>
                <div class="product-card__pricing">
                    <span class="product-card__price">$${product.price ?? 0}</span>
                    ${hasDiscount ? `
                        <span class="product-card__price--old">$${product.oldPrice}</span>
                        <span class="product-card__badge">-${product.discount}%</span>
                    ` : ''}
                </div>
            </article>
        </li>
    `;
}

// Расчёт страниц (с троеточием, если страниц > 7)
function getPageNumbers(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3 || current >= total - 2) {
        return [1, 2, 3, '...', total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
}

// Отрисовка кнопок пагинации
function renderPagination(page, totalPages) {
    const paginationNav = document.querySelector('.pagination');
    if (!paginationNav) return;

    if (totalPages <= 1) {
        paginationNav.style.display = 'none';
        return;
    }
    paginationNav.style.display = 'flex';

    const prevBtn = paginationNav.querySelector('.pagination__arrow--prev');
    const nextBtn = paginationNav.querySelector('.pagination__arrow--next');
    const numbersContainer = paginationNav.querySelector('.pagination__numbers');

    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;

    if (numbersContainer) {
        const pages = getPageNumbers(page, totalPages);
        numbersContainer.innerHTML = pages.map(item => {
            if (item === '...') {
                return `<span class="pagination__dots">...</span>`;
            }
            const activeClass = item === page ? 'pagination__num--active' : '';
            return `<button type="button" class="pagination__num ${activeClass}" data-page="${item}">${item}</button>`;
        }).join('');
    }
}

// Обновление счётчика "Showing 1-9 of 24 Products"
function updateCatalogMeta(page, limit, total, itemsCount) {
    const metaText = document.querySelector('.catalog-main__meta p');
    if (!metaText) return;

    if (total === 0) {
        metaText.textContent = 'Showing 0 Products';
        return;
    }

    const start = (page - 1) * limit + 1;
    const end = start + itemsCount - 1;
    metaText.textContent = `Showing ${start}-${end} of ${total} Products`;
}

// Загрузка конкретной страницы каталога
async function loadCatalogPage(page = 1) {
    const productsContainer = document.getElementById('productsContainer');
    if (!productsContainer) return;

    try {
        productsContainer.innerHTML = '<li class="loading">Загрузка каталога...</li>';

        const response = await getProducts({ page, limit: ITEMS_PER_PAGE });
        const products = response.items || [];
        const total = response.total ?? products.length;
        const totalPages = response.pages ?? Math.ceil(total / ITEMS_PER_PAGE);

        currentPage = response.page || page;

        if (products.length === 0) {
            productsContainer.innerHTML = '<li class="empty">Товары не найдены</li>';
            updateCatalogMeta(1, ITEMS_PER_PAGE, 0, 0);
            renderPagination(1, 0);
            return;
        }

        productsContainer.innerHTML = products.map((p, idx) => createProductCard(p, idx)).join('');
        updateCatalogMeta(currentPage, ITEMS_PER_PAGE, total, products.length);
        renderPagination(currentPage, totalPages);
    } catch (error) {
        console.error('[API Fetch Error] Ошибка загрузки каталога:', error);
        productsContainer.innerHTML = '<li class="error">Не удалось загрузить товары с сервера.</li>';
    }
}

// Обработчики кликов пагинации
function initPaginationEvents() {
    const paginationNav = document.querySelector('.pagination');
    if (!paginationNav) return;

    paginationNav.addEventListener('click', (e) => {
        const prevBtn = e.target.closest('.pagination__arrow--prev');
        const nextBtn = e.target.closest('.pagination__arrow--next');
        const numBtn = e.target.closest('.pagination__num');

        if (prevBtn && !prevBtn.disabled) {
            loadCatalogPage(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (nextBtn && !nextBtn.disabled) {
            loadCatalogPage(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (numBtn) {
            const targetPage = Number(numBtn.dataset.page);
            if (targetPage && targetPage !== currentPage) {
                loadCatalogPage(targetPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPaginationEvents();
        loadCatalogPage(1);
    });
} else {
    initPaginationEvents();
    loadCatalogPage(1);
}