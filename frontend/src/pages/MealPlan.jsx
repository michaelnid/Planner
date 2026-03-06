import { useState, useEffect } from 'react';
import { getWeekPlan, setMeal, removeMeal, getRecipes } from '../api/client';

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const SLOT_LABELS = { fruehstueck: 'Frühstück', mittagessen: 'Mittagessen', abendessen: 'Abendessen', snack: 'Snack' };
const SLOTS = ['fruehstueck', 'mittagessen', 'abendessen', 'snack'];

export default function MealPlan() {
    const [weekPlan, setWeekPlan] = useState(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState({ date: null, slot: null });
    const [searchRecipe, setSearchRecipe] = useState('');

    useEffect(() => { loadData(); }, [weekOffset]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [wp, recs] = await Promise.all([getWeekPlan(weekOffset), getRecipes()]);
            setWeekPlan(wp);
            setRecipes(recs);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openSlotModal = (date, slot) => {
        setSelectedSlot({ date, slot });
        setSearchRecipe('');
        setShowModal(true);
    };

    const handleSelectRecipe = async (recipeId) => {
        try {
            await setMeal({
                plan_date: selectedSlot.date,
                meal_slot: selectedSlot.slot,
                recipe_id: recipeId,
            });
            setShowModal(false);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleRemoveMeal = async (mealPlanId) => {
        try {
            await removeMeal(mealPlanId);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return `${d.getDate()}.${d.getMonth() + 1}.`;
    };

    const isToday = (dateStr) => {
        return dateStr === new Date().toISOString().split('T')[0];
    };

    const getWeekLabel = () => {
        if (!weekPlan) return '';
        const start = new Date(weekPlan.week_start + 'T00:00:00');
        const end = new Date(weekPlan.week_end + 'T00:00:00');
        const kw = getISOWeek(start);
        return `KW ${kw} (${start.getDate()}.${start.getMonth() + 1}. - ${end.getDate()}.${end.getMonth() + 1}.)`;
    };

    const getISOWeek = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    };

    const filteredRecipes = recipes.filter(r =>
        !searchRecipe || r.name.toLowerCase().includes(searchRecipe.toLowerCase())
    );

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    if (!weekPlan) return null;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Wochenplanung</h1>
                        <p className="page-subtitle">Plane deine Mahlzeiten für die Woche</p>
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
                <div className="week-nav-label">{getWeekLabel()}</div>
                <button className="btn btn-secondary btn-icon" onClick={() => setWeekOffset(weekOffset + 1)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
                {weekOffset !== 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(0)}>
                        Heute
                    </button>
                )}
            </div>

            {/* Week Totals */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Wochenübersicht</span>
                    <div className="nutrition-bar">
                        <div className="nutrition-item">
                            <span className="nutrition-value">{Math.round(weekPlan.week_total_kcal)}</span>
                            <span className="nutrition-label">kcal</span>
                        </div>
                        <div className="nutrition-item">
                            <span className="nutrition-value">{Math.round(weekPlan.week_total_protein)}g</span>
                            <span className="nutrition-label">Protein</span>
                        </div>
                        <div className="nutrition-item">
                            <span className="nutrition-value">{Math.round(weekPlan.week_total_fat)}g</span>
                            <span className="nutrition-label">Fett</span>
                        </div>
                        <div className="nutrition-item">
                            <span className="nutrition-value">{Math.round(weekPlan.week_total_carbs)}g</span>
                            <span className="nutrition-label">Kohlenhydrate</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Day Columns */}
            <div className="week-grid">
                {weekPlan.days.map((day, idx) => (
                    <div key={day.date} className={`day-column ${isToday(day.date) ? 'day-today' : ''}`}>
                        <div className="day-header">
                            <div className="day-name">{DAY_NAMES[idx]}</div>
                            <div className="day-date">{formatDate(day.date)}</div>
                        </div>

                        {SLOTS.map(slot => {
                            const meal = day.meals[slot];
                            return (
                                <div key={slot} className="meal-slot">
                                    <div className="meal-slot-label">{SLOT_LABELS[slot]}</div>
                                    {meal ? (
                                        <div className="meal-slot-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span onClick={() => openSlotModal(day.date, slot)} style={{ flex: 1 }}>{meal.recipe_name}</span>
                                            <button className="btn btn-ghost" onClick={() => handleRemoveMeal(meal.id)} style={{ padding: 2 }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="meal-slot-empty" onClick={() => openSlotModal(day.date, slot)}>
                                            + Rezept
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div className="day-footer">
                            <strong>{Math.round(day.total_kcal)}</strong> kcal
                            {day.total_prep_time > 0 && (
                                <span> | {day.total_prep_time} Min.</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recipe Selection Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Rezept waehlen</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <input className="form-input" placeholder="Rezept suchen..." value={searchRecipe} onChange={e => setSearchRecipe(e.target.value)} autoFocus />
                            </div>
                            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                {filteredRecipes.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-lg)' }}>
                                        Keine Rezepte gefunden
                                    </div>
                                ) : (
                                    filteredRecipes.map(r => (
                                        <div
                                            key={r.id}
                                            onClick={() => handleSelectRecipe(r.id)}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: 'var(--space-sm) var(--space-md)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                transition: 'background var(--transition-fast)',
                                                marginBottom: 2,
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                                                    {r.category_name && <span>{r.category_name} | </span>}
                                                    {Math.round(r.kcal_total)} kcal
                                                    {r.prep_time_minutes && ` | ${r.prep_time_minutes} Min.`}
                                                </div>
                                            </div>
                                            {r.is_favorite && (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2">
                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                </svg>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
