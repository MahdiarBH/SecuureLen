import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ShieldCheck, Search, Plus, Download, LogOut, RefreshCw, X, Pencil, Trash2, Shield, ChevronDown } from 'lucide-react'

const API = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
const severities = ['critical', 'high', 'medium', 'low', 'info']
const statuses = ['open', 'in_progress', 'resolved', 'accepted']
const emptyForm = { title: '', asset: '', severity: 'medium', status: 'open', cvss_score: '', description: '', recommendation: '' }
const human = (s='') => s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())

async function api(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try { const data = await response.json(); message = Object.values(data).flat().join(' ') || message } catch {}
    throw new Error(message)
  }
  if (response.status === 204) return null
  const type = response.headers.get('content-type') || ''
  return type.includes('application/json') ? response.json() : response.blob()
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      if (mode === 'register') await api('/auth/register/', null, { method: 'POST', body: JSON.stringify({ username, password }) })
      const tokens = await api('/auth/token/', null, { method: 'POST', body: JSON.stringify({ username, password }) })
      onAuth({ ...tokens, username })
    } catch (err) { setError(err.message || 'Unable to sign in') } finally { setBusy(false) }
  }
  return <div className="auth-wrap"><div className="auth-card">
    <div className="brand-mark"><Shield size={23}/></div><p className="eyebrow">SECURITY OPERATIONS</p><h1>Welcome to <span>SecureLens</span></h1>
    <p className="muted">Track findings. Prioritize risk. Keep remediation moving.</p>
    <form onSubmit={submit} className="auth-form">
      <label>Username<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} minLength="3" required placeholder="your_username"/></label>
      <label>Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength="8" required placeholder="At least 8 characters"/></label>
      {error && <div className="error">{error}</div>}
      <button className="primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
    </form>
    <button className="text-button" onClick={()=>{setMode(mode === 'login' ? 'register' : 'login'); setError('')}}>{mode === 'login' ? 'New to SecureLens? Create an account' : 'Already registered? Sign in'}</button>
    <p className="fine-print">For authorized security work only. No automated scanning is performed.</p>
  </div></div>
}

function FindingModal({ initial, onClose, onSave, saving }) {
  const [form, setForm] = useState(initial || emptyForm)
  const [error, setError] = useState('')
  function change(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }
  async function submit(e) {
    e.preventDefault(); setError('')
    try { await onSave({ ...form, cvss_score: form.cvss_score === '' ? null : Number(form.cvss_score) }) }
    catch (err) { setError(err.message || 'Could not save finding') }
  }
  return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget && onClose()}><section className="modal">
    <div className="modal-head"><div><p className="eyebrow">FINDING DETAILS</p><h2>{initial?.id ? 'Edit finding' : 'New finding'}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19}/></button></div>
    <form onSubmit={submit} className="finding-form">
      <label>Title<input name="title" value={form.title} onChange={change} required maxLength="180" placeholder="e.g. Missing security header"/></label>
      <label>Asset / application<input name="asset" value={form.asset} onChange={change} required maxLength="255" placeholder="app.example.test"/></label>
      <div className="form-grid">
        <label>Severity<select name="severity" value={form.severity} onChange={change}>{severities.map(s=><option key={s} value={s}>{human(s)}</option>)}</select></label>
        <label>Status<select name="status" value={form.status} onChange={change}>{statuses.map(s=><option key={s} value={s}>{human(s)}</option>)}</select></label>
      </div>
      <label>CVSS score <span className="optional">(optional, 0–10)</span><input name="cvss_score" type="number" min="0" max="10" step="0.1" value={form.cvss_score ?? ''} onChange={change} placeholder="e.g. 7.5"/></label>
      <label>Description<textarea name="description" value={form.description} onChange={change} rows="3" placeholder="What was observed? Avoid including secrets or sensitive personal data."/></label>
      <label>Recommendation<textarea name="recommendation" value={form.recommendation} onChange={change} rows="3" placeholder="Suggested remediation"/></label>
      {error && <div className="error">{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save finding'}</button></div>
    </form>
  </section></div>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [findings, setFindings] = useState([])
  const [stats, setStats] = useState(null)
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('all')
  const [status, setStatus] = useState('all')
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (s=session) => {
    if (!s?.access) return
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (severity !== 'all') params.set('severity', severity)
      if (status !== 'all') params.set('status', status)
      const [list, summary] = await Promise.all([
        api(`/findings/?${params.toString()}`, s.access),
        api('/findings/stats/', s.access),
      ])
      setFindings(list.results || list)
      setStats(summary)
    } catch (err) {
      if (String(err.message).includes('401')) setError('Your session may have expired. Please sign in again.')
      else setError(err.message || 'Could not load data')
    } finally { setLoading(false) }
  }, [session, search, severity, status])

  useEffect(() => { if (session) load(session) }, [session, search, severity, status, load])
  // Keep access tokens in memory only; a page refresh requires signing in again.

  async function saveFinding(form) {
    setBusy(true)
    try {
      const editing = Boolean(form.id)
      await api(editing ? `/findings/${form.id}/` : '/findings/', session.access, {
        method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form),
      })
      setModal(null); setNotice(editing ? 'Finding updated.' : 'Finding created.')
      await load(session)
    } finally { setBusy(false) }
  }
  async function deleteFinding(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    try { await api(`/findings/${item.id}/`, session.access, { method: 'DELETE' }); setNotice('Finding deleted.'); await load(session) }
    catch (err) { setError(err.message) }
  }
  async function exportCsv() {
    try {
      const blob = await api('/findings/export_csv/', session.access)
      const url = URL.createObjectURL(blob); const a = document.createElement('a')
      a.href = url; a.download = 'securelens-findings.csv'; a.click(); URL.revokeObjectURL(url)
    } catch (err) { setError(err.message) }
  }
  function logout() { setSession(null); setFindings([]); setStats(null); setError(''); setNotice('') }

  if (!session) return <Auth onAuth={setSession}/>
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Shield size={21}/></div><span>Secure<span>Lens</span></span></div>
      <div className="workspace"><div className="workspace-icon">SL</div><div><strong>Security workspace</strong><small>Personal environment</small></div><ChevronDown size={15}/></div>
      <p className="nav-label">WORKSPACE</p><div className="nav-item active"><Activity size={17}/> Overview</div>
      <div className="nav-item"><AlertTriangle size={17}/> Findings <span className="nav-count">{stats?.total ?? 0}</span></div>
      <div className="sidebar-bottom"><div className="user-row"><div className="avatar">{session.username?.slice(0,1).toUpperCase()}</div><div className="user-meta"><strong>{session.username}</strong><small>Workspace member</small></div><button className="icon-btn" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button></div><div className="version">SECURELENS • PORTFOLIO BUILD</div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><p className="eyebrow">OVERVIEW / SECURITY</p><h1>Findings dashboard</h1></div><div className="top-actions"><span className="live-dot">Workspace active</span><button className="secondary" onClick={()=>load()}><RefreshCw size={15}/> Refresh</button><button className="primary" onClick={()=>setModal(emptyForm)}><Plus size={17}/> New finding</button></div></header>
      <div className="intro"><div><h2>Good to see you, {session.username}.</h2><p>Review risk, track remediation, and keep your security work organized.</p></div><button className="secondary" onClick={exportCsv}><Download size={16}/> Export CSV</button></div>
      {error && <div className="banner error-banner">{error}<button onClick={()=>setError('')}><X size={16}/></button></div>}
      {notice && <div className="banner success-banner">{notice}<button onClick={()=>setNotice('')}><X size={16}/></button></div>}
      <section className="metrics">
        <Metric icon={<Activity/>} label="Total findings" value={stats?.total ?? '—'} note="All recorded findings" />
        <Metric icon={<AlertTriangle/>} label="Open findings" value={stats?.open ?? '—'} note="Awaiting remediation" accent="amber"/>
        <Metric icon={<Shield/>} label="Critical severity" value={stats?.critical ?? '—'} note="Requires urgent review" accent="red"/>
        <Metric icon={<ShieldCheck/>} label="Resolved" value={stats?.resolved ?? '—'} note="Marked as resolved" accent="green"/>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Security findings</h2><p>Manage and prioritize manually recorded issues.</p></div><span className="result-count">{findings.length} shown</span></div>
        <div className="filters"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title, asset, description…"/></div>
          <select aria-label="Filter by severity" value={severity} onChange={e=>setSeverity(e.target.value)}><option value="all">All severities</option>{severities.map(s=><option key={s} value={s}>{human(s)}</option>)}</select>
          <select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{statuses.map(s=><option key={s} value={s}>{human(s)}</option>)}</select>
        </div>
        <div className="table-wrap"><table><thead><tr><th>Finding</th><th>Severity</th><th>Status</th><th>CVSS</th><th>Last updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="6" className="empty-state">Loading findings…</td></tr> : findings.length ? findings.map(item=><tr key={item.id}>
            <td><div className="finding-title">{item.title}</div><div className="asset">{item.asset}</div></td>
            <td><span className={`pill severity-${item.severity}`}>{item.severity}</span></td>
            <td><span className={`pill status-${item.status}`}>{human(item.status)}</span></td>
            <td className="cvss">{item.cvss_score ?? '—'}</td><td className="date">{new Date(item.updated_at).toLocaleDateString()}</td>
            <td><div className="row-actions"><button className="icon-btn" title="Edit" aria-label={`Edit ${item.title}`} onClick={()=>setModal(item)}><Pencil size={15}/></button><button className="icon-btn danger-hover" title="Delete" aria-label={`Delete ${item.title}`} onClick={()=>deleteFinding(item)}><Trash2 size={15}/></button></div></td>
          </tr>) : <tr><td colSpan="6" className="empty-state"><div className="empty-icon"><ShieldCheck size={25}/></div><strong>No findings found</strong><p>Create your first finding or adjust the filters.</p><button className="primary" onClick={()=>setModal(emptyForm)}><Plus size={16}/> Add finding</button></td></tr>}</tbody>
        </table></div>
        <div className="panel-foot"><span>Data is scoped to your account.</span><span>Findings are entered manually; no scanning runs in the background.</span></div>
      </section>
      <footer className="footer"><span>© {new Date().getFullYear()} SecureLens</span><span><span className="footer-dot"/> API connected when data loads successfully</span></footer>
    </main>
    {modal && <FindingModal initial={modal.id ? modal : null} onClose={()=>setModal(null)} onSave={saveFinding} saving={busy}/>}
  </div>
}

function Metric({ icon, label, value, note, accent='' }) {
  return <div className="metric-card"><div className={`metric-icon ${accent}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>
}
