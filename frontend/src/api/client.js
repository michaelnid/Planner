const API_BASE = '/api';

let accessToken = null;
let onLogout = null;

export function setAccessToken(token) {
    accessToken = token;
}

export function getAccessToken() {
    return accessToken;
}

export function setLogoutHandler(handler) {
    onLogout = handler;
}

async function request(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Remove Content-Type for FormData
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    // Token expired - try refresh
    if (response.status === 401 && url !== '/auth/login' && url !== '/auth/refresh') {
        const refreshed = await refreshToken();
        if (refreshed) {
            headers['Authorization'] = `Bearer ${accessToken}`;
            const retryResponse = await fetch(`${API_BASE}${url}`, {
                ...options,
                headers,
                credentials: 'include',
            });
            if (!retryResponse.ok) {
                const error = await retryResponse.json().catch(() => ({}));
                throw new Error(error.detail || 'Anfrage fehlgeschlagen');
            }
            return retryResponse.json();
        } else {
            if (onLogout) onLogout();
            throw new Error('Sitzung abgelaufen');
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Anfrage fehlgeschlagen');
    }

    if (response.status === 204) return null;
    return response.json();
}

async function refreshToken() {
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });
        if (res.ok) {
            const data = await res.json();
            accessToken = data.access_token;
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(username, password) {
    const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    accessToken = data.access_token;
    return data;
}

export async function logout() {
    try {
        await request('/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    accessToken = null;
}

export async function register(username, password) {
    return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

export async function getMe() {
    return request('/auth/me');
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getProducts(search, categoryId) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId) params.set('category_id', categoryId);
    return request(`/products?${params}`);
}

export async function getProduct(id) {
    return request(`/products/${id}`);
}

export async function createProduct(data) {
    return request('/products', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateProduct(id, data) {
    return request(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteProduct(id) {
    return request(`/products/${id}`, { method: 'DELETE' });
}

export async function getProductCategories() {
    return request('/products/categories');
}

export async function createProductCategory(data) {
    return request('/products/categories', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// ─── Recipes ─────────────────────────────────────────────────────────────────

export async function getRecipes(search, categoryId, favoritesOnly) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId) params.set('category_id', categoryId);
    if (favoritesOnly) params.set('favorites_only', 'true');
    return request(`/recipes?${params}`);
}

export async function getRecipe(id) {
    return request(`/recipes/${id}`);
}

export async function createRecipe(data) {
    return request('/recipes', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateRecipe(id, data) {
    return request(`/recipes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteRecipe(id) {
    return request(`/recipes/${id}`, { method: 'DELETE' });
}

export async function toggleFavorite(id) {
    return request(`/recipes/${id}/favorite`, { method: 'PUT' });
}

export async function uploadRecipeImage(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/recipes/${id}/image`, {
        method: 'POST',
        body: formData,
    });
}

export async function getRecipeCategories() {
    return request('/recipes/categories');
}

// ─── Meal Plan ───────────────────────────────────────────────────────────────

export async function getWeekPlan(weekOffset = 0) {
    return request(`/meal-plan/week?week_offset=${weekOffset}`);
}

export async function setMeal(data) {
    return request('/meal-plan', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function removeMeal(id) {
    return request(`/meal-plan/${id}`, { method: 'DELETE' });
}

export async function getMealPlanTemplates() {
    return request('/meal-plan/templates');
}

export async function createMealPlanTemplate(data) {
    return request('/meal-plan/templates', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function applyMealPlanTemplate(templateId, weekOffset = 0) {
    return request(`/meal-plan/templates/${templateId}/apply?week_offset=${weekOffset}`, {
        method: 'POST',
    });
}

export async function deleteMealPlanTemplate(id) {
    return request(`/meal-plan/templates/${id}`, { method: 'DELETE' });
}

// ─── Shopping ────────────────────────────────────────────────────────────────

export async function getShoppingList(weekOffset = 0) {
    return request(`/shopping?week_offset=${weekOffset}`);
}

export async function generateShoppingList(weekOffset = 0) {
    return request(`/shopping/generate?week_offset=${weekOffset}`, { method: 'POST' });
}

export async function addShoppingItem(data, weekOffset = 0) {
    return request(`/shopping?week_offset=${weekOffset}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateShoppingItem(id, data) {
    return request(`/shopping/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function checkAllShopping(weekOffset = 0) {
    return request(`/shopping/check-all?week_offset=${weekOffset}`, { method: 'PUT' });
}

export async function uncheckAllShopping(weekOffset = 0) {
    return request(`/shopping/uncheck-all?week_offset=${weekOffset}`, { method: 'PUT' });
}

export async function deleteShoppingItem(id) {
    return request(`/shopping/${id}`, { method: 'DELETE' });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUsers() {
    return request('/users');
}

export async function updateUser(id, data) {
    return request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteUser(id) {
    return request(`/users/${id}`, { method: 'DELETE' });
}
