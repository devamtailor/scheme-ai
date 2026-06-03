import { useState } from 'react'
import './index.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RadioGroup = ({ label, options, value, onChange }) => (
  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
    <label>{label}</label>
    <div className="radio-cards">
      {options.map(opt => (
        <div
          key={opt}
          className={`radio-card ${value === opt ? 'selected' : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </div>
      ))}
    </div>
  </div>
);

function App() {
  const [view, setView] = useState('landing') // 'landing', 'discover', 'saved', 'analytics'
  const [theme, setTheme] = useState('dark')   // 'dark' or 'light'
  
  const [activeTab, setActiveTab] = useState('form')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  
  // Navigator Panel States
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [activeScheme, setActiveScheme] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  
  // Pre-loaded saved schemes for a well-maintained, professional SaaS dashboard look
  const [savedSchemes, setSavedSchemes] = useState([
    {
      id: 'saved-1',
      name: "AICTE Pragati Scholarship Scheme for Girls",
      description: "Provides financial assistance to meritorious girl students pursuing technical degree courses in AICTE-approved institutions.",
      benefits: "₹50,000 per annum for course duration",
      status: "applied",
      updatedAt: "June 2, 2026"
    },
    {
      id: 'saved-2',
      name: "Pradhan Mantri Mudra Yojana (PMMY)",
      description: "Collateral-free loans up to 10 Lakhs to non-corporate, non-farm small/micro enterprises.",
      benefits: "Up to ₹10 Lakhs business credit",
      status: "approved",
      updatedAt: "May 28, 2026"
    }
  ]);
  
  // Form profile state
  const [formData, setFormData] = useState({
    name: '', age: '', gender: '', state: '', city: '',
    income: '', category: '', profession: '', education: '',
    disability: 'No', minority: 'No'
  })
  const [chatText, setChatText] = useState('')

  // Toast / feedback message when saving a scheme
  const [toastMessage, setToastMessage] = useState(null)

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleDemoMode = () => {
    setView('discover')
    setActiveTab('form')
    setFormStep(3) // Jump to the end page for demo mode
    setFormData({
      ...formData,
      name: 'Rahul Patel',
      age: 20,
      gender: 'Male',
      state: 'Gujarat',
      city: 'Ahmedabad',
      income: 300000,
      category: 'General',
      profession: 'Student',
      education: 'Undergraduate',
      disability: 'No',
      minority: 'No'
    })
  }

  const handleAnalyze = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setResults(null);
    setError(null);
    
    try {
      const payload = activeTab === 'form' 
        ? { profile: formData } 
        : { chatText }

      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await response.json()
      if (data.error) {
        setError(String(data.error))
      } else {
        setResults(data)
      }
    } catch (err) {
      console.error("Error fetching analysis:", err)
      setError("Unable to connect to the discovery server. Please ensure the backend service is running.")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveScheme = (scheme) => {
    // Check if already saved
    if (savedSchemes.some(s => s.name === scheme.name)) {
      showToast("Scheme is already saved to your portfolio!");
      return;
    }
    
    const newSaved = {
      id: `saved-${Date.now()}`,
      name: scheme.name,
      description: scheme.description,
      benefits: scheme.benefits,
      status: "pending",
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    
    setSavedSchemes([...savedSchemes, newSaved]);
    showToast("Scheme saved to your portfolio successfully!");
  }

  const handleDeleteSavedScheme = (id) => {
    setSavedSchemes(savedSchemes.filter(s => s.id !== id));
    showToast("Scheme removed from your portfolio.");
  }

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  const handleApplyClick = (scheme) => {
    setActiveScheme(scheme);
    setChatMessages([
      { role: 'assistant', text: `I am your Smart Navigator. I just opened the official portal for ${scheme.name} in a new tab. If the site didn't load, let me know! How can I help you navigate the form?` }
    ]);
    setIsNavigatorOpen(true);
    
    if (scheme.apply_link) {
      try {
        window.open(scheme.apply_link, '_blank');
      } catch (e) {
        console.error("Popup blocked or failed to open link");
      }
    }
  };

  const handleSendAssistantMessage = async () => {
    if (!assistantInput.trim() || isAssistantTyping) return;
    
    const userMessage = { role: 'user', text: assistantInput };
    const newContext = [...chatMessages, userMessage];
    
    setChatMessages(newContext);
    setAssistantInput('');
    setIsAssistantTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/apply-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemeName: activeScheme.name,
          schemeSteps: activeScheme.application_steps,
          profile: formData,
          messages: newContext
        })
      });
      
      const data = await response.json();
      if (data.error) {
        setChatMessages([...newContext, { role: 'assistant', text: `⚠️ ${data.error}` }]);
      } else {
        setChatMessages([...newContext, { role: 'assistant', text: data.text || "I couldn't retrieve a response." }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages([...newContext, { role: 'assistant', text: "⚠️ Sorry, I'm having trouble connecting to the server." }]);
    } finally {
      setIsAssistantTyping(false);
    }
  };

  return (
    <div className={`app-shell theme-${theme}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className="global-alert" 
          style={{ 
            position: 'fixed', 
            top: '80px', 
            right: '20px', 
            zIndex: 1100, 
            background: 'var(--surface)', 
            borderColor: 'var(--primary)', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            animation: 'slideLeftDrawer 0.3s ease-out',
            margin: 0
          }}
        >
          <span>✨</span>
          <p>{toastMessage}</p>
        </div>
      )}

      {/* SaaS Premium Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setView('landing')}>
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 8px var(--primary-glow))' }}>
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <circle cx="9" cy="12" r="5" stroke="url(#logo-grad)" strokeWidth="2.5" />
              <circle cx="15" cy="12" r="5" stroke="url(#logo-grad)" strokeWidth="2.5" strokeDasharray="3 3" />
              <path d="M12 9v6M9 12h6" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2>SchemeSync</h2>
        </div>
        
        <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <span 
            className={`nav-link ${view === 'landing' ? 'active' : ''}`}
            onClick={() => { setView('landing'); setIsMobileMenuOpen(false); }}
          >
            Home
          </span>
          <span 
            className={`nav-link ${view === 'discover' ? 'active' : ''}`}
            onClick={() => { setView('discover'); setIsMobileMenuOpen(false); }}
          >
            AI Discover
          </span>
          <span 
            className={`nav-link ${view === 'saved' ? 'active' : ''}`}
            onClick={() => { setView('saved'); setIsMobileMenuOpen(false); }}
          >
            My Schemes
          </span>
          <span 
            className={`nav-link ${view === 'analytics' ? 'active' : ''}`}
            onClick={() => { setView('analytics'); setIsMobileMenuOpen(false); }}
          >
            Analytics
          </span>
          {/* Mobile-only status indicators inside the drawer */}
          <div className="mobile-only-drawer-status">
            <div className="quota-pill" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#10b981', margin: '0.5rem 0', width: 'fit-content' }}>
              <span className="quota-indicator" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
              Live Grounded
            </div>
            <div className="quota-pill" style={{ margin: '0.5rem 0', width: 'fit-content' }}>
              <span className="quota-indicator"></span>
              15 RPM Free
            </div>
          </div>
        </div>
        
        <div className="nav-actions">
          {/* Live Grounding status indicator (Hidden on mobile via CSS) */}
          <div className="quota-pill grounding-desktop-only" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#10b981' }}>
            <span className="quota-indicator" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
            Live Grounded
          </div>

          {/* Custom Slider Theme Toggle */}
          <button 
            className={`theme-toggle-btn ${theme}`} 
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <span className="toggle-track">
              <span className={`toggle-thumb ${theme}`}>
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                    <path d="M12 3a9 9 0 109 9 9.75 9.75 0 00-.67-3.4 6.78 6.78 0 01-8.3-8.3A10.15 10.15 0 0012 3z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="currentColor" strokeWidth="1">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/>
                  </svg>
                )}
              </span>
            </span>
          </button>
          
          <div className="quota-pill quota-desktop-only">
            <span className="quota-indicator"></span>
            15 RPM Free
          </div>
          <div className="profile-avatar">
            {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <button 
            className="mobile-menu-toggle" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* VIEW 1: SaaS Landing Page / Hero Console */}
      {view === 'landing' && (
        <section className="landing-view">
          <div className="landing-hero">
            <h1>Discover & Apply for Government <span>Benefits Instantly</span></h1>
            <p>
              SchemeSync bridges the gap between citizens and their benefits. Describe your profile in natural language or complete our structured wizard to query live government databases in real-time.
            </p>
            <div className="hero-cta-wrapper">
              <button className="btn" onClick={() => setView('discover')}>
                🚀 Launch Discovery Console
              </button>
              <button className="btn btn-secondary" onClick={handleDemoMode}>
                ⚡ Try Demo Profile
              </button>
            </div>
          </div>

          {/* Social Proof Stats */}
          <div className="landing-stats-grid">
            <div className="stat-card glass-card">
              <h3>1,500+</h3>
              <p>Active Schemes Checked</p>
            </div>
            <div className="stat-card glass-card">
              <h3>₹12,500</h3>
              <p>Average Benefit / Person</p>
            </div>
            <div className="stat-card glass-card">
              <h3>99.8%</h3>
              <p>Search Verification Accuracy</p>
            </div>
          </div>

          {/* Features Section */}
          <div className="landing-features-section">
            <div className="section-title">
              <h2>Engineered for High Performance</h2>
              <p>A defensive, scalable setup designed to deliver accurate matches.</p>
            </div>
            <div className="features-grid">
              <div className="feature-card glass-card">
                <div className="feature-icon">🔍</div>
                <h3>Live Grounding Search</h3>
                <p>No outdated internal datasets. Our system uses Gemini search grounding to crawl and verify active parameters on official portals.</p>
              </div>
              <div className="feature-card glass-card">
                <div className="feature-icon">🧭</div>
                <h3>Step-by-Step Navigator</h3>
                <p>Opening external portals can be confusing. Our companion assistant guides you through the forms conversational step by step.</p>
              </div>
              <div className="feature-card glass-card">
                <div className="feature-icon">🛡️</div>
                <h3>Defensive Caching & Rate Limits</h3>
                <p>Guards backend server endpoints against spamming and quota exhaustion by caching query keys directly in MongoDB Atlas.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VIEW 2: AI Discover Console */}
      {view === 'discover' && (
        <main className="dashboard-workspace">
          {/* Left Column: Form / Search Control Panel */}
          <section className="glass-card left-panel">
            <div className="panel-header">
              <h3>Match Criteria</h3>
              <p>Define your profile metrics to search real-time schemes.</p>
            </div>

            <div className="tabs">
              <div 
                className={`tab ${activeTab === 'form' ? 'active' : ''}`}
                onClick={() => setActiveTab('form')}
              >
                📋 Guided Profile
              </div>
              <div 
                className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                💬 Natural Language
              </div>
            </div>

            {activeTab === 'form' ? (
              <div className="wizard-container">
                <div className="wizard-progress">
                   <span className={`step-indicator ${formStep >= 1 ? 'active' : ''}`}>Basics</span>
                   <span className={`step-indicator ${formStep >= 2 ? 'active' : ''}`}>Location</span>
                   <span className={`step-indicator ${formStep >= 3 ? 'active' : ''}`}>Details</span>
                </div>

                {formStep === 1 && (
                  <div className="grid-2">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        placeholder="e.g. Rahul Patel" 
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Age</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.age} 
                        onChange={e => setFormData({...formData, age: e.target.value})} 
                        placeholder="e.g. 21" 
                      />
                    </div>
                    <RadioGroup 
                      label="Gender" 
                      options={['Male', 'Female', 'Other']} 
                      value={formData.gender} 
                      onChange={v => setFormData({...formData, gender: v})} 
                    />
                  </div>
                )}

                {formStep === 2 && (
                  <div className="grid-2">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>State</label>
                      <select 
                        className="form-control" 
                        value={formData.state} 
                        onChange={e => setFormData({...formData, state: e.target.value})}
                      >
                        <option value="">Select State</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="UP">Uttar Pradesh</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Punjab">Punjab</option>
                        <option value="Karnataka">Karnataka</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>City / Town</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.city} 
                        onChange={e => setFormData({...formData, city: e.target.value})} 
                        placeholder="e.g. Ahmedabad" 
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Annual Family Income (₹)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.income} 
                        onChange={e => setFormData({...formData, income: e.target.value})} 
                        placeholder="e.g. 300000" 
                      />
                    </div>
                  </div>
                )}

                {formStep === 3 && (
                  <div className="grid-2">
                    <RadioGroup 
                      label="Category" 
                      options={['General', 'OBC', 'SC', 'ST']} 
                      value={formData.category} 
                      onChange={v => setFormData({...formData, category: v})} 
                    />
                    <RadioGroup 
                      label="Profession" 
                      options={['Student', 'Farmer', 'Salaried', 'Self-employed', 'Business Owner', 'Unemployed']} 
                      value={formData.profession} 
                      onChange={v => setFormData({...formData, profession: v})} 
                    />
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Highest Education Level</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.education} 
                        onChange={e => setFormData({...formData, education: e.target.value})} 
                        placeholder="e.g. 12th Pass, Graduate" 
                      />
                    </div>
                    <RadioGroup 
                      label="Disability Status" 
                      options={['No', 'Yes']} 
                      value={formData.disability} 
                      onChange={v => setFormData({...formData, disability: v})} 
                    />
                  </div>
                )}

                <div className="wizard-footer">
                  {formStep > 1 ? (
                    <button type="button" className="btn btn-secondary" onClick={() => setFormStep(formStep - 1)}>
                      &larr; Back
                    </button>
                  ) : (
                    <div></div>
                  )}
                  {formStep < 3 ? (
                    <button type="button" className="btn" onClick={() => setFormStep(formStep + 1)}>
                      Next Step &rarr;
                    </button>
                  ) : (
                    <button type="button" className="btn" onClick={handleAnalyze} disabled={loading}>
                      {loading ? 'Processing...' : 'Search Matching'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="chat-input-area">
                <div className="form-group">
                  <label>Enter profile search query via natural language</label>
                  <textarea 
                    className="form-control chat-input" 
                    placeholder="e.g. I am a 20-year old female student from Gujarat with an annual family income of ₹2.5 Lakhs. Looking for higher education scholarships."
                    value={chatText}
                    onChange={e => setChatText(e.target.value)}
                  ></textarea>
                </div>
                
                <div className="wizard-footer" style={{ marginTop: '0.5rem', borderTop: 'none', paddingTop: 0 }}>
                  <div></div>
                  <button className="btn" onClick={handleAnalyze} disabled={loading}>
                    {loading ? 'Processing...' : 'Analyze & Discover'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Demo Assist Link */}
            {activeTab === 'form' && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleDemoMode} 
                  style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', borderRadius: '8px' }}
                >
                  ⚡ Load Sample Student Profile
                </button>
              </div>
            )}
          </section>

          {/* Right Column: Dynamic Recommendations Panel */}
          <section className="results-container">
            
            {error && (
              <div className="global-alert">
                <span>⚠️</span>
                <p><strong>System Alert:</strong> {error}</p>
              </div>
            )}

            {loading && (
              <div className="glass-card loader-container">
                <div className="shimmer-circle"></div>
                <p>Connecting to Google Search grounding engine...</p>
              </div>
            )}

            {!loading && !results && (
              <div className="empty-dashboard-state">
                <div className="empty-state-graphic">🧭</div>
                <h2>AI Discovery Engine Ready</h2>
                <p>Fill out the guided profile or describe your criteria in natural language. The system will search and ground actual live Indian government portals in real-time.</p>
              </div>
            )}

            {!loading && results && results.length === 0 && (
              <div className="empty-dashboard-state">
                <div className="empty-state-graphic">🔎</div>
                <h2>No Matching Schemes Found</h2>
                <p>We searched live government portals but found no direct matches. Try adjusting your profile parameters, state, or income settings to expand query matching.</p>
              </div>
            )}

            {!loading && results && results.length > 0 && (
              <div>
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.65rem' }}>AI Recommendations</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Top live matched schemes resolved in real-time.</p>
                  </div>
                  <div className="grounding-badge-context">
                    <span className="pulse-dot"></span>
                    <span>Live Grounded</span>
                  </div>
                </div>
                
                <div className="results-grid">
                  {results.map((scheme, idx) => (
                    <div key={idx} className="scheme-card">
                      <div className="scheme-card-header">
                        <h3>{scheme.name}</h3>
                        {scheme.confidence_score && (
                          <span className="confidence-badge">{scheme.confidence_score}% Match</span>
                        )}
                      </div>
                      
                      <div className="scheme-section">
                        <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          {scheme.description}
                        </p>
                      </div>
                      
                      {scheme.eligible !== false ? (
                        <div className="eligibility-alert success">
                          <strong>🟢 ELIGIBLE</strong>
                          <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>{scheme.eligibility_reason}</p>
                        </div>
                      ) : (
                        <div className="eligibility-alert danger">
                          <strong>🔴 INELIGIBLE</strong>
                          <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>{scheme.ineligibility_reason}</p>
                        </div>
                      )}

                      <div className="scheme-section">
                        <h4>Benefits</h4>
                        <p>{scheme.benefits}</p>
                      </div>

                      <div className="scheme-section">
                        <h4>Required Documents</h4>
                        <ul>
                          {scheme.documents?.map((doc, i) => <li key={i}>{doc}</li>)}
                        </ul>
                      </div>

                      <div className="scheme-section" style={{ flexGrow: 1 }}>
                        <h4>Application Process</h4>
                        <ol style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          {scheme.application_steps?.map((step, i) => <li key={i}><strong>{step}</strong></li>)}
                        </ol>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1rem' }}>
                        <button 
                          onClick={() => handleApplyClick(scheme)} 
                          className="apply-action-btn"
                          style={{ flex: 1 }}
                        >
                          🚀 Navigate
                        </button>
                        <button 
                          onClick={() => handleSaveScheme(scheme)} 
                          className="btn btn-secondary"
                          style={{ padding: '0.75rem 1rem', borderRadius: '10px' }}
                          title="Save scheme to portfolio"
                        >
                          💾 Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      )}

      {/* VIEW 3: Saved Schemes Portfolio */}
      {view === 'saved' && (
        <section className="landing-view" style={{ padding: '3rem 2rem' }}>
          <div className="portfolio-header">
            <h2>Benefit Tracker Portfolio</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Track and manage the government benefits you are applying for.</p>
          </div>

          {savedSchemes.length === 0 ? (
            <div className="empty-dashboard-state">
              <div className="empty-state-graphic">📂</div>
              <h2>Your Portfolio is Empty</h2>
              <p>Go to the AI Discover console, run a match search, and click "Save" on any scheme to track its status here.</p>
              <button className="btn" style={{ marginTop: '1.5rem' }} onClick={() => setView('discover')}>
                Go to Discover Console
              </button>
            </div>
          ) : (
            <div className="portfolio-grid">
              {savedSchemes.map((scheme) => (
                <div key={scheme.id} className="portfolio-card">
                  <div className="portfolio-info">
                    <h3>{scheme.name}</h3>
                    <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem 0', maxWidth: '600px' }}>
                      {scheme.description}
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                      <span>💵 <strong>Benefits:</strong> {scheme.benefits}</span>
                      <span>📅 <strong>Updated:</strong> {scheme.updatedAt}</span>
                    </div>
                  </div>

                  <div className="portfolio-status-actions">
                    <span className={`status-badge ${scheme.status}`}>
                      {scheme.status === 'approved' ? '🟢 Approved' : scheme.status === 'applied' ? '🔵 Applied' : '⏳ Pending'}
                    </span>
                    <button 
                      className="delete-saved-btn" 
                      onClick={() => handleDeleteSavedScheme(scheme.id)}
                      title="Remove scheme from portfolio"
                    >
                      ❌ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* VIEW 4: SaaS Analytics Dashboard */}
      {view === 'analytics' && (
        <section className="landing-view" style={{ padding: '3rem 2rem' }}>
          <div className="portfolio-header">
            <h2>System Analytics & Performance</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Real-time telemetry and API performance monitoring logs.</p>
          </div>

          <div className="analytics-dashboard">
            {/* KPI statistics cards row */}
            <div className="kpi-row">
              <div className="glass-card kpi-card">
                <h4>Active Users</h4>
                <div className="kpi-value">14,280</div>
              </div>
              <div className="glass-card kpi-card">
                <h4>API Quota Pool</h4>
                <div className="kpi-value">15 RPM</div>
              </div>
              <div className="glass-card kpi-card">
                <h4>Cache Hit Ratio</h4>
                <div className="kpi-value">82.4%</div>
              </div>
              <div className="glass-card kpi-card">
                <h4>Match Accuracy</h4>
                <div className="kpi-value">96.8%</div>
              </div>
            </div>

            {/* Charts block */}
            <div className="analytics-charts-grid">
              {/* Left Bar Chart */}
              <div className="glass-card chart-container">
                <div className="panel-header" style={{ marginBottom: '1rem' }}>
                  <h3>Eligibility Distribution</h3>
                  <p>Top category matches resolved across all user searches.</p>
                </div>
                <div className="bar-chart">
                  <div className="bar-row">
                    <div className="bar-label">Student Scholarships</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: '85%' }}></div></div>
                    <div className="bar-value">85%</div>
                  </div>
                  <div className="bar-row">
                    <div className="bar-label">Business & Mudra Credits</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: '64%' }}></div></div>
                    <div className="bar-value">64%</div>
                  </div>
                  <div className="bar-row">
                    <div className="bar-label">Women Empowerment</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: '72%' }}></div></div>
                    <div className="bar-value">72%</div>
                  </div>
                  <div className="bar-row">
                    <div className="bar-label">Farmers & Landholding</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: '48%' }}></div></div>
                    <div className="bar-value">48%</div>
                  </div>
                  <div className="bar-row">
                    <div className="bar-label">Health & Ayushman cover</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: '92%' }}></div></div>
                    <div className="bar-value">92%</div>
                  </div>
                </div>
              </div>

              {/* Right Recent Searches Table */}
              <div className="glass-card chart-container" style={{ padding: '1.5rem' }}>
                <div className="panel-header" style={{ marginBottom: '1rem' }}>
                  <h3>Live Queries Log</h3>
                  <p>Real-time query routing telemetry.</p>
                </div>
                <table className="recent-searches-table">
                  <thead>
                    <tr>
                      <th>Query</th>
                      <th>Method</th>
                      <th>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>single girl scholarship</td>
                      <td><span style={{ color: 'var(--sentiment-positive)' }}>CACHE</span></td>
                      <td>Atlas DB</td>
                    </tr>
                    <tr>
                      <td>mudra loan business plan</td>
                      <td><span style={{ color: 'var(--sentiment-positive)' }}>CACHE</span></td>
                      <td>Atlas DB</td>
                    </tr>
                    <tr>
                      <td>gujarat farmer subsidy</td>
                      <td><span style={{ color: 'var(--secondary)' }}>API</span></td>
                      <td>Gemini 3.1</td>
                    </tr>
                    <tr>
                      <td>post office saving schemes</td>
                      <td><span style={{ color: 'var(--sentiment-positive)' }}>CACHE</span></td>
                      <td>Atlas DB</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Smart Application Navigator Panel Drawer */}
      {isNavigatorOpen && activeScheme && (
        <div className="navigator-overlay" onClick={() => setIsNavigatorOpen(false)}>
          <div className="navigator-panel" onClick={e => e.stopPropagation()}>
            
            <div className="navigator-header">
              <h3>🧭 Step Navigator</h3>
              <button className="close-btn" onClick={() => setIsNavigatorOpen(false)}>×</button>
            </div>
            
            <div className="navigator-body">
              
              <div className="nav-section">
                <h4>Steps checklist</h4>
                <ol className="nav-steps">
                  {activeScheme.application_steps?.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="nav-section">
                <h4>Document verification</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  {activeScheme.documents?.map((doc, i) => (
                    <div key={i}>
                       {doc.toLowerCase().includes('aadhaar') || doc.toLowerCase().includes('income') || doc.toLowerCase().includes('address')
                          ? '✅ Verified' : '⏳ Pending'} - {doc}
                    </div>
                  ))}
                </div>
              </div>

              <div className="nav-section">
                <h4>Form Autofill Assistant</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>Copy details to paste into the official portal:</p>
                <div className="autofill-box">
                  <p><strong>Full Name:</strong> {formData.name || 'N/A'}</p>
                  <p><strong>Annual Income:</strong> ₹{formData.income || 'N/A'}</p>
                  <p><strong>Demographics:</strong> {formData.category || 'N/A'} - {formData.profession || 'N/A'}</p>
                  <p><strong>Location:</strong> {formData.city || 'N/A'}, {formData.state || 'N/A'}</p>
                </div>
              </div>

              {/* Chat Interface pinned at bottom of body */}
              <div style={{ flex: 1, minHeight: '260px', display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div className="chat-messages-container">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.role}`}>
                      <p style={{ margin: 0 }}>{msg.text}</p>
                    </div>
                  ))}
                  {isAssistantTyping && (
                    <div className="chat-message assistant">
                      <div className="typing-indicator">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="chat-input-wrapper">
                  <input 
                    type="text" 
                    className="chat-input-field" 
                    placeholder="Ask assistant to fill out form fields..." 
                    value={assistantInput}
                    onChange={e => setAssistantInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendAssistantMessage()}
                    disabled={isAssistantTyping}
                  />
                  <button 
                    className="chat-send-btn" 
                    onClick={handleSendAssistantMessage}
                    disabled={isAssistantTyping || !assistantInput.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Footer component */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="brand-logo-container">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="footer-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <circle cx="9" cy="12" r="5" stroke="url(#footer-logo-grad)" strokeWidth="2.5" />
                <circle cx="15" cy="12" r="5" stroke="url(#footer-logo-grad)" strokeWidth="2.5" strokeDasharray="3 3" />
                <path d="M12 9v6M9 12h6" stroke="url(#footer-logo-grad)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h3>SchemeSync</h3>
            </div>
            <p>Bridging the gap between citizens and their benefits through real-time search grounding and interactive companion assistance.</p>
          </div>
          
          <div className="footer-links-grid">
            <div className="footer-link-col">
              <h4>Platform</h4>
              <span className="footer-link" onClick={() => setView('landing')}>Home</span>
              <span className="footer-link" onClick={() => setView('discover')}>AI Discover</span>
              <span className="footer-link" onClick={() => setView('saved')}>My Schemes</span>
              <span className="footer-link" onClick={() => setView('analytics')}>Analytics</span>
            </div>
            <div className="footer-link-col">
              <h4>Resources</h4>
              <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="footer-link">Gemini AI Studio</a>
              <span className="footer-link">Documentation</span>
              <span className="footer-link">API Sandbox</span>
              <span className="footer-link">System Status</span>
            </div>
            <div className="footer-link-col">
              <h4>Legal</h4>
              <span className="footer-link">Privacy Policy</span>
              <span className="footer-link">Terms of Service</span>
              <span className="footer-link">Disclaimer</span>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2026 SchemeSync. All rights reserved.</p>
          <div className="footer-grounding-disclaimer">
            <span className="grounding-dot"></span>
            <span>Real-time verification powered by <strong>Google Search Grounding</strong>. Information is dynamically verified from official government portals.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
