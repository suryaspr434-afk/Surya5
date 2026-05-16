import { useState, useEffect, useRef, useCallback } from "react";

const STOCKS = [
  "Reliance", "TCS", "HDFC Bank", "ICICI Bank", "Infosys", "Wipro",
  "SBI", "Bajaj Finance", "Tata Motors", "Adani Ports", "Axis Bank",
  "Kotak Bank", "HUL", "ITC", "JSW Steel", "Tata Steel", "ONGC",
  "Power Grid", "NTPC", "Maruti Suzuki", "M&M", "Sun Pharma",
  "Dr Reddy", "Titan", "Nestle", "Zomato", "Paytm", "Jio Finance",
  "LTIMindtree", "Tech Mahindra", "Bajaj Auto", "Hero MotoCorp",
  "Britannia", "Dabur", "Pidilite", "SRF", "Divi's Labs", "Cipla",
  "Asian Paints", "Berger Paints", "UltraTech Cement", "ACC", "Ambuja",
  "Hindalco", "Vedanta", "Coal India", "BPCL", "IOC", "HAL", "BEL"
];

// ─── Secure fetch via Vercel serverless function ───────────────────────────
async function fetchAnalysis(stock, date) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock, date }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }
  return res.json();
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const C = {
  green: "#16a34a", greenBg: "#dcfce7", greenText: "#14532d",
  red: "#dc2626", redBg: "#fee2e2", redText: "#7f1d1d",
  amber: "#d97706", amberBg: "#fef3c7", amberText: "#78350f",
  gray: "#6b7280", surface: "#ffffff", bg: "#f1f5f9",
  border: "rgba(0,0,0,0.08)", dark: "#0f172a",
};
const riskColor = (r) => r === "Low" ? C.green : r === "Medium" ? C.amber : C.red;
const riskBg = (r) => r === "Low" ? C.greenBg : r === "Medium" ? C.amberBg : C.redBg;
const riskText = (r) => r === "Low" ? C.greenText : r === "Medium" ? C.amberText : C.redText;

// ─── Sub-components ────────────────────────────────────────────────────────
function Dot({ color, pulse }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      {pulse && <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.4, animation: "ping 1.4s ease-in-out infinite" }} />}
      <span style={{ position: "absolute", inset: pulse ? 1 : 0, borderRadius: "50%", background: color }} />
    </span>
  );
}

function Badge({ children, color, bg, text }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg, color: text, letterSpacing: "0.3px", textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

function Sparkline({ direction }) {
  const pts = direction === "bull"
    ? [28, 32, 27, 35, 33, 40, 38, 45, 43, 50]
    : [50, 48, 42, 47, 38, 44, 35, 40, 32, 28];
  const max = Math.max(...pts), min = Math.min(...pts);
  const norm = pts.map(p => 36 - ((p - min) / (max - min)) * 32);
  const path = norm.map((y, i) => `${i === 0 ? "M" : "L"}${i * 11},${y}`).join(" ");
  const color = direction === "bull" ? C.green : C.red;
  const areaPath = `${path} L${(pts.length - 1) * 11},40 L0,40 Z`;
  return (
    <svg width="100" height="40" viewBox="0 0 99 40" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg-${direction}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${direction})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(pts.length - 1) * 11} cy={norm[norm.length - 1]} r="3" fill={color} />
    </svg>
  );
}

function RRBar({ rr }) {
  const pct = Math.min((rr / 4) * 100, 100);
  const color = rr >= 2.5 ? C.green : rr >= 1.5 ? C.amber : C.red;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.gray, marginBottom: 5 }}>
        <span>Risk : Reward</span>
        <span style={{ fontWeight: 700, color }}>{rr.toFixed(1)}x</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

function RiskMeter({ level }) {
  const levels = ["Low", "Medium", "High"];
  const idx = levels.indexOf(level);
  const colors = [C.green, C.amber, C.red];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {levels.map((l, i) => (
        <div key={l} style={{
          height: 5, width: 22, borderRadius: 99,
          background: i <= idx ? colors[i] : "rgba(0,0,0,0.1)",
          transition: "background 0.3s"
        }} />
      ))}
      <span style={{ fontSize: 11, fontWeight: 700, color: riskColor(level), marginLeft: 4 }}>{level} risk</span>
    </div>
  );
}

function StatPill({ label, value, good }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <Dot color={good ? C.green : C.amber} />
      <span style={{ fontSize: 11, color: C.gray }}>{label}:</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.dark }}>{value}</span>
    </div>
  );
}

function PriceBox({ label, value, color }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 8px", textAlign: "center", border: "1px solid rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function StockCard({ data, idx, onRemove }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), idx * 100); return () => clearTimeout(t); }, [idx]);

  const isLong = data.direction === "LONG";
  const accent = isLong ? C.green : C.red;
  const pnlPct = ((Math.abs(data.target1 - data.entry) / data.entry) * 100).toFixed(1);

  return (
    <div style={{
      background: C.surface,
      borderRadius: 16,
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${accent}`,
      boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.45s ease, transform 0.45s ease",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
              <Dot color={accent} pulse />
              <span style={{ fontSize: 17, fontWeight: 800, color: C.dark, letterSpacing: "-0.4px" }}>{data.name}</span>
              <Badge color={accent} bg={isLong ? C.greenBg : C.redBg} text={isLong ? C.greenText : C.redText}>
                {data.direction}
              </Badge>
            </div>
            <div style={{ fontSize: 11, color: C.gray, fontWeight: 500 }}>
              {data.symbol} · NSE · {data.sector}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <Sparkline direction={isLong ? "bull" : "bear"} />
            <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 500 }}>Intraday</span>
          </div>
        </div>

        {/* Price grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
          <PriceBox label="Entry" value={`₹${data.entry}`} color={C.dark} />
          <PriceBox label="Target 1" value={`₹${data.target1}`} color={C.green} />
          <PriceBox label="Target 2" value={`₹${data.target2}`} color="#15803d" />
          <PriceBox label="Stop Loss" value={`₹${data.sl}`} color={C.red} />
        </div>

        {/* Bars */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <RRBar rr={data.rr} />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.gray, marginBottom: 5 }}>
              <span>Expected return</span>
              <span style={{ fontWeight: 700, color: accent }}>+{pnlPct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(parseFloat(pnlPct) * 12, 100)}%`, background: accent, borderRadius: 99, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
            </div>
          </div>
        </div>

        {/* Risk + Tags */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <RiskMeter level={data.risk} />
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {data.tags?.map(t => (
              <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Rationale */}
        <div style={{
          background: `${accent}08`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: "0 8px 8px 0",
          padding: "10px 12px",
          fontSize: 12,
          color: "#374151",
          lineHeight: 1.65,
          marginBottom: 12,
        }}>
          {data.rationale}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingBottom: 14 }}>
          <StatPill label="RSI" value={data.rsi} good={data.direction === "LONG" ? data.rsi < 65 && data.rsi > 40 : data.rsi > 55} />
          <StatPill label="Volume" value={data.volume} good={data.volume !== "Low"} />
          <StatPill label="News" value={data.news} good={data.news === "Positive"} />
        </div>
      </div>

      {/* Risks footer */}
      {data.risks && (
        <div style={{ background: "#fffbeb", borderTop: "1px solid #fde68a", padding: "12px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
            ⚠ Risks to watch
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            {data.risks.map((risk, i) => (
              <div key={i} style={{ display: "flex", gap: 7, fontSize: 11, color: "#78350f" }}>
                <span style={{ color: C.amber, flexShrink: 0, fontWeight: 700 }}>›</span>
                <span>{risk}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 11, flexWrap: "wrap" }}>
            <span style={{ color: C.gray }}>Best entry: <strong style={{ color: C.dark }}>{data.bestEntryTime}</strong></span>
            <span style={{ color: C.gray }}>Exit by: <strong style={{ color: C.red }}>{data.exitBy}</strong></span>
          </div>
        </div>
      )}

      {/* Remove button */}
      <button onClick={onRemove} style={{
        display: "block", width: "100%", padding: "8px",
        background: "none", border: "none", borderTop: `1px solid ${C.border}`,
        fontSize: 11, color: "#94a3b8", cursor: "pointer", fontWeight: 600,
        letterSpacing: "0.3px"
      }}>
        Remove card
      </button>
    </div>
  );
}

function LoadingCard({ stock }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
      borderTop: "3px solid #e2e8f0", padding: 20,
      animation: "pulse 1.5s ease-in-out infinite",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e2e8f0" }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#94a3b8" }}>Analyzing {stock}…</span>
        <div style={{ width: 16, height: 16, border: "2px solid #e2e8f0", borderTopColor: "#94a3b8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: "#f1f5f9", borderRadius: 10, height: 52 }} />
        ))}
      </div>
      <div style={{ background: "#f1f5f9", borderRadius: 8, height: 56 }} />
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [queue, setQueue] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStock, setLoadingStock] = useState("");
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState("All");
  const inputRef = useRef();

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  useEffect(() => {
    if (input.length < 1) { setSuggestions([]); setShowSug(false); return; }
    const f = STOCKS.filter(s => s.toLowerCase().includes(input.toLowerCase())).slice(0, 6);
    setSuggestions(f);
    setShowSug(f.length > 0);
  }, [input]);

  const addToQueue = useCallback((name) => {
    if (!queue.includes(name) && !results.find(r => r.name === name)) {
      setQueue(q => [...q, name]);
    }
    setInput(""); setSuggestions([]); setShowSug(false);
    inputRef.current?.focus();
  }, [queue, results]);

  const runAnalysis = async () => {
    if (queue.length === 0 || loading) return;
    setLoading(true);
    for (const stock of queue) {
      setLoadingStock(stock);
      try {
        const result = await fetchAnalysis(stock, today);
        setResults(prev => [result, ...prev.filter(r => r.name !== result.name)]);
        setErrors(e => { const n = { ...e }; delete n[stock]; return n; });
      } catch (err) {
        setErrors(e => ({ ...e, [stock]: err.message }));
      }
    }
    setQueue([]); setLoadingStock(""); setLoading(false);
  };

  const filteredResults = filter === "All" ? results
    : filter === "LONG" ? results.filter(r => r.direction === "LONG")
    : results.filter(r => r.direction === "SHORT");

  const avgRR = results.length
    ? (results.reduce((a, r) => a + (r.rr || 0), 0) / results.length).toFixed(1)
    : "–";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", paddingBottom: 40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        @keyframes ping { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(2.4);opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; margin: 0; }
        body { margin: 0; }
        button { font-family: inherit; }
        input { font-family: inherit; }
        input:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: C.dark, color: "#fff", padding: "0 16px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📈</span>
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>Intraday Intelligence</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}>
            <Dot color={C.green} pulse />
            <span>NSE Live</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "20px 16px 0" }}>

        {/* Date + bias banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "10px 14px", marginBottom: 16, border: `1px solid ${C.border}`, flexWrap: "wrap", gap: 6 }}>
          <Dot color={C.green} pulse />
          <span style={{ fontSize: 12, color: C.gray }}>Market open ·</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>Cautious Bullish</span>
          <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>{today}</span>
        </div>

        {/* Search card */}
        <div style={{
          background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
            Add stocks to analyze
          </div>

          {/* Input */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && input.trim()) addToQueue(input.trim()); }}
              placeholder="Search — Reliance, ICICI Bank, JSW Steel…"
              style={{
                width: "100%", padding: "12px 14px 12px 40px",
                borderRadius: 10, border: "1.5px solid #e2e8f0",
                fontSize: 14, background: "#f8fafc", color: C.dark,
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
              onBlur={e => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
                setTimeout(() => setShowSug(false), 160);
              }}
            />
            {showSug && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`,
                boxShadow: "0 12px 32px rgba(0,0,0,0.12)", zIndex: 99, overflow: "hidden",
                animation: "slideDown 0.15s ease",
              }}>
                {suggestions.map((s, i) => (
                  <div key={s} onMouseDown={() => addToQueue(s)} style={{
                    padding: "11px 16px", fontSize: 14, cursor: "pointer", color: C.dark,
                    borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : "none",
                    display: "flex", alignItems: "center", gap: 10,
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: 12 }}>📊</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Queue chips */}
          {queue.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {queue.map(s => (
                <div key={s} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: C.greenBg, border: "1px solid #86efac",
                  borderRadius: 99, padding: "4px 8px 4px 11px",
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.greenText }}>{s}</span>
                  <button onClick={() => setQueue(q => q.filter(x => x !== s))} style={{
                    width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.08)",
                    border: "none", cursor: "pointer", fontSize: 12, color: C.greenText,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1
                  }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Quick picks */}
          {queue.length === 0 && results.length === 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 7 }}>Quick picks:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["ICICI Bank", "Reliance", "JSW Steel", "TCS", "SBI", "Tata Motors"].map(s => (
                  <button key={s} onClick={() => addToQueue(s)} style={{
                    padding: "5px 12px", background: "#f1f5f9", border: "1px solid #e2e8f0",
                    borderRadius: 99, fontSize: 12, color: "#475569", cursor: "pointer", fontWeight: 500,
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => e.target.style.background = "#e2e8f0"}
                    onMouseLeave={e => e.target.style.background = "#f1f5f9"}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Error display */}
          {Object.entries(errors).length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: C.red }}>
              {Object.entries(errors).map(([stock, msg]) => (
                <div key={stock}>⚠ {stock}: {msg}</div>
              ))}
            </div>
          )}

          {/* Analyze button */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={runAnalysis}
              disabled={loading || queue.length === 0}
              style={{
                padding: "11px 24px", borderRadius: 10, border: "none",
                background: loading || queue.length === 0 ? "#e2e8f0" : C.dark,
                color: loading || queue.length === 0 ? "#94a3b8" : "#fff",
                fontSize: 13, fontWeight: 700, cursor: loading || queue.length === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8, transition: "transform 0.15s, opacity 0.15s",
              }}
              onMouseEnter={e => { if (!loading && queue.length > 0) e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {loading ? (
                <>
                  <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#94a3b8", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                  Analyzing {loadingStock}…
                </>
              ) : `Analyze ${queue.length > 0 ? queue.length + " " : ""}stock${queue.length !== 1 ? "s" : ""}`}
            </button>
            {queue.length > 0 && !loading && (
              <span style={{ fontSize: 12, color: C.gray }}>{queue.length} queued · AI + live signals</span>
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            {/* Summary stats */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { label: "Analyzed", value: results.length, color: C.dark },
                { label: "Avg R:R", value: `${avgRR}x`, color: C.green },
                { label: "Long", value: results.filter(r => r.direction === "LONG").length, color: C.green },
                { label: "Short", value: results.filter(r => r.direction === "SHORT").length, color: C.red },
                { label: "High risk", value: results.filter(r => r.risk === "High").length, color: C.red },
              ].map(m => (
                <div key={m.label} style={{
                  background: C.surface, borderRadius: 10, padding: "8px 14px",
                  border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 7
                }}>
                  <span style={{ fontSize: 11, color: C.gray }}>{m.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: m.color }}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Filter tabs + clear */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 10, padding: 4, border: `1px solid ${C.border}` }}>
                {["All", "LONG", "SHORT"].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 700,
                    background: filter === f ? C.dark : "transparent",
                    color: filter === f ? "#fff" : C.gray,
                    transition: "background 0.15s, color 0.15s",
                  }}>{f}</button>
                ))}
              </div>
              <button onClick={() => { setResults([]); setErrors({}); }} style={{
                fontSize: 12, color: C.red, background: "none", border: "none",
                cursor: "pointer", fontWeight: 700, padding: "5px 10px"
              }}>Clear all</button>
            </div>

            {/* Loading skeleton */}
            {loading && <LoadingCard stock={loadingStock} />}

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredResults.map((r, i) => (
                <StockCard
                  key={r.symbol + i}
                  data={r}
                  idx={i}
                  onRemove={() => setResults(prev => prev.filter(x => x.name !== r.name))}
                />
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {results.length === 0 && !loading && (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            background: C.surface, borderRadius: 16,
            border: "1.5px dashed #e2e8f0",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 6 }}>No stocks analyzed yet</div>
            <div style={{ fontSize: 13, color: C.gray }}>Search and queue stocks above, then tap Analyze</div>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          textAlign: "center", marginTop: 24, padding: "14px 16px",
          background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a",
          fontSize: 11, color: "#92400e", lineHeight: 1.7
        }}>
          ⚠️ <strong>For educational purposes only.</strong> Not SEBI-registered financial advice.<br />
          Intraday trading carries high risk. Always use stop-losses. Never risk more than you can afford to lose.
        </div>
      </div>
    </div>
  );
}
