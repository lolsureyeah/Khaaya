import { useState, useEffect, useRef } from "react";
import { collection, addDoc, doc, updateDoc, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import NINInfo from "./NINInfo";
import MicroEducation from "./MicroEducation";
import History from "./History";
import SavedMeals from "./SavedMeals";
import { calcGoals } from "../utils/calculations";
import { useTheme } from "../theme";
import { apiUrl } from "../apiBase";

const DEFAULT_MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

const SpeechRecognitionAPI = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

function buildSuggestions(todayLabels) {
  const seen = new Set();
  const result = [];
  for (const n of [...DEFAULT_MEALS, ...todayLabels]) {
    const k = n.toLowerCase();
    if (!seen.has(k)) { seen.add(k); result.push(n); }
  }
  return result;
}

function toDateKey(d) {
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
}


export default function MacroTracker({ user, stats, onCharUpdate, goals: propGoals }) {
  const { T } = useTheme();
  const [meals, setMeals] = useState([]);
  const [mealLog, setMealLog] = useState([]);
  const [foodInput, setFoodInput] = useState("");
  const [mealName, setMealName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [localMsg, setLocalMsg] = useState("");
  const [showNINInfo, setShowNINInfo] = useState(false);
  const [toast, setToast] = useState(null);
  const [showEdu, setShowEdu] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const todayKeyStr = toDateKey(new Date());
  const targetKeyStr = toDateKey(selectedDate);
  const isFutureDate = targetKeyStr > todayKeyStr;
  const isTargetToday = targetKeyStr === todayKeyStr;

  const goals = propGoals || calcGoals(stats);

  const totals = meals.reduce((acc, m) => ({
    cal: acc.cal + (m.cal || 0),
    protein: acc.protein + (m.protein || 0),
    carbs: acc.carbs + (m.carbs || 0),
    fat: acc.fat + (m.fat || 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0 });

  Object.keys(totals).forEach(k => totals[k] = +totals[k].toFixed(1));
useEffect(() => {
    if (!user) return;
    const now = new Date();
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
    const q = query(collection(db, "users", user.uid, "food_logs"), where("date", "==", today));
    const unsub = onSnapshot(q, (snap) => {
      const allMeals = [], allLog = [];
      snap.forEach(d => {
        const data = d.data();
        allLog.push({ id: d.id, ...data });
        allMeals.push(...(data.items || []));
      });
      allLog.sort((a, b) => (a.isoTime || "").localeCompare(b.isoTime || ""));
      setMeals(allMeals);
      setMealLog(allLog);
    });
    return unsub;
  }, [user]);

  const toggleListening = () => {
    if (!SpeechRecognitionAPI) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = navigator.language || "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (finalText.trim()) {
        setFoodInput(prev => (prev.trim() ? `${prev.trim()} ${finalText.trim()}` : finalText.trim()));
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setLocalMsg("Microphone permission denied.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setLocalMsg("Couldn't hear that — try again.");
      }
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    setLocalMsg("");
    recognition.start();
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const handleLog = async () => {
    if (!mealName.trim() || !foodInput.trim() || isFutureDate) return;
    setParsing(true);
    setLocalMsg("");
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(apiUrl("/api/parse-food"), { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ text: foodInput }) });
      const data = await res.json();
      const items = data.items || [];
      if (!items.length) { setLocalMsg("Couldn't recognise that food. Try again!"); setParsing(false); return; }

      const now = new Date();
      const localDate = targetKeyStr;

      // Normalise the new meal name for case-insensitive matching
      const rawName = (mealName || "Meal").trim();
      const newMealName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const normalizedNew = newMealName.toLowerCase();

      // Check if a meal with the same normalised name already exists on the target date.
      // For today we can use the live `mealLog` listener; for a backdated entry we look it up directly.
      let existingEntry = null;
      if (isTargetToday) {
        existingEntry = mealLog.find(e => e.label.trim().toLowerCase() === normalizedNew);
      } else if (user) {
        const q = query(collection(db, "users", user.uid, "food_logs"), where("date", "==", localDate));
        const snap = await getDocs(q);
        existingEntry = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find(e => (e.label || "").trim().toLowerCase() === normalizedNew) || null;
      }

      if (existingEntry) {
        // Merge: append new items into the existing meal
        const mergedItems = [...(existingEntry.items || []), ...items];
        const updatedFields = {
          items: mergedItems,
          cal: mergedItems.reduce((sum, item) => sum + (item.cal || 0), 0),
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isoTime: now.toISOString(),
        };
        if (user && existingEntry.id) {
          await updateDoc(doc(db, "users", user.uid, "food_logs", existingEntry.id), updatedFields);
        } else {
          setMealLog(p => p.map(e => e === existingEntry ? { ...e, ...updatedFields } : e));
          setMeals(p => [...p, ...items]);
        }
      } else {
        // No match - create a new meal entry
        const entry = {
          label: newMealName,
          items,
          date: localDate,
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isoTime: now.toISOString(),
          cal: items.reduce((sum, item) => sum + (item.cal || 0), 0),
        };
        if (user) {
          await addDoc(collection(db, "users", user.uid, "food_logs"), entry);
        } else {
          setMeals(p => [...p, ...items]);
          setMealLog(p => [...p, entry]);
        }
      }

      setFoodInput(""); setMealName("");

      const addedCal = items.reduce((sum, item) => sum + (item.cal || 0), 0);
      if (isTargetToday) {
        setToast(`Logged (+${Math.round(addedCal)} kcal)`);
      } else {
        const dateLabel = new Date(localDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        setToast(`Logged (+${Math.round(addedCal)} kcal) to ${dateLabel}`);
      }
      setTimeout(() => setToast(null), 2500);

      // One-time micro-education moment
      if (!localStorage.getItem("khaaya-edu-shown")) {
        setTimeout(() => setShowEdu(true), 800);
      }

      // The meal is saved at this point, so release the form now. The coach comment
      // is cosmetic and the request is slow (several seconds against a cold backend);
      // awaiting it here left LOG IT disabled long after the meal was visibly logged.
      setParsing(false);

      // Coach feedback + character progress only make sense against today's running totals
      if (!isTargetToday) return;

      const newTotals = { ...totals };
      items.forEach(m => { newTotals.cal += m.cal; newTotals.protein += m.protein; newTotals.carbs += m.carbs; newTotals.fat += m.fat; });

      // Progress comes from numbers we already have, so update the character first
      // and let the comment land whenever the coach responds.
      const progress = Math.min(100, (newTotals.cal / goals.cal) * 100);
      onCharUpdate("", progress);

      try {
        const coachToken = await auth.currentUser.getIdToken();
        const cr = await fetch(apiUrl("/api/coach"), { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${coachToken}` }, body: JSON.stringify({ meals: items, totals: newTotals, goals, stats }) });
        const cd = await cr.json();
        onCharUpdate(cd.comment || "Great fuel!", progress);
      } catch (err) {
        // A missing coach line must never look like a failed log
        console.error("Coach comment failed:", err.message);
      }
    } catch (e) {
      setLocalMsg("Error parsing food.");
      setParsing(false);
    }
  };

  const cardS = { background: T.card, borderRadius: 16, boxShadow: T.cardShadow, padding: 16, marginBottom: 24, border: `1px solid rgba(128,128,128,0.12)` };
  const labelS = { fontSize: 13, fontWeight: 600, letterSpacing: 0.5, color: T.textSec, display: "block", marginBottom: 10, textTransform: "uppercase" };
  const inputS = { width: "100%", background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 12, padding: "13px 16px", color: T.text, fontSize: 17, marginBottom: 12, boxSizing: "border-box", outline: "none" };

  return (
    <div style={{ paddingBottom: 80, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {showNINInfo && <NINInfo onClose={() => setShowNINInfo(false)} />}
      {showEdu && (
        <MicroEducation
          onDismiss={() => {
            setShowEdu(false);
            localStorage.setItem("khaaya-edu-shown", "1");
          }}
        />
      )}

      {/* History calendar + stats slot + meals */}
      <History user={user} goals={goals} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Saved Meals */}
      <SavedMeals user={user} todayLabels={mealLog.map(e => e.label).filter(Boolean)} selectedDate={selectedDate} />

      {/* Log a Meal — at the bottom */}
      <div style={cardS}>
        <span style={labelS}>
          Log a Meal
          {!isTargetToday && !isFutureDate && (
            <span style={{ textTransform: "none", fontWeight: 400, color: T.textSec }}>
              {" "}— for {new Date(targetKeyStr + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          )}
        </span>
        {isFutureDate && (
          <div style={{ fontSize: 13, color: T.textSec, marginBottom: 12 }}>
            Pick today or a past date on the calendar above to log a meal.
          </div>
        )}
        <input style={inputS} value={mealName} onChange={e => setMealName(e.target.value)} placeholder="Meal name (e.g. Lunch)" disabled={isFutureDate} />
        {/* Quick-pick meal name chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -6, marginBottom: 12 }}>
          {buildSuggestions(mealLog.map(e => e.label).filter(Boolean)).map(s => (
            <button key={s} onClick={() => setMealName(s)} style={{
              background: mealName === s ? T.accent : T.inputBg,
              color: mealName === s ? "#fff" : T.textSec,
              border: `1px solid ${mealName === s ? T.accent : T.border}`,
              borderRadius: 20, padding: "5px 12px", fontSize: 13,
              fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
            }}>{s}</button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <textarea
            style={{ ...inputS, height: 80, resize: "none", paddingRight: SpeechRecognitionAPI ? 48 : undefined }}
            value={foodInput}
            onChange={e => setFoodInput(e.target.value)}
            placeholder="e.g. 2 eggs, 1 toast, chai"
            disabled={isFutureDate}
          />
          {SpeechRecognitionAPI && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isFutureDate}
              title={listening ? "Stop recording" : "Speak your meal"}
              style={{
                position: "absolute", top: 10, right: 10,
                width: 32, height: 32, borderRadius: "50%",
                background: listening ? "#FF3B30" : T.accent,
                border: "none", cursor: isFutureDate ? "default" : "pointer",
                opacity: isFutureDate ? 0.5 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: listening ? "pulseMic 1.2s ease-in-out infinite" : "none",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" fill="#fff" />
                <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A7 7 0 0 0 19 11Z" fill="#fff" />
              </svg>
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: T.textSec, marginBottom: 12 }}>
          {SpeechRecognitionAPI ? "Powered by AI · Type or tap the mic to log meals in any language" : "Powered by AI · Log meals in any language"}
        </div>
        {localMsg && <div style={{ fontSize: 13, color: "#FF3B30", marginBottom: 10 }}>{localMsg}</div>}
        <button
          style={{ width: "100%", background: T.btnPrimary, color: T.card, border: "none", borderRadius: 14, padding: 16, fontWeight: 700, fontSize: 17, cursor: "pointer", opacity: parsing || isFutureDate || !mealName.trim() ? 0.5 : 1 }}
          onClick={handleLog}
          disabled={parsing || isFutureDate || !mealName.trim()}
        >
          {parsing ? "LOGGING..." : "LOG IT"}
        </button>
      </div>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: T.card, color: T.text, padding: "12px 24px", border: `1px solid ${T.border}`,
          borderRadius: 16, fontSize: 15, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          animation: "slideUp 0.25s ease",
          zIndex: 9999, whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } } @keyframes pulseMic { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,48,0.5); } 50% { box-shadow: 0 0 0 8px rgba(255,59,48,0); } }`}</style>
    </div>
  );
}
