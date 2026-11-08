import { getProducts, IMAGE_BASE_URL } from './api.js'; // импортируем функции из api.js

// функция создает хтмл разметку для одной карточки товара
function createProductCard(product) {
    // вычисляет скидку
    const hasDiscount = product.discount > 0;
    const finalPrice = hasDiscount
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price

    return `
        <article class="product-card" data-id="${product.id}">
            <a href="Product.html?id=${product.id}" class="product-card__link">
                <div class="product-card__image-wrap">
                    <img 
                        src="${IMAGE_BASE_URL}/${product.image}" 
                        alt="${product.name}" 
                        class="product-card__img"
                        onerror="this.src='./assest/images/image-1.png'"
                    >
                </div>
                <h3 class="product-card__title">${product.name}</h3>
                
                <div class="product-card__rating">
                    <div class="stars">
                        ★★★★☆
                    </div>
                    <span class="rating-value">${product.rating || '4.5'}/5</span>
                </div>

                <div class="product-card__price-wrap">
                    <span class="product-card__price">$${finalPrice}</span>
                    ${hasDiscount ? `
                        <span class="product-card__price--old">$${product.price}</span>
                        <span class="product-card__badge">-${product.discount}%</span>
                    ` : ''}
                </div>
            </a>
        </article>
    `;
}

// функция которая загружает и отображает товар

async function initProducts() {

    const productContainer = document.getElementById('productsContainer')

    console.log('Контейнер товаров:, productsContainer');

    if (!productContainer) {
        console.error('Ошибка: элемент с id="productContainer" не найден в хтмл');
        return;
    }

    try {
        // показыает текст загрузку товаров пока товары грузятся
        productsContainer.innerHTML = '<p class="loading">Загрузка товаров</p>';

        // запрос массива товара у бекенда через api.js
        const data = await getProducts();
        console.log('Ответ от сервера:', data);

        // бекенд возвращает либо массив либо объект
        const products = Array.isArray(data) ? data : (data.item || []);

        // так же если ничего не не выдало или же кол во товаров 0 то напишет товары не найдены
        if (products.length === 0) {
            productsContainer.innerHTML = '<p class="empty">Товары не найдены</p>';
            return;
        }

        // собираем конструктов
        productsContainer.innerHTML = products.map(createProductCard).join('');

    } catch (error) { 
            console.error('Не удалось загрузить товары:', error);
            productsContainer.innerHTML = '<p class="error">Ошибрка при загрузке товаров с сервера.</p>';
        }
    }
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProducts);
} else {
    initProducts();
}