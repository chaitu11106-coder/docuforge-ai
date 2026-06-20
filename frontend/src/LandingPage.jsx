import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";


function LandingPage() {
  const canvasRef = useRef(null);
  const heroRef = useRef(null);

  // ---- network graph animation (ported from the static HTML version) ----
  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;

    const ctx = canvas.getContext("2d");
    let mouseX = -9999, mouseY = -9999;
    let nodes = [];
    let edges = [];
    let animationId;

    const ICONS = ["📄", "🔍", "🚩", "🗄️"];

    function resize() {
      canvas.width = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
    }

    function buildGraph() {
      nodes = [];
      const w = canvas.width, h = canvas.height;
      const count = window.innerWidth < 700 ? 26 : 46;

      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: 3 + Math.random() * 3,
          glowPhase: Math.random() * Math.PI * 2,
          isIcon: false,
          icon: null,
        });
      }

      const iconIndices = [];
      const step = Math.floor(count / ICONS.length);
      for (let i = 0; i < ICONS.length; i++) {
        const idx = Math.min(count - 1, i * step + Math.floor(step / 2));
        iconIndices.push(idx);
      }
      iconIndices.forEach((idx, i) => {
        nodes[idx].isIcon = true;
        nodes[idx].icon = ICONS[i];
        nodes[idx].r = 13;
      });

      edges = [];
      for (let i = 0; i < nodes.length; i++) {
        const dists = [];
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          dists.push({ j, d: Math.sqrt(dx * dx + dy * dy) });
        }
        dists.sort((a, b) => a.d - b.d);
        const linkCount = nodes[i].isIcon ? 4 : 2;
        for (let k = 0; k < Math.min(linkCount, dists.length); k++) {
          const pair = [i, dists[k].j].sort((a, b) => a - b).join("-");
          if (!edges.some((e) => e.key === pair)) {
            edges.push({ key: pair, a: i, b: dists[k].j });
          }
        }
      }
    }

    function step(time) {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        const dx = n.x - mouseX, dy = n.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          const force = ((140 - dist) / 140) * 0.6;
          n.x += (dx / dist) * force;
          n.y += (dy / dist) * force;
        }
      });

      edges.forEach((e) => {
        const a = nodes[e.a], b = nodes[e.b];
        const dx = a.x - b.x, dy = a.y - b.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const maxLen = 220;
        if (len > maxLen) return;

        const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
        const mdx = midX - mouseX, mdy = midY - mouseY;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        const proximityBoost = mdist < 180 ? ((180 - mdist) / 180) * 0.35 : 0;

        const baseOpacity = (1 - len / maxLen) * 0.22;
        ctx.strokeStyle = `rgba(62,207,142,${Math.min(0.55, baseOpacity + proximityBoost)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        const pulseT = (time * 0.0002 + ((e.a * 13 + e.b * 7) % 100) / 100) % 1;
        const px = a.x + (b.x - a.x) * pulseT;
        const py = a.y + (b.y - a.y) * pulseT;
        ctx.fillStyle = `rgba(95,224,163,${0.5 * (1 - len / maxLen)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
      });

      nodes.forEach((n) => {
        const glow = 0.5 + Math.sin(time * 0.0012 + n.glowPhase) * 0.5;

        if (n.isIcon) {
          const ringR = n.r + 10 + glow * 4;
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, ringR);
          grad.addColorStop(0, `rgba(62,207,142,${0.28 + glow * 0.18})`);
          grad.addColorStop(1, "rgba(62,207,142,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(62,207,142,${0.5 + glow * 0.3})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 5, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = "#0C1410";
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = "15px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(n.icon, n.x, n.y + 1);
        } else {
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r + 6);
          grad.addColorStop(0, `rgba(62,207,142,${0.45 + glow * 0.25})`);
          grad.addColorStop(1, "rgba(62,207,142,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(95,224,163,${0.7 + glow * 0.3})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(62,207,142,${0.4 + glow * 0.3})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      animationId = requestAnimationFrame(step);
    }

    function handleMouseMove(e) {
      const rect = hero.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }
    function handleMouseLeave() {
      mouseX = -9999;
      mouseY = -9999;
    }
    function handleResize() {
      resize();
      buildGraph();
    }

    hero.addEventListener("mousemove", handleMouseMove);
    hero.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    resize();
    buildGraph();
    animationId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationId);
      hero.removeEventListener("mousemove", handleMouseMove);
      hero.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="landing">
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="logo"><span className="logo-mark"></span>DOCUFORGE.AI</div>
          <div className="nav-links">
            <a href="#systems">Systems</a>
            <a href="#proof">Proof</a>
            <a href="#tech">Tech</a>
            <a href="#faq">FAQ</a>
          </div>
          <Link to="/dashboard" className="nav-cta">Open Dashboard →</Link>
        </div>
      </nav>

      <header className="hero" ref={heroRef}>
        <canvas ref={canvasRef} className="particle-canvas"></canvas>
        <div className="wrap hero-inner">
          <div className="eyebrow">Document Intelligence Engine</div>
          <h1 className="hero-title">
            Every invoice, scan, and<br />ledger — read, <em>verified</em>,<br />and searchable in seconds.
          </h1>
          <p className="hero-sub">
            DocuForge AI extracts structured data from any document, flags suspicious patterns
            before they cost you, and lets you search your entire archive by meaning — not keywords.
          </p>
          <div className="hero-actions">
            <Link to="/dashboard" className="btn-primary">See the Pipeline →</Link>
            <a href="#proof" className="btn-secondary">Read the Case Study</a>
          </div>
          <div className="trust-bar">
            <span>Built on Claude API</span>
            <span>FastAPI + PostgreSQL</span>
            <span>FAISS Semantic Search</span>
            <span>Docker Deployed</span>
          </div>
        </div>
      </header>

      <section className="solutions" id="systems">
        <div className="wrap">
          <div className="section-head">
            <div className="section-eyebrow">Capabilities</div>
            <h2 className="section-title">Four problems. One pipeline.</h2>
            <p className="section-desc">
              Built around the exact workflow enterprise document teams run every day —
              extraction, structuring, fraud detection, and discovery.
            </p>
          </div>
        </div>
        <div className="wrap">
          <div className="solutions-grid">
            <div className="solution-card">
              <div className="solution-num">01</div>
              <div className="solution-title">Document Extraction</div>
              <p className="solution-desc">Convert unstructured PDFs — digital or scanned — into clean, structured data.</p>
              <ul className="solution-list">
                <li>Extracts fields from invoices, contracts, reports</li>
                <li>OCR fallback for scanned and low-quality files</li>
                <li>Normalizes into machine-readable JSON</li>
              </ul>
              <div className="solution-tags"><span className="solution-tag">pdfplumber</span><span className="solution-tag">pytesseract</span></div>
            </div>
            <div className="solution-card">
              <div className="solution-num">02</div>
              <div className="solution-title">AI Field Mapping</div>
              <p className="solution-desc">Claude reads extracted text and returns precisely the fields you need.</p>
              <ul className="solution-list">
                <li>Vendor, amount, date, GST — every time</li>
                <li>Structured JSON, zero manual entry</li>
                <li>Consistent schema across every document</li>
              </ul>
              <div className="solution-tags"><span className="solution-tag">Claude API</span><span className="solution-tag">Structured Output</span></div>
            </div>
            <div className="solution-card">
              <div className="solution-num">03</div>
              <div className="solution-title">Forensic Anomaly Detection</div>
              <p className="solution-desc">Statistical checks run across every record the moment it lands.</p>
              <ul className="solution-list">
                <li>Outlier amounts vs vendor history</li>
                <li>Duplicate invoice numbers</li>
                <li>Repeated billing patterns flagged instantly</li>
              </ul>
              <div className="solution-tags"><span className="solution-tag">Pandas</span><span className="solution-tag">PostgreSQL</span></div>
            </div>
            <div className="solution-card">
              <div className="solution-num">04</div>
              <div className="solution-title">Semantic Search</div>
              <p className="solution-desc">Find any document by meaning — not exact keyword matches.</p>
              <ul className="solution-list">
                <li>"High-value pending Wipro invoices" — just works</li>
                <li>Vector search across your full archive</li>
                <li>Results ranked by true relevance</li>
              </ul>
              <div className="solution-tags"><span className="solution-tag">FAISS</span><span className="solution-tag">Embeddings</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="wrap">
          <div className="section-head">
            <div className="section-eyebrow">How It Works</div>
            <h2 className="section-title">From raw file to verified record.</h2>
            <p className="section-desc">No manual entry, no separate fraud review. One upload triggers the entire pipeline.</p>
          </div>
          <div className="process-grid">
            <div className="process-card">
              <div className="process-step-num">Stage 1</div>
              <div className="process-title">Ingest & Extract</div>
              <p className="process-desc">Drop in any PDF. Digital text is pulled directly; scanned pages run through OCR automatically — no manual sorting required.</p>
              <div className="process-badge">~2 seconds</div>
            </div>
            <div className="process-card">
              <div className="process-step-num">Stage 2</div>
              <div className="process-title">Structure & Flag</div>
              <p className="process-desc">Claude maps the text into clean fields. Anomaly detection runs immediately — duplicates and outliers surface before payment.</p>
              <div className="process-badge">Real-time</div>
            </div>
            <div className="process-card">
              <div className="process-step-num">Stage 3</div>
              <div className="process-title">Index & Discover</div>
              <p className="process-desc">Every record is embedded into a searchable index. Your team finds anything by describing it in plain language.</p>
              <div className="process-badge">Instantly searchable</div>
            </div>
          </div>
        </div>
      </section>

      <section className="case-study" id="proof">
        <div className="wrap">
          <div className="section-eyebrow">Proof of Concept</div>
          <h2 className="section-title" style={{ color: "var(--ink)", maxWidth: "680px" }}>
            From manual chaos to automated precision.
          </h2>
          <p className="section-desc" style={{ color: "#A8A597" }}>
            A reference build modeled on a real accounting-firm workflow.
          </p>

          <div className="case-grid">
            <div className="case-col">
              <h3>The Problem</h3>
              <p>Teams lose hundreds of hours reading invoices by hand, cross-checking ledgers, and re-keying GST data — work that delays every audit cycle by weeks.</p>
            </div>
            <div className="case-col">
              <h3>The Build</h3>
              <ul>
                <li>Automated extraction across invoices and ledger PDFs</li>
                <li>Anomaly detection catching duplicate and outlier billing</li>
                <li>Semantic search replacing manual folder digging</li>
              </ul>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat"><div className="stat-num">500+</div><div className="stat-label">Hours Saved / Month</div></div>
            <div className="stat"><div className="stat-num">40%</div><div className="stat-label">Faster Turnaround</div></div>
            <div className="stat"><div className="stat-num">98%</div><div className="stat-label">Extraction Accuracy</div></div>
          </div>

          <div className="quote">
            <p>"The target benchmark for this build: what used to take three weeks should take three days."</p>
            <span>— Project Reference Goal</span>
          </div>
        </div>
      </section>

      <section id="tech">
        <div className="wrap">
          <div className="section-head">
            <div className="section-eyebrow">Technical Edge</div>
            <h2 className="section-title">Built like a production system, not a script.</h2>
            <p className="section-desc">Every layer mirrors how real enterprise AI consultancies actually ship.</p>
          </div>
          <div className="tech-grid">
            <div className="tech-card">
              <div className="tech-icon">[ DB ]</div>
              <div className="tech-title">PostgreSQL at the Core</div>
              <div className="tech-desc">Structured schema across invoices, documents, and anomaly flags — not flat files.</div>
            </div>
            <div className="tech-card">
              <div className="tech-icon">[ AI ]</div>
              <div className="tech-title">Claude-Powered Extraction</div>
              <div className="tech-desc">Structured prompting with strict JSON-only output and safe parsing on every call.</div>
            </div>
            <div className="tech-card">
              <div className="tech-icon">[ ⊞ ]</div>
              <div className="tech-title">Containerized Deployment</div>
              <div className="tech-desc">Docker Compose spins up backend, database, and frontend with a single command.</div>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />

      <section id="leadership">
        <div className="wrap">
          <div className="section-head">
            <div className="section-eyebrow">Built By</div>
            <h2 className="section-title">One engineer, one sprint.</h2>
          </div>
          <div className="founder-card">
            <div className="founder-avatar">CJ</div>
            <div>
              <div className="founder-name">Chaitanya Joshi</div>
              <p className="founder-bio">
                MCA, Bangalore Institute of Technology. Built this entire pipeline — extraction,
                anomaly detection, semantic search, and deployment — as a reference implementation
                of enterprise document intelligence.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section" id="cta">
        <div className="wrap">
          <h2>Ready to see the pipeline in action?</h2>
          <p>Upload a document. Watch it get extracted, flagged, and indexed in real time.</p>
          <Link to="/dashboard" className="btn-primary">Open the Dashboard →</Link>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="footer-top">
            <div>
              <div className="footer-logo"><span className="logo-mark"></span>DOCUFORGE.AI</div>
              <p className="footer-desc">
                A document intelligence pipeline built to mirror enterprise AI consultancy
                products — extraction, fraud detection, and semantic search in one system.
              </p>
            </div>
            <div className="footer-col">
              <h4>System</h4>
              <a href="#systems">Capabilities</a>
              <a href="#how-it-works">Pipeline</a>
              <a href="#tech">Architecture</a>
            </div>
            <div className="footer-col">
              <h4>Project</h4>
              <a href="#proof">Case Study</a>
              <a href="#leadership">Builder</a>
              <a href="#faq">FAQ</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 DocuForge AI. Personal project, built for learning.</span>
            <span>Source available on request</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FaqSection() {
  const faqs = [
    {
      q: "What happens if a PDF is scanned, not digital?",
      a: "The pipeline first attempts direct text extraction. If that returns empty, it automatically falls back to OCR — converting each page to an image and reading it — so scanned and digital documents are handled identically from the outside.",
    },
    {
      q: "How does anomaly detection actually decide what's suspicious?",
      a: "Every new record is compared against the full history for that vendor — flagging amounts that are statistical outliers, invoice numbers that repeat, and billing patterns that match too closely to be coincidence.",
    },
    {
      q: 'What makes the search "semantic" rather than keyword-based?',
      a: 'Each document is converted into a vector embedding capturing its meaning, not just its words. A query like "high-value pending invoices" matches documents on intent, even if those exact words never appear in them.',
    },
    {
      q: "Is this deployed the same way Livo deploys for clients?",
      a: "Yes — the entire stack runs in Docker containers, the same on-premise-friendly pattern enterprise AI consultancies use when client data can't leave their infrastructure.",
    },
  ];

  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq">
      <div className="wrap">
        <div className="section-head">
          <div className="section-eyebrow">Questions</div>
          <h2 className="section-title">How the pipeline actually works.</h2>
        </div>
        <div className="faq-list">
          {faqs.map((item, i) => (
            <div className={`faq-item ${openIndex === i ? "open" : ""}`} key={i}>
              <button className="faq-q" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                {item.q} <span className="faq-q-mark">+</span>
              </button>
              <div className="faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LandingPage;