function evaluate() {
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

    if (answers[key] === "YES") score += weights[key];
    else if (answers[key] === "PARTIAL") score += weights[key] * 0.5;
    else failures.push(key);
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

  document.getElementById("result").innerHTML =
    `<span class="${className}">${status}</span>`;

  const failureMessages = {
    replay: "Audit replay not guaranteed",
    determinism: "Non-deterministic behavior",
    ownership: "Decision ownership unclear",
    boundary: "Authority boundaries weak",
    failure: "Failure may corrupt state",
    idempotency: "Duplicate execution possible"
  };

  let failureHTML = "<ul>";

  failures.forEach(f => {
    failureHTML += `<li>${failureMessages[f]}</li>`;
  });

  failureHTML += "</ul>";

  document.getElementById("failures").innerHTML = failureHTML;
}
