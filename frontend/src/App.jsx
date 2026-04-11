import { useState } from 'react'
import './index.css'

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
  
  // Navigator States
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [activeScheme, setActiveScheme] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', age: '', gender: '', state: '', city: '',
    income: '', category: '', profession: '', education: '',
    disability: 'No', minority: 'No'
  })
  const [chatText, setChatText] = useState('')

  const handleDemoMode = () => {
    setActiveTab('form')
    setFormStep(3) // Jump to end for demo mode
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

      const response = await fetch('http://localhost:5000/api/analyze', {
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
      setError("Failed to analyze. Make sure backend is running.")
    } finally {
      setLoading(false)
    }
  }

  const handleApplyClick = (scheme) => {
    setActiveScheme(scheme);
    setChatMessages([
      { role: 'assistant', text: `I am your Smart Navigator. I just opened the official site for ${scheme.name} in a new tab. If the site didn't load, let me know! How can I help you navigate the form?` }
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
      const response = await fetch('http://localhost:5000/api/apply-assistant', {
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
      setChatMessages([...newContext, { role: 'assistant', text: data.text }]);
    } catch (err) {
      console.error(err);
      setChatMessages([...newContext, { role: 'assistant', text: "Sorry, I'm having trouble connecting to the server." }]);
    } finally {
      setIsAssistantTyping(false);
    }
  };

  return (
    <div className="app-container">
      <header className="hero">
        <h1>Discover Every<br/>Scheme You Deserve</h1>
        <p>AI-powered government scheme matching. Personal. Private. Instant.</p>
      </header>

      <section className="input-section glass-card">
        {error && (
          <div className="eligibility-alert danger" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
            <strong>❌ Error:</strong>
            <p style={{ marginTop: '0.25rem' }}>{error}</p>
          </div>
        )}
        
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            📋 Guided Form
          </div>
          <div 
            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 AI Terminal (Text)
          </div>
        </div>

        {activeTab === 'form' ? (
          <div>
            <div className="wizard-progress">
               <span className={`step-indicator ${formStep >= 1 ? 'active' : ''}`}>1. Basics</span>
               <span className={`step-indicator ${formStep >= 2 ? 'active' : ''}`}>2. Finance</span>
               <span className={`step-indicator ${formStep >= 3 ? 'active' : ''}`}>3. Profile</span>
            </div>

            {formStep === 1 && (
              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Full Name</label>
                  <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rahul Kumar" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Age</label>
                  <input type="number" className="form-control" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} placeholder="e.g. 25" />
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
                  <select className="form-control" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}>
                    <option value="">Select State</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="UP">Uttar Pradesh</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Karnataka">Karnataka</option>
                    {/* Add more states natively or keep short for demo */}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>City / Town</label>
                  <input type="text" className="form-control" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="e.g. Ahmedabad" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Annual Family Income (₹)</label>
                  <input type="number" className="form-control" value={formData.income} onChange={e => setFormData({...formData, income: e.target.value})} placeholder="e.g. 300000" />
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
                  <input type="text" className="form-control" value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})} placeholder="e.g. 12th Pass, Graduate" />
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
                  {loading ? 'Analyzing...' : 'Submit to AI'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="chat-input-area">
            <label>Describe yourself via natural language:</label>
            <textarea 
              className="form-control chat-input" 
              placeholder="System Ready: Describe your age, income, state, and profession."
              value={chatText}
              onChange={e => setChatText(e.target.value)}
            ></textarea>
            
            <div className="wizard-footer" style={{ marginTop: '1rem', paddingTop: '1rem' }}>
              <div></div>
              <button className="btn" onClick={handleAnalyze} disabled={loading}>
                {loading ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </div>
          </div>
        )}

        {/* Global Demo Mode button sitting slightly detached at the bottom */}
        {activeTab === 'form' && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={handleDemoMode} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
              Load Sample Profile
            </button>
          </div>
        )}
      </section>

      {loading && <div className="loader"></div>}

      {results && results.length > 0 && (
        <section className="results-section">
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', borderBottom: '2px solid var(--text-main)', paddingBottom: '0.5rem' }}>AI Recommendations</h2>
          <div className="results-grid">
            {results.map((scheme, idx) => (
              <div key={idx} className="scheme-card glass-card">
                <div className="scheme-card-header">
                  <h3>{scheme.name}</h3>
                  {scheme.confidence_score && (
                    <span className="confidence-badge">{scheme.confidence_score}% Match</span>
                  )}
                </div>
                <p className="scheme-section" style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  {scheme.description}
                </p>
                
                {scheme.eligible !== false ? (
                  <div className="eligibility-alert success">
                    <strong>✅ ELIGIBLE</strong>
                    <p style={{ marginTop: '0.25rem' }}>{scheme.eligibility_reason}</p>
                  </div>
                ) : (
                  <div className="eligibility-alert danger">
                    <strong>❌ INELIGIBLE</strong>
                    <p style={{ marginTop: '0.25rem' }}>{scheme.ineligibility_reason}</p>
                  </div>
                )}

                <div className="scheme-section" style={{ marginTop: '1.5rem' }}>
                  <h4>Benefits</h4>
                  <p>{scheme.benefits}</p>
                </div>

                <div className="scheme-section">
                  <h4>Required Documents</h4>
                  <ul style={{ listStyleType: 'square' }}>
                    {scheme.documents?.map((doc, i) => <li key={i}>{doc}</li>)}
                  </ul>
                </div>

                <div className="scheme-section" style={{ flexGrow: 1 }}>
                  <h4>Application Process</h4>
                  <ol style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {scheme.application_steps?.map((step, i) => <li key={i}><strong>{step}</strong></li>)}
                  </ol>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto', paddingTop: '2rem' }}>
                  <button onClick={() => handleApplyClick(scheme)} className="btn help-apply-btn" style={{ background: 'var(--text-main)', color: 'white' }}>
                    👉 Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Smart Application Navigator Panel */}
      {isNavigatorOpen && activeScheme && (
        <div className="navigator-overlay" onClick={() => setIsNavigatorOpen(false)}>
          <div className="navigator-panel" onClick={e => e.stopPropagation()}>
            
            <div className="navigator-header">
              <h3>🧭 Navigator</h3>
              <button className="close-btn" onClick={() => setIsNavigatorOpen(false)}>×</button>
            </div>
            
            <div className="navigator-body">
              
              <div className="nav-section">
                <h4>Step-by-Step Guide</h4>
                <ol className="nav-steps">
                  {activeScheme.application_steps?.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="nav-section">
                <h4>Document Checklist</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                  {activeScheme.documents?.map((doc, i) => (
                    <div key={i}>
                       {/* Intelligent mock checklist */}
                       {doc.toLowerCase().includes('aadhaar') || doc.toLowerCase().includes('income') || doc.toLowerCase().includes('address')
                          ? '✅' : '⏳'} {doc}
                    </div>
                  ))}
                </div>
              </div>

              <div className="nav-section">
                <h4>Autofill Data</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>👉 Use these details while filling the form:</p>
                <div className="autofill-box">
                  <p><strong>Name:</strong> {formData.name || 'N/A'}</p>
                  <p><strong>Income:</strong> ₹{formData.income || 'N/A'}</p>
                  <p><strong>Category:</strong> {formData.category || 'N/A'}</p>
                </div>
              </div>

              {/* Chat Interface pinned at bottom of body */}
              <div style={{ flex: 1, minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
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
                    placeholder="Ask for help..." 
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
