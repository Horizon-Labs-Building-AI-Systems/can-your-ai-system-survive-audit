function runAudit() {

  const answers = {
    replay: document.getElementById("replay").value,
    determinism: document.getElementById("determinism").value,
    ownership: document.getElementById("ownership").value,
    boundary: document.getElementById("boundary").value,
    failure: document.getElementById("failure").value,
    idempotency: document.getElementById("idempotency").value
  };

  const weights = {
    replay: 2,
    determinism: 2,
    ownership: 1,
    boundary: 2,
    failure: 1,
    idempotency: 2
  };

  let score = 0;
  let max = 0;
  let failures = [];

  for (let key in weights) {
    max += weights[key];

    if (answers[key] === "YES") {
      score += weights[key];
    } else if (answers[key] === "PARTIAL") {
      score += weights[key] * 0.5;
      failures.push(key);
    } else {
      failures.push(key);
    }
  }

  const ratio = score / max;

  let status = "";
  let className = "";

  if (ratio === 1) {
    status = "PASS";
    className = "pass";
  } else if (ratio >= 0.6) {
    status = "CONDITIONAL PASS";
    className = "warn";
  } else {
    status = "FAIL";
    className = "fail";
  }

  const shareLink = generateShareLink(answers);

  document.getElementById("result").innerHTML = `
    <div class="p-3 border rounded">
      <h2 class="${className}">${status}</h2>
    </div>

    <div class="mt-3">
      <input class="form-control" value="${shareLink}" readonly id="shareLink">
      <button class="btn btn-outline-light mt-2 w-100" onclick="copyLink()">Copy Share Link</button>
    </div>

    <button class="btn btn-success mt-3 w-100" onclick="downloadScreenshot()">
      Download Result Image
    </button>
  `;

  const failureMessages = {
    replay: "Audit replay not guaranteed",
    determinism: "Non-deterministic behavior",
    ownership: "Decision ownership unclear",
    boundary: "Authority boundaries weak",
    failure: "Failure may corrupt state",
    idempotency: "Duplicate execution possible"
  };

  let failureHTML = "<ul class='list-group mt-3'>";

  failures.forEach(f => {
    failureHTML += `<li class="list-group-item bg-dark text-light border-secondary">${failureMessages[f]}</li>`;
  });

  failureHTML += "</ul>";

  document.getElementById("failures").innerHTML = failureHTML;

  document.getElementById("result").scrollIntoView({ behavior: "smooth" });
}

function generateShareLink(answers) {
  const params = new URLSearchParams(answers);
  return window.location.origin + window.location.pathname + "?" + params.toString();
}

function copyLink() {
  const input = document.getElementById("shareLink");
  input.select();
  document.execCommand("copy");
  alert("Link copied!");
}

function downloadScreenshot() {
  const element = document.querySelector(".card");

  html2canvas(element).then(canvas => {
    const link = document.createElement("a");
    link.download = "ai-audit-result.png";
    link.href = canvas.toDataURL();
    link.click();
  });
}

window.onload = function () {
  const params = new URLSearchParams(window.location.search);

  if (params.toString()) {
    for (let key of params.keys()) {
      const el = document.getElementById(key);
      if (el) el.value = params.get(key);
    }
    runAudit();
  }
};