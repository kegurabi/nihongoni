import React, { useState, useRef, useEffect } from "react";
import wrongSoundUrl from "./assets/wrongSound.mp3";

export default function HiraganaQuizApp() {
  const [screen, setScreen] = useState("modeSelect");
  const [quizSet, setQuizSet] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showCorrect, setShowCorrect] = useState("");
  const [results, setResults] = useState([]);
  const [customSelection, setCustomSelection] = useState({});

  // Read mode controls
  const [readFilter, setReadFilter] = useState("all");
  const [readQuery, setReadQuery] = useState("");

  // audio-related
  const wrongSoundRef = useRef(new Audio(wrongSoundUrl));
  const audioContextRef = useRef(null); // for fallback beep
  const [soundUnlocked, setSoundUnlocked] = useState(false);

  // Small helper: create a short beep fallback using WebAudio
  const createBeepPlayer = () => ({
    play: async () => {
      try {
        if (!audioContextRef.current) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          audioContextRef.current = new AC();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === "suspended") try { await ctx.resume(); } catch {}
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
        osc.stop(ctx.currentTime + 0.2);
      } catch (err) {
        console.debug("beep play failed:", err);
      }
    }
  });

  // ensure fonts + small stylesheet for handwritten look are injected
  useEffect(() => {
    const id = "nihongo-handwritten-font";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Kosugi+Maru&display=swap";
      link.id = id;
      document.head.appendChild(link);

      const style = document.createElement("style");
      style.id = "nihongo-handwritten-style";
      style.innerHTML = `
        .hiragana-chart { 
          border-collapse: collapse; 
          width: 100%; 
          max-width: 900px; 
          margin: 0 auto 2rem;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .hiragana-chart th, .hiragana-chart td { 
          border: 1px solid #e5e7eb; 
          padding: 12px 8px; 
          text-align: center;
          vertical-align: middle;
        }
        @media (max-width: 640px) {
          .hiragana-chart th, .hiragana-chart td {
            padding: 8px 4px;
          }
        }
        .hiragana-chart th.left { 
          text-align: left; 
          padding-left: 16px; 
          font-weight: 700; 
          background: #fff7ed;
          color: #991b1b;
          white-space: nowrap;
        }
        .hiragana-chart thead th {
          background: #f8fafc;
          font-weight: 600;
          color: #1e293b;
        }
        .handwritten { 
          font-family: 'Kosugi Maru', system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; 
        }
        .hiragana-char { 
          font-size: clamp(20px, 4vw, 28px); 
          color: #c92a2a;
          margin-bottom: 4px;
        }
        .romaji { 
          font-size: clamp(10px, 2vw, 12px);
          color: #1d4ed8; 
          display: block;
          margin-top: 2px;
        }
        .enable-sound-btn { 
          position: fixed; 
          right: 12px; 
          top: 12px; 
          z-index: 1200; 
          background: #0369a1; 
          color: white; 
          border: none; 
          padding: 8px 10px; 
          border-radius: 6px; 
          cursor: pointer; 
        }
        .charts-container {
          padding: 1rem;
          max-height: calc(100vh - 200px);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
        .chart-section {
          margin-bottom: 2rem;
        }
        .chart-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1d4ed8;
          margin-bottom: 1rem;
          padding-left: 0.5rem;
          border-left: 4px solid #1d4ed8;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {};
  }, []);

  useEffect(() => {
    let createdAudio = wrongSoundRef.current || null;
    let replacedWithFallback = false;

    try {
      if (createdAudio) {
        createdAudio.preload = "auto";
        const onAudioError = () => {
          if (createdAudio) try { createdAudio.removeEventListener("error", onAudioError); } catch {}
          wrongSoundRef.current = createBeepPlayer();
          replacedWithFallback = true;
          console.warn("wrongSound asset failed to load — using fallback beep");
        };
        createdAudio.addEventListener("error", onAudioError);
        wrongSoundRef.current = createdAudio;
        try { createdAudio.load(); } catch (err) { console.debug("audio.load() failed:", err); }
      } else {
        wrongSoundRef.current = createBeepPlayer();
        replacedWithFallback = true;
      }
    } catch (err) {
      wrongSoundRef.current = createBeepPlayer();
      replacedWithFallback = true;
      console.warn("Failed to create HTMLAudio, using fallback beep:", err);
    }

    // Try to unlock on first user gesture
    const tryUnlock = async () => {
      if (!wrongSoundRef.current) return false;
      try {
        // Audio element or fallback supports play()
        const p = wrongSoundRef.current.play();
        if (p && typeof p.then === "function") {
          await p;
          if (createdAudio && !replacedWithFallback) {
            try { createdAudio.pause(); createdAudio.currentTime = 0; } catch {}
          }
        }
        return true;
      } catch (err) {
        return false;
      }
    };

    const onFirstInteraction = async () => {
      const ok = await tryUnlock();
      if (ok) setSoundUnlocked(true);
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };

    window.addEventListener("click", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });

    // if AudioContext created earlier, keep it; cleanup on unmount
    return () => {
      try {
        if (createdAudio) try { createdAudio.pause(); } catch {}
        if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {} audioContextRef.current = null; }
        wrongSoundRef.current = null;
      } catch {}
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  // explicit user-triggered unlock (reliable)
  const unlockAudio = async () => {
    try {
      // resume AudioContext if any
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        try { await audioContextRef.current.resume(); } catch {}
      }
      if (!wrongSoundRef.current) wrongSoundRef.current = new Audio(wrongSoundUrl);
      try {
        const p = wrongSoundRef.current.play();
        if (p && typeof p.then === "function") {
          await p;
          try { wrongSoundRef.current.pause(); wrongSoundRef.current.currentTime = 0; } catch {}
        }
        setSoundUnlocked(true);
      } catch (err) {
        // fallback: create and resume WebAudio then play beep
        wrongSoundRef.current = createBeepPlayer();
        await wrongSoundRef.current.play();
        setSoundUnlocked(true);
      }
    } catch (err) {
      console.debug("unlockAudio failed:", err);
    }
  };

  // Hiragana data and chart mapping for review table
  const basicChart = {
    "": ["あ","い","う","え","お"],
    k: ["か","き","く","け","こ"],
    s: ["さ","し","す","せ","そ"],
    t: ["た","ち","つ","て","と"],
    n: ["な","に","ぬ","ね","の"],
    h: ["は","ひ","ふ","へ","ほ"],
    m: ["ま","み","む","め","も"],
    y: ["や","","ゆ","","よ"],
    r: ["ら","り","る","れ","ろ"],
    w: ["わ","","","","を"]
  };

  const dakuonChart = {
    g: ["が","ぎ","ぐ","げ","ご"],
    z: ["ざ","じ","ず","ぜ","ぞ"],
    d: ["だ","ぢ","づ","で","ど"],
    b: ["ば","び","ぶ","べ","ぼ"]
  };

  const handakuonChart = {
    p: ["ぱ","ぴ","ぷ","ぺ","ぽ"]
  };

  const youonChart = {
    ky: ["きゃ","きゅ","きょ"],
    sh: ["しゃ","しゅ","しょ"],
    ch: ["ちゃ","ちゅ","ちょ"],
    ny: ["にゃ","にゅ","にょ"],
    hy: ["ひゃ","ひゅ","ひょ"],
    my: ["みゃ","みゅ","みょ"],
    ry: ["りゃ","りゅ","りょ"],
    gy: ["ぎゃ","ぎゅ","ぎょ"],
    j: ["じゃ","じゅ","じょ"],
    by: ["びゃ","びゅ","びょ"],
    py: ["ぴゃ","ぴゅ","ぴょ"]
  };
  const vowels = ["a","i","u","e","o"];
  const romajiMap = {
    "あ":"a","い":"i","う":"u","え":"e","お":"o",
    "か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
    "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so",
    "た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
    "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no",
    "は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
    "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo",
    "や":"ya","ゆ":"yu","よ":"yo",
    "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro",
    "わ":"wa","を":"wo","ん":"n"
  };

  // Extended groups: yōon (youon), dakuten (dakouon) and handakuten (handakouon)
  const youon = {
    'きゃ':'kya','きゅ':'kyu','きょ':'kyo',
    'しゃ':'sha','しゅ':'shu','しょ':'sho',
    'ちゃ':'cha','ちゅ':'chu','ちょ':'cho',
    'にゃ':'nya','にゅ':'nyu','にょ':'nyo',
    'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo',
    'みゃ':'mya','みゅ':'myu','みょ':'myo',
    'りゃ':'rya','りゅ':'ryu','りょ':'ryo',
    'ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
    'じゃ':'ja','じゅ':'ju','じょ':'jo',
    'びゃ':'bya','びゅ':'byu','びょ':'byo',
    'ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo'
  };

  const dakouon = {
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
    'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
    'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do',
    'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo'
  };

  const handakouon = {
    'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po'
  };

  // grouped dictionary used for read/filters and quizzes when requested
  const groups = {
    basic: romajiMap,
    youon,
    dakouon,
    handakouon
  };

  // other existing code (quiz start/check etc.)
  const allChars = Object.entries({ ...Object.fromEntries(Object.entries(romajiMap)) });

  // Mnemonics provided by user — map each hiragana to the mnemonic text
  const mnemonics = {
    // Vowels
    'あ': 'Apple 🍎',
    'い': 'Two lines “ii” 👀',
    'う': 'A man bending over “oo”',
    'え': 'Crooked E shape',
    'お': 'Octopus arm 🐙',
    // K-row
    'か': 'Kite 🎏',
    'き': 'Keys 🔑',
    'く': 'Cuckoo beak 🐤',
    'け': 'Keg 🍺',
    'こ': 'Co-ordinates ✏️',
    // S-row
    'さ': 'Samurai sword 🗡️',
    'し': 'Fish swimming 🐟',
    'す': 'Spiral 🍥',
    'せ': 'Sideways S',
    'そ': 'Sewing thread 🧵',
    // T-row
    'た': 'Top hat 🎩',
    'ち': 'Cheerleader 🎀',
    'つ': 'Tsunami wave 🌊',
    'て': 'Telephone pole ☎️',
    'と': 'Toe 🦶',
    // N-row
    'な': 'Nun praying 🙏',
    'に': 'Two needles 🪡',
    'ぬ': 'Noodle loop 🍜',
    'ね': 'Cat saying “neow!” 🐱',
    'の': 'Circle 🚫',
    // H-row
    'は': 'Happy face or house 🏠',
    'ひ': 'Smiling person 😆',
    'ふ': 'Blowing mountain 🌬️',
    'へ': 'Arrow up hill ⛰️',
    'ほ': 'Holy cross 🌿',
    // M-row
    'ま': 'Mama’s face 👩‍🍼',
    'み': 'Three lines 3️⃣',
    'む': 'Cow nose 🐮',
    'め': 'Eye 👁️',
    'も': 'Hook catching fish 🐟',
    // Y-row
    'や': 'Yak horns 🐂',
    'ゆ': 'Fishing hook 🎣',
    'よ': 'Letter Y sideways ✌️',
    // R-row
    'ら': 'Rabbit 🐇',
    'り': 'Two reeds 🌾',
    'る': 'Loop/ribbon 🎀',
    'れ': 'Raindrop 💧',
    'ろ': 'Road 🛣️',
    // W / special
    'わ': 'Wasp’s stinger 🐝',
    'を': 'Object particle “o” 🎯',
    'ん': 'Noodle tail 🍜'
  };

  const startQuiz = (type, customList = null) => {
    let selected = [];
    if (type === "custom") {
      selected = Object.entries(customSelection);
    } else if (type === "review" && customList) {
      selected = Object.entries(customList);
    } else if (type === 'all') {
      selected = Object.entries({ ...groups.basic, ...groups.youon, ...groups.dakouon, ...groups.handakouon });
    } else if (groups[type]) {
      selected = Object.entries(groups[type]);
    } else {
      // default to basic
      selected = Object.entries(groups.basic);
    }

    if (selected.length === 0) return alert("Please select some characters first.");
    setQuizSet(selected.sort(() => Math.random() - 0.5));
    setCurrent(0);
    setScore(0);
    setFinished(false);
    setFeedback(null);
    setShowCorrect("");
    setResults([]);
    setScreen("quiz");
  };

  const checkAnswer = () => {
    if (!quizSet.length) return;
    const correct = quizSet[current][1];
    const char = quizSet[current][0];
    const isCorrect = answer.trim().toLowerCase() === correct;
    if (isCorrect) setScore((s) => s + 1);
    else {
      setShowCorrect(correct);
      try {
        if (wrongSoundRef.current && typeof wrongSoundRef.current.play === "function") {
          try { wrongSoundRef.current.pause(); wrongSoundRef.current.currentTime = 0; } catch {}
          const p = wrongSoundRef.current.play();
          if (p && typeof p.then === "function") p.catch(() => {});
        } else if (wrongSoundRef.current && wrongSoundRef.current.play) {
          wrongSoundRef.current.play();
        }
      } catch (err) { console.error("Audio playback failed:", err); }
    }
    setFeedback(isCorrect ? "correct" : "wrong");
    setResults((prev) => [...prev, { char, user: answer.trim().toLowerCase(), correct, isCorrect }]);
    setTimeout(() => {
      if (current + 1 < quizSet.length) {
        setCurrent((c) => c + 1);
        setAnswer(""); setFeedback(null); setShowCorrect("");
      } else { setFinished(true); setScreen("finished"); }
    }, 1200);
  };

  const toggleCharacter = (char, romaji) => {
    setCustomSelection((prev) => {
      const updated = { ...prev };
      if (updated[char]) delete updated[char];
      else updated[char] = romaji;
      return updated;
    });
  };

  const resetToMenu = () => {
    setScreen("menu"); setQuizSet([]); setAnswer(""); setFeedback(null); setShowCorrect(""); setResults([]); setCustomSelection({});
  };

  const readData = () => {
    let entries = Object.entries(romajiMap);
    if (readFilter && readFilter !== "all") {
      // pick the selected group (basic/youon/dakouon/handakouon)
      entries = Object.entries(groups[readFilter] || {});
    } else if (readFilter === 'all') {
      // merge all groups for 'all'
      entries = Object.entries({ ...groups.basic, ...groups.youon, ...groups.dakouon, ...groups.handakouon });
    }
    if (readQuery && readQuery.trim()) {
      const q = readQuery.trim().toLowerCase();
      entries = entries.filter(([ch, rom]) => ch.includes(q) || rom.includes(q));
    }
    return entries;
  };

  const wrongAnswers = results.filter((r) => !r.isCorrect);
  const wrongSet = Object.fromEntries(wrongAnswers.map((r) => [r.char, r.correct]));
  const handleQuizKey = (e) => { if (e.key === "Enter") { e.preventDefault(); checkAnswer(); } };

  // UI: show Enable sound button when not unlocked
  const enableSoundButton = !soundUnlocked ? (
    <button className="enable-sound-btn" onClick={unlockAudio}>Enable sound</button>
  ) : null;

  // screens
  if (screen === "modeSelect") {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-6">
        {enableSoundButton}
        <div className="max-w-4xl w-full">
          <h1 className="text-5xl font-bold mb-6 text-red-600 text-center">Choose Learning Mode</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => setScreen("readMode")} className="p-6 rounded-2xl bg-yellow-100 border-2 border-red-400 shadow hover:scale-105 transition">
              <div className="text-2xl font-semibold mb-2">Read / Review</div>
              <div className="text-sm">Study characters with hints and quick search.</div>
            </button>
            <button onClick={() => setScreen("menu")} className="p-6 rounded-2xl bg-white border-2 border-blue-400 shadow hover:scale-105 transition">
              <div className="text-2xl font-semibold mb-2">Quiz Mode</div>
              <div className="text-sm">Take quizzes (basic / custom / wrong-only).</div>
            </button>
            <button onClick={() => setScreen("writeMode")} className="p-6 rounded-2xl bg-blue-100 border-2 border-blue-500 shadow hover:scale-105 transition">
              <div className="text-2xl font-semibold mb-2">Practice (coming)</div>
              <div className="text-sm">Stroke order & tracing (coming next).</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "readMode") {
    // render chart table like image
    return (
      <div className="min-h-screen bg-[#FFF8F0] p-6">
        {enableSoundButton}
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setScreen("modeSelect")} className="px-4 py-2 bg-blue-400 text-white rounded">← Back</button>
            <h1 className="text-3xl font-bold text-red-600">Hiragana Characters</h1>
            <div />
          </div>

          <div className="flex gap-3 items-center mb-4">
            <div className="flex space-x-2">
              {['all','basic','youon','dakouon','handakouon'].map((g) => (
                <button key={g} onClick={() => setReadFilter(g)}
                  className={`px-3 py-2 rounded ${readFilter === g ? 'bg-red-600 text-white' : 'bg-yellow-100 text-red-700'}`}>
                  {g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input value={readQuery} onChange={(e) => setReadQuery(e.target.value)} placeholder="Search Hiragana or Romaji... (e.g., か or ka)"
                className="px-3 py-2 rounded border" />
              <button onClick={() => { setReadQuery(''); setReadFilter('all'); }} className="px-3 py-2 rounded bg-gray-200">Reset</button>
            </div>
          </div>

          <div className="charts-container">
            {/* Dakuon Chart (Voiced Consonants) */}
            <div className="chart-section">
              <h3 className="chart-title">Dakuon (Voiced Consonants)</h3>
              <table className="hiragana-chart">
                <thead>
                  <tr>
                    <th className="left"></th>
                    <th>a</th><th>i</th><th>u</th><th>e</th><th>o</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(dakuonChart).map(([cons, cells]) => (
                    <tr key={cons}>
                      <th className="left">{cons}</th>
                      {cells.map((ch, idx) => {
                        const rom = dakouon[ch];
                        return (
                          <td key={idx}>
                            <div className="hiragana-char handwritten">{ch}</div>
                            <span className="romaji">{rom}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Handakuon Chart (Semi-Voiced Consonants) */}
            <div className="chart-section">
              <h3 className="chart-title">Handakuon (Semi-Voiced Consonants)</h3>
              <table className="hiragana-chart">
                <thead>
                  <tr>
                    <th className="left"></th>
                    <th>a</th><th>i</th><th>u</th><th>e</th><th>o</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(handakuonChart).map(([cons, cells]) => (
                    <tr key={cons}>
                      <th className="left">{cons}</th>
                      {cells.map((ch, idx) => {
                        const rom = handakouon[ch];
                        return (
                          <td key={idx}>
                            <div className="hiragana-char handwritten">{ch}</div>
                            <span className="romaji">{rom}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Youon Chart (Contracted Sounds) */}
            <div className="chart-section">
              <h3 className="chart-title">Youon (Contracted Sounds)</h3>
              <table className="hiragana-chart">
                <thead>
                  <tr>
                    <th className="left"></th>
                    {['ya (ゃ)', 'yu (ゅ)', 'yo (ょ)'].map((v, idx) => (
                      <th key={idx}>{v}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(youonChart).map(([cons, cells]) => (
                    <tr key={cons}>
                      <th className="left">{cons}</th>
                      {cells.map((ch, idx) => {
                        const rom = youon[ch];
                        return (
                          <td key={idx}>
                            <div className="hiragana-char handwritten">{ch}</div>
                            <span className="romaji">{rom}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Basic Chart */}
            <div className="chart-section">
              <h3 className="chart-title">Basic Hiragana</h3>
              <table className="hiragana-chart">
                <thead>
                  <tr>
                    <th className="left"></th>
                    <th>a</th><th>i</th><th>u</th><th>e</th><th>o</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(basicChart).map(([cons, cells]) => (
                    <tr key={cons}>
                      <th className="left">{cons === "" ? "∅" : cons}</th>
                      {cells.map((ch, idx) => {
                        const rom = ch ? romajiMap[ch] : "";
                        return (
                          <td key={idx}>
                            {ch ? <div className="hiragana-char handwritten">{ch}</div> : ""}
                            {rom && <span className="romaji">{rom}</span>}
                            {ch ? <div className="text-xs text-gray-600 mt-1">{mnemonics[ch] || ''}</div> : <div className="text-xs text-gray-400">—</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <th className="left">n</th>
                    <td colSpan={5}>
                      <div className="hiragana-char handwritten">ん</div>
                      <div className="romaji">n</div>
                      <div className="text-xs text-gray-600 mt-1">{mnemonics['ん'] || ''}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Character list controlled by the filter/search so users can view youon/dakouon/handakouon and add to custom selection */}
          <div className="mt-6" style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <h2 className="text-xl font-semibold mb-2">Characters — {readFilter === 'all' ? 'All' : readFilter.charAt(0).toUpperCase() + readFilter.slice(1)}</h2>
            <div className="grid grid-cols-10 gap-2 bg-white border-2 border-blue-500 p-4 rounded-lg shadow-inner max-h-64 overflow-y-auto">
              {readData().map(([char, rom]) => (
                <div key={char} onClick={() => toggleCharacter(char, rom)}
                  className={`p-2 rounded text-xl cursor-pointer border ${customSelection[char] ? 'bg-red-300 border-red-500 text-white' : 'bg-yellow-50 border-red-300 text-red-700 hover:bg-yellow-100'}`}>
                  <div className="handwritten">{char}</div>
                  <div className="text-xs mt-1">{rom}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={()=>setScreen('modeSelect')} className="px-4 py-2 bg-red-500 text-white rounded">Back</button>
            <button onClick={()=>startQuiz(readFilter === 'all' ? 'all' : readFilter)} className="px-4 py-2 bg-blue-600 text-white rounded">Quiz Selection</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-6">
        {enableSoundButton}
        <div className="max-w-3xl w-full text-center">
          <h1 className="text-4xl font-bold mb-6 text-red-600">Hiragana Quiz — Choose Category</h1>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={() => startQuiz('basic')} className="py-3 rounded-lg bg-yellow-100 border-2 border-red-400">Basic</button>
            <button onClick={() => startQuiz('youon')} className="py-3 rounded-lg bg-yellow-100 border-2 border-red-400">Youon</button>
            <button onClick={() => startQuiz('dakouon')} className="py-3 rounded-lg bg-yellow-100 border-2 border-red-400">Dakouon</button>
            <button onClick={() => startQuiz('handakouon')} className="py-3 rounded-lg bg-yellow-100 border-2 border-red-400">Handakouon</button>
            <button onClick={() => startQuiz('all')} className="py-3 rounded-lg bg-yellow-100 border-2 border-red-400 col-span-2">All Characters</button>
            <button onClick={() => setScreen('custom')} className="py-3 rounded-lg bg-blue-100 border-2 border-blue-400 col-span-2">Customized</button>
          </div>
          <div className="flex justify-center gap-4">
            <button onClick={()=>setScreen('modeSelect')} className="px-4 py-2 rounded bg-red-500 text-white">Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "custom") {
    const allChars = Object.entries(romajiMap);
    return (
      <div className="min-h-screen bg-[#FFF8F0] p-6">
        {enableSoundButton}
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl text-red-600 font-bold mb-4">Select Characters for Custom Quiz</h2>
          <div className="grid grid-cols-10 gap-2 bg-white border-2 border-blue-500 p-4 rounded-lg shadow-inner mb-4 max-h-96 overflow-y-auto">
            {allChars.map(([char, rom]) => (
              <div key={char} onClick={() => toggleCharacter(char, rom)} className={`p-2 rounded text-xl cursor-pointer border ${customSelection[char] ? 'bg-red-300 border-red-500 text-white' : 'bg-yellow-50 border-red-300 text-red-700 hover:bg-yellow-100'}`}>
                <span className="handwritten">{char}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={()=>startQuiz('custom')} className="px-4 py-2 bg-red-500 text-white rounded">Start Custom Quiz</button>
            <button onClick={()=>setScreen('menu')} className="px-4 py-2 bg-blue-400 text-white rounded">Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "quiz") {
    const item = quizSet[current] || ["",""];
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-6">
        {enableSoundButton}
        <div className="text-center">
          <div className="text-8xl text-red-600 font-bold mb-6 handwritten">{item[0]}</div>
          <input value={answer} onChange={(e)=>setAnswer(e.target.value)} onKeyDown={handleQuizKey}
            className={`border-4 text-2xl p-3 rounded-xl text-center w-56 mb-4 focus:outline-none transition ${feedback === 'correct' ? 'border-green-500 bg-green-100' : feedback === 'wrong' ? 'border-red-500 bg-red-100' : 'border-red-500'}`}
            placeholder="type romaji and press Enter" autoFocus />
          <div className="flex gap-3 justify-center mb-3">
            <button onClick={checkAnswer} className="px-4 py-2 bg-red-500 text-white rounded">Submit</button>
            <button onClick={resetToMenu} className="px-4 py-2 bg-blue-400 text-white rounded">Quit</button>
          </div>
          {feedback === 'wrong' && <div className="text-red-600 mb-2">❌ Correct answer: {showCorrect}</div>}
          <div className="text-yellow-700">Question {current+1} of {quizSet.length} — Score: {score}</div>
        </div>
      </div>
    );
  }

  if (screen === "finished") {
    return (
      <div className="min-h-screen bg-[#FFF8F0] p-6 flex items-center justify-center">
        {enableSoundButton}
        <div className="max-w-3xl w-full text-center">
          <h2 className="text-4xl text-red-600 font-bold mb-4">Quiz Finished!</h2>
          <p className="text-2xl text-blue-700 mb-6">Your score: {score} / {quizSet.length}</p>
          <div className="bg-white border p-4 rounded mb-6">
            <h3 className="text-lg font-semibold mb-2">Results Summary</h3>
            <ul className="text-left max-h-48 overflow-y-auto space-y-2">
              {results.map((r,i) => (
                <li key={i} className={r.isCorrect ? 'text-green-600' : 'text-red-600'}>{r.char} → {r.user || '(blank)'} {r.isCorrect ? '✅' : `❌ (Correct: ${r.correct})`}</li>
              ))}
            </ul>
          </div>
          <div className="flex gap-3 justify-center mb-4">
            <button onClick={()=>setScreen('readMode')} className="px-4 py-2 bg-yellow-300 text-red-800 rounded">Review All</button>
            {results.some(r=>!r.isCorrect) && <button onClick={()=>startQuiz('review', wrongSet)} className="px-4 py-2 bg-red-500 text-white rounded">Quiz Wrong Only</button>}
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={resetToMenu} className="px-4 py-2 bg-red-500 text-white rounded">Back to Menu</button>
            <button onClick={()=>setScreen('modeSelect')} className="px-4 py-2 bg-blue-400 text-white rounded">Change Mode</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
