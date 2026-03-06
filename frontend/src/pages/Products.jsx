import { useState, useEffect } from 'react';
import {
    getProducts, createProduct, updateProduct, deleteProduct,
    getProductCategories, createProductCategory
} from '../api/client';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [form, setForm] = useState({
        name: '', unit: 'Stk', category_id: '', kcal_per_unit: '',
        protein_per_unit: '', fat_per_unit: '', carbs_per_unit: ''
    });
    const [error, setError] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [prods, cats] = await Promise.all([getProducts(), getProductCategories()]);
            setProducts(prods);
            setCategories(cats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (product = null) => {
        if (product) {
            setEditProduct(product);
            setForm({
                name: product.name,
                unit: product.unit,
                category_id: product.category_id || '',
                kcal_per_unit: product.kcal_per_unit || '',
                protein_per_unit: product.protein_per_unit || '',
                fat_per_unit: product.fat_per_unit || '',
                carbs_per_unit: product.carbs_per_unit || '',
            });
        } else {
            setEditProduct(null);
            setForm({ name: '', unit: 'Stk', category_id: '', kcal_per_unit: '', protein_per_unit: '', fat_per_unit: '', carbs_per_unit: '' });
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
                unit: form.unit,
                category_id: form.category_id ? parseInt(form.category_id) : null,
                kcal_per_unit: form.kcal_per_unit ? parseFloat(form.kcal_per_unit) : 0,
                protein_per_unit: form.protein_per_unit ? parseFloat(form.protein_per_unit) : 0,
                fat_per_unit: form.fat_per_unit ? parseFloat(form.fat_per_unit) : 0,
                carbs_per_unit: form.carbs_per_unit ? parseFloat(form.carbs_per_unit) : 0,
            };
            if (editProduct) {
                await updateProduct(editProduct.id, data);
            } else {
                await createProduct(data);
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Produkt wirklich loeschen?')) return;
        try {
            await deleteProduct(id);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const filtered = products.filter(p => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterCat && p.category_id !== parseInt(filterCat)) return false;
        return true;
    });

    const UNITS = ['Stk', 'g', 'kg', 'ml', 'l', 'EL', 'TL', 'Prise', 'Scheiben', 'Bund'];

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Produkte</h1>
                        <p className="page-subtitle">{products.length} Produkte verwalten</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Neues Produkt
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="form-input"
                        placeholder="Produkte suchen..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="form-select"
                    value={filterCat}
                    onChange={(e) => setFilterCat(e.target.value)}
                    style={{ width: 200 }}
                >
                    <option value="">Alle Kategorien</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Products Table */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                    </svg>
                    <div className="empty-state-title">Keine Produkte gefunden</div>
                    <div className="empty-state-text">Erstelle dein erstes Produkt.</div>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Einheit</th>
                                <th>Kategorie</th>
                                <th>kcal</th>
                                <th>Protein</th>
                                <th>Fett</th>
                                <th>Kohlenh.</th>
                                <th style={{ width: 100 }}>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                    <td><span className="badge badge-primary">{p.unit}</span></td>
                                    <td>{p.category_name || '-'}</td>
                                    <td>{p.kcal_per_unit || '-'}</td>
                                    <td>{p.protein_per_unit || '-'}</td>
                                    <td>{p.fat_per_unit || '-'}</td>
                                    <td>{p.carbs_per_unit || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-icon" onClick={() => openModal(p)} title="Bearbeiten">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(p.id)} title="Loeschen" style={{ color: 'var(--color-error)' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}</h3>
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
                                        <label className="form-label">Einheit</label>
                                        <select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Kategorie</label>
                                        <select className="form-select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                            <option value="">Keine</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">kcal / Einheit</label>
                                        <input className="form-input" type="number" step="0.1" value={form.kcal_per_unit} onChange={e => setForm({ ...form, kcal_per_unit: e.target.value })} placeholder="0" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Protein (g)</label>
                                        <input className="form-input" type="number" step="0.1" value={form.protein_per_unit} onChange={e => setForm({ ...form, protein_per_unit: e.target.value })} placeholder="0" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Fett (g)</label>
                                        <input className="form-input" type="number" step="0.1" value={form.fat_per_unit} onChange={e => setForm({ ...form, fat_per_unit: e.target.value })} placeholder="0" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Kohlenhydrate (g)</label>
                                        <input className="form-input" type="number" step="0.1" value={form.carbs_per_unit} onChange={e => setForm({ ...form, carbs_per_unit: e.target.value })} placeholder="0" />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                                <button type="submit" className="btn btn-primary">{editProduct ? 'Speichern' : 'Erstellen'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
