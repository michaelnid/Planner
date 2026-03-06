import { useState, useEffect } from 'react';
import {
    getRecipes, createRecipe, updateRecipe, deleteRecipe, toggleFavorite, uploadRecipeImage,
    getProducts, getRecipeCategories
} from '../api/client';

export default function Recipes() {
    const [recipes, setRecipes] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [favOnly, setFavOnly] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editRecipe, setEditRecipe] = useState(null);
    const [form, setForm] = useState({
        name: '', category_id: '', servings: 1, prep_time_minutes: '',
        notes: '', is_favorite: false,
        kcal_override: '', protein_override: '', fat_override: '', carbs_override: '',
        ingredients: []
    });
    const [error, setError] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [recs, prods, cats] = await Promise.all([
                getRecipes(), getProducts(), getRecipeCategories()
            ]);
            setRecipes(recs);
            setProducts(prods);
            setCategories(cats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (recipe = null) => {
        if (recipe) {
            setEditRecipe(recipe);
            setForm({
                name: recipe.name,
                category_id: recipe.category_id || '',
                servings: recipe.servings || 1,
                prep_time_minutes: recipe.prep_time_minutes || '',
                notes: recipe.notes || '',
                is_favorite: recipe.is_favorite,
                kcal_override: '',
                protein_override: '',
                fat_override: '',
                carbs_override: '',
                ingredients: recipe.ingredients.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity,
                })),
            });
        } else {
            setEditRecipe(null);
            setForm({
                name: '', category_id: '', servings: 1, prep_time_minutes: '',
                notes: '', is_favorite: false,
                kcal_override: '', protein_override: '', fat_override: '', carbs_override: '',
                ingredients: [],
            });
        }
        setError('');
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = {
                name: form.name,
                category_id: form.category_id ? parseInt(form.category_id) : null,
                servings: parseInt(form.servings) || 1,
                prep_time_minutes: form.prep_time_minutes ? parseInt(form.prep_time_minutes) : null,
                notes: form.notes || null,
                is_favorite: form.is_favorite,
                kcal_override: form.kcal_override ? parseFloat(form.kcal_override) : null,
                protein_override: form.protein_override ? parseFloat(form.protein_override) : null,
                fat_override: form.fat_override ? parseFloat(form.fat_override) : null,
                carbs_override: form.carbs_override ? parseFloat(form.carbs_override) : null,
                ingredients: form.ingredients.filter(i => i.product_id).map(i => ({
                    product_id: parseInt(i.product_id),
                    quantity: parseFloat(i.quantity) || 0,
                })),
            };
            if (editRecipe) {
                await updateRecipe(editRecipe.id, data);
            } else {
                await createRecipe(data);
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Rezept wirklich loeschen?')) return;
        try {
            await deleteRecipe(id);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleToggleFavorite = async (id) => {
        await toggleFavorite(id);
        loadData();
    };

    const handleImageUpload = async (recipeId, e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await uploadRecipeImage(recipeId, file);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const addIngredient = () => {
        setForm({ ...form, ingredients: [...form.ingredients, { product_id: '', quantity: '' }] });
    };

    const removeIngredient = (idx) => {
        setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== idx) });
    };

    const updateIngredient = (idx, field, value) => {
        const ings = [...form.ingredients];
        ings[idx] = { ...ings[idx], [field]: value };
        setForm({ ...form, ingredients: ings });
    };

    const filtered = recipes.filter(r => {
        if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterCat && r.category_id !== parseInt(filterCat)) return false;
        if (favOnly && !r.is_favorite) return false;
        return true;
    });

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Rezepte</h1>
                        <p className="page-subtitle">{recipes.length} Rezepte gespeichert</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Neues Rezept
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-bar" style={{ flex: 1 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input className="form-input" placeholder="Rezepte suchen..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className="form-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ width: 180 }}>
                    <option value="">Alle Kategorien</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                    className={`btn ${favOnly ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFavOnly(!favOnly)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={favOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Favoriten
                </button>
            </div>

            {/* Recipe Cards */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <div className="empty-state-title">Keine Rezepte gefunden</div>
                    <div className="empty-state-text">Erstelle dein erstes Rezept.</div>
                </div>
            ) : (
                <div className="card-grid">
                    {filtered.map(recipe => (
                        <div key={recipe.id} className="recipe-card" onClick={() => openModal(recipe)}>
                            <div className="recipe-card-relative">
                                <div className="recipe-card-image">
                                    {recipe.image_path ? (
                                        <img src={`/uploads/${recipe.image_path}`} alt={recipe.name} />
                                    ) : (
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                        </svg>
                                    )}
                                </div>
                                <button
                                    className="recipe-card-favorite"
                                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite(recipe.id); }}
                                    title={recipe.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill={recipe.is_favorite ? '#f59e0b' : 'none'} stroke={recipe.is_favorite ? '#f59e0b' : '#94a3b8'} strokeWidth="2">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                </button>
                            </div>
                            <div className="recipe-card-body">
                                <div className="recipe-card-name">{recipe.name}</div>
                                {recipe.category_name && (
                                    <span className="badge badge-primary">{recipe.category_name}</span>
                                )}
                                <div className="recipe-card-meta">
                                    <span className="recipe-card-meta-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                                        </svg>
                                        {Math.round(recipe.kcal_total)} kcal
                                    </span>
                                    {recipe.prep_time_minutes && (
                                        <span className="recipe-card-meta-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            {recipe.prep_time_minutes} Min.
                                        </span>
                                    )}
                                    <span className="recipe-card-meta-item">
                                        {recipe.servings} Port.
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editRecipe ? 'Rezept bearbeiten' : 'Neues Rezept'}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                {error && <div className="login-error">{error}</div>}

                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Kategorie</label>
                                        <select className="form-select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                            <option value="">Keine</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Portionen</label>
                                        <input className="form-input" type="number" min="1" value={form.servings} onChange={e => setForm({ ...form, servings: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Zubereitungszeit (Min.)</label>
                                        <input className="form-input" type="number" value={form.prep_time_minutes} onChange={e => setForm({ ...form, prep_time_minutes: e.target.value })} placeholder="z.B. 30" />
                                    </div>
                                </div>

                                {/* Ingredients */}
                                <div className="form-group">
                                    <label className="form-label">Zutaten</label>
                                    {form.ingredients.map((ing, idx) => (
                                        <div key={idx} className="ingredient-row">
                                            <select className="form-select" value={ing.product_id} onChange={e => updateIngredient(idx, 'product_id', e.target.value)}>
                                                <option value="">Produkt waehlen...</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                                            </select>
                                            <input className="form-input" type="number" step="0.1" placeholder="Menge" value={ing.quantity} onChange={e => updateIngredient(idx, 'quantity', e.target.value)} />
                                            <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeIngredient(idx)} style={{ color: 'var(--color-error)' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={addIngredient}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Zutat hinzufuegen
                                    </button>
                                </div>

                                {/* Override Nutrition */}
                                <details style={{ marginTop: 'var(--space-md)' }}>
                                    <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                        Nährwerte manuell überschreiben (optional)
                                    </summary>
                                    <div className="form-row" style={{ marginTop: 'var(--space-sm)' }}>
                                        <div className="form-group">
                                            <label className="form-label">kcal gesamt</label>
                                            <input className="form-input" type="number" step="0.1" value={form.kcal_override} onChange={e => setForm({ ...form, kcal_override: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Protein (g)</label>
                                            <input className="form-input" type="number" step="0.1" value={form.protein_override} onChange={e => setForm({ ...form, protein_override: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Fett (g)</label>
                                            <input className="form-input" type="number" step="0.1" value={form.fat_override} onChange={e => setForm({ ...form, fat_override: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Kohlenhydrate (g)</label>
                                            <input className="form-input" type="number" step="0.1" value={form.carbs_override} onChange={e => setForm({ ...form, carbs_override: e.target.value })} />
                                        </div>
                                    </div>
                                </details>

                                <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                    <label className="form-label">Notizen</label>
                                    <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Zubereitungshinweise..." />
                                </div>

                                {editRecipe && (
                                    <div className="form-group">
                                        <label className="form-label">Bild hochladen</label>
                                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImageUpload(editRecipe.id, e)} />
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                {editRecipe && (
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => { handleDelete(editRecipe.id); setShowModal(false); }} style={{ marginRight: 'auto' }}>
                                        Loeschen
                                    </button>
                                )}
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                                <button type="submit" className="btn btn-primary">{editRecipe ? 'Speichern' : 'Erstellen'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
