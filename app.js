// ---------- Analytics Helper ----------
function trackEvent(name, params = {}) {
  if (typeof gtag === "function") {
    gtag('event', name, params);
  }
}

// ---------- Main Logic ----------
function runAudit() {

  const answers = {
    replay: document.getElementById("replay").value,
    determinism: document.getElementById("determinism").value,
    ownership: document.getElementById("ownership").value,
    boundary: document.getElementById("boundary").value,
    failure: document.getElementById("failure").value,
    idempotency: document.getElementById("idempotency").value,

    state_validity: document.getElementById("state_validity").value,
    authority_validity: document.getElementById("authority_validity").value,
    state_continuity: document.getElementById("state_continuity").value
  };

  // ---------- FIX MAP ----------
  const fixMap = {
    replay: "Persist full decision snapshots with inputs, outputs, and metadata for exact replay.",
    determinism: "Eliminate non-deterministic components (randomness, time-based variation, async drift).",
    ownership: "Assign explicit decision ownership at every execution boundary.",
    boundary: "Enforce strict authority checks before execution (no implicit permissions).",
    failure: "Ensure atomic failure handling with rollback or safe state preservation.",
    idempotency: "Implement idempotency keys to prevent duplicate execution.",

    state_validity: "Validate input state completeness and freshness at decision time.",
    authority_validity: "Verify authorization at the exact moment of execution.",
    state_continuity: "Maintain continuous, origin-traceable state lineage across system."
  };

  trackEvent('run_audit', answers);

  const weights = {
    replay: 2, determinism: 2, ownership: 1,
    boundary: 2, failure: 1, idempotency: 2,
    state_validity: 3, authority_validity: 3, state_continuity: 3
  };

  const executionKeys = ["replay","determinism","ownership","boundary","failure","idempotency"];
  const admissibilityKeys = ["state_validity","authority_validity","state_continuity"];

  let failures = [];

  // ---------- Execution ----------
  let executionScore = 0;
  let executionMax = 0;

  executionKeys.forEach(key => {
    executionMax += weights[key];

    if (answers[key] === "YES") executionScore += weights[key];
    else if (answers[key] === "PARTIAL") {
      executionScore += weights[key] * 0.5;
      failures.push(key);
    } else failures.push(key);
  });

  const executionPercent = Math.round((executionScore / executionMax) * 100);
  
  let executionStatus =
    executionPercent === 100 ? "PASS" :
    executionPercent >= 60 ? "CONDITIONAL" : "FAIL";

  let executionClass =
    executionStatus === "PASS" ? "pass" :
    executionStatus === "CONDITIONAL" ? "warn" : "fail";

  // ---------- Admissibility ----------
  let admissibilityFail = false;
  let admissibilityWeak = false;

  admissibilityKeys.forEach(key => {
    if (answers[key] === "NO") {
      admissibilityFail = true;
      failures.push(key);
    } else if (answers[key] === "PARTIAL") {
      admissibilityWeak = true;
      failures.push(key);
    }
  });

  let admissibilityStatus =
    admissibilityFail ? "FAIL" :
    admissibilityWeak ? "WEAK PASS" : "PASS";

  let admissibilityClass =
    admissibilityFail ? "fail" :
    admissibilityWeak ? "warn" : "pass";

  // ---------- Final ----------
  let finalStatus = admissibilityFail ? "FAIL" : executionStatus;
  let finalClass = admissibilityFail ? "fail" : executionClass;

  // ---------- Risk ----------
  let risk = "";
  let riskClass = "";

  if (admissibilityFail) {
    risk = "DANGEROUS";
    riskClass = "fail";
  } else if (executionPercent >= 80 && admissibilityWeak) {
    risk = "DANGEROUS";
    riskClass = "fail";
  } else if (executionPercent >= 80) {
    risk = "SAFE";
    riskClass = "pass";
  } else {
    risk = "CAUTION";
    riskClass = "warn";
  }

  // AFTER admissibility processing
window.auditFailures = [...new Set(failures)];
window.auditFixMap = fixMap;

  trackEvent('audit_result', {
    final: finalStatus,
    execution: executionStatus,
    admissibility: admissibilityStatus,
    risk: risk
  });

  const shareLink = generateShareLink(answers);

  // ---------- Insight ----------
  let insight = "";
  if (risk === "DANGEROUS") {
    insight = `<div class="alert alert-danger mt-3">
      ⚠️ High risk: System may act on invalid or partially valid state.
    </div>`;
  }

  // ---------- UI ----------
  document.getElementById("result").innerHTML = `
    <div class="p-3 border rounded mb-3">
      <h2 class="${finalClass}">${finalStatus}</h2>
    </div>

    <div class="p-3 border rounded mb-3">
      <h5 class="section-title">Risk Classification</h5>
      <h3 class="${riskClass}">${risk}</h3>
    </div>

    ${insight}

    <div class="p-3 border rounded mb-3">
      <h5 class="section-title">Admissibility Gate</h5>
      <h4 class="${admissibilityClass}">${admissibilityStatus}</h4>
      <div class="progress mt-2" style="height:8px;">
        <div class="progress-bar ${
          admissibilityClass === 'fail' ? 'bg-danger' :
          admissibilityClass === 'warn' ? 'bg-warning' :
          'bg-success'
        }" style="width:${
          admissibilityClass === 'fail' ? '20%' :
          admissibilityClass === 'warn' ? '60%' : '100%'
        }"></div>
      </div>
    </div>

    <div class="p-3 border rounded mb-3">
      <h5 class="section-title">Execution Score</h5>
      <h4 class="${executionClass}">${executionStatus}</h4>
      <div class="progress mt-2" style="height:8px;">
        <div class="progress-bar ${
          executionClass === 'pass' ? 'bg-success' :
          executionClass === 'warn' ? 'bg-warning' :
          'bg-danger'
        }" style="width:${executionPercent}%"></div>
      </div>
      <p class="small text-secondary mt-2">${executionPercent}% integrity</p>
    </div>

    <div class="mt-3">
      <textarea class="form-control small" readonly id="shareLink">${shareLink}</textarea>
      <button class="btn btn-outline-light mt-2 w-100" onclick="copyLink()">Copy Share Link</button>
    </div>

    <button class="btn btn-success mt-3 w-100" onclick="downloadScreenshot()">
      Download Result Image
    </button>

    <button class="btn btn-outline-warning mt-3 w-100" onclick="downloadPDF()">
      Download Audit Report (PDF)
    </button>
  `;

  // ---------- Failures ----------
  const failureMessages = {
    replay: "Audit replay not guaranteed",
    determinism: "Non-deterministic behavior",
    ownership: "Decision ownership unclear",
    boundary: "Authority boundaries weak",
    failure: "Failure may corrupt state",
    idempotency: "Duplicate execution possible",
    state_validity: "Input state invalid at decision time",
    authority_validity: "Unauthorized action",
    state_continuity: "State lacks origin trace"
  };

  const uniqueFailures = [...new Set(failures)];

  const failureTexts = uniqueFailures.map(f => failureMessages[f]);

  let html = "<ul class='list-group mt-3'>";

  failureTexts.forEach(f => {
    html += `<li class="list-group-item bg-dark text-light border-secondary">${f}</li>`;
  });

  html += "</ul>";

  // ---------- FIX PATH (PRIORITIZED) ----------
  const priorityOrder = [
    "state_validity",
    "authority_validity",
    "state_continuity",
    "determinism",
    "replay",
    "boundary",
    "ownership",
    "failure",
    "idempotency"
  ];

  const sortedFailures = priorityOrder.filter(f => uniqueFailures.includes(f));

  let fixHTML = `
    <div class="mt-4 p-3 border rounded">
      <h5 class="section-title">Recommended Fix Path</h5>
      <p class="text-secondary small">Fix admissibility issues first.</p>
      <ul class="list-group mt-3">
  `;

  sortedFailures.forEach(f => {
    if (fixMap[f]) {
      fixHTML += `
        <li class="list-group-item bg-dark text-light border-secondary">
          <strong>${failureMessages[f]}</strong><br>
          <span class="text-secondary small">${fixMap[f]}</span>
        </li>
      `;
    }
  });

  fixHTML += "</ul></div>";

  document.getElementById("failures").innerHTML = html + fixHTML;

  document.getElementById("result").scrollIntoView({ behavior: "smooth" });
}

// ---------- Utilities ----------
function generateShareLink(answers) {
  return window.location.origin + window.location.pathname + "?" + new URLSearchParams(answers);
}

function copyLink() {
  const el = document.getElementById("shareLink");
  el.select();
  document.execCommand("copy");
  alert("Link copied!");
  trackEvent('copy_share_link');
}

function downloadScreenshot() {
  trackEvent('download_screenshot');
  html2canvas(document.querySelector(".card")).then(canvas => {
    const a = document.createElement("a");
    a.download = "ai-audit.png";
    a.href = canvas.toDataURL();
    a.click();
  });
}

window.onload = function () {
  const params = new URLSearchParams(window.location.search);
  if (params.toString()) {
    trackEvent('auto_run_from_url');
    for (let key of params.keys()) {
      const el = document.getElementById(key);
      if (el) el.value = params.get(key);
    }
    runAudit();
  }
};

function downloadPDF() {

  trackEvent('download_pdf');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const now = new Date().toLocaleString();
  const auditId = Math.random().toString(36).substring(2, 10).toUpperCase();

  const failureMessagesMap = {
  replay: "Audit replay not guaranteed",
  determinism: "Non-deterministic behavior",
  ownership: "Decision ownership unclear",
  boundary: "Authority boundaries weak",
  failure: "Failure may corrupt state",
  idempotency: "Duplicate execution possible",
  state_validity: "Input state invalid at decision time",
  authority_validity: "Unauthorized action",
  state_continuity: "State lacks origin trace"
};

  // ---------- Collect current values ----------
  const final = document.querySelector("#result h2")?.innerText || "";
  const risk = document.querySelector("#result h3")?.innerText || "";

  const admissibility = document.querySelectorAll("#result h4")[0]?.innerText || "";
  const execution = document.querySelectorAll("#result h4")[1]?.innerText || "";

  const executionText = document.querySelector("#result p.small")?.innerText || "";

  const uniqueFailures = [...new Set(window.auditFailures || [])];

const failureTexts = uniqueFailures.map(f => failureMessagesMap[f]);
const fixTexts = uniqueFailures.map(f => window.auditFixMap[f]);

  // ---------- Title ----------
  doc.setFontSize(18);
  doc.text("AI AUDIT REPORT", 20, 20);

doc.setFontSize(10);
doc.text(`Audit ID: ${auditId}`, 20, 30);
doc.text(`Generated: ${now}`, 20, 35);

  // ---------- Summary ----------
  doc.setFontSize(12);
  doc.text(`Final Status: ${final}`, 20, 40);
  doc.text(`Risk: ${risk}`, 20, 50);
  doc.text(`Admissibility: ${admissibility}`, 20, 60);
  doc.text(`Execution: ${execution}`, 20, 70);
  doc.text(`${executionText}`, 20, 80);

  // ---------- Failures ----------
  let y = 100;
  doc.setFontSize(14);
  doc.text("Failure Points", 20, y);

  doc.setFontSize(10);
  y += 10;

  failureTexts.forEach(f => {
  doc.text(`• ${f}`, 20, y);
    y += 8;

    // page break safety
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  // ---------- Fix Path ----------
  

  y += 10;
  doc.setFontSize(14);
  doc.text("Recommended Fix Path", 20, y);

  doc.setFontSize(10);
  y += 10;

  fixTexts.forEach(fix => {
  const cleanFix = fix.replace(/[^\x00-\x7F]/g, "");
  doc.text(`→ ${cleanFix}`, 20, y);
    y += 8;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  // ---------- Footer ----------
  doc.setFontSize(8);
  doc.text("Generated by Horizon Labs — Deterministic AI Systems", 20, 285);
  doc.text("Follow: linkedin.com/company/horizon-labs-deterministic-ai-systems", 20, 290);

  // ---------- Save ----------
  doc.save("ai-audit-report.pdf");
}