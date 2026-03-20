import { useState, useEffect } from "react";

const USERS = {
  admin:  { password: "mothers2026", role: "admin" },
  viewer: { password: "viewer123",   role: "viewer" },
};

const GOOGLE_CLIENT_ID = "77102317566-eg8r56fva0l9e6m27jcl4t1u7uecovlf.apps.googleusercontent.com";
const GOOGLE_AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=https://mothers-reviews.vercel.app/auth/callback&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent`;

// Mock reviews for testing (used when not connected to Google)
const MOCK_REVIEWS = [
  { id: "1", author: "Ahmed Al Mansouri", rating: 5, text: "Absolutely amazing food! The biryani was the best I have had in Dubai. Service was fast and friendly. Will definitely come back!", date: "2026-03-15", replied: false, profilePhoto: null },
  { id: "2", author: "Priya Sharma", rating: 5, text: "Mother's Restaurant is a hidden gem! The dal makhani and butter naan were outstanding. Feels like home cooking. Highly recommend!", date: "2026-03-12", replied: false, profilePhoto: null },
  { id: "3", author: "Fatima Al Zaabi", rating: 4, text: "Good food and reasonable prices. The chicken curry was delicious. Only issue was the wait time was a bit long during peak hours.", date: "2026-03-10", replied: false, profilePhoto: null },
  { id: "4", author: "Rajesh Kumar", rating: 5, text: "Best Delhi ka Dhaba in UAE! The parathas and lassi took me back to India. The staff is very welcoming and the portions are generous.", date: "2026-03-08", replied: true, existingReply: "Thank you so much Rajesh! We are thrilled you enjoyed our food. See you again soon!", profilePhoto: null },
  { id: "5", author: "Mohammed Hassan", rating: 3, text: "Food is decent but nothing exceptional. The service could be improved. The place was crowded and noisy. Might give it another try.", date: "2026-03-05", replied: false, profilePhoto: null },
  { id: "6", author: "Sarah Johnson", rating: 2, text: "Waited 45 minutes for my order. The food was cold when it arrived. The paneer tikka was overcooked. Very disappointed with the experience.", date: "2026-03-01", replied: false, profilePhoto: null },
  { id: "7", author: "Vikram Nair", rating: 5, text: "Authentic Indian street food experience in Dubai! The chole bhature and masala chai were perfect. Staff is very friendly. A must visit!", date: "2026-02-28", replied: false, profilePhoto: null },
  { id: "8", author: "Layla Al Rashidi", rating: 4, text: "Lovely restaurant with great ambiance. The mutton rogan josh was excellent. Prices are very reasonable for the quality. Will return!", date: "2026-02-25", replied: false, profilePhoto: null },
];

const STAR_COLORS = { 5: "#10b981", 4: "#34d399", 3: "#f59e0b", 2: "#f97316", 1: "#ef4444" };
const STAR_LABELS = { 5: "Excellent", 4: "Good", 3: "Average", 2: "Poor", 1: "Terrible" };

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedReview, setSelectedReview] = useState(null);
  const [draftReplies, setDraftReplies] = useState({});
  const [generatingId, setGeneratingId] = useState(null);
  const [postingId, setPostingId] = useState(null);
  const [postedIds, setPostedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("reviews");
  const [searchText, setSearchText] = useState("");
  const [notification, setNotification] = useState(null);

  const isAdmin = currentUser?.role === "admin";

  // Check if returning from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      setGoogleConnected(true);
      window.history.replaceState({}, '', '/');
      loadGoogleReviews();
    }
  }, []);

  const loadGoogleReviews = async () => {
    setLoadingReviews(true);
    try {
      // Try to get token from sessionStorage first
      const token = sessionStorage.getItem('google_access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/reviews', { headers, credentials: 'include' });
      const json = await res.json();
      if (json.reviews) {
        setReviews(json.reviews);
        setGoogleConnected(true);
        showNotification(`✅ Loaded ${json.reviews.length} real Google reviews!`);
      } else {
        console.error('Reviews error:', json);
        showNotification('⚠️ ' + (json.error || 'Could not load reviews'), 'error');
      }
    } catch (e) {
      console.error('Load error:', e);
      showNotification('⚠️ Could not load Google reviews', 'error');
    }
    setLoadingReviews(false);
  };

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = () => {
    const user = USERS[username];
    if (user && user.password === password) {
      setCurrentUser({ username, role: user.role });
      setShowLogin(false);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const generateReply = async (review) => {
    setGeneratingId(review.id);
    const prompt = `You are a professional customer service manager for Mother's Restaurant in Dubai (Delhi Ka Dhaba — authentic Indian cuisine).

Write a warm, professional reply to this Google review:
- Reviewer: ${review.author}
- Rating: ${review.rating}/5 stars
- Review: "${review.text}"

Guidelines:
- Start by thanking the customer by first name
- Address specific points they mentioned
- For negative reviews: apologize sincerely, acknowledge the issue, invite them back
- For positive reviews: express gratitude, highlight what they enjoyed
- Keep it 2-3 sentences, warm and authentic
- End with an invitation to visit again
- Tone: friendly, professional, Indian hospitality
- Do NOT use generic templates
- Sign off as: Team Mothers Restaurant`;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const json = await res.json();
      setDraftReplies(prev => ({ ...prev, [review.id]: json.analysis || "Could not generate reply." }));
    } catch {
      setDraftReplies(prev => ({ ...prev, [review.id]: "Error generating reply. Please try again." }));
    }
    setGeneratingId(null);
  };

  const postReply = async (review) => {
    setPostingId(review.id);
    try {
      if (googleConnected && review.reviewName) {
        // Post real reply to Google
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewName: review.reviewName, reply: draftReplies[review.id] })
        });
        if (!res.ok) throw new Error('Failed to post');
      }
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, replied: true, existingReply: draftReplies[review.id] } : r));
      setPostedIds(prev => [...prev, review.id]);
      setSelectedReview(null);
      showNotification(`✅ Reply posted for ${review.author}'s review!`);
    } catch {
      showNotification('⚠️ Failed to post reply to Google', 'error');
    }
    setPostingId(null);
  };

  // Stats
  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  const repliedCount = reviews.filter(r => r.replied).length;
  const pendingCount = reviews.filter(r => !r.replied).length;
  const ratingDist = [5,4,3,2,1].map(s => ({ stars: s, count: reviews.filter(r => r.rating === s).length }));

  const filteredReviews = reviews.filter(r => {
    if (filter === "pending") return !r.replied;
    if (filter === "replied") return r.replied;
    if (filter === "5" || filter === "4" || filter === "3" || filter === "2" || filter === "1") return r.rating === parseInt(filter);
    if (searchText) return r.text.toLowerCase().includes(searchText.toLowerCase()) || r.author.toLowerCase().includes(searchText.toLowerCase());
    return true;
  });

  const Stars = ({ rating, size = 14 }) => (
    <span style={{ display: "inline-flex", gap: "1px" }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= rating ? "#f59e0b" : "#2a2a35" }}>★</span>
      ))}
    </span>
  );

  if (showLogin) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a0f 0%,#111116 50%,#0a0a0f 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif" }}>
      <div style={{ width: "380px", background: "#111116", border: "1px solid #2a1800", borderRadius: "20px", padding: "3rem", boxShadow: "0 30px 80px rgba(0,0,0,0.8)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⭐</div>
          <div style={{ color: "#f5c842", fontSize: "1.3rem", fontWeight: "bold", marginBottom: "0.3rem" }}>Mothers Restaurant</div>
          <div style={{ color: "#9a6a20", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>Reviews Manager</div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.7rem", color: "#9a6a20", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Username</div>
          <input value={username} onChange={e => { setUsername(e.target.value); setLoginError(false); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter username" autoFocus
            style={{ width: "100%", background: "#0c0c10", border: `1px solid ${loginError ? "#ef4444" : "#3a2200"}`, color: "#e2d9c8", padding: "0.8rem", borderRadius: "8px", outline: "none", boxSizing: "border-box", fontFamily: "inherit", fontSize: "0.9rem" }} />
        </div>

        <div style={{ marginBottom: "1.2rem" }}>
          <div style={{ fontSize: "0.7rem", color: "#9a6a20", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Password</div>
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setLoginError(false); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter password"
            style={{ width: "100%", background: "#0c0c10", border: `1px solid ${loginError ? "#ef4444" : "#3a2200"}`, color: "#e2d9c8", padding: "0.8rem", borderRadius: "8px", outline: "none", boxSizing: "border-box", fontFamily: "inherit", fontSize: "0.9rem" }} />
        </div>

        {loginError && <div style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "1rem", textAlign: "center" }}>❌ Incorrect username or password</div>}

        <button onClick={handleLogin} style={{ width: "100%", background: "linear-gradient(135deg,#b45309,#92400e)", color: "#fff", border: "none", borderRadius: "10px", padding: "0.9rem", fontSize: "1rem", cursor: "pointer", fontFamily: "inherit", fontWeight: "bold" }}>
          Sign In
        </button>
        <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.65rem", color: "#4a3a20" }}>Contact admin for access</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0f", fontFamily: "'Georgia', serif", color: "#e2d9c8" }}>

      {/* Notification */}
      {notification && (
        <div style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 1000, background: notification.type === "success" ? "#0a2a0a" : "#2a0a0a", border: `1px solid ${notification.type === "success" ? "#10b981" : "#ef4444"}`, borderRadius: "8px", padding: "0.8rem 1.2rem", color: notification.type === "success" ? "#4ade80" : "#f87171", fontSize: "0.85rem" }}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a0e00,#2c1800)", borderBottom: "1px solid #3a2200", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <span style={{ fontSize: "1.8rem" }}>⭐</span>
          <div>
            <div style={{ color: "#f5c842", fontSize: "1.2rem", fontWeight: "bold" }}>Mothers Restaurant</div>
            <div style={{ color: "#9a6a20", fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>Google Reviews Manager</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <span style={{ fontSize: "0.75rem", color: isAdmin ? "#4ade80" : "#a08020", background: isAdmin ? "#0a2a0a" : "#1a1a00", padding: "0.3rem 0.7rem", borderRadius: "5px", border: `1px solid ${isAdmin ? "#1a4a1a" : "#4a3800"}` }}>
            {isAdmin ? "👑 Admin" : "👁 Viewer"}
          </span>
          {isAdmin && (
            googleConnected
              ? <span style={{ fontSize: "0.75rem", color: "#4ade80", background: "#0a2a0a", padding: "0.3rem 0.7rem", borderRadius: "5px", border: "1px solid #1a4a1a" }}>🟢 Google Connected</span>
              : <button onClick={() => window.location.href = GOOGLE_AUTH_URL}
                  style={{ background: "linear-gradient(135deg,#1a3a6a,#0a2a4a)", color: "#4a9eff", border: "1px solid #1a4a8a", borderRadius: "6px", padding: "0.4rem 0.8rem", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>
                  🔗 Connect Google Reviews
                </button>
          )}
          {isAdmin && googleConnected && (
            <button onClick={loadGoogleReviews} disabled={loadingReviews}
              style={{ background: "#1a1200", color: "#f59e0b", border: "1px solid #4a3800", borderRadius: "6px", padding: "0.4rem 0.8rem", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>
              {loadingReviews ? "⏳" : "🔄"} Refresh
            </button>
          )}
          <button onClick={() => { setCurrentUser(null); setShowLogin(true); }}
            style={{ background: "#1a0e00", color: "#9a6a20", border: "1px solid #3a2200", borderRadius: "6px", padding: "0.4rem 0.8rem", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit" }}>
            Logout
          </button>
        </div>
      </div>

      {/* KPI Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: "#111116", borderBottom: "1px solid #2a1800" }}>
        {[
          { label: "Average Rating", value: `${avgRating} ★`, color: "#f59e0b" },
          { label: "Total Reviews", value: reviews.length, color: "#e2d9c8" },
          { label: "Pending Reply", value: pendingCount, color: "#ef4444" },
          { label: "Replied", value: repliedCount, color: "#10b981" },
        ].map(k => (
          <div key={k.label} style={{ padding: "0.9rem 1rem", textAlign: "center", borderRight: "1px solid #2a1800" }}>
            <div style={{ fontSize: "0.6rem", color: "#7a5a30", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>{k.label}</div>
            <div style={{ fontSize: "1.4rem", color: k.color, fontWeight: "bold" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#0e0e12", borderBottom: "1px solid #2a1800" }}>
        {[["reviews","⭐ Reviews"],["analytics","📊 Analytics"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding: "0.7rem 1.2rem", border: "none", cursor: "pointer", fontSize: "0.8rem", background: activeTab === id ? "#1e1205" : "transparent", color: activeTab === id ? "#f5c842" : "#7a5a30", borderBottom: activeTab === id ? "2px solid #f5c842" : "2px solid transparent", fontFamily: "inherit" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.2rem" }}>

        {activeTab === "reviews" && (
          <div style={{ display: "grid", gridTemplateColumns: selectedReview ? "1fr 1fr" : "1fr", gap: "1.2rem" }}>

            {/* Reviews List */}
            <div>
              {/* Filters */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="🔍 Search reviews..."
                  style={{ background: "#111116", border: "1px solid #3a2200", color: "#e2d9c8", padding: "0.4rem 0.8rem", borderRadius: "6px", outline: "none", fontSize: "0.8rem", fontFamily: "inherit", width: "180px" }} />
                {["all","pending","replied","5","4","3","2","1"].map(f => (
                  <button key={f} onClick={() => { setFilter(f); setSearchText(""); }}
                    style={{ background: filter === f ? "#2a1800" : "transparent", color: filter === f ? "#f5c842" : "#7a5a30", border: `1px solid ${filter === f ? "#4a2c00" : "#2a1800"}`, borderRadius: "6px", padding: "0.3rem 0.7rem", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit" }}>
                    {f === "all" ? "All" : f === "pending" ? "⏳ Pending" : f === "replied" ? "✅ Replied" : `${"★".repeat(parseInt(f))}`}
                  </button>
                ))}
              </div>

              {/* Review Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {filteredReviews.map(review => (
                  <div key={review.id} onClick={() => setSelectedReview(selectedReview?.id === review.id ? null : review)}
                    style={{ background: "#111116", border: `1px solid ${selectedReview?.id === review.id ? "#b45309" : "#2a1800"}`, borderRadius: "10px", padding: "1rem", cursor: "pointer", transition: "border-color 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: `${STAR_COLORS[review.rating]}22`, border: `1px solid ${STAR_COLORS[review.rating]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                          {review.author.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#e2d9c8" }}>{review.author}</div>
                          <div style={{ fontSize: "0.65rem", color: "#7a5a30" }}>{new Date(review.date).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
                        <Stars rating={review.rating} />
                        {review.replied
                          ? <span style={{ fontSize: "0.65rem", color: "#10b981", background: "#0a2a0a", padding: "0.1rem 0.4rem", borderRadius: "3px", border: "1px solid #1a4a1a" }}>✅ Replied</span>
                          : <span style={{ fontSize: "0.65rem", color: "#f59e0b", background: "#1a1200", padding: "0.1rem 0.4rem", borderRadius: "3px", border: "1px solid #4a3800" }}>⏳ Pending</span>
                        }
                      </div>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#b09070", lineHeight: 1.6, margin: 0 }}>{review.text}</p>
                    {review.replied && review.existingReply && (
                      <div style={{ marginTop: "0.6rem", background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: "6px", padding: "0.5rem 0.7rem", fontSize: "0.75rem", color: "#6a9a6a" }}>
                        <strong>Your reply:</strong> {review.existingReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Panel */}
            {selectedReview && (
              <div style={{ background: "#111116", border: "1px solid #2a1800", borderRadius: "12px", padding: "1.5rem", height: "fit-content", position: "sticky", top: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ color: "#f5c842", fontWeight: "bold", fontSize: "0.9rem" }}>Reply to Review</span>
                  <button onClick={() => setSelectedReview(null)} style={{ background: "none", border: "none", color: "#9a6a20", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
                </div>

                {/* Review Summary */}
                <div style={{ background: "#0c0c10", borderRadius: "8px", padding: "0.8rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                    <strong style={{ fontSize: "0.85rem" }}>{selectedReview.author}</strong>
                    <Stars rating={selectedReview.rating} size={12} />
                    <span style={{ fontSize: "0.7rem", color: STAR_COLORS[selectedReview.rating] }}>{STAR_LABELS[selectedReview.rating]}</span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "#b09070", margin: 0, lineHeight: 1.5 }}>{selectedReview.text}</p>
                </div>

                {/* Generate Button */}
                {isAdmin && (
                  <button onClick={() => generateReply(selectedReview)} disabled={generatingId === selectedReview.id}
                    style={{ width: "100%", background: generatingId === selectedReview.id ? "#1a1200" : "linear-gradient(135deg,#1e3a1e,#0a2a0a)", color: "#4ade80", border: "1px solid #1a4a1a", borderRadius: "8px", padding: "0.6rem", fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", marginBottom: "0.8rem" }}>
                    {generatingId === selectedReview.id ? "⏳ Generating AI Reply..." : "🤖 Generate AI Reply"}
                  </button>
                )}

                {/* Draft Reply */}
                {draftReplies[selectedReview.id] && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.7rem", color: "#9a6a20", marginBottom: "0.4rem", textTransform: "uppercase" }}>
                      {isAdmin ? "✏️ Edit before posting:" : "AI Draft Reply:"}
                    </div>
                    <textarea
                      value={draftReplies[selectedReview.id]}
                      onChange={e => isAdmin && setDraftReplies(prev => ({ ...prev, [selectedReview.id]: e.target.value }))}
                      readOnly={!isAdmin}
                      rows={5}
                      style={{ width: "100%", background: "#0c0c10", border: "1px solid #3a2200", color: "#e2d9c8", padding: "0.7rem", borderRadius: "8px", outline: "none", resize: "vertical", fontSize: "0.82rem", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }}
                    />
                  </div>
                )}

                {/* Post Button */}
                {isAdmin && draftReplies[selectedReview.id] && !selectedReview.replied && (
                  <button onClick={() => postReply(selectedReview)} disabled={postingId === selectedReview.id}
                    style={{ width: "100%", background: postingId === selectedReview.id ? "#1a1200" : "linear-gradient(135deg,#b45309,#92400e)", color: "#fff", border: "none", borderRadius: "8px", padding: "0.8rem", fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit", fontWeight: "bold" }}>
                    {postingId === selectedReview.id ? "⏳ Posting to Google..." : "✅ Approve & Post to Google"}
                  </button>
                )}

                {selectedReview.replied && (
                  <div style={{ textAlign: "center", color: "#10b981", fontSize: "0.82rem", padding: "0.8rem", background: "#0a2a0a", borderRadius: "8px", border: "1px solid #1a4a1a" }}>
                    ✅ Reply already posted on Google
                  </div>
                )}

                {!isAdmin && (
                  <div style={{ textAlign: "center", color: "#9a6a20", fontSize: "0.75rem", marginTop: "0.5rem" }}>
                    Contact admin to post replies
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>

            {/* Rating Distribution */}
            <div style={{ background: "#111116", border: "1px solid #2a1800", borderRadius: "12px", padding: "1.5rem" }}>
              <div style={{ color: "#f5c842", fontWeight: "bold", marginBottom: "1.2rem", fontSize: "0.9rem" }}>⭐ Rating Distribution</div>
              {ratingDist.map(({ stars, count }) => (
                <div key={stars} style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.6rem" }}>
                  <span style={{ fontSize: "0.8rem", color: STAR_COLORS[stars], width: "20px", textAlign: "right" }}>{stars}★</span>
                  <div style={{ flex: 1, height: "8px", background: "#1a1a22", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${(count / reviews.length) * 100}%`, height: "100%", background: STAR_COLORS[stars], borderRadius: "4px", transition: "width 0.5s" }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#7a5a30", width: "20px" }}>{count}</span>
                </div>
              ))}
              <div style={{ marginTop: "1.2rem", paddingTop: "1rem", borderTop: "1px solid #2a1800", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", color: "#f59e0b", fontWeight: "bold" }}>{avgRating}</div>
                <Stars rating={Math.round(parseFloat(avgRating))} size={18} />
                <div style={{ fontSize: "0.72rem", color: "#7a5a30", marginTop: "0.3rem" }}>Based on {reviews.length} reviews</div>
              </div>
            </div>

            {/* Reply Stats */}
            <div style={{ background: "#111116", border: "1px solid #2a1800", borderRadius: "12px", padding: "1.5rem" }}>
              <div style={{ color: "#f5c842", fontWeight: "bold", marginBottom: "1.2rem", fontSize: "0.9rem" }}>📊 Reply Statistics</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.2rem" }}>
                {[
                  { label: "Reply Rate", value: `${Math.round((repliedCount / reviews.length) * 100)}%`, color: "#10b981" },
                  { label: "Pending", value: pendingCount, color: "#ef4444" },
                  { label: "Replied", value: repliedCount, color: "#10b981" },
                  { label: "Total", value: reviews.length, color: "#e2d9c8" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0c0c10", borderRadius: "8px", padding: "0.8rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", color: s.color, fontWeight: "bold" }}>{s.value}</div>
                    <div style={{ fontSize: "0.65rem", color: "#7a5a30", textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent activity */}
              <div style={{ color: "#f5c842", fontWeight: "bold", marginBottom: "0.8rem", fontSize: "0.85rem" }}>Recent Reviews</div>
              {reviews.slice(0, 4).map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid #1a1a22", fontSize: "0.75rem" }}>
                  <span style={{ color: "#b09070" }}>{r.author}</span>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Stars rating={r.rating} size={10} />
                    <span style={{ color: r.replied ? "#10b981" : "#f59e0b" }}>{r.replied ? "✅" : "⏳"}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pending reviews that need reply */}
            <div style={{ background: "#111116", border: "1px solid #3a1a00", borderRadius: "12px", padding: "1.5rem", gridColumn: "1 / -1" }}>
              <div style={{ color: "#f5c842", fontWeight: "bold", marginBottom: "1rem", fontSize: "0.9rem" }}>⏳ Reviews Needing Reply ({pendingCount})</div>
              {reviews.filter(r => !r.replied).length === 0 ? (
                <div style={{ textAlign: "center", color: "#10b981", padding: "1.5rem" }}>🎉 All reviews have been replied to!</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: "0.8rem" }}>
                  {reviews.filter(r => !r.replied).map(r => (
                    <div key={r.id} onClick={() => { setSelectedReview(r); setActiveTab("reviews"); }}
                      style={{ background: "#0c0c10", border: "1px solid #3a2200", borderRadius: "8px", padding: "0.8rem", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "bold" }}>{r.author}</span>
                        <Stars rating={r.rating} size={11} />
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "#9a7a50", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
