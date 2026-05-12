import { useState } from "react";

// ─── Shared mock data ──────────────────────────────────────────────────────────
const HERO_IMG =
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1600&q=80";
const HERO_IMG2 =
  "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=1600&q=80";

const MOCK_CARS = [
  {
    rank: 1,
    name: "2020 Grigio Silverstone",
    score: 90.8,
    verdict: "STRONG BUY",
    gap: "+£98k",
    price: "£249,995",
    miles: "7,368 mi",
    tag: "Pre-GPF",
    img: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&q=80",
  },
  {
    rank: 2,
    name: "2019 Rosso Corsa",
    score: 84.2,
    verdict: "BUY",
    gap: "+£61k",
    price: "£269,950",
    miles: "12,100 mi",
    tag: "Pre-GPF",
    img: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=600&q=80",
  },
  {
    rank: 3,
    name: "2021 Nero Daytona",
    score: 78.5,
    verdict: "BUY",
    gap: "+£34k",
    price: "£289,000",
    miles: "4,200 mi",
    tag: "Pre-GPF",
    img: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80",
  },
];

// ─── Direction A: Investment Terminal ─────────────────────────────────────────
function DirectionA() {
  const [activeTab, setActiveTab] = useState("overview");
  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: "#0A0A0B",
        color: "#F5F0E8",
        minHeight: "100vh",
      }}
    >
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap');
        .dir-a-serif { font-family: 'Instrument Serif', serif; }
        .dir-a-mono { font-family: 'SF Mono', 'Fira Code', monospace; }
      `}</style>

      {/* Nav */}
      <nav
        style={{
          background: "#111113",
          borderBottom: "1px solid #222",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          height: 52,
          gap: 32,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{ width: 8, height: 8, background: "#C8102E", borderRadius: "50%" }}
          />
          <span
            className="dir-a-serif"
            style={{ fontSize: 16, fontStyle: "italic", color: "#F5F0E8" }}
          >
            SupercarIQ
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {["812 Superfast", "F8 Tributo", "812 GTS", "458 Italia"].map((m) => (
            <span
              key={m}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                color: m === "812 Superfast" ? "#C8102E" : "#888",
                borderBottom: m === "812 Superfast" ? "2px solid #C8102E" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {m}
            </span>
          ))}
          <span style={{ padding: "4px 10px", fontSize: 12, color: "#C9A84C", cursor: "pointer" }}>
            ▾ More Models
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#666" }}>
          <span style={{ cursor: "pointer", color: "#888" }}>Compare</span>
          <span style={{ cursor: "pointer", color: "#888" }}>Market</span>
          <span
            style={{
              background: "#C8102E",
              color: "#fff",
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            ALL REPORTS
          </span>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ position: "relative", height: 520, overflow: "hidden" }}>
        <img
          src={HERO_IMG}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, #0A0A0B 40%, transparent 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            padding: "48px 48px",
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                color: "#C8102E",
                marginBottom: 12,
                fontWeight: 600,
              }}
            >
              LIVE ANALYSIS · 20 ACTIVE UK LISTINGS · REFRESHED TODAY
            </div>
            <h1
              className="dir-a-serif"
              style={{ fontSize: 64, lineHeight: 1.05, margin: "0 0 16px", fontWeight: 400 }}
            >
              Ferrari 812{" "}
              <span style={{ color: "#C8102E", fontStyle: "italic" }}>Superfast</span>
            </h1>
            <p style={{ fontSize: 16, color: "#aaa", margin: "0 0 32px", fontWeight: 300 }}>
              The last naturally aspirated V12 Ferrari. Every active UK listing
              scored, ranked, and valued against real auction data.
            </p>
            <div style={{ display: "flex", gap: 0 }}>
              {[
                { label: "TOP SCORE", value: "90.8/100" },
                { label: "BEST GAP", value: "+£98k" },
                { label: "VERDICT", value: "STRONG BUY", accent: true },
                { label: "ACTIVE LISTINGS", value: "20" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: s.accent ? "#C8102E" : "#111113",
                    border: "1px solid #222",
                    padding: "12px 20px",
                    marginRight: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      color: s.accent ? "rgba(255,255,255,0.7)" : "#555",
                      marginBottom: 4,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    className="dir-a-serif"
                    style={{ fontSize: 22, fontWeight: 400, color: s.accent ? "#fff" : "#F5F0E8" }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          background: "#111113",
          borderBottom: "1px solid #1e1e1e",
          padding: "0 48px",
          display: "flex",
          gap: 0,
        }}
      >
        {["overview", "rankings", "methodology", "predictions", "sentiment"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === t ? "2px solid #C8102E" : "2px solid transparent",
              color: activeTab === t ? "#F5F0E8" : "#555",
              padding: "14px 20px",
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Rankings */}
      <div style={{ padding: "40px 48px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 1,
            background: "#1a1a1a",
          }}
        >
          {MOCK_CARS.map((car) => (
            <div
              key={car.rank}
              style={{ background: "#0A0A0B", padding: 24, cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span
                  className="dir-a-mono"
                  style={{ fontSize: 11, color: "#444" }}
                >
                  #{car.rank.toString().padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color:
                      car.verdict === "STRONG BUY"
                        ? "#C9A84C"
                        : car.verdict === "BUY"
                        ? "#4CAF50"
                        : "#888",
                    background:
                      car.verdict === "STRONG BUY"
                        ? "rgba(201,168,76,0.1)"
                        : "rgba(76,175,80,0.1)",
                    padding: "3px 8px",
                  }}
                >
                  {car.verdict}
                </span>
              </div>
              <img
                src={car.img}
                alt=""
                style={{ width: "100%", height: 140, objectFit: "cover", marginBottom: 16 }}
              />
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{car.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#444", marginBottom: 2 }}>SCORE</div>
                  <div
                    className="dir-a-serif"
                    style={{ fontSize: 24, color: "#C9A84C" }}
                  >
                    {car.score}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#444", marginBottom: 2 }}>VS IIV</div>
                  <div
                    className="dir-a-serif"
                    style={{ fontSize: 24, color: "#4CAF50" }}
                  >
                    {car.gap}
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid #1a1a1a",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#555",
                }}
              >
                <span>{car.price}</span>
                <span>{car.miles}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Direction B: Editorial Magazine ─────────────────────────────────────────
function DirectionB() {
  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: "#FAFAF7",
        color: "#111111",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .dir-b-serif { font-family: 'Playfair Display', serif; }
      `}</style>

      {/* Nav */}
      <nav
        style={{
          background: "#FAFAF7",
          borderBottom: "1px solid #E8E4DC",
          padding: "0 48px",
          display: "flex",
          alignItems: "center",
          height: 60,
          gap: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 22, background: "#C8102E" }} />
          <span
            className="dir-b-serif"
            style={{ fontSize: 18, fontWeight: 700, color: "#111" }}
          >
            SupercarIQ
          </span>
        </div>
        <div style={{ display: "flex", gap: 28, flex: 1 }}>
          {["812 Superfast", "F8 Tributo", "812 GTS", "458 Italia", "More Models ▾"].map(
            (m) => (
              <span
                key={m}
                style={{
                  fontSize: 13,
                  fontWeight: m === "812 Superfast" ? 600 : 400,
                  color: m === "812 Superfast" ? "#111" : "#777",
                  borderBottom: m === "812 Superfast" ? "2px solid #C8102E" : "none",
                  paddingBottom: 2,
                  cursor: "pointer",
                }}
              >
                {m}
              </span>
            )
          )}
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#777" }}>
          <span style={{ cursor: "pointer" }}>Compare</span>
          <span style={{ cursor: "pointer" }}>Market</span>
          <span
            style={{
              background: "#111",
              color: "#fff",
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            All Reports
          </span>
        </div>
      </nav>

      {/* Hero — asymmetric split */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          minHeight: 560,
          borderBottom: "1px solid #E8E4DC",
        }}
      >
        {/* Left: text */}
        <div
          style={{
            padding: "64px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            background: "#FAFAF7",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#C8102E",
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            LIVE ANALYSIS · 20 ACTIVE UK LISTINGS
          </div>
          <h1
            className="dir-b-serif"
            style={{ fontSize: 56, lineHeight: 1.1, margin: "0 0 20px", fontWeight: 900 }}
          >
            Ferrari 812{" "}
            <em style={{ color: "#C8102E", fontStyle: "italic" }}>Superfast</em>
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "#555",
              lineHeight: 1.6,
              margin: "0 0 36px",
              maxWidth: 420,
            }}
          >
            The last naturally aspirated V12 Ferrari. Every active UK listing
            scored, ranked, and valued against real auction data.
          </p>

          {/* IIV pull quote */}
          <div
            style={{
              borderLeft: "3px solid #C8102E",
              paddingLeft: 20,
              marginBottom: 32,
            }}
          >
            <div
              className="dir-b-serif"
              style={{ fontSize: 40, fontWeight: 900, color: "#111", lineHeight: 1 }}
            >
              +£98k
            </div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              best opportunity below implied value
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              style={{
                background: "#C8102E",
                color: "#fff",
                border: "none",
                padding: "13px 28px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              See Full Analysis →
            </button>
            <button
              style={{
                background: "transparent",
                color: "#111",
                border: "1px solid #ddd",
                padding: "13px 24px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              All Models
            </button>
          </div>
        </div>

        {/* Right: image */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <img
            src={HERO_IMG}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* Verdict badge */}
          <div
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              background: "#fff",
              padding: "12px 20px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#888", marginBottom: 4 }}>
              INVESTMENT VERDICT
            </div>
            <div
              className="dir-b-serif"
              style={{ fontSize: 20, fontWeight: 900, color: "#C8102E" }}
            >
              STRONG BUY
            </div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
              90.8 / 100 score
            </div>
          </div>
        </div>
      </div>

      {/* Model cards */}
      <div style={{ padding: "56px 48px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 32,
          }}
        >
          <h2
            className="dir-b-serif"
            style={{ fontSize: 32, fontWeight: 900, margin: 0 }}
          >
            Top Ranked Listings
          </h2>
          <span style={{ fontSize: 13, color: "#C8102E", cursor: "pointer" }}>
            View all 20 →
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 24,
          }}
        >
          {MOCK_CARS.map((car) => (
            <div
              key={car.rank}
              style={{
                background: "#fff",
                border: "1px solid #E8E4DC",
                cursor: "pointer",
                transition: "box-shadow 0.2s",
              }}
            >
              <div style={{ position: "relative" }}>
                <img
                  src={car.img}
                  alt=""
                  style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    background: car.verdict === "STRONG BUY" ? "#C8102E" : "#111",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    padding: "4px 10px",
                  }}
                >
                  {car.verdict}
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    background: "rgba(255,255,255,0.95)",
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#2D7D46",
                  }}
                >
                  {car.gap} vs IIV
                </div>
              </div>
              <div style={{ padding: "20px 20px 24px" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "#aaa",
                    letterSpacing: "0.1em",
                    marginBottom: 6,
                  }}
                >
                  RANK #{car.rank} · {car.tag}
                </div>
                <div
                  className="dir-b-serif"
                  style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}
                >
                  {car.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 12,
                    borderTop: "1px solid #f0ece4",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#555" }}>{car.price}</span>
                  <span style={{ color: "#555" }}>{car.miles}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#C8102E",
                    }}
                  >
                    {car.score}/100
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div
        style={{
          background: "#111",
          padding: "40px 48px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 1,
        }}
      >
        {[
          { label: "Active UK Listings", value: "127" },
          { label: "Scoring Variables", value: "20+" },
          { label: "Auction Results", value: "47+" },
          { label: "Views Analysed", value: "15M+" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "0 32px", borderRight: "1px solid #222" }}>
            <div
              className="dir-b-serif"
              style={{ fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1 }}
            >
              {s.value}
            </div>
            <div
              style={{ fontSize: 11, color: "#666", marginTop: 6, letterSpacing: "0.05em" }}
            >
              {s.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Direction C: Dark Luxury Platform ───────────────────────────────────────
function DirectionC() {
  return (
    <div
      style={{
        fontFamily: "'Manrope', sans-serif",
        background: "#141414",
        color: "#FFFFFF",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@300;400;500;600;700&display=swap');
        .dir-c-bebas { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }
      `}</style>

      {/* Nav — cleaner than current */}
      <nav
        style={{
          background: "rgba(20,20,20,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 40px",
          display: "flex",
          alignItems: "center",
          height: 56,
          gap: 32,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="9" fill="none" stroke="#C8102E" strokeWidth="1.5" />
            <path d="M6 10 L10 6 L14 10 L10 14 Z" fill="#C8102E" />
          </svg>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#fff",
            }}
          >
            SUPERCAR<span style={{ color: "#C8102E" }}>IQ</span>
          </span>
        </div>

        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {["812 Superfast", "F8 Tributo", "812 GTS", "458 Italia"].map((m) => (
            <span
              key={m}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 500,
                color: m === "812 Superfast" ? "#fff" : "rgba(255,255,255,0.4)",
                background: m === "812 Superfast" ? "rgba(200,16,46,0.15)" : "transparent",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {m}
            </span>
          ))}
          <span
            style={{
              padding: "6px 14px",
              fontSize: 12,
              color: "#B8962E",
              cursor: "pointer",
            }}
          >
            ▾ 7 More
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {["Compare", "Market", "Watchlist"].map((item) => (
            <span
              key={item}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            >
              {item}
            </span>
          ))}
          <span
            style={{
              background: "#C8102E",
              color: "#fff",
              padding: "6px 16px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            ALL REPORTS
          </span>
        </div>
      </nav>

      {/* Hero — full bleed */}
      <div style={{ position: "relative", height: 600, overflow: "hidden" }}>
        <img
          src={HERO_IMG2}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, transparent 20%, #141414 100%), linear-gradient(90deg, #141414 0%, transparent 60%)",
          }}
        />

        {/* Live ticker */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22c55e",
              display: "inline-block",
              boxShadow: "0 0 8px #22c55e",
            }}
          />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>
            LIVE · 20 ACTIVE UK LISTINGS · REFRESHED TODAY
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0 40px 48px",
          }}
        >
          <div style={{ maxWidth: 700 }}>
            <h1
              className="dir-c-bebas"
              style={{ fontSize: 88, lineHeight: 0.9, margin: "0 0 20px", fontWeight: 400 }}
            >
              Ferrari 812{" "}
              <span style={{ color: "#C8102E" }}>Superfast</span>
            </h1>
            <p
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.6)",
                margin: "0 0 32px",
                maxWidth: 500,
                lineHeight: 1.6,
              }}
            >
              The last naturally aspirated V12 Ferrari. Every active UK listing
              scored, ranked, and valued against real auction data.
            </p>

            {/* Stat pills */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "TOP SCORE", value: "90.8", unit: "/100", color: "#B8962E" },
                { label: "BEST GAP", value: "+£98k", unit: "vs IIV", color: "#22c55e" },
                { label: "VERDICT", value: "STRONG BUY", unit: "", color: "#C8102E" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "12px 20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      color: "rgba(255,255,255,0.4)",
                      marginBottom: 4,
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span
                      className="dir-c-bebas"
                      style={{ fontSize: 28, color: s.color, lineHeight: 1 }}
                    >
                      {s.value}
                    </span>
                    {s.unit && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        {s.unit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Car cards */}
      <div style={{ padding: "48px 40px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h2
            className="dir-c-bebas"
            style={{ fontSize: 36, margin: 0, color: "#fff" }}
          >
            Top Ranked Listings
          </h2>
          <span
            style={{
              fontSize: 12,
              color: "#B8962E",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            VIEW ALL 20 →
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          {MOCK_CARS.map((car) => (
            <div
              key={car.rank}
              style={{
                background: "#1C1C1C",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div style={{ position: "relative" }}>
                <img
                  src={car.img}
                  alt=""
                  style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    background:
                      car.verdict === "STRONG BUY"
                        ? "#B8962E"
                        : "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(4px)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    padding: "4px 10px",
                    borderRadius: 3,
                  }}
                >
                  {car.verdict}
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    background: "rgba(34,197,94,0.15)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    color: "#22c55e",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 3,
                  }}
                >
                  {car.gap}
                </div>
              </div>
              <div style={{ padding: "16px 16px 20px" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    letterSpacing: "0.1em",
                    marginBottom: 6,
                  }}
                >
                  RANK #{car.rank} · {car.tag}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                  {car.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 12,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{car.price}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{car.miles}</span>
                  <span
                    className="dir-c-bebas"
                    style={{ color: "#B8962E", fontSize: 16 }}
                  >
                    {car.score}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Preview Page ────────────────────────────────────────────────────────
const DIRECTIONS = [
  {
    id: "A",
    name: "The Investment Terminal",
    subtitle: "Bloomberg meets Robb Report",
    desc: "Near-black background · Instrument Serif headings · Ferrari red + gold accents · Tab navigation · Data-dense but premium",
    component: DirectionA,
  },
  {
    id: "B",
    name: "The Editorial Magazine",
    subtitle: "evo magazine with a data layer",
    desc: "Warm off-white background · Playfair Display serif · Asymmetric hero split · Pull-quote IIV callouts · Light, authoritative, editorial",
    component: DirectionB,
    recommended: true,
  },
  {
    id: "C",
    name: "The Dark Luxury Platform",
    subtitle: "PistonHeads premium tier",
    desc: "Deep charcoal background · Bebas Neue labels · Glassmorphism stat pills · Cleaner nav · Evolution of the current design",
    component: DirectionC,
  },
];

export default function DesignPreview() {
  const [active, setActive] = useState<"A" | "B" | "C">("B");
  const ActiveComponent = DIRECTIONS.find((d) => d.id === active)!.component;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0d0d0d", minHeight: "100vh" }}>
      {/* Selector bar */}
      <div
        style={{
          background: "#0d0d0d",
          borderBottom: "1px solid #222",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <span style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", marginRight: 8 }}>
          DESIGN DIRECTION
        </span>
        {DIRECTIONS.map((d) => (
          <button
            key={d.id}
            onClick={() => setActive(d.id as "A" | "B" | "C")}
            style={{
              background: active === d.id ? "#fff" : "transparent",
              color: active === d.id ? "#000" : "#666",
              border: active === d.id ? "none" : "1px solid #333",
              padding: "8px 20px",
              fontSize: 12,
              fontWeight: active === d.id ? 700 : 400,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 4,
              fontFamily: "inherit",
            }}
          >
            <span
              style={{
                background: active === d.id ? "#C8102E" : "#333",
                color: "#fff",
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {d.id}
            </span>
            {d.name}
            {d.recommended && (
              <span
                style={{
                  background: "#C8102E",
                  color: "#fff",
                  fontSize: 9,
                  padding: "2px 6px",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                }}
              >
                RECOMMENDED
              </span>
            )}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#444" }}>
          {DIRECTIONS.find((d) => d.id === active)?.desc}
        </div>
      </div>

      {/* Mockup */}
      <div style={{ border: "1px solid #222", margin: "0" }}>
        <ActiveComponent />
      </div>
    </div>
  );
}
