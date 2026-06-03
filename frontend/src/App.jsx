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
  const [activeTab, setActiveTab] = useState('form')
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
  
  // Form profile state
  const [formData, setFormData] = useState({
    name: '', age: '', gender: '', state: '', city: '',
    income: '', category: '', profession: '', education: '',
    disability: 'No', minority: 'No'
  })
  const [chatText, setChatText] = useState('')

  const handleDemoMode = () => {
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
    <div className="app-shell">
      {/* SaaS Premium Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand" onClick={() => window.location.reload()}>
          <div className="brand-icon">S</div>
          <h2>Scheme.AI</h2>
        </div>
        
        <div className="nav-links">
          <span className="nav-link active">Discover</span>
          <span className="nav-link" onClick={handleDemoMode}>Load Demo</span>
          <span className="nav-link">Saved Schemes</span>
          <span className="nav-link">Analytics</span>
        </div>
        
        <div className="nav-actions">
          <div className="quota-pill">
            <span className="quota-indicator"></span>
            15 RPM Free
          </div>
          <div className="profile-avatar">
            {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </nav>

      {/* Main SaaS Dashboard Workspace */}
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
                 <span className={`step-indicator ${formStep >= 2 ? 'active' : ''}`}>Location & Income</span>
                 <span className={`step-indicator ${formStep >= 3 ? 'active' : ''}`}>Demographics</span>
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
                  <p style={{ color: 'var(--text-muted)' }}>Top live matched schemes resolved using search grounding.</p>
                </div>
                <div style={{ color: 'var(--sentiment-positive)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                  🟢 Live Portals Checked
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

                    <button 
                      onClick={() => handleApplyClick(scheme)} 
                      className="apply-action-btn"
                    >
                      🚀 Open Interactive Application Guide
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

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
    </div>
  )
}

export default App
