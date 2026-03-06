import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeekPlan, getRecipe } from '../api/client';

export default function Home() {
    const navigate = useNavigate();
    const [todayPlan, setTodayPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [recipeLoading, setRecipeLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const weekPlan = await getWeekPlan(0);
            const today = new Date().toISOString().split('T')[0];
            const todayDay = weekPlan.days.find(d => d.date === today);
            setTodayPlan(todayDay || null);
        } catch (err) {
            console.error('Fehler beim Laden:', err);
        } finally {
            setLoading(false);
        }
    };

    const openRecipe = async (recipeId) => {
        if (!recipeId) return;
        setRecipeLoading(true);
        try {
            const recipe = await getRecipe(recipeId);
            setSelectedRecipe(recipe);
        } catch (err) {
            console.error('Fehler beim Laden des Rezepts:', err);
        } finally {
            setRecipeLoading(false);
        }
    };

    if (loading) {
        return <div className="loading-center"><div className="spinner" /></div>;
    }

    const SLOT_LABELS = {
        fruehstueck: 'Frühstück',
        mittagessen: 'Mittagessen',
        abendessen: 'Abendessen',
        snack: 'Snack',
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Willkommen zurück! Hier ist dein heutiger Überblick.</p>
            </div>

            {/* Today's Meals */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Heutiges Menü</h2>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/wochenplan')}>
                        Wochenplan
                    </button>
                </div>

                {todayPlan ? (
                    <div>
                        {Object.entries(SLOT_LABELS).map(([slot, label]) => {
                            const meal = todayPlan.meals[slot];
                            return (
                                <div
                                    key={slot}
                                    onClick={() => meal && openRecipe(meal.recipe_id)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: 'var(--space-sm) var(--space-md)',
                                        borderBottom: '1px solid var(--color-border-light)',
                                        cursor: meal ? 'pointer' : 'default',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'background 0.15s ease',
                                        ...(meal ? {} : {}),
                                    }}
                                    onMouseEnter={e => { if (meal) e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {label}
                                        </div>
                                        <div style={{ fontWeight: 500, marginTop: '2px' }}>
                                            {meal ? meal.recipe_name : <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Nicht geplant</span>}
                                        </div>
                                    </div>
                                    {meal && (
                                        <div className="nutrition-bar" style={{ gap: 'var(--space-md)' }}>
                                            <div className="nutrition-item">
                                                <span className="nutrition-value">{Math.round(meal.recipe_kcal)}</span>
                                                <span className="nutrition-label">kcal</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Day Totals */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingTop: 'var(--space-md)',
                            marginTop: 'var(--space-sm)',
                        }}>
                            <span style={{ fontWeight: 700 }}>Gesamt</span>
                            <div className="nutrition-bar">
                                <div className="nutrition-item">
                                    <span className="nutrition-value">{Math.round(todayPlan.total_kcal)}</span>
                                    <span className="nutrition-label">kcal</span>
                                </div>
                                <div className="nutrition-item">
                                    <span className="nutrition-value">{Math.round(todayPlan.total_protein)}g</span>
                                    <span className="nutrition-label">Protein</span>
                                </div>
                                <div className="nutrition-item">
                                    <span className="nutrition-value">{Math.round(todayPlan.total_fat)}g</span>
                                    <span className="nutrition-label">Fett</span>
                                </div>
                                <div className="nutrition-item">
                                    <span className="nutrition-value">{Math.round(todayPlan.total_carbs)}g</span>
                                    <span className="nutrition-label">Kohlenhydrate</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <div className="empty-state-title">Noch nichts geplant</div>
                        <div className="empty-state-text">Trage Rezepte in deinen Wochenplan ein.</div>
                        <button className="btn btn-primary" onClick={() => navigate('/wochenplan')} style={{ marginTop: 'var(--space-md)' }}>
                            Wochenplan öffnen
                        </button>
                    </div>
                )}
            </div>

            {/* Recipe Detail Modal */}
            {(selectedRecipe || recipeLoading) && (
                <div className="recipe-modal-overlay" onClick={() => !recipeLoading && setSelectedRecipe(null)}>
                    <div className="recipe-modal" onClick={e => e.stopPropagation()}>
                        {recipeLoading ? (
                            <div className="loading-center" style={{ padding: 'var(--space-2xl)' }}>
                                <div className="spinner" />
                            </div>
                        ) : selectedRecipe && (
                            <>
                                {/* Header */}
                                <div className="recipe-modal-header">
                                    <div>
                                        <h2 className="recipe-modal-title">{selectedRecipe.name}</h2>
                                        <div className="recipe-modal-meta">
                                            {selectedRecipe.category_name && (
                                                <span className="recipe-modal-tag">{selectedRecipe.category_name}</span>
                                            )}
                                            {selectedRecipe.prep_time_minutes && (
                                                <span className="recipe-modal-time">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    {selectedRecipe.prep_time_minutes} Min.
                                                </span>
                                            )}
                                            {selectedRecipe.servings && (
                                                <span className="recipe-modal-servings">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                        <circle cx="9" cy="7" r="4" />
                                                    </svg>
                                                    {selectedRecipe.servings} Portion{selectedRecipe.servings > 1 ? 'en' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button className="recipe-modal-close" onClick={() => setSelectedRecipe(null)}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Image */}
                                {selectedRecipe.image_path && (
                                    <div className="recipe-modal-image">
                                        <img src={`/uploads/${selectedRecipe.image_path}`} alt={selectedRecipe.name} />
                                    </div>
                                )}

                                {/* Nutrition Bar */}
                                <div className="recipe-modal-nutrition">
                                    <div className="recipe-modal-nutrition-item">
                                        <span className="recipe-modal-nutrition-value">{Math.round(selectedRecipe.kcal_total)}</span>
                                        <span className="recipe-modal-nutrition-label">kcal</span>
                                    </div>
                                    <div className="recipe-modal-nutrition-item">
                                        <span className="recipe-modal-nutrition-value">{Math.round(selectedRecipe.protein_total)}g</span>
                                        <span className="recipe-modal-nutrition-label">Protein</span>
                                    </div>
                                    <div className="recipe-modal-nutrition-item">
                                        <span className="recipe-modal-nutrition-value">{Math.round(selectedRecipe.fat_total)}g</span>
                                        <span className="recipe-modal-nutrition-label">Fett</span>
                                    </div>
                                    <div className="recipe-modal-nutrition-item">
                                        <span className="recipe-modal-nutrition-value">{Math.round(selectedRecipe.carbs_total)}g</span>
                                        <span className="recipe-modal-nutrition-label">Kohlenhydrate</span>
                                    </div>
                                </div>

                                {/* Ingredients */}
                                {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                                    <div className="recipe-modal-section">
                                        <h3 className="recipe-modal-section-title">Zutaten</h3>
                                        <ul className="recipe-modal-ingredients">
                                            {selectedRecipe.ingredients.map(ing => (
                                                <li key={ing.id} className="recipe-modal-ingredient">
                                                    <span className="recipe-modal-ingredient-qty">
                                                        {ing.quantity && `${ing.quantity} ${ing.product_unit || ''}`}
                                                    </span>
                                                    <span className="recipe-modal-ingredient-name">
                                                        {ing.product_name || 'Unbekannt'}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Notes */}
                                {selectedRecipe.notes && (
                                    <div className="recipe-modal-section">
                                        <h3 className="recipe-modal-section-title">Zubereitung</h3>
                                        <div className="recipe-modal-notes">{selectedRecipe.notes}</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
