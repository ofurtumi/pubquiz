// Tiny static file + deck-editing server. No dependencies.
// Run: node server.js [port]

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DECKS_DIR = path.join(ROOT, "decks");
const IMAGES_DIR = path.join(ROOT, "images");
const PORT = Number(process.argv[2]) || 5178;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

var DECK_NAME_RE = /^[a-zA-Z0-9_-]+\.json$/;
var IMAGE_NAME_RE = /^[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|gif|webp|svg)$/i;

function safeDeckPath(name) {
  if (!DECK_NAME_RE.test(name)) return null;
  var full = path.join(DECKS_DIR, name);
  if (path.dirname(full) !== DECKS_DIR) return null;
  return full;
}

function safeImagePath(name) {
  if (!IMAGE_NAME_RE.test(name)) return null;
  var full = path.join(IMAGES_DIR, name);
  if (path.dirname(full) !== IMAGES_DIR) return null;
  return full;
}

function send(res, status, body, contentType) {
  res.writeHead(status, { "Content-Type": contentType || "text/plain; charset=utf-8" });
  res.end(body);
}

function sendJSON(res, status, obj) {
  send(res, status, JSON.stringify(obj), "application/json; charset=utf-8");
}

function readBodyBuffer(req, maxBytes, cb) {
  var chunks = [];
  var total = 0;
  var tooBig = false;
  req.on("data", function (c) {
    total += c.length;
    if (total > maxBytes) {
      tooBig = true;
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on("end", function () {
    if (tooBig) return;
    cb(Buffer.concat(chunks));
  });
}

function readBody(req, cb) {
  readBodyBuffer(req, 5 * 1024 * 1024, function (buf) {
    cb(buf.toString("utf8"));
  });
}

function serveStatic(req, res, urlPath) {
  var rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  var full = path.normalize(path.join(ROOT, rel));
  if (full.indexOf(ROOT) !== 0) {
    send(res, 403, "Forbidden");
    return;
  }
  fs.readFile(full, function (err, data) {
    if (err) {
      send(res, 404, "Not found");
      return;
    }
    var ext = path.extname(full);
    send(res, 200, data, MIME[ext] || "application/octet-stream");
  });
}

var server = http.createServer(function (req, res) {
  var urlPath = req.url.split("?")[0];

  // GET /api/decks -> list deck filenames
  if (req.method === "GET" && urlPath === "/api/decks") {
    fs.readdir(DECKS_DIR, function (err, files) {
      if (err) return sendJSON(res, 500, { error: err.message });
      sendJSON(
        res,
        200,
        files.filter(function (f) {
          return DECK_NAME_RE.test(f);
        }),
      );
    });
    return;
  }

  // GET/POST/DELETE /api/decks/:name
  var m = urlPath.match(/^\/api\/decks\/([^/]+)$/);
  if (m) {
    var name = m[1];
    var full = safeDeckPath(name);
    if (!full) return sendJSON(res, 400, { error: "Invalid deck name" });

    if (req.method === "GET") {
      fs.readFile(full, "utf8", function (err, data) {
        if (err) return sendJSON(res, 404, { error: "Deck not found" });
        send(res, 200, data, "application/json; charset=utf-8");
      });
      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      readBody(req, function (body) {
        var parsed;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          return sendJSON(res, 400, { error: "Invalid JSON: " + e.message });
        }
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.slides)) {
          return sendJSON(res, 400, { error: "Deck must have a 'slides' array" });
        }
        fs.mkdir(DECKS_DIR, { recursive: true }, function () {
          fs.writeFile(full, JSON.stringify(parsed, null, 2) + "\n", "utf8", function (err) {
            if (err) return sendJSON(res, 500, { error: err.message });
            sendJSON(res, 200, { ok: true, name: name });
          });
        });
      });
      return;
    }

    if (req.method === "DELETE") {
      fs.unlink(full, function (err) {
        if (err) return sendJSON(res, 404, { error: "Deck not found" });
        sendJSON(res, 200, { ok: true });
      });
      return;
    }
  }

  // GET /api/images -> list uploaded image filenames
  if (req.method === "GET" && urlPath === "/api/images") {
    fs.readdir(IMAGES_DIR, function (err, files) {
      if (err) return sendJSON(res, 200, []);
      sendJSON(
        res,
        200,
        files.filter(function (f) {
          return IMAGE_NAME_RE.test(f);
        }),
      );
    });
    return;
  }

  // POST /api/images/:name -> upload raw image bytes
  var im = urlPath.match(/^\/api\/images\/([^/]+)$/);
  if (im && req.method === "POST") {
    var iname = decodeURIComponent(im[1]);
    var ifull = safeImagePath(iname);
    if (!ifull) return sendJSON(res, 400, { error: "Invalid image name (use letters, numbers, - or _, and .png/.jpg/.jpeg/.gif/.webp/.svg)" });
    readBodyBuffer(req, 15 * 1024 * 1024, function (buf) {
      if (!buf || !buf.length) return sendJSON(res, 400, { error: "Empty upload" });
      fs.mkdir(IMAGES_DIR, { recursive: true }, function () {
        fs.writeFile(ifull, buf, function (err) {
          if (err) return sendJSON(res, 500, { error: err.message });
          sendJSON(res, 200, { ok: true, name: iname, url: "images/" + iname });
        });
      });
    });
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res, urlPath);
    return;
  }

  send(res, 405, "Method not allowed");
});

server.listen(PORT, function () {
  console.log("Pub quiz server running at http://localhost:" + PORT);
  console.log("  Slides:  http://localhost:" + PORT + "/index.html");
  console.log("  Admin:   http://localhost:" + PORT + "/admin.html");
});
