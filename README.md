# OmniTrack — Interactive Cloud Operations & Analytics Dashboard

> **Yuva Intern: Junior Frontend Developer Internship**  
> **Week 5 Deliverable: Final Project Integration — Mini Web Application (Capstone)**  
> **Student Developer:** Ashish Ranjan Singh  
> **Target Repository:** [Yuva-Week5-Dashboard-App](https://github.com/ASHISH-7142023/Yuva-Week5-Dashboard-App)  
> **Status:** 100% Complete & Verified | Pure Vanilla Stack | WCAG 2.1 AA Accessible | Zero Dependencies

---

## 🌟 1. Executive Summary & Capstone Objective

**OmniTrack** is the final capstone deliverable for the **Junior Frontend Developer Internship** at Yuva Intern. It synthesizes all core frontend competencies mastered throughout the 5-week curriculum into a single, cohesive, production-grade cloud infrastructure monitoring dashboard:

- **Week 1 (Responsive Design):** Fluid 12-column CSS Grid & Flexbox layouts with an off-canvas mobile navigation drawer.
- **Week 2 (Interactive UI Components):** WAI-ARIA accessible modal dialogs with keyboard focus trapping, dynamic filter toolbars, and animated notification toasts.
- **Week 3 (UX & Accessibility):** Full WCAG 2.1 Level AA conformance, skip navigation links, high-contrast light/dark modes, 3px solid visible focus outlines, and `aria-live="polite"` screen reader announcements.
- **Week 4 (Frontend Performance):** Zero external framework dependencies, sub-millisecond DOM manipulation, optimized vector rendering, and zero layout shift (CLS: 0.000).

---

## 🏛️ 2. Architectural Blueprint & MVC Design Pattern

OmniTrack is engineered using a clean **Model-View-Controller (MVC)** client-side architecture without React, Vue, or heavy charting bundles:

```mermaid
graph TD
    Data[Static data.json Telemetry Store] -->|Async Fetch API| Store[State Store / Model]
    Store -->|State Mutations| Controller[App Controller (app.js)]
    Controller -->|Render Data Grid| TableView[Services Table DOM]
    Controller -->|Render SVG Telemetry| ChartView[Zero-Dependency SVG Chart]
    Controller -->|Render Executive KPIs| KpiView[KPI Cards]
    User[User Interactions: Search, Filter, Sort, Pagination, Theme] -->|Event Dispatch| Controller
    TableView -->|Row Click / Inspect| ModalView[WAI-ARIA Focus-Trapped Modal Dialog]
```

### State Store Structure (`app.js`):
```javascript
const state = {
  dataset: null,           // Ingested summary, metrics & 24 services
  filteredServices: [],    // Active filtered & sorted subset
  activeMetricChannel: 'requests', // 'requests' | 'latency' | 'cpu'
  filters: { search: '', category: 'all', region: 'all', status: 'all' },
  sort: { column: 'name', order: 'asc' },
  pagination: { currentPage: 1, pageSize: 8 },
  selectedService: null,   // Active record for modal inspection
  theme: 'dark'            // 'dark' | 'light' persisted in localStorage
};
```

---

## 🚀 3. Core Functional Capabilities

### 3.1. Executive KPI Metrics Cards
- High-level operational summary tracking **Monthly Cloud Spend (₹1,42,85,000 in INR)**, **128 Active Cluster Nodes**, **1 Critical Incident**, and **99.4% Global Efficiency Index**.
- Dynamic trend badges indicating period-over-period performance gains.

### 3.2. Custom Zero-Dependency SVG Chart Engine
- Mathematical vector rendering engine constructing smooth **cubic bezier splines** and gradient-filled area polygons on a responsive `1000 x 320` SVG canvas.
- Multi-metric channel switcher: dynamically toggles between **Requests / sec**, **Latency (ms)**, and **CPU Load (%)**.
- Interactive data node circles (`<circle>`) with coordinate-calculated hover tooltips and keyboard accessibility (`tabindex="0"`, `aria-label`).

### 3.3. Multi-Column Sortable & Filterable Data Grid
- Instant debounced search querying across service names, IDs, categories, regions, and architectural descriptions.
- Multi-dropdown categorical filtering for **Category** (Infrastructure, Database, Streaming, Security, Compute, Analytics), **Cloud Region** (Mumbai, Virginia, Oregon, Frankfurt, Tokyo), and **Health Status** (Healthy, Warning, Critical).
- Column header sorting with ascending (`↑`) and descending (`↓`) visual indicators synchronized with `aria-sort="ascending|descending"`.
- Client-side pagination controls with dynamic page button generation and configurable rows-per-page (8, 12, 24).

### 3.4. Accessible Modal Record Inspector (WCAG AA)
- Clicking any service record opens an accessible modal dialog (`role="dialog"`, `aria-modal="true"`).
- Features a strict keyboard focus trap (`Tab`/`Shift+Tab`) and `Escape` key dismissal.
- Restores focus to the triggering element upon closure.
- Displays full operational telemetry, architecture roles, incident history, and provides interactive "Reboot Service Node" actions with toast feedback.

### 3.5. Dark / Light Theme Ergonomics
- Seamless theme toggle between a futuristic dark cockpit (`#0b0f19`) and a high-contrast corporate light theme (`#f8fafc`).
- Preferences are automatically stored in browser `localStorage`.

---

## 📁 4. Project Directory Structure

```
week-05-dashboard-app/
├── index.html                   # Accessible Semantic HTML5 dashboard shell
├── dashboard.css                # Pure Vanilla CSS3 design system (Grid, Flexbox, Themes)
├── app.js                       # Vanilla ES6 MVC controller, SVG chart engine, modal manager
├── data.json                    # Structured telemetry dataset (24 microservices across 5 regions)
├── submission_description.txt   # Verified >300 words description for internship portal
├── README.md                    # Comprehensive technical documentation (this file)
└── report/
    └── report_week5.docx        # Professional Microsoft Word capstone project report
```

---

## 💻 5. Running Locally

To inspect and test the dashboard on your local machine:

```bash
# Clone the repository
git clone https://github.com/ASHISH-7142023/Yuva-Week5-Dashboard-App.git

# Navigate into the project directory
cd Yuva-Week5-Dashboard-App

# Start a local HTTP server (Python 3)
python -m http.server 8084

# Open your browser at
# http://localhost:8084/
```

---

## 🎓 6. Author Information

- **Student Intern:** Ashish Ranjan Singh
- **Internship Program:** Yuva Intern — Junior Frontend Developer Internship
- **Term:** 07-Jul-2026 to 11-Aug-2026
- **Deliverable:** Week 5 Final Project Integration — Mini Web Application (Capstone)
- **GitHub:** [@ASHISH-7142023](https://github.com/ASHISH-7142023)
