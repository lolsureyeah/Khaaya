import { useState, useEffect } from "react";
import { collection, addDoc, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useTheme } from "../theme";
import { apiUrl } from "../apiBase";

const DEFAULT_MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function toDateKey(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

// Shift a YYYY-MM-DD key by whole days. Anchored at local noon so a DST change
// can't bump the result onto the wrong calendar day.
function addDays(dateKey, delta) {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

function formatDay(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function buildSuggestions(todayLabels) {
  const seen = new Set();
  const result = [];
  for (const n of [...DEFAULT_MEALS, ...todayLabels]) {
    const k = n.toLowerCase();
    if (!seen.has(k)) { seen.add(k); result.push(n); }
  }
  return result;
}

function Toast({ msg }) {
  const { T } = useTheme();
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
      background: "#1c1c1e", color: "#fff", borderRadius: 14,
      padding: "12px 22px", fontSize: 15, fontWeight: 600,
      zIndex: 9999, boxShadow: "0 4px 24px rgba(0,0,0,0.22)", pointerEvents: "none",
    }}>
      {msg}
    </div>
  );
}

// Attach per-gram rates so macro values scale when grams change
function withRates(foods) {
  return foods.map(f => ({
    ...f,
    _calPer:     f.grams > 0 ? f.cal     / f.grams : 0,
    _proteinPer: f.grams > 0 ? f.protein / f.grams : 0,
    _carbsPer:   f.grams > 0 ? f.carbs   / f.grams : 0,
    _fatPer:     f.grams > 0 ? f.fat     / f.grams : 0,
  }));
}

// Strip internal rate keys before sending to the server
function stripRates(foods) {
  return foods.map(({ _calPer, _proteinPer, _carbsPer, _fatPer, ...rest }) => rest);
}

export default function SavedMeals({ user, todayLabels = [], selectedDate }) {
  const { T } = useTheme();
  const [meals,      setMeals]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [logPrompt,  setLogPrompt]  = useState(null); // { meal, label }
  const [logLabel,   setLogLabel]   = useState("");
  const [logging,    setLogging]    = useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const [toast,      setToast]      = useState("");
  const [expanded,   setExpanded]   = useState(new Set());

  // Quick-repeat: the meals logged on the day before whichever day is selected
  const [prevMeals,      setPrevMeals]      = useState([]);
  const [prevLoading,    setPrevLoading]    = useState(true);
  const [repeatOpen,     setRepeatOpen]     = useState(false);
  const [repeatPicked,   setRepeatPicked]   = useState(new Set()); // labels ticked for re-logging
  const [repeatLogging,  setRepeatLogging]  = useState(false);

  const todayKey  = toDateKey(new Date());
  const selKey    = toDateKey(selectedDate || new Date());
  const prevKey   = addDays(selKey, -1);
  const isFutureSel = selKey > todayKey;

  // Edit modal state
  const [editingMeal, setEditingMeal] = useState(null); // meal object being edited
  const [editName,    setEditName]    = useState("");
  const [editFoods,   setEditFoods]   = useState([]);
  const [editSaving,  setEditSaving]  = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // Real-time listener
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(
      collection(db, "users", user.uid, "saved_meals"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("saved-meals listener failed:", err.message);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Live-subscribe to every meal logged the day before the selected day, grouped by
  // label (any name, not just the four default meal types - a custom-named meal like
  // "Post Workout" is just as repeatable as "Lunch"). onSnapshot (not a one-time
  // getDocs) so a meal backdated via the calendar shows up here immediately, without
  // requiring a page reload.
  useEffect(() => {
    if (!user || isFutureSel) { setPrevMeals([]); setPrevLoading(false); return; }

    const q = query(
      collection(db, "users", user.uid, "food_logs"),
      where("date", "==", prevKey)
    );
    const unsub = onSnapshot(q, (snap) => {
      const byLabel = new Map();
      snap.forEach(d => {
        const data = d.data();
        const rawLabel = (data.label || "").trim();
        if (!rawLabel) return;
        const key = rawLabel.toLowerCase();
        // Prefer the default meal type's canonical casing when it matches
        // (e.g. "lunch" -> "Lunch"); otherwise keep the label as logged.
        const canonical = DEFAULT_MEALS.find(m => m.toLowerCase() === key) || rawLabel;
        const existing = byLabel.get(key) || { label: canonical, items: [] };
        existing.items = [...existing.items, ...(data.items || [])];
        byLabel.set(key, existing);
      });

      const list = Array.from(byLabel.values())
        .map(m => ({
          label:        m.label,
          items:        m.items,
          totalCal:     m.items.reduce((s, i) => s + (i.cal     || 0), 0),
          totalProtein: m.items.reduce((s, i) => s + (i.protein || 0), 0),
          totalCarbs:   m.items.reduce((s, i) => s + (i.carbs   || 0), 0),
          totalFat:     m.items.reduce((s, i) => s + (i.fat     || 0), 0),
        }))
        // Default meal types first in their usual order, then custom names alphabetically
        .sort((a, b) => {
          const ai = DEFAULT_MEALS.indexOf(a.label), bi = DEFAULT_MEALS.indexOf(b.label);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return a.label.localeCompare(b.label);
        });

      setPrevMeals(list);
      setPrevLoading(false);
    }, (err) => {
      console.error("previous-day meals listener failed:", err.message);
      setPrevLoading(false);
    });
    return unsub;
  }, [user, prevKey, isFutureSel]);

  // Collapse the picker and drop any ticked meals when the day changes
  useEffect(() => {
    setRepeatOpen(false);
    setRepeatPicked(new Set());
  }, [prevKey]);

  const openEdit = (meal) => {
    setEditingMeal(meal);
    setEditName(meal.name);
    setEditFoods(withRates(meal.foods || []));
  };

  const closeEdit = () => {
    setEditingMeal(null);
    setEditName("");
    setEditFoods([]);
  };

  const handleGramChange = (idx, rawVal) => {
    const newGrams = Math.max(0, Number(rawVal) || 0);
    setEditFoods(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      return {
        ...f,
        grams:   newGrams,
        cal:     +( f._calPer     * newGrams).toFixed(1),
        protein: +( f._proteinPer * newGrams).toFixed(1),
        carbs:   +( f._carbsPer   * newGrams).toFixed(1),
        fat:     +( f._fatPer     * newGrams).toFixed(1),
      };
    }));
  };

  const handleRemoveFood = (idx) => {
    setEditFoods(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEditSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed || editFoods.length === 0 || !editingMeal) return;
    setEditSaving(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(apiUrl(`/api/saved-meal/${editingMeal.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmed, foods: stripRates(editFoods) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      closeEdit();
      showToast("Meal updated");
    } catch (e) {
      console.error("edit saved meal failed:", e.message);
      showToast("Failed to save changes.");
    } finally {
      setEditSaving(false);
    }
  };

  const openLogPrompt = (meal) => {
    setLogPrompt(meal);
    setLogLabel(meal.name);
  };

  const handleLogConfirm = async () => {
    const label = logLabel.trim();
    if (!label || !logPrompt || !user || logging) return;
    const meal = logPrompt;
    setLogging(true);
    try {
      const now = new Date();
      const localDate = selKey;

      // Check if a food_log entry with the same label already exists on the target day
      const q = query(
        collection(db, "users", user.uid, "food_logs"),
        where("date", "==", localDate)
      );
      const snap = await getDocs(q);
      const existing = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(e => (e.label || "").trim().toLowerCase() === label.toLowerCase());

      if (existing) {
        // Merge: append this meal's foods to the existing entry
        const mergedItems = [...(existing.items || []), ...meal.foods];
        await updateDoc(doc(db, "users", user.uid, "food_logs", existing.id), {
          items:   mergedItems,
          cal:     mergedItems.reduce((s, i) => s + (i.cal || 0), 0),
          time:    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isoTime: now.toISOString(),
        });
      } else {
        // Create a new meal entry under the chosen label
        await addDoc(collection(db, "users", user.uid, "food_logs"), {
          label:   label,
          items:   meal.foods,
          date:    localDate,
          time:    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isoTime: now.toISOString(),
          cal:     meal.totalCal,
        });
      }

      setLogPrompt(null);
      setLogLabel("");
      showToast(`"${meal.name}" added to ${label}`);
    } catch (e) {
      console.error("log saved meal failed:", e.message);
      showToast("Failed to log meal.");
    } finally {
      setLogging(false);
    }
  };

  const toggleRepeatPick = (label) => setRepeatPicked(prev => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

  // Copy the ticked meals from the previous day onto the selected day
  const handleRepeatSelected = async () => {
    if (!user || repeatLogging || repeatPicked.size === 0) return;
    const chosen = prevMeals.filter(m => repeatPicked.has(m.label));
    if (!chosen.length) return;
    setRepeatLogging(true);
    try {
      const now = new Date();
      const q = query(
        collection(db, "users", user.uid, "food_logs"),
        where("date", "==", selKey)
      );
      const snap = await getDocs(q);
      const existingByLabel = new Map(
        snap.docs.map(d => {
          const data = d.data();
          return [(data.label || "").trim().toLowerCase(), { id: d.id, ...data }];
        })
      );

      for (const meal of chosen) {
        const existing = existingByLabel.get(meal.label.toLowerCase());
        if (existing) {
          const mergedItems = [...(existing.items || []), ...meal.items];
          await updateDoc(doc(db, "users", user.uid, "food_logs", existing.id), {
            items:   mergedItems,
            cal:     mergedItems.reduce((s, i) => s + (i.cal || 0), 0),
            time:    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isoTime: now.toISOString(),
          });
        } else {
          await addDoc(collection(db, "users", user.uid, "food_logs"), {
            label:   meal.label,
            items:   meal.items,
            date:    selKey,
            time:    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isoTime: now.toISOString(),
            cal:     meal.totalCal,
          });
        }
      }

      setRepeatPicked(new Set());
      setRepeatOpen(false);
      showToast(chosen.length === 1
        ? `"${chosen[0].label}" logged`
        : `${chosen.length} meals logged`);
    } catch (e) {
      console.error("repeat meals failed:", e.message);
      showToast("Failed to log meals.");
    } finally {
      setRepeatLogging(false);
    }
  };

  const handleDelete = async (meal) => {
    if (!user || deleting) return;
    setDeleting(meal.id);
    try {
      await deleteDoc(doc(db, "users", user.uid, "saved_meals", meal.id));
    } catch (e) {
      console.error("delete saved meal failed:", e.message);
      showToast("Failed to delete meal.");
    } finally {
      setDeleting(null);
    }
  };

  const card   = { background: T.card, borderRadius: 20, boxShadow: T.cardShadow, padding: 20, marginBottom: 16 };
  const labelS = { fontSize: 13, fontWeight: 600, letterSpacing: 0.5, color: T.textSec, display: "block", marginBottom: 16, textTransform: "uppercase" };
  const inputS = { background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.text, fontSize: 15, outline: "none", boxSizing: "border-box" };

  // Edit totals (live)
  const editTotals = editFoods.reduce((acc, f) => ({
    cal:     acc.cal     + (f.cal     || 0),
    protein: acc.protein + (f.protein || 0),
    carbs:   acc.carbs   + (f.carbs   || 0),
    fat:     acc.fat     + (f.fat     || 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0 });

  const repeatTotalCal = prevMeals.reduce((s, m) => s + m.totalCal, 0);
  const repeatHeading = selKey === todayKey
    ? "Repeat yesterday's meals"
    : `Repeat meals from ${formatDay(prevKey)}`;

  if (loading || prevLoading) return null;
  if (meals.length === 0 && prevMeals.length === 0) return (
    <div style={card}>
      <span style={labelS}>Saved Meals</span>
      <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.55, padding: "4px 0 2px" }}>
        Save meals you eat often to log faster next time.
      </div>
    </div>
  );

  return (
    <>
      <Toast msg={toast} />

      {/* ── Edit modal ────────────────────────────────────────────────── */}
      {editingMeal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          zIndex: 1000, padding: "0 0 0 0",
        }} onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div style={{
            background: T.card, borderRadius: "20px 20px 0 0", padding: "24px 20px 32px",
            width: "100%", maxWidth: 480, maxHeight: "85vh",
            display: "flex", flexDirection: "column", boxShadow: "0 -4px 40px rgba(0,0,0,0.3)",
          }}>
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 20px" }} />

            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 16 }}>Edit Meal</div>

            {/* Name */}
            <input
              autoFocus
              style={{ ...inputS, width: "100%", marginBottom: 16, fontSize: 16 }}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Meal name"
            />

            {/* Foods list — scrollable */}
            <div style={{ flex: 1, overflowY: "auto", marginBottom: 14 }}>
              {editFoods.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", borderBottom: `1px solid ${T.divider}`,
                }}>
                  {/* Name + macro preview */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: 12, color: T.textSec }}>
                      {Math.round(f.cal)} kcal · P:{Math.round(f.protein)}g · C:{Math.round(f.carbs)}g · F:{Math.round(f.fat)}g
                    </div>
                  </div>

                  {/* Grams input */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <input
                      type="number"
                      min="0"
                      value={f.grams}
                      onChange={e => handleGramChange(i, e.target.value)}
                      style={{ ...inputS, width: 72, textAlign: "center", padding: "8px 8px" }}
                    />
                    <span style={{ fontSize: 12, color: T.textSec }}>g</span>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemoveFood(i)}
                    disabled={editFoods.length === 1}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textSec, padding: "4px", flexShrink: 0, opacity: editFoods.length === 1 ? 0.3 : 1 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Live totals */}
            <div style={{ background: T.inputBg, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#FF9500", fontWeight: 700 }}>{Math.round(editTotals.cal)} kcal</span>
              <span style={{ fontSize: 13, color: T.textSec }}>P: <b style={{ color: "#FF9500" }}>{Math.round(editTotals.protein)}g</b></span>
              <span style={{ fontSize: 13, color: T.textSec }}>C: <b style={{ color: T.accent }}>{Math.round(editTotals.carbs)}g</b></span>
              <span style={{ fontSize: 13, color: T.textSec }}>F: <b style={{ color: "#34C759" }}>{Math.round(editTotals.fat)}g</b></span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeEdit} style={{
                flex: 1, background: T.inputBg, color: T.textSec,
                border: "none", borderRadius: 12, padding: 14,
                fontWeight: 600, fontSize: 15, cursor: "pointer",
              }}>
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editName.trim() || editFoods.length === 0 || editSaving}
                style={{
                  flex: 2, background: T.accent, color: "#fff",
                  border: "none", borderRadius: 12, padding: 14,
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                  opacity: !editName.trim() || editFoods.length === 0 || editSaving ? 0.5 : 1,
                }}
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Saved meals list ──────────────────────────────────────────── */}
      <div style={card}>
        <span style={labelS}>Saved Meals</span>

        {/* Quick-repeat — one collapsed row that expands into a meal picker */}
        {prevMeals.length > 0 && (
          <div style={{ borderBottom: `1px solid ${T.divider}` }}>
            <div
              onClick={() => setRepeatOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 0", cursor: "pointer", userSelect: "none",
              }}>
              <span style={{ fontSize: 11, color: T.textSec, flexShrink: 0, transition: "transform 0.2s", display: "inline-block", transform: repeatOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {repeatHeading}
                </div>
                <div style={{ fontSize: 12, color: T.textSec }}>
                  {prevMeals.length} meal{prevMeals.length > 1 ? "s" : ""}
                  {" · "}<span style={{ color: T.accent, fontWeight: 600 }}>{Math.round(repeatTotalCal)} kcal</span>
                </div>
              </div>
            </div>

            {repeatOpen && (
              <div style={{ paddingLeft: 20, paddingBottom: 12 }}>
                {prevMeals.map((meal) => {
                  const picked = repeatPicked.has(meal.label);
                  return (
                    <div
                      key={`prev-${meal.label}`}
                      onClick={() => toggleRepeatPick(meal.label)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 0", cursor: "pointer", userSelect: "none",
                      }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: `1.5px solid ${picked ? T.accent : T.border}`,
                        background: picked ? T.accent : "transparent",
                        color: "#fff", fontSize: 12, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{picked ? "✓" : ""}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.text, marginBottom: 2 }}>
                          {meal.label}
                        </div>
                        <div style={{ fontSize: 12, color: T.textSec }}>
                          <span style={{ color: T.accent, fontWeight: 600 }}>{Math.round(meal.totalCal)} kcal</span>
                          {" · "}P:{Math.round(meal.totalProtein)}g · C:{Math.round(meal.totalCarbs)}g · F:{Math.round(meal.totalFat)}g
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={handleRepeatSelected}
                  disabled={repeatPicked.size === 0 || repeatLogging}
                  style={{
                    width: "100%", marginTop: 8,
                    background: T.accent, color: "#fff", border: "none",
                    borderRadius: 10, padding: "10px 0",
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                    opacity: repeatPicked.size === 0 || repeatLogging ? 0.5 : 1,
                  }}>
                  {repeatLogging
                    ? "Logging..."
                    : `+ Log ${repeatPicked.size || ""} ${repeatPicked.size === 1 ? "meal" : "meals"}`.replace("  ", " ")}
                </button>
              </div>
            )}
          </div>
        )}

        {meals.map((meal) => {
          const isOpen = expanded.has(meal.id);
          const toggleExpand = () => setExpanded(prev => {
            const next = new Set(prev);
            next.has(meal.id) ? next.delete(meal.id) : next.add(meal.id);
            return next;
          });
          return (
          <div key={meal.id}>
            {/* Compact row */}
            <div
              onClick={toggleExpand}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 0", borderBottom: isOpen ? "none" : `1px solid ${T.divider}`,
                cursor: "pointer", userSelect: "none",
              }}>
              {/* Chevron */}
              <span style={{ fontSize: 11, color: T.textSec, flexShrink: 0, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>

              {/* Name + macros */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {meal.name}
                </div>
                <div style={{ fontSize: 12, color: T.textSec }}>
                  <span style={{ color: T.accent, fontWeight: 600 }}>{Math.round(meal.totalCal)} kcal</span>
                  {" · "}P:{Math.round(meal.totalProtein)}g · C:{Math.round(meal.totalCarbs)}g · F:{Math.round(meal.totalFat)}g
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(meal)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: T.textSec, padding: "2px 4px" }}>✏️</button>
                <button onClick={() => handleDelete(meal)} disabled={!!deleting}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: T.textSec, padding: "2px 4px" }}>🗑️</button>
                <button onClick={() => openLogPrompt(meal)}
                  style={{
                    background: T.accent, color: "#fff", border: "none",
                    borderRadius: 8, padding: "5px 12px",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}>
                  + Log
                </button>
              </div>
            </div>

            {/* Expandable food list */}
            {isOpen && (
              <div style={{ paddingLeft: 20, paddingBottom: 10, borderBottom: `1px solid ${T.divider}` }}>
                {(meal.foods || []).map((f, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.textSec, padding: "3px 0" }}>
                    <span>{f.grams}g {f.name}</span>
                    <span style={{ fontWeight: 600, color: T.text }}>{Math.round(f.cal)} kcal</span>
                  </div>
                ))}
              </div>
            )}

            {/* Inline log prompt — expands below the row */}
            {logPrompt?.id === meal.id && (
              <div style={{ padding: "10px 0 4px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {buildSuggestions(todayLabels).map(s => (
                    <button key={s} onClick={() => setLogLabel(s)} style={{
                      background: logLabel === s ? T.accent : T.inputBg,
                      color: logLabel === s ? "#fff" : T.textSec,
                      border: `1px solid ${logLabel === s ? T.accent : T.border}`,
                      borderRadius: 20, padding: "4px 10px", fontSize: 12,
                      fontWeight: 600, cursor: "pointer",
                    }}>{s}</button>
                  ))}
                </div>
                <input
                  value={logLabel}
                  onChange={e => setLogLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleLogConfirm(); if (e.key === "Escape") setLogPrompt(null); }}
                  placeholder="or type a custom name…"
                  style={{ ...inputS, width: "100%", padding: "9px 12px", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setLogPrompt(null); setLogLabel(""); }} style={{
                    flex: 1, background: T.inputBg, color: T.textSec,
                    border: "none", borderRadius: 8, padding: "8px 0",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}>Cancel</button>
                  <button onClick={handleLogConfirm} disabled={!logLabel.trim() || logging} style={{
                    flex: 2, background: T.accent, color: "#fff",
                    border: "none", borderRadius: 8, padding: "8px 0",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                    opacity: !logLabel.trim() || logging ? 0.5 : 1,
                  }}>{logging ? "Logging..." : "Log It"}</button>
                </div>
              </div>
            )}
          </div>
        ); })}
      </div>
    </>
  );
}
