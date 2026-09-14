var state = { brand: "", slides: [] };

var deckSelect = document.getElementById("deckSelect");
var filenameInput = document.getElementById("filenameInput");
var brandInput = document.getElementById("brandInput");
var newBtn = document.getElementById("newBtn");
var saveBtn = document.getElementById("saveBtn");
var previewLink = document.getElementById("previewLink");
var statusBar = document.getElementById("statusBar");
var slideList = document.getElementById("slideList");
var addSlideBtn = document.getElementById("addSlideBtn");

function escAttr(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getPath(obj, path) {
  var parts = path.split(".");
  var cur = obj;
  for (var i = 0; i < parts.length; i++) {
    if (cur == null) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

function setPath(obj, path, value) {
  var parts = path.split(".");
  var cur = obj;
  for (var i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function setStatus(msg, kind) {
  statusBar.textContent = msg;
  statusBar.className = "status-bar" + (kind ? " " + kind : "");
  if (kind === "ok") {
    setTimeout(function () {
      if (statusBar.textContent === msg) {
        statusBar.textContent = "";
        statusBar.className = "status-bar";
      }
    }, 3000);
  }
}

function defaultSlideForKind(kind) {
  if (kind === "title")
    return { kind: "title", eyebrow: "", title: "", sub: "", meta: [] };
  if (kind === "divider" || kind === "closing")
    return { kind: kind, title: "", sub: "" };
  if (kind === "music-question")
    return {
      kind: "music-question",
      flavor: "",
      parts: [{ letter: "A · 1 stig", src: "audio/", start: 0, answer: "" }],
    };
  if (kind === "challenge")
    return { kind: "challenge", flavor: "", text: "", points: "1" };
  return {
    kind: kind,
    flavor: "",
    text: "",
    points: "1",
    answerText: "",
  };
}

var KIND_LABELS = {
  title: "Titilglæra",
  question: "Spurning",
  challenge: "Áskorun",
  divider: "Millikafli",
  "music-question": "Tónlistarspurning",
  closing: "Lokaglæra",
};

// ---------- field templates ----------

function textField(label, path, value, opts) {
  opts = opts || {};
  var tag = opts.area ? "textarea" : "input";
  var type = opts.number ? ' type="number"' : "";
  var arrayAttr = opts.array ? ' data-array="comma"' : "";
  var classAttr = opts.tall ? ' class="textarea-tall"' : "";
  var openTag =
    "<" + tag + (tag === "input" ? type : "") + classAttr + ' data-path="' + escAttr(path) + '"' + arrayAttr;
  openTag += opts.area
    ? ">" + escHtml(value == null ? "" : value) + "</textarea>"
    : ' value="' + escAttr(value == null ? "" : value) + '" />';
  return (
    '<label class="' +
    (opts.narrow ? "field-narrow" : "") +
    '">' +
    escHtml(label) +
    (opts.hint ? '<span class="hint">' + escHtml(opts.hint) + "</span>" : "") +
    openTag +
    "</label>"
  );
}

function actionCheckbox(label, action, idx, checked) {
  return (
    '<div class="checkbox-row"><label style="display:flex;flex-direction:row;align-items:center;gap:6px;margin:0;">' +
    '<input type="checkbox" data-action="' +
    escAttr(action) +
    '" data-idx="' +
    idx +
    '"' +
    (checked ? " checked" : "") +
    " />" +
    escHtml(label) +
    "</label></div>"
  );
}

var GRID_PALETTE = ["", "🟫", "⬜", "⬛", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪"];

function gridEditor(idx, grid) {
  var cells = grid && grid.length === 9 ? grid : ["", "", "", "", "", "", "", "", ""];
  var html = '<div class="grid-editor">';
  cells.forEach(function (c, cIdx) {
    html +=
      '<button type="button" data-action="grid-cell" data-idx="' +
      idx +
      '" data-cell="' +
      cIdx +
      '" title="Smelltu til að skipta um kubb">' +
      (c || "") +
      "</button>";
  });
  html += "</div>";
  return html;
}

var availableImages = null;

function loadImageList() {
  return fetch("/api/images")
    .then(function (res) {
      return res.ok ? res.json() : [];
    })
    .then(function (names) {
      availableImages = names;
    })
    .catch(function () {
      availableImages = [];
    });
}

function imageField(idx, image) {
  var html = '<div class="image-field" data-idx="' + idx + '">';
  html += '<label>Mynd <span class="hint">Birtist milli flavor-texta og spurningarinnar.</span></label>';
  if (image) {
    html +=
      '<div class="image-preview-row">' +
      '<img class="image-preview" src="' +
      escAttr(image) +
      '" alt="" />' +
      '<div class="image-preview-meta">' +
      '<div class="image-preview-name">' +
      escHtml(image) +
      "</div>" +
      '<button type="button" class="admin-btn danger" data-action="remove-image" data-idx="' +
      idx +
      '">Fjarlægja mynd</button>' +
      "</div>" +
      "</div>";
  } else {
    var options = '<option value="">— veldu úr uppheldum myndum —</option>';
    (availableImages || []).forEach(function (name) {
      options += '<option value="images/' + escAttr(name) + '">' + escHtml(name) + "</option>";
    });
    html += '<div class="image-pick-row">';
    html += '<select data-action="pick-image" data-idx="' + idx + '">' + options + "</select>";
    html +=
      '<label class="admin-btn ghost image-upload-btn">Hlaða upp mynd' +
      '<input type="file" accept="image/*" data-action="upload-image" data-idx="' +
      idx +
      '" hidden />' +
      "</label>";
    html += "</div>";
  }
  html += "</div>";
  return html;
}

function blankPartsEditor(idx, parts) {
  var html = '<div class="parts-block"><p class="hint">Notaðu undirstrik (____) í línunni fyrir hverja eyðu, og skráðu svörin í röð fyrir neðan, kommu aðskilin.</p>';
  (parts || []).forEach(function (p, pIdx) {
    html += '<div class="part-row">';
    html +=
      '<button type="button" class="admin-btn danger" data-action="remove-part" data-idx="' +
      idx +
      '" data-pidx="' +
      pIdx +
      '">Eyða</button>';
    html += textField("Merking (t.d. A · 3 stig)", "slides." + idx + ".parts." + pIdx + ".letter", p.letter);
    html += textField("Lína (með ____ fyrir eyður)", "slides." + idx + ".parts." + pIdx + ".line", p.line, { area: true });
    html += textField("Svör (kommu aðskilin, í röð)", "slides." + idx + ".parts." + pIdx + ".blanks", (p.blanks || []).join(", "), { array: true });
    html += "</div>";
  });
  html +=
    '<button type="button" class="admin-btn ghost" data-action="add-part" data-idx="' +
    idx +
    '" data-partkind="blanks">+ Bæta við eyðu</button>';
  html += "</div>";
  return html;
}

function musicPartsEditor(idx, parts) {
  var html = '<div class="parts-block">';
  (parts || []).forEach(function (p, pIdx) {
    html += '<div class="part-row">';
    html +=
      '<button type="button" class="admin-btn danger" data-action="remove-part" data-idx="' +
      idx +
      '" data-pidx="' +
      pIdx +
      '">Eyða</button>';
    html += textField("Merking (t.d. A · 2 stig)", "slides." + idx + ".parts." + pIdx + ".letter", p.letter);
    html += textField("Skrá (audio/lag.mp3)", "slides." + idx + ".parts." + pIdx + ".src", p.src);
    html += textField("Byrjar á (sek.)", "slides." + idx + ".parts." + pIdx + ".start", p.start, { number: true });
    html += textField("Svar", "slides." + idx + ".parts." + pIdx + ".answer", p.answer);
    html += "</div>";
  });
  html +=
    '<button type="button" class="admin-btn ghost" data-action="add-part" data-idx="' +
    idx +
    '" data-partkind="music">+ Bæta við lagi</button>';
  html += "</div>";
  return html;
}

function slideFields(s, idx) {
  if (s.kind === "title") {
    return (
      textField("Yfirtitill (eyebrow)", "slides." + idx + ".eyebrow", s.eyebrow) +
      textField("Titill (má nota <br>)", "slides." + idx + ".title", s.title, { area: true }) +
      textField("Undirtitill", "slides." + idx + ".sub", s.sub) +
      textField("Merkimiðar (kommu aðskilið)", "slides." + idx + ".meta", (s.meta || []).join(", "), {
        array: true,
        hint: "Fjöldi spurninga bætist sjálfkrafa við fremst — ekki skrá það hér.",
      })
    );
  }
  if (s.kind === "divider" || s.kind === "closing") {
    return (
      textField("Titill", "slides." + idx + ".title", s.title) +
      textField("Undirtitill", "slides." + idx + ".sub", s.sub)
    );
  }
  if (s.kind === "music-question") {
    return (
      textField("Flavor texti", "slides." + idx + ".flavor", s.flavor) +
      musicPartsEditor(idx, s.parts)
    );
  }

  var html = textField("Flavor texti", "slides." + idx + ".flavor", s.flavor);
  html += imageField(idx, s.image);

  if (s.kind === "challenge") {
    html += textField("Áskorunartexti", "slides." + idx + ".text", s.text, { area: true, tall: true });
    html += textField("Stig", "slides." + idx + ".points", s.points, { narrow: true, hint: "T.d. 1, eða 1-3 ef stigin eru breytileg" });
    return html;
  }

  // question
  var hasParts = !!s.parts;
  html += actionCheckbox("Nota margar eyðufyllingar (parts) í stað einnar spurningar", "toggle-parts-mode", idx, hasParts);

  if (hasParts) {
    html += blankPartsEditor(idx, s.parts);
  } else {
    html += textField("Spurningartexti", "slides." + idx + ".text", s.text, { area: true, tall: true });
    html += textField("Stig", "slides." + idx + ".points", s.points, { narrow: true, hint: "T.d. 1, eða 1-3 ef stigin eru breytileg" });
    html += textField("Svar", "slides." + idx + ".answerText", s.answerText, { area: true });
    html += actionCheckbox("Bæta við 3×3 smíðaborði (Minecraft-stíl svar)", "toggle-grid", idx, !!s.answerGrid);
    if (s.answerGrid) {
      html += textField("Yfirskrift borðs", "slides." + idx + ".gridCaption", s.gridCaption);
      html += gridEditor(idx, s.answerGrid);
      html += textField("Athugasemd við borð", "slides." + idx + ".answerNote", s.answerNote);
    }
  }
  return html;
}

function slideCardHtml(s, idx) {
  var options = Object.keys(KIND_LABELS)
    .map(function (k) {
      return (
        '<option value="' +
        k +
        '"' +
        (k === s.kind ? " selected" : "") +
        ">" +
        KIND_LABELS[k] +
        "</option>"
      );
    })
    .join("");

  var html = '<div class="slide-card">';
  html += '<div class="slide-card-head">';
  html += '<span class="slide-index">' + (idx + 1) + "</span>";
  html += '<select data-action="change-kind" data-idx="' + idx + '">' + options + "</select>";
  html += '<span class="spacer"></span>';
  html += '<button type="button" class="admin-btn ghost" data-action="move-up" data-idx="' + idx + '">↑</button>';
  html += '<button type="button" class="admin-btn ghost" data-action="move-down" data-idx="' + idx + '">↓</button>';
  html += '<button type="button" class="admin-btn ghost" data-action="duplicate" data-idx="' + idx + '">Afrita</button>';
  html += '<button type="button" class="admin-btn danger" data-action="delete-slide" data-idx="' + idx + '">Eyða</button>';
  html += "</div>";
  html += slideFields(s, idx);
  html += "</div>";
  return html;
}

function renderSlideList() {
  slideList.innerHTML = state.slides.map(slideCardHtml).join("");
}

function renderAll() {
  brandInput.value = state.brand || "";
  renderSlideList();
  updatePreviewLink();
}

function updatePreviewLink() {
  var name = filenameInput.value.trim();
  if (name) {
    previewLink.href = "index.html?deck=" + encodeURIComponent("decks/" + name);
  } else {
    previewLink.removeAttribute("href");
  }
}

// ---------- generic field updates ----------

slideList.addEventListener("input", function (e) {
  var el = e.target;
  var path = el.getAttribute("data-path");
  if (!path) return;
  var value;
  if (el.dataset.array === "comma") {
    value = el.value
      .split(",")
      .map(function (x) {
        return x.trim();
      })
      .filter(function (x) {
        return x.length > 0;
      });
  } else if (el.type === "number") {
    value = el.value === "" ? "" : Number(el.value);
  } else if (el.type === "checkbox") {
    value = el.checked;
  } else {
    value = el.value;
  }
  setPath(state, path, value);
});

slideList.addEventListener("change", function (e) {
  var el = e.target;
  if (el.type === "checkbox" && el.getAttribute("data-path")) {
    setPath(state, el.getAttribute("data-path"), el.checked);
  }
});

// ---------- structural actions ----------

slideList.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-action]");
  if (!btn) return;
  var action = btn.getAttribute("data-action");
  var idx = Number(btn.getAttribute("data-idx"));

  if (action === "move-up") {
    if (idx > 0) {
      var tmp = state.slides[idx - 1];
      state.slides[idx - 1] = state.slides[idx];
      state.slides[idx] = tmp;
      renderSlideList();
    }
  } else if (action === "move-down") {
    if (idx < state.slides.length - 1) {
      var tmp2 = state.slides[idx + 1];
      state.slides[idx + 1] = state.slides[idx];
      state.slides[idx] = tmp2;
      renderSlideList();
    }
  } else if (action === "duplicate") {
    var copy = JSON.parse(JSON.stringify(state.slides[idx]));
    state.slides.splice(idx + 1, 0, copy);
    renderSlideList();
  } else if (action === "delete-slide") {
    if (confirm("Eyða þessari glæru?")) {
      state.slides.splice(idx, 1);
      renderSlideList();
    }
  } else if (action === "add-part") {
    var pk = btn.getAttribute("data-partkind");
    var s = state.slides[idx];
    if (!s.parts) s.parts = [];
    if (pk === "music") {
      s.parts.push({ letter: "", src: "audio/", start: 0, answer: "" });
    } else {
      s.parts.push({ letter: "", line: "", blanks: [] });
    }
    renderSlideList();
  } else if (action === "remove-part") {
    var pidx = Number(btn.getAttribute("data-pidx"));
    state.slides[idx].parts.splice(pidx, 1);
    renderSlideList();
  } else if (action === "grid-cell") {
    var cell = Number(btn.getAttribute("data-cell"));
    var s2 = state.slides[idx];
    if (!s2.answerGrid || s2.answerGrid.length !== 9) {
      s2.answerGrid = ["", "", "", "", "", "", "", "", ""];
    }
    var curIdx = GRID_PALETTE.indexOf(s2.answerGrid[cell]);
    var next = GRID_PALETTE[(curIdx + 1) % GRID_PALETTE.length];
    s2.answerGrid[cell] = next;
    renderSlideList();
  } else if (action === "remove-image") {
    delete state.slides[idx].image;
    renderSlideList();
  }
});

slideList.addEventListener("change", function (e) {
  var el = e.target;
  var action = el.getAttribute && el.getAttribute("data-action");
  if (!action) return;
  var idx = Number(el.getAttribute("data-idx"));

  if (action === "change-kind") {
    var old = state.slides[idx];
    var next = defaultSlideForKind(el.value);
    if (old.flavor !== undefined && next.flavor !== undefined) next.flavor = old.flavor;
    if (old.image && (next.kind === "question" || next.kind === "challenge")) next.image = old.image;
    state.slides[idx] = next;
    renderSlideList();
  } else if (action === "pick-image") {
    var sPick = state.slides[idx];
    if (el.value) sPick.image = el.value;
    else delete sPick.image;
    renderSlideList();
  } else if (action === "upload-image") {
    var file = el.files && el.files[0];
    if (!file) return;
    var safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    if (!/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(safeName)) {
      setStatus("Óstudd myndaskrá — leyfðar eru png, jpg, jpeg, gif, webp, svg.", "err");
      return;
    }
    var uploadIdx = idx;
    setStatus("Hleð upp mynd…", "");
    fetch("/api/images/" + encodeURIComponent(safeName), {
      method: "POST",
      body: file,
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.error || "Villa við upphal");
          return body;
        });
      })
      .then(function (body) {
        state.slides[uploadIdx].image = body.url;
        availableImages = null;
        setStatus("", "");
        renderSlideList();
      })
      .catch(function (err) {
        setStatus(err.message, "err");
      });
  } else if (action === "toggle-parts-mode") {
    var s = state.slides[idx];
    if (el.checked) {
      delete s.text;
      delete s.answerText;
      delete s.answerGrid;
      delete s.answerNote;
      delete s.gridCaption;
      s.parts = [{ letter: "", line: "", blanks: [] }];
    } else {
      delete s.parts;
      s.text = "";
      s.answerText = "";
    }
    renderSlideList();
  } else if (action === "toggle-grid") {
    var s2 = state.slides[idx];
    if (el.checked) {
      s2.answerGrid = ["", "", "", "", "", "", "", "", ""];
    } else {
      delete s2.answerGrid;
      delete s2.answerNote;
      delete s2.gridCaption;
    }
    renderSlideList();
  }
});

// ---------- deck-level controls ----------

brandInput.addEventListener("input", function () {
  state.brand = brandInput.value;
});

filenameInput.addEventListener("input", updatePreviewLink);

addSlideBtn.addEventListener("click", function () {
  state.slides.push(defaultSlideForKind("question"));
  renderSlideList();
  slideList.lastElementChild.scrollIntoView({ behavior: "smooth", block: "start" });
});

newBtn.addEventListener("click", function () {
  if (!confirm("Byrja á nýju, tómu deck-i? Óvistaðar breytingar tapast.")) return;
  state = { brand: "NÖRD VÍSÓ · PUB QUIZ", slides: [defaultSlideForKind("title")] };
  filenameInput.value = "";
  deckSelect.value = "";
  setStatus("", "");
  renderAll();
});

function loadDeckList(selectName) {
  return fetch("/api/decks")
    .then(function (res) {
      return res.json();
    })
    .then(function (names) {
      deckSelect.innerHTML =
        '<option value="">— nýtt deck —</option>' +
        names
          .map(function (n) {
            return '<option value="' + escAttr(n) + '">' + escHtml(n) + "</option>";
          })
          .join("");
      if (selectName) deckSelect.value = selectName;
    });
}

function loadDeck(name) {
  return fetch("/api/decks/" + encodeURIComponent(name))
    .then(function (res) {
      if (!res.ok) throw new Error("Fannst ekki: " + name);
      return res.json();
    })
    .then(function (deck) {
      state = { brand: deck.brand || "", slides: deck.slides || [] };
      filenameInput.value = name;
      setStatus("", "");
      renderAll();
    })
    .catch(function (err) {
      setStatus(err.message, "err");
    });
}

deckSelect.addEventListener("change", function () {
  if (deckSelect.value) loadDeck(deckSelect.value);
});

saveBtn.addEventListener("click", function () {
  var name = filenameInput.value.trim();
  if (!/^[a-zA-Z0-9_-]+\.json$/.test(name)) {
    setStatus("Skráarnafn verður að vera á forminu 'eitthvad.json' (bara bókstafir, tölur, - og _).", "err");
    filenameInput.focus();
    return;
  }
  if (!state.slides.length) {
    setStatus("Deck þarf að minnsta kosti eina glæru.", "err");
    return;
  }
  saveBtn.disabled = true;
  fetch("/api/decks/" + encodeURIComponent(name), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  })
    .then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || "Villa við vistun");
        return body;
      });
    })
    .then(function () {
      setStatus("Vistað í decks/" + name, "ok");
      updatePreviewLink();
      return loadDeckList(name);
    })
    .catch(function (err) {
      setStatus(err.message, "err");
    })
    .finally(function () {
      saveBtn.disabled = false;
    });
});

// ---------- init ----------

loadImageList().then(function () {
  renderSlideList();
});

var initialDeck = new URLSearchParams(window.location.search).get("deck");
loadDeckList(initialDeck || undefined).then(function () {
  if (initialDeck) {
    loadDeck(initialDeck);
  } else if (deckSelect.options.length > 1) {
    // default to first real deck if one exists
    deckSelect.selectedIndex = 1;
    loadDeck(deckSelect.value);
  } else {
    state = { brand: "NÖRD VÍSÓ · PUB QUIZ", slides: [defaultSlideForKind("title")] };
    renderAll();
  }
});
