import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookOpen, Bot, Check, ChevronDown, Clock3, ExternalLink,
  FileText, Globe2, History, LayoutDashboard, Menu, MessageSquare, Plus,
  Search, Send, Sparkles, Target, X, Zap,
} from "lucide-react";
import { api } from "./api";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "sources", label: "Sources", icon: Globe2 },
  { id: "summary", label: "Synthesis", icon: Sparkles },
  { id: "chat", label: "Ask Lattice", icon: MessageSquare },
];
const examples = [
  "How is generative AI changing scientific discovery?",
  "What are the latest approaches to sustainable aviation fuel?",
  "Compare current open-source vector databases",
];
const initials = (title = "") => title.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "RS";
function timeAgo(value) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function App() {
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(8);
  const [searchResult, setSearchResult] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focus, setFocus] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatCitations, setChatCitations] = useState([]);
  const currentId = searchResult?.search_id;
  const scraped = useMemo(() => searchResult?.sources?.filter((source) => source.scraped).length || 0, [searchResult]);

  useEffect(() => {
    Promise.allSettled([api.health(), api.history()]).then(([healthResult, historyResult]) => {
      if (healthResult.status === "fulfilled") setHealth(healthResult.value);
      if (historyResult.status === "fulfilled") setHistory(historyResult.value.items || []);
    });
  }, []);

  async function runSearch(event) {
    event?.preventDefault();
    if (query.trim().length < 3) return setError("Enter a research question with at least 3 characters.");
    setError(""); setLoading("search"); setSummary(null); setMessages([]);
    try {
      const result = await api.search(query.trim(), maxResults);
      setSearchResult(result);
      setHistory((items) => [{
        search_id: result.search_id, query: result.query, created_at: result.created_at,
        total_sources: result.total_sources,
        scraped_sources: result.sources.filter((source) => source.scraped).length,
      }, ...items.filter((item) => item.search_id !== result.search_id)]);
      setTab("sources");
    } catch (err) { setError(err.message); }
    finally { setLoading(""); }
  }

  async function generateSummary() {
    if (!currentId) return setError("Start a research session first.");
    setError(""); setLoading("summary");
    try { setSummary(await api.summary(currentId, focus)); setTab("summary"); }
    catch (err) { setError(err.message); }
    finally { setLoading(""); }
  }

  async function sendMessage(event) {
    event?.preventDefault();
    if (!chatInput.trim() || !currentId || loading) return;
    const message = chatInput.trim();
    setChatInput(""); setError(""); setMessages((items) => [...items, { role: "user", content: message }]); setLoading("chat");
    try {
      const result = await api.chat(currentId, message);
      setMessages(result.history); setChatCitations(result.citations || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(""); }
  }

  function openHistory(item, destination = "overview") {
    setSearchResult({ search_id: item.search_id, query: item.query, created_at: item.created_at,
      total_sources: item.total_sources, sources: [] });
    setSummary(null); setMessages([]); setQuery(item.query); setTab(destination); setSidebarOpen(false);
  }
  function newResearch() {
    setSearchResult(null); setSummary(null); setMessages([]); setQuery(""); setTab("overview"); setSidebarOpen(false);
  }

  return <div className="app-shell">
    <div className={`scrim ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} />
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div>
        <div><strong>Lattice</strong><span>RESEARCH OS</span></div>
        <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
      </div>
      <button className="new-research" onClick={newResearch}><Plus size={17} /> New research</button>
      <nav className="side-nav"><p>Workspace</p>
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><LayoutDashboard size={18} /> Dashboard</button>
        <button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}><Bot size={18} /> AI assistant</button>
      </nav>
      <div className="recent"><div className="section-label"><span>Recent research</span><History size={15} /></div>
        <div className="recent-list">{history.length ? history.slice(0, 7).map((item) =>
          <button key={item.search_id} className={item.search_id === currentId ? "active" : ""} onClick={() => openHistory(item)}>
            <span className="recent-dot" /><span><strong>{item.query}</strong>
            <small>{timeAgo(item.created_at)} · {item.scraped_sources}/{item.total_sources} sources</small></span>
          </button>) : <p className="empty-side">Your research sessions will appear here.</p>}</div>
      </div>
      <div className="sidebar-footer"><div className={`status-dot ${health ? "online" : ""}`} />
        <span><strong>{health ? "Systems online" : "Backend offline"}</strong><small>{health ? `API v${health.version}` : "Check port 8000"}</small></span>
      </div>
    </aside>

    <main className="main"><header className="topbar">
      <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
      <div className="breadcrumbs"><span>Research workspace</span><b>/</b><strong>{searchResult?.query || "New inquiry"}</strong></div>
      <div className="top-actions"><div className="live-pill"><span /> Grounded AI</div></div>
    </header>
    <div className="content">
      {error && <div className="error-toast"><span>{error}</span><button onClick={() => setError("")}><X size={17} /></button></div>}
      <section className="hero"><div className="eyebrow"><Sparkles size={14} /> RESEARCH, SYNTHESIZED</div>
        <h1>Turn curiosity into<br /><em>clear intelligence.</em></h1>
        <p>Search the open web, synthesize trusted sources, and ask sharper follow-up questions—all in one focused workspace.</p>
        <form className="search-box" onSubmit={runSearch}>
          <div className="search-main"><Search size={21} /><input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to understand?" autoFocus /></div>
          <div className="search-footer"><label><Globe2 size={15} /> Search depth
            <select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))}>
              {[4, 6, 8, 10].map((number) => <option key={number} value={number}>{number} sources</option>)}
            </select><ChevronDown size={14} /></label>
            <button disabled={loading === "search"}>{loading === "search" ? <span className="spinner" /> : <ArrowRight size={18} />}</button>
          </div>
        </form>
        {!searchResult && <div className="suggestions"><span>Try asking</span>{examples.map((item) =>
          <button key={item} onClick={() => setQuery(item)}>{item}<ArrowRight size={13} /></button>)}</div>}
      </section>

      {searchResult ? <section className="workspace">
        <div className="workspace-heading"><div><span className="session-label">ACTIVE RESEARCH SESSION</span><h2>{searchResult.query}</h2>
          <p><Clock3 size={14} /> Started {timeAgo(searchResult.created_at)} <i /> {scraped || searchResult.total_sources} sources collected</p></div>
          <button className="primary-action" onClick={generateSummary} disabled={loading === "summary"}>
            {loading === "summary" ? <span className="spinner dark" /> : <Sparkles size={17} />} Synthesize research</button>
        </div>
        <div className="tabs">{tabs.map(({ id, label, icon: Icon }) =>
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={16} />{label}</button>)}</div>
        {tab === "overview" && <Overview result={searchResult} scraped={scraped} onTab={setTab} onSummary={generateSummary} />}
        {tab === "sources" && <Sources sources={searchResult.sources || []} />}
        {tab === "summary" && <SummaryPanel data={summary} focus={focus} setFocus={setFocus} generate={generateSummary} loading={loading} />}
        {tab === "chat" && <Chat messages={messages} value={chatInput} setValue={setChatInput} send={sendMessage}
          loading={loading === "chat"} citations={chatCitations} />}
      </section> : <FeatureStrip />}
    </div></main>
  </div>;
}

function FeatureStrip() {
  const features = [
    [Globe2, "Broad discovery", "Search and extract insight from relevant sources across the open web."],
    [Target, "Evidence first", "Every synthesis is grounded in retrieved passages you can inspect."],
    [MessageSquare, "Go deeper", "Ask follow-up questions without losing the context of your research."],
  ];
  return <section className="feature-strip">{features.map(([Icon, title, copy], index) =>
    <div className="feature" key={title}><span>0{index + 1}</span><Icon size={21} /><h3>{title}</h3><p>{copy}</p></div>)}</section>;
}

function Overview({ result, scraped, onTab, onSummary }) {
  return <div className="overview-grid">
    <div className="metric-card dark-card"><span>Research coverage</span><strong>{scraped || result.total_sources}<small> sources</small></strong>
      <div className="coverage-bar"><i style={{ width: `${Math.max(15, ((scraped || result.total_sources) / result.total_sources) * 100)}%` }} /></div>
      <p>{scraped ? `${scraped} successfully extracted` : "Session loaded from history"}</p></div>
    <button className="journey-card" onClick={() => onTab("sources")}><Globe2 size={20} /><span><b>01</b><strong>Review the evidence</strong>
      <small>Inspect collected sources and extracted content.</small></span><ArrowRight size={19} /></button>
    <button className="journey-card" onClick={onSummary}><Sparkles size={20} /><span><b>02</b><strong>Synthesize findings</strong>
      <small>Generate structured insights with citations.</small></span><ArrowRight size={19} /></button>
    <button className="journey-card" onClick={() => onTab("chat")}><MessageSquare size={20} /><span><b>03</b><strong>Interrogate the research</strong>
      <small>Ask contextual questions grounded in your sources.</small></span><ArrowRight size={19} /></button>
  </div>;
}

function Sources({ sources }) {
  if (!sources.length) return <Empty icon={Globe2} title="Source details aren't retained in history"
    copy="Run the search again to reload the full extracted source set." />;
  return <div className="sources-grid">{sources.map((source, index) =>
    <article className="source-card" key={`${source.url}-${index}`}>
      <div className="source-top"><span className="source-index">{String(index + 1).padStart(2, "0")}</span>
        <span className={`scrape-status ${source.scraped ? "good" : ""}`}>{source.scraped ? <Check size={12} /> : <X size={12} />}
          {source.scraped ? "EXTRACTED" : "PARTIAL"}</span></div>
      <div className="source-icon">{initials(source.title)}</div><h3>{source.title}</h3>
      <p>{source.snippet || source.content?.slice(0, 180) || "No preview available for this source."}</p>
      <div className="source-meta"><span><FileText size={14} />{source.word_count.toLocaleString()} words</span>
        <a href={source.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={14} /></a></div>
    </article>)}</div>;
}

function SummaryPanel({ data, focus, setFocus, generate, loading }) {
  if (!data) return <div className="summary-empty"><div className="summary-prompt"><Sparkles size={25} /><h3>Build your research synthesis</h3>
    <p>Optionally narrow the lens, then let Lattice retrieve the strongest evidence and organize it into clear findings.</p>
    <div><input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Optional focus, e.g. risks and limitations" />
      <button onClick={generate} disabled={loading === "summary"}>{loading === "summary" ? <span className="spinner dark" /> : "Generate synthesis"}</button></div></div></div>;
  const columns = [["Key insights", data.key_insights, Zap], ["Important facts", data.important_facts, BookOpen],
    ["Next actions", data.actionable_takeaways, Target]];
  return <div className="summary-content"><div className="executive-summary"><span>EXECUTIVE SYNTHESIS</span><h3>{data.query}</h3><p>{data.summary}</p></div>
    <div className="insight-grid">{columns.map(([title, items, Icon]) => <section key={title}><Icon size={18} /><h3>{title}</h3>
      <ul>{items.map((item, index) => <li key={index}><span>{index + 1}</span>{item}</li>)}</ul></section>)}</div>
    <div className="citations"><h3>Evidence trail <span>{data.citations.length}</span></h3>{data.citations.map((citation, index) =>
      <details key={index}><summary><span>[{index + 1}]</span><strong>{citation.source_title}</strong>
        <i>{Math.round(citation.relevance_score * 100)}% match</i><ChevronDown size={16} /></summary>
        <p>{citation.text}</p><a href={citation.source_url} target="_blank" rel="noreferrer">View original <ExternalLink size={13} /></a></details>)}</div>
  </div>;
}

function Chat({ messages, value, setValue, send, loading, citations }) {
  return <div className="chat-layout"><div className="chat-panel"><div className="chat-heading"><div><Bot size={19} /></div>
    <span><strong>Ask Lattice</strong><small>Answers grounded in this research session</small></span></div><div className="messages">
      {!messages.length && <div className="chat-welcome"><Sparkles size={22} /><h3>What would you like to understand?</h3>
        <p>Ask for comparisons, contradictions, implications, or a deeper explanation of any finding.</p></div>}
      {messages.map((message, index) => <div className={`message ${message.role}`} key={index}>
        <span>{message.role === "user" ? "You" : "AI"}</span><p>{message.content}</p></div>)}
      {loading && <div className="message assistant"><span>AI</span><p className="thinking"><i /><i /><i /></p></div>}</div>
    <form className="chat-input" onSubmit={send}><textarea value={value} onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
      placeholder="Ask a question about your research…" rows="1" /><button disabled={!value.trim() || loading}><Send size={17} /></button></form></div>
    <aside className="chat-evidence"><span>EVIDENCE IN LAST ANSWER</span>{citations.length ? citations.slice(0, 5).map((citation, index) =>
      <a href={citation.source_url} target="_blank" rel="noreferrer" key={index}><b>{index + 1}</b><span><strong>{citation.source_title}</strong>
        <small>{Math.round(citation.relevance_score * 100)}% relevance</small></span><ExternalLink size={13} /></a>)
      : <p>Source evidence will appear here after your first answer.</p>}</aside>
  </div>;
}

function Empty({ icon: Icon, title, copy }) {
  return <div className="empty-state"><Icon size={24} /><h3>{title}</h3><p>{copy}</p></div>;
}
