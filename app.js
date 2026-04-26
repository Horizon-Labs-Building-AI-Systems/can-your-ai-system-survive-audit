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
    workflow: document.getElementById("workflow").value,

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

  let riskNote = "";

if (risk === "DANGEROUS") {
  riskNote = "System may execute invalid or unauthorized decisions in production.";
}
if (risk === "CAUTION") {
  riskNote = "System has control gaps under edge conditions.";
}
if (risk === "SAFE") {
  riskNote = "System operates within controlled execution boundaries.";
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

let signal = "";

if (risk === "DANGEROUS") {
  signal = "⚠️ Not safe for production deployment.";
} else if (risk === "CAUTION") {
  signal = "⚠️ Requires control improvements before scale.";
} else {
  signal = "✅ Safe for controlled production use.";
}  

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
      <h6 class="text-secondary">Workflow</h6>
      <h5>${answers.workflow.replaceAll("_", " ")}</h5>
      <h2 class="${finalClass} mt-2">${finalStatus}</h2>
    </div>

    <div class="p-3 border rounded mb-3">
      <h5 class="section-title">Risk Classification</h5>
      <h3 class="${riskClass}">${risk}</h3>
      <p class="mt-2 text-warning fw-semibold">${riskNote}</p>
      <p class="mt-2 fw-bold ${
        risk === "DANGEROUS" ? "text-danger" :
        risk === "CAUTION" ? "text-warning" :
        "text-success"
      }">
        ${signal}
      </p>
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
      <input class="form-control text-center fw-semibold" readonly id="shareLink" value="${shareLink}">
      <button class="btn btn-outline-light mt-2 w-100" onclick="copyLink()">Copy Share Link</button>
    </div>

    <button class="btn btn-success mt-3 w-100" onclick="downloadScreenshot()">
      Download Result Image
    </button>

    <button class="btn btn-outline-warning mt-3 w-100" onclick="downloadPDF()">
      Download Audit Report (PDF)
    </button>

    <div class="mt-4 text-center">
      <p class="text-secondary small">Want to audit a real workflow?</p>

      <a 
        href="https://wa.me/917042220456?text=Hi%20Prashant%2C%20I%20ran%20the%20AI%20audit%20tool%20and%20want%20to%20discuss%20a%20workflow%20audit." 
        target="_blank"
        class="btn btn-success w-100 mb-2">
        Chat on WhatsApp
      </a>

      <a 
        href="https://www.linkedin.com/company/horizon-labs-deterministic-ai-systems/" 
        target="_blank"
        class="btn btn-outline-warning w-100">
        Follow on LinkedIn
      </a>
    </div>
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

  const failureTexts = uniqueFailures
  .map(f => failureMessages[f])
  .filter(Boolean);

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
      <h5 class="section-title">Recommended Fix Path (${sortedFailures.length} issues)</h5>
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
  el.setSelectionRange(0, 99999);
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
  const workflow = document.querySelector("#result h5")?.innerText || "";
  const final = document.querySelector("#result h2")?.innerText || "";
  const risk = document.querySelector("#result h3")?.innerText || "";

  const admissibility = document.querySelectorAll("#result h4")[0]?.innerText || "";
  const execution = document.querySelectorAll("#result h4")[1]?.innerText || "";

  const executionText = document.querySelector("#result p.small")?.innerText || "";

  const uniqueFailures = [...new Set(window.auditFailures || [])];

const failureTexts = uniqueFailures
  .map(f => failureMessagesMap[f])
  .filter(Boolean);

 const fixTexts = uniqueFailures
  .map(f => window.auditFixMap[f])
  .filter(Boolean); 

  // ---------- Title ----------
  doc.setFillColor(15, 23, 42);
doc.rect(0, 0, 210, 20, 'F');

doc.setTextColor(255,255,255);
doc.setFontSize(16);
doc.text("AI AUDIT REPORT", 20, 13);

doc.setTextColor(0,0,0);

doc.setFontSize(10);
doc.text(`Audit ID: ${auditId}`, 20, 30);
doc.text(`Generated: ${now}`, 20, 35);

  // ---------- Summary ----------
  doc.setFontSize(12);

  doc.text(`Workflow: ${workflow.replaceAll("_", " ")}`, 20, 40);
  doc.text(`Final Status: ${final}`, 20, 50);
  doc.text(`Risk: ${risk}`, 20, 60);
  doc.text(`Admissibility: ${admissibility}`, 20, 70);
  doc.text(`Execution: ${execution}`, 20, 80);
  doc.text(`${executionText}`, 20, 90);
  doc.setFontSize(11);
  doc.text(`Total Issues: ${uniqueFailures.length}`, 20, 100);

  // ---------- Failures ----------
  let y = 130;
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
  const lines = doc.splitTextToSize(`→ ${cleanFix}`, 170);
    doc.text(lines, 20, y);
    y += lines.length * 6 + 4;

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

function openContact() {
  window.open("https://www.linkedin.com/company/horizon-labs-deterministic-ai-systems/", "_blank");
}

function showHelp(key) {
  document.getElementById("helpText").innerText = questionHelp[key];
  const box = document.getElementById("helpBox");
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}