function craftGrid(cells) {
  // cells: array of 9 emoji or '' for empty
  var html = '<div class="craft">';
  cells.forEach(function (c) {
    html += '<div class="cell">' + (c || "") + "</div>";
  });
  html += "</div>";
  return html;
}

var DEFAULT_DECK = "decks/nord-2026.json";

function deckUrl() {
  var params = new URLSearchParams(window.location.search);
  return params.get("deck") || DEFAULT_DECK;
}

var slides = [];
var autoNum = {};
var currentDeckUrl = null;

function loadDeck(url) {
  return fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (deck) {
      slides = deck.slides || [];
      autoNum = {};
      var quizItemCount = 0;
      slides.forEach(function (s, idx) {
        if (
          s.kind === "question" ||
          s.kind === "challenge" ||
          s.kind === "music-question"
        ) {
          quizItemCount++;
          autoNum[idx] = quizItemCount;
        }
      });

      if (slides[0] && slides[0].kind === "title") {
        slides[0].meta = [quizItemCount + " spurningar"].concat(
          slides[0].meta || [],
        );
      }

      if (deck.brand) {
        var brandEl = document.getElementById("brandText");
        if (brandEl) brandEl.textContent = deck.brand;
      }

      currentDeckUrl = url;
      i = 0;
      revealed = {};
      render();
      renderDeckMenu();
    })
    .catch(function (err) {
      stage.innerHTML =
        '<div class="slide"><p class="q-text">Villa við að hlaða glærur (' +
        url +
        "): " +
        err.message +
        "</p></div>";
    });
}

function selectDeck(name) {
  var url = "decks/" + name;
  var params = new URLSearchParams(window.location.search);
  params.set("deck", url);
  history.replaceState(null, "", window.location.pathname + "?" + params.toString());
  closeDeckMenu();
  loadDeck(url);
}

var i = 0;
var revealed = {}; // slide index -> bool, or for q12 -> array of bools per part

var stage = document.getElementById("stage");
var countEl = document.getElementById("count");
var dotsEl = document.getElementById("dots");
var prevBtn = document.getElementById("prevBtn");
var nextBtn = document.getElementById("nextBtn");
var brandBtn = document.getElementById("brandBtn");
var deckMenuEl = document.getElementById("deckMenu");
var availableDecks = null;

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

function closeDeckMenu() {
  deckMenuEl.hidden = true;
  brandBtn.setAttribute("aria-expanded", "false");
}

function renderDeckMenu() {
  if (!availableDecks) {
    deckMenuEl.innerHTML = '<div class="empty">Hleð deckum…</div>';
    return;
  }
  if (!availableDecks.length) {
    deckMenuEl.innerHTML = '<div class="empty">Engin deck fundust</div>';
    return;
  }
  deckMenuEl.innerHTML = availableDecks
    .map(function (name) {
      var url = "decks/" + name;
      var active = url === currentDeckUrl;
      return (
        '<button type="button" class="' +
        (active ? "active" : "") +
        '" data-deck="' +
        name +
        '">' +
        (active ? "✓ " : "") +
        name +
        "</button>"
      );
    })
    .join("");
}

function openDeckMenu() {
  deckMenuEl.hidden = false;
  brandBtn.setAttribute("aria-expanded", "true");
  if (availableDecks) {
    renderDeckMenu();
    return;
  }
  fetch("/api/decks")
    .then(function (res) {
      if (!res.ok) throw new Error("no deck listing");
      return res.json();
    })
    .then(function (names) {
      availableDecks = names;
      renderDeckMenu();
    })
    .catch(function () {
      availableDecks = [];
      renderDeckMenu();
    });
}

brandBtn.addEventListener("click", function (e) {
  e.stopPropagation();
  if (deckMenuEl.hidden) openDeckMenu();
  else closeDeckMenu();
});

deckMenuEl.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-deck]");
  if (btn) selectDeck(btn.getAttribute("data-deck"));
});

document.addEventListener("click", function (e) {
  if (!deckMenuEl.hidden && !e.target.closest(".brand-wrap")) closeDeckMenu();
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && !deckMenuEl.hidden) closeDeckMenu();
});

function renderDots() {
  dotsEl.innerHTML = "";
  slides.forEach(function (s, idx) {
    var b = document.createElement("button");
    if (idx === i) b.className = "active";
    b.addEventListener("click", function () {
      go(idx);
    });
    dotsEl.appendChild(b);
  });
}

function toggleAnswer(idx, partIdx) {
  if (typeof partIdx === "number") {
    revealed[idx] = revealed[idx] || {};
    revealed[idx][partIdx] = !revealed[idx][partIdx];
  } else {
    revealed[idx] = !revealed[idx];
  }
  render();
}

function questionHasAnswer(s) {
  return !!(s.answerText || s.answerGrid || (s.parts && s.parts.length));
}

var audioEl = new Audio();

function playClip(src, start) {
  if (audioEl.getAttribute("data-src") === src && !audioEl.paused) {
    audioEl.pause();
    return;
  }
  if (audioEl.getAttribute("data-src") !== src) {
    audioEl.pause();
    audioEl.src = src;
    audioEl.setAttribute("data-src", src);
    audioEl.addEventListener(
      "loadedmetadata",
      function onLoaded() {
        audioEl.currentTime = start;
        audioEl.play().catch(function () {});
        audioEl.removeEventListener("loadedmetadata", onLoaded);
      },
      { once: true },
    );
    audioEl.load();
  } else {
    audioEl.currentTime = start;
    audioEl.play().catch(function () {});
  }
}

function updatePlayButtons() {
  stage.querySelectorAll(".play-btn").forEach(function (btn) {
    var isPlaying =
      audioEl.getAttribute("data-src") === btn.getAttribute("data-src") &&
      !audioEl.paused;
    btn.textContent = isPlaying ? "■ Stopp" : "▶ Spila";
    btn.classList.toggle("playing", isPlaying);
  });
}

audioEl.addEventListener("play", updatePlayButtons);
audioEl.addEventListener("pause", updatePlayButtons);
audioEl.addEventListener("ended", updatePlayButtons);

function render() {
  var s = slides[i];
  var html = "";

  if (s.kind === "title") {
    html =
      '<div class="slide title">' +
      '<p class="eyebrow">' +
      s.eyebrow +
      "</p>" +
      "<h1>" +
      s.title +
      "</h1>" +
      '<p class="sub">' +
      s.sub +
      "</p>" +
      '<div class="meta">' +
      s.meta
        .map(function (m) {
          return '<span class="chip">' + m + "</span>";
        })
        .join("") +
      "</div>" +
      "</div>";
  } else if (s.kind === "divider") {
    html =
      '<div class="slide divider">' +
      "<h1>" +
      s.title +
      "</h1>" +
      '<p class="sub">' +
      s.sub +
      "</p>" +
      "</div>";
  } else if (s.kind === "closing") {
    html =
      '<div class="slide closing">' +
      "<h1>" +
      s.title +
      "</h1>" +
      '<p class="sub">' +
      s.sub +
      "</p>" +
      "</div>";
  } else if (s.kind === "question" || s.kind === "challenge") {
    var pointsClass = "q-points";
    var pointsLabel = s.points + " stig";

    html +=
      '<div class="slide ' + (s.kind === "challenge" ? "challenge" : "") + '">';
    html +=
      '<div class="q-head"><span class="q-num">' +
      autoNum[i] +
      "</span>" +
      (s.points
        ? '<span class="' + pointsClass + '">' + pointsLabel + "</span>"
        : "") +
      "</div>";
    if (s.flavor) html += '<p class="q-flavor">' + s.flavor + "</p>";
    if (s.image)
      html +=
        '<div class="q-image"><img src="' + s.image + '" alt="" /></div>';
    if (s.text) html += '<p class="q-text">' + s.text + "</p>";

    if (s.parts) {
      html += '<div class="q-parts">';
      s.parts.forEach(function (p, pIdx) {
        var isOn = !!(revealed[i] && revealed[i][pIdx]);
        var line = p.line;
        if (isOn) {
          var bi = 0;
          line = line.replace(/_+/g, function () {
            var w = p.blanks[bi] !== undefined ? p.blanks[bi] : "";
            bi++;
            return '<span class="blank">' + w + "</span>";
          });
        } else {
          line = line.replace(/_+/g, '<span class="blank">&nbsp;</span>');
        }
        html +=
          '<div class="q-part' +
          (isOn ? " revealed" : "") +
          '" data-part="' +
          pIdx +
          '">' +
          '<span class="letter">' +
          p.letter +
          "</span>" +
          '<span class="body"><span class="line">' +
          line +
          "</span></span>" +
          "</div>";
      });
      html += "</div>";
    }

    if (questionHasAnswer(s) && !s.parts) {
      var on = !!revealed[i];
      html +=
        '<button class="answer-toggle' +
        (on ? " on" : "") +
        '" id="revealBtn">' +
        (on ? "Fela svar" : "Birta svar") +
        "</button>";
      html += '<div class="answer-box' + (on ? " show" : "") + '">';
      html += '<span class="label">Svar</span>';
      if (s.answerGrid)
        html +=
          (s.gridCaption
            ? '<div style="font-family:var(--font-body);font-size:0.8rem;color:var(--text)">' +
              s.gridCaption +
              "</div>"
            : "") +
          craftGrid(s.answerGrid) +
          (s.answerNote
            ? '<div style="font-family:var(--font-body);font-size:0.75rem;color:var(--text-dim)">' +
              s.answerNote +
              "</div>"
            : "");
      if (s.answerText) html += "<div>" + s.answerText + "</div>";
      html += "</div>";
    }

    html += "</div>";
  } else if (s.kind === "music-question") {
    html += '<div class="slide music">';
    html +=
      '<div class="q-head"><span class="q-num">' + autoNum[i] + "</span></div>";
    if (s.flavor) html += '<p class="q-flavor">' + s.flavor + "</p>";

    html += '<div class="q-parts">';
    s.parts.forEach(function (p, pIdx) {
      var isOn = !!(revealed[i] && revealed[i][pIdx]);
      html +=
        '<div class="q-part music-part' +
        (isOn ? " revealed" : "") +
        '" data-part="' +
        pIdx +
        '">' +
        '<span class="letter">' +
        p.letter +
        "</span>" +
        '<span class="body">' +
        '<button class="play-btn" data-src="' +
        p.src +
        '" data-start="' +
        p.start +
        '">▶ Spila</button>' +
        (isOn ? '<span class="line">' + p.answer + "</span>" : "") +
        "</span>" +
        "</div>";
    });
    html += "</div>";
    html += "</div>";
  }

  stage.innerHTML = html;
  countEl.textContent = pad(i + 1) + " / " + pad(slides.length);
  prevBtn.disabled = i === 0;
  nextBtn.disabled = i === slides.length - 1;
  renderDots();

  var revealBtn = document.getElementById("revealBtn");
  if (revealBtn)
    revealBtn.addEventListener("click", function () {
      toggleAnswer(i);
    });

  stage.querySelectorAll(".q-part").forEach(function (el) {
    el.style.cursor = "pointer";
    el.addEventListener("click", function () {
      toggleAnswer(i, parseInt(el.getAttribute("data-part"), 10));
    });
  });

  updatePlayButtons();

  stage.querySelectorAll(".play-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      playClip(
        btn.getAttribute("data-src"),
        parseFloat(btn.getAttribute("data-start")) || 0,
      );
    });
  });
}

function go(idx) {
  if (idx < 0 || idx >= slides.length) return;
  audioEl.pause();
  i = idx;
  render();
}

prevBtn.addEventListener("click", function () {
  go(i - 1);
});
nextBtn.addEventListener("click", function () {
  go(i + 1);
});

document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
    e.preventDefault();
    go(i + 1);
  } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
    e.preventDefault();
    go(i - 1);
  } else if (e.key === "a" || e.key === "A") {
    var s = slides[i];
    if (s && questionHasAnswer(s) && !s.parts) toggleAnswer(i);
  }
});

document.getElementById("fsBtn").addEventListener("click", function () {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function () {});
  } else {
    document.exitFullscreen();
  }
});

loadDeck(deckUrl());
