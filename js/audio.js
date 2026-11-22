
(function () {
  "use strict";

  var audio = document.getElementById("bgm");
  if (!audio) return;

  var KEY = "inkwell-bgm";
  var saved = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch (err) {
    saved = {};
  }

  var wantPlay = typeof saved.wantPlay === "boolean" ? saved.wantPlay : true;
  var leaving = false;
  var lastSave = 0;

  audio.loop = true;
  audio.volume = typeof saved.vol === "number" ? saved.vol : 0.5;

  function save() {
    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({
          wantPlay: wantPlay,
          t: audio.currentTime,
          vol: audio.volume,
          ts: Date.now()
        })
      );
    } catch (err) {
      /* storage unavailable: music still works, it just restarts per page */
    }
  }

  /* Work out where the loop would be by now. */
  function resumePosition() {
    if (typeof saved.t !== "number") return 0;
    var t = saved.t;
    if (saved.wantPlay !== false && typeof saved.ts === "number") {
      t += (Date.now() - saved.ts) / 1000;
    }
    if (isFinite(audio.duration) && audio.duration > 0) {
      t = t % audio.duration;
    }
    return t;
  }

  function tryPlay() {
    if (!wantPlay) return;
    var attempt = audio.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(armGesture); /* autoplay blocked: wait for a click */
    }
  }

  var gestureEvents = ["pointerdown", "keydown", "touchstart"];

  function onGesture(event) {
    /* Let the native play/pause button do its own thing. */
    if (event.target === audio || audio.contains(event.target)) {
      disarmGesture();
      return;
    }
    disarmGesture();
    if (wantPlay && audio.paused) {
      audio.play().catch(function () {});
    }
  }

  function armGesture() {
    gestureEvents.forEach(function (name) {
      document.addEventListener(name, onGesture, true);
    });
  }

  function disarmGesture() {
    gestureEvents.forEach(function (name) {
      document.removeEventListener(name, onGesture, true);
    });
  }

  audio.addEventListener("play", function () {
    wantPlay = true;
    disarmGesture();
    save();
  });

  audio.addEventListener("pause", function () {
    if (leaving) return; /* page is closing, not a real pause */
    wantPlay = false;
    save();
  });

  audio.addEventListener("volumechange", save);

  audio.addEventListener("timeupdate", function () {
    var now = Date.now();
    if (now - lastSave > 1000) {
      lastSave = now;
      save();
    }
  });

  window.addEventListener("pagehide", function () {
    leaving = true;
    save();
  });

  window.addEventListener("beforeunload", function () {
    leaving = true;
    save();
  });

  function start() {
    var pos = resumePosition();
    if (pos > 0) {
      try {
        audio.currentTime = pos;
      } catch (err) {
        /* ignore: some browsers refuse until more data has loaded */
      }
    }
    tryPlay();
  }

  if (audio.readyState >= 1) {
    start();
  } else {
    audio.addEventListener("loadedmetadata", start, { once: true });
  }
})();
