import { useState, useEffect } from 'react';
import {
    getShoppingList, generateShoppingList, addShoppingItem,
    updateShoppingItem, deleteShoppingItem,
    checkAllShopping, uncheckAllShopping, getProducts
} from '../api/client';

export default function Shopping() {
    const [items, setItems] = useState([]);
    const [products, setProducts] = useState([]);
    const [weekOffset, setWeekOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ product_id: '', custom_name: '', quantity: '', unit: '' });

    useEffect(() => { loadData(); }, [weekOffset]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [list, prods] = await Promise.all([
                getShoppingList(weekOffset),
                getProducts(),
            ]);
            setItems(list);
            setProducts(prods);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        try {
            await generateShoppingList(weekOffset);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleToggleCheck = async (item) => {
        try {
            await updateShoppingItem(item.id, { is_checked: !item.is_checked });
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleCheckAll = async () => {
        await checkAllShopping(weekOffset);
        loadData();
    };

    const handleUncheckAll = async () => {
        await uncheckAllShopping(weekOffset);
        loadData();
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            const data = {};
            if (addForm.product_id) {
                data.product_id = parseInt(addForm.product_id);
                const prod = products.find(p => p.id === data.product_id);
                if (prod) data.unit = prod.unit;
            } else {
                data.custom_name = addForm.custom_name;
                data.unit = addForm.unit;
            }
            data.quantity = addForm.quantity ? parseFloat(addForm.quantity) : null;

            await addShoppingItem(data, weekOffset);
            setShowAddModal(false);
            setAddForm({ product_id: '', custom_name: '', quantity: '', unit: '' });
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteItem = async (id) => {
        try {
            await deleteShoppingItem(id);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    // Group by category
    const grouped = {};
    items.forEach(item => {
        const cat = item.product_category || 'Sonstiges';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    const totalItems = items.length;
    const checkedItems = items.filter(i => i.is_checked).length;
    const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Einkaufsliste</h1>
                        <p className="page-subtitle">{checkedItems} von {totalItems} erledigt ({progress}%)</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-primary" onClick={handleGenerate}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 4 23 10 17 10" />
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            Aus Wochenplan generieren
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Manuell
                        </button>
                    </div>
                </div>
            </div>

            {/* Week Navigation */}
            <div className="week-nav">
                <button className="btn btn-secondary btn-icon" onClick={() => setWeekOffset(weekOffset - 1)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <div className="week-nav-label">
                    {weekOffset === 0 ? 'Aktuelle Woche' : weekOffset > 0 ? `+${weekOffset} Woche(n)` : `${weekOffset} Woche(n)`}
                </div>
                <button className="btn btn-secondary btn-icon" onClick={() => setWeekOffset(weekOffset + 1)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
                {weekOffset !== 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(0)}>Aktuelle</button>
                )}
            </div>

            {/* Progress Bar */}
            {totalItems > 0 && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <div style={{
                        height: 8,
                        background: 'var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: progress === 100 ? 'var(--color-success)' : 'var(--color-primary)',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width var(--transition-normal)',
                        }} />
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            {totalItems > 0 && (
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleCheckAll}>Alle abhaken</button>
                    <button className="btn btn-secondary btn-sm" onClick={handleUncheckAll}>Zuruecksetzen</button>
                </div>
            )}

            {/* Shopping List */}
            {totalItems === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    <div className="empty-state-title">Einkaufsliste ist leer</div>
                    <div className="empty-state-text">Generiere die Liste aus deinem Wochenplan oder fuege manuell Produkte hinzu.</div>
                </div>
            ) : (
                <div>
                    {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, catItems]) => (
                        <div key={category} className="shopping-category">
                            <div className="shopping-category-title">{category}</div>
                            {catItems.map(item => (
                                <div
                                    key={item.id}
                                    className={`checkbox-item ${item.is_checked ? 'checked' : ''}`}
                                    onClick={() => handleToggleCheck(item)}
                                >
                                    <div className={`custom-checkbox ${item.is_checked ? 'checked' : ''}`}>
                                        {item.is_checked && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="checkbox-text">
                                        {item.product_name || item.custom_name}
                                    </span>
                                    {item.quantity && (
                                        <span className="checkbox-meta">
                                            {item.quantity} {item.unit}
                                        </span>
                                    )}
                                    <button
                                        className="btn btn-ghost"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                        style={{ padding: 4 }}
                                        title="Entfernen"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-muted)' }}>
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Item Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Produkt hinzufuegen</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddModal(false)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddItem}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Aus Produkten waehlen</label>
                                    <select className="form-select" value={addForm.product_id} onChange={e => setAddForm({ ...addForm, product_id: e.target.value, custom_name: '' })}>
                                        <option value="">-- oder unten eingeben --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                                    </select>
                                </div>
                                {!addForm.product_id && (
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Oder Name eingeben</label>
                                            <input className="form-input" value={addForm.custom_name} onChange={e => setAddForm({ ...addForm, custom_name: e.target.value })} placeholder="z.B. Tafelessig" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Einheit</label>
                                            <input className="form-input" value={addForm.unit} onChange={e => setAddForm({ ...addForm, unit: e.target.value })} placeholder="z.B. ml" />
                                        </div>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Menge</label>
                                    <input className="form-input" type="number" step="0.1" value={addForm.quantity} onChange={e => setAddForm({ ...addForm, quantity: e.target.value })} placeholder="z.B. 3" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Abbrechen</button>
                                <button type="submit" className="btn btn-primary">Hinzufuegen</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
