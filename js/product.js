import { getProducts, IMAGE_BASE_URL } from './api.js';

// Список обязательных полей по контракту бэкенда
const REQUIRED_FIELDS = ['id', 'name', 'price', 'rating', 'image'];

// Валидация структуры данных товара
function validateProduct(product, index) {
    const missingFields = REQUIRED_FIELDS.filter(field => product[field] === undefined || product[field] === null);
    
    if (missingFields.length > 0) {
        console.warn(
            `[API Schema Warning] Товар #${index} (id: ${product.id ?? 'не указан'}, name: "${product.name ?? 'без имени'}") ` +
            `не содержит обязательных полей: [${missingFields.join(', ')}]`,
            product
        );
    }
}

// Генерация SVG-звезд рейтинга
function renderStars(rating = 0) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let starsHtml = '';

    const starFull = './assest/icons/Star.svg';
    const starHalf = './assest/icons/HalfStar.svg';

    for (let i = 0; i < fullStars; i++) {
        starsHtml += `<img src="${starFull}" alt="star" class="product-card__star">`;
    }

    if (hasHalf) {
        starsHtml += `<img src="${starHalf}" alt="half star" class="product-card__star">`;
    }

    return starsHtml;
}

// Обработка битого изображения с подробным отчетом об ошибке
window.handleImageError = function(imgElement, productId, productName, requestedSrc) {
    imgElement.onerror = null; // глушим повторный вызов
    
    // Выводим структурированную ошибку для разработчика
    console.error(
        `[Asset Error 404] Отсутствует изображение для товара!\n` +
        `ID товара: ${productId}\n` +
        `Название: "${productName}"\n` +
        `Запрошенный URL: ${requestedSrc}\n`
    );

    // Заменяем сломанную картинку на нейтральный SVG-плейсхолдер "No Image"
    imgElement.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F0F0F0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23888888%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
    imgElement.alt = `Изображение не найдено (${productName})`;
};

// Формирование карточки строго по данным API
function createProductCard(product, index) {
    validateProduct(product, index);

    // Бэкенд возвращает только имя файла или число (например "22" или "22.png")
    const imageName = product.image ? (product.image.includes('.') ? product.image : `${product.image}.png`) : '';
    const imageSrc = imageName ? `${IMAGE_BASE_URL}/${imageName}` : '';
    const hasDiscount = Boolean(product.discount && product.oldPrice);

    return `
        <li class="product-card" data-id="${product.id}">
            <a href="Product.html?id=${product.id}" class="product-card__link">
                <div class="product-card__image-wrap">
                    <img 
                        src="${imageSrc}" 
                        alt="${product.alt || product.name || 'Товар'}" 
                        class="product-card__img"
                        loading="lazy"
                        onerror="window.handleImageError(this, ${product.id}, '${product.name}', '${imageSrc}')"
                    >
                </div>
                
                <h3 class="product-card__title">${product.name || 'Без названия'}</h3>
                
                <div class="product-card__rating">
                    <div class="product-card__stars">
                        ${renderStars(product.rating || 0)}
                    </div>
                    <span class="product-card__rating-value">${product.rating ?? 0}/5</span>
                </div>

                <div class="product-card__price-wrap">
                    <span class="product-card__price">$${product.price ?? 0}</span>
                    ${hasDiscount ? `
                        <span class="product-card__price--old">$${product.oldPrice}</span>
                        <span class="product-card__badge">-${product.discount}%</span>
                    ` : ''}
                </div>
            </a>
        </li>
    `;
}

// Загрузка данных и инъекция в DOM
async function initProducts() {
    const productsContainer = document.getElementById('productsContainer');
    if (!productsContainer) {
        console.error('[DOM Error] Контейнер #productsContainer не найден на странице!');
        return;
    }

    try {
        productsContainer.innerHTML = '<li class="loading">Загрузка каталога...</li>';

        const response = await getProducts();
        const products = response.items || [];

        if (products.length === 0) {
            productsContainer.innerHTML = '<li class="empty">Товары не найдены</li>';
            return;
        }

        productsContainer.innerHTML = products.map((p, idx) => createProductCard(p, idx)).join('');
    } catch (error) {
        console.error('[API Fetch Error] Не удалось получить список товаров с бэкенда:', error);
        productsContainer.innerHTML = '<li class="error">Не удалось загрузить товары с сервера.</li>';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProducts);
} else {
    initProducts();
}