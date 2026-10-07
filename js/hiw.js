/* potaterrr.github.io — "How it works" pipeline demos.
   SVG node-graph canvas styled after a flow-visualizer: dotted grid,
   node rects, animated flow-light edges, hover "Purpose" tooltips.
   Vanilla JS, zero dependencies, zero APIs. The voice-receptionist data
   mirrors simulator/payload-*.json in the voice-receptionist repo. All
   visitor-derived text is inserted with textContent only. */
(function () {
  "use strict";

  const hiwRoot = document.getElementById("hiw");
  if (!hiwRoot) return;

  const still = () =>
    document.documentElement.classList.contains("reduce-motion") ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const rawSleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const emailOf = (name, company) => {
    const local = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".") || "lead";
    const domain = company.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || "example";
    return local + "@" + domain + ".com";
  };

  const tomorrow1400 = () => {
    const d = new Date(Date.now() + 86400000);
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T14:00";
  };

  /* ---------- shared visual builders (detail panel) ---------- */

  const hint = (v, text) =>
    v.appendChild(el("p", "hiw-hint", text || "▶ run the pipeline to populate this stage"));

  const logBlock = (v, lines) => {
    const box = el("div", "hiw-log");
    lines.forEach((l) => box.appendChild(el("div", null, l)));
    v.appendChild(box);
  };

  const board = (v, leadName, stage) => {
    const cols = ["TO DO", "Draft Done", "Follow-up Sent"];
    const wrap = el("div", "hiw-board");
    cols.forEach((label, ci) => {
      const col = el("div", "hiw-col");
      col.appendChild(el("h4", null, label));
      const live =
        (ci === 0 && stage === "todo") ||
        (ci === 1 && stage === "draft") ||
        (ci === 2 && stage === "sent");
      if (live) col.appendChild(el("div", "hiw-lead is-live", "⭐ " + leadName));
      if (ci === 0) {
        ["Kwento.ph editorial calendar", "Northwind Cafe loyalty bot"].forEach((t) =>
          col.appendChild(el("div", "hiw-lead", t))
        );
      }
      if (ci === 1) col.appendChild(el("div", "hiw-lead is-old", "yesterday's lead"));
      wrap.appendChild(col);
    });
    v.appendChild(wrap);
  };

  const boardNote = (v, text) => v.appendChild(el("p", "hiw-board-note", text));

  const mailCard = (v, lead, body) => {
    const card = el("div", "hiw-mail");
    const head = el("div", "hiw-mail-head");
    head.appendChild(el("span", "hiw-mail-tag", "DRAFT — never auto-sent"));
    card.appendChild(head);
    card.appendChild(el("div", "hiw-mail-row", "To: " + emailOf(lead.name, lead.company)));
    card.appendChild(el("div", "hiw-mail-row", "Subject: 🔍 Quick check-in — " + lead.company));
    const bodyEl = el("div", "hiw-mail-body");
    bodyEl.textContent = body;
    card.appendChild(bodyEl);
    const cta = el("span", "hiw-cta", "Schedule a call");
    cta.title = "Demo button — the real one links to my booking form";
    card.appendChild(cta);
    v.appendChild(card);
  };

  const callCard = (v, sc) => {
    const c = el("div", "hiw-call");
    c.appendChild(el("div", "hiw-call-line", "📞 incoming call · " + sc.num));
    c.appendChild(el("div", "hiw-call-sub", "🔇 missed / after hours — Vapi voice agent picks up"));
    v.appendChild(c);
  };

  /* ---------- demo 1 · Dead Lead Follow-up (n8n) ---------- */

  const dlfEmail = (lead) =>
    "Hi " + lead.name + ",\n\n" +
    "It's been a few weeks since we talked about " + lead.interest + " over at " + lead.company +
    " — I wanted to check in and see whether that's still on your radar.\n\n" +
    "If it is, I'd love to hear how things are going:\n" +
    "— what you ended up doing about " + lead.interest + "\n" +
    "— where " + lead.company + " is spending the most manual time now\n\n" +
    "Worth a quick call?\n\n" +
    "Potater";

  const DLF = {
    ready: "Ready — hit “Run the pipeline” or click any node.",
    done: "Pipeline complete — AI drafted, human approved, nothing auto-sent. 🥔",
    stages: [
      {
        icon: "⏰", name: "Schedule Trigger", short: "Schedule Trigger",
        type: "n8n · scheduleTrigger", pause: 950,
        desc: "The pipeline wakes up every morning at 10:00 — nobody clicks anything.",
        tip: ["Fires daily at 10:00, Asia/Manila.", "No clicks, no cron-fu."],
        build(v) {
          logBlock(v, [
            "› workflow activated · cron 0 10 * * 1-5",
            "› timezone: Asia/Manila",
            "› trigger fired — starting run",
          ]);
        },
      },
      {
        icon: "📋", name: "Get Dead Leads", short: "Get Dead Leads",
        type: "n8n · clickUp.getAll", pause: 1200,
        desc: "Pulls every task still marked TO DO from the ClickUp list — the board is the database.",
        tip: ["Fetches ClickUp tasks still marked", "TO DO — filter runs server-side."],
        build(v, ctx) {
          board(v, ctx.lead.name, "todo");
          boardNote(v, "server-side filter: status = TO DO · lead queued with 2 others");
        },
      },
      {
        icon: "✍️", name: "Generate AI Follow-up", short: "AI Follow-up",
        type: "langchain · aiAgent", pause: 600,
        desc: "An LLM writes a short, warm check-in from the lead's custom fields. Prompt rules forbid invented links or names.",
        tip: ["LLM writes a short check-in from", "name, company and interest notes."],
        build(v, ctx) {
          v.appendChild(el("p", "hiw-model", "openrouter · google/gemini-2.5-flash-lite"));
          const out = el("div", "hiw-type");
          v.appendChild(out);
          const text = dlfEmail(ctx.lead);
          if (!ctx.live || still()) {
            out.textContent = text;
            out.classList.add("done");
            return null;
          }
          const isLive = ctx.token;
          return new Promise((done) => {
            let i = 0;
            const step = Math.max(2, Math.round(text.length / 90));
            const tick = () => {
              if (!isLive()) { done(); return; }
              i = Math.min(text.length, i + step);
              out.textContent = text.slice(0, i);
              if (i < text.length) {
                setTimeout(tick, 24);
              } else {
                out.classList.add("done");
                done();
              }
            };
            tick();
          });
        },
      },
      {
        icon: "📨", name: "Create a draft", short: "Create a draft",
        type: "n8n · gmail.draft", pause: 1300,
        desc: "Files the email as a Gmail draft with a booking button — and never sends it.",
        tip: ["Files a Gmail draft with a booking", "button. Never auto-sends."],
        build(v, ctx) {
          mailCard(v, ctx.lead, dlfEmail(ctx.lead));
        },
      },
      {
        icon: "🏷️", name: "Set Draft Done", short: "Set Draft Done",
        type: "n8n · clickUp.update", pause: 1100,
        desc: "The task flips to Draft Done in the same run, so tomorrow's sweep never double-drafts.",
        tip: ["Flips the task to Draft Done so", "tomorrow's run skips it."],
        build(v, ctx) {
          board(v, ctx.lead.name, "draft");
          boardNote(v, "duplicate protection: status advance + draft existence = one draft per lead");
        },
      },
      {
        icon: "🫵", name: "You", short: "You",
        type: "human in the loop", pause: 1200,
        desc: "The only unskippable step: a person opens the draft, edits if needed, and hits send. AI drafts; human approves.",
        tip: ["A human reads, edits and sends.", "AI drafts; human approves."],
        build(v, ctx) {
          mailCard(v, ctx.lead, dlfEmail(ctx.lead));
          const gate = el("div", "hiw-gate");
          gate.appendChild(el("p", "hiw-gate-text", "📤 1 draft waiting for review — nothing sends itself."));
          const btn = el("button", "hiw-gate-btn", "✅ Approve & send (the human part)");
          btn.type = "button";
          gate.appendChild(btn);
          v.appendChild(gate);
          const finish = () => {
            v.textContent = "";
            board(v, ctx.lead.name, "sent");
            boardNote(v, "✉️ sent by a human — lifecycle: TO DO → Draft Done → Follow-up Sent");
            ctx.status("📮 Draft sent — lead resurrected. 🥔");
          };
          if (!ctx.live) {
            btn.addEventListener("click", finish, { once: true });
            return null;
          }
          const isLive = ctx.token;
          return new Promise((done) => {
            btn.addEventListener(
              "click",
              () => {
                if (!isLive()) { done(); return; }
                finish();
                done();
              },
              { once: true }
            );
          });
        },
      },
    ],
  };

  /* ---------- demo 2 · AI Voice Receptionist (Make / n8n / Zapier) ---------- */

  const SCENARIOS = {
    bookable: {
      num: "+63 917 123 4567", name: "Maria Santos",
      intent: "book_appointment", service: "haircut",
      slot: "TOMORROW_1400", bad: false,
      transcript: [
        ["ai", "Thank you for calling Potaterrr Salon, how may I help you?"],
        ["cu", "Hi, I'd like to book a haircut tomorrow afternoon."],
        ["ai", "Sure! May I get your name?"],
        ["cu", "Maria Santos."],
        ["ai", "Any time preference?"],
        ["cu", "Around 2 PM please."],
      ],
      summary: "Maria Santos wants a haircut at 2 PM tomorrow.",
      logline: "[bookable] call logged · calendar event created ✓",
      alert: "🤖 Salon bot → owner: ✅ Booked a haircut for Maria Santos — tomorrow 14:00. Calendar updated.",
    },
    question: {
      num: "+63 920 111 1222", name: "—",
      intent: "question", service: "hair_color",
      slot: null, bad: false,
      transcript: [
        ["ai", "Thank you for calling Potaterrr Salon, how may I help you?"],
        ["cu", "How much is hair color?"],
        ["ai", "Hair color starts at 1,200 pesos and takes about 90 minutes."],
        ["cu", "Okay, I'll think about it, thanks!"],
      ],
      summary: "Caller asked about hair color pricing, no booking made.",
      logline: "[no_booking] call logged · no event created",
      alert: "🤖 Salon bot → owner: 💬 Caller asked about hair-color pricing — no booking, flagged for follow-up.",
    },
    invalid: {
      num: "+63 927 333 4444", name: "Ana Reyes",
      intent: "book_appointment", service: "manicure",
      slot: "2026-08-24T10:00", bad: true,
      transcript: [
        ["ai", "Thank you for calling Potaterrr Salon, how may I help you?"],
        ["cu", "I want a manicure last Monday morning."],
        ["ai", "I'm sorry, I can only book future appointments."],
        ["cu", "Ah okay, forget it then."],
      ],
      summary: "Ana Reyes asked for a past slot; not bookable, needs follow-up.",
      logline: "[conflict] call logged · flagged for human follow-up",
      alert: "🤖 Salon bot → owner: ⚠️ Ana Reyes asked for a past slot — needs human follow-up.",
    },
  };

  const VR = {
    ready: "Ready — pick a call, then hit “Run the call” or click any node.",
    done: "Call handled end-to-end — the caller never waited, the owner never lifted a finger. 🥔",
    stages: [
      {
        icon: "📵", name: "Missed call → Vapi", short: "Missed call",
        type: "Vapi + Twilio", pause: 1200,
        desc: "Nobody picks up, or it's after hours. Twilio hands the call to a Vapi voice agent that answers instantly — 24/7.",
        tip: ["Twilio routes the missed call to a", "Vapi agent — answers 24/7."],
        build(v, ctx) {
          callCard(v, ctx.sc);
        },
      },
      {
        icon: "🗣️", name: "Conversation", short: "Conversation",
        type: "Vapi assistant", pause: 2100,
        desc: "Natural chat: answers service and pricing questions from the salon config, and captures name, number, intent and preferred slot as structured data.",
        tip: ["Captures name, number, intent and", "slot as structured data."],
        build(v, ctx) {
          v.appendChild(el("p", "hiw-model", "🎙 vapi assistant · Potaterrr Salon"));
          const wrap = el("div", "hiw-chat");
          ctx.sc.transcript.forEach(([who, text], i) => {
            const b = el("div", "hiw-bubble " + who, (who === "ai" ? "🤖 " : "🙋 ") + text);
            b.style.transitionDelay = still() ? "0ms" : i * 260 + "ms";
            wrap.appendChild(b);
            requestAnimationFrame(() =>
              requestAnimationFrame(() => b.classList.add("show"))
            );
          });
          v.appendChild(wrap);
        },
      },
      {
        icon: "🧾", name: "End-of-call report", short: "Call report",
        type: "webhook · POST", pause: 1500,
        desc: "Vapi POSTs one structured JSON report to the branch webhook. Same contract whether the branch runs on Make, n8n or Zapier — swap platforms by changing a single URL.",
        tip: ["One JSON contract POSTed to the", "branch webhook (Make/n8n/Zapier)."],
        build(v, ctx) {
          const sc = ctx.sc;
          const payload = {
            message: {
              type: "end-of-call-report",
              endedReason: "customer-ended-call",
              call: { id: "sim-web-001", customer: { number: sc.num.replace(/\s/g, "") } },
              artifact: {
                structuredData: {
                  caller_name: sc.name === "—" ? null : sc.name,
                  callback_number: sc.num.replace(/\s/g, ""),
                  intent: sc.intent,
                  service: sc.service,
                  preferred_slot: sc.slot === "TOMORROW_1400" ? tomorrow1400() : sc.slot,
                },
              },
              summary: sc.summary,
            },
          };
          v.appendChild(el("p", "hiw-model", (PLATFORM_LABEL[ctx.platform] || "Branch webhook") + " · receives this report"));
          v.appendChild(el("p", "hiw-model", "POST /webhook · content-type: application/json"));
          v.appendChild(el("pre", "hiw-json", JSON.stringify(payload, null, 2)));
        },
      },
      {
        icon: "🔍", name: "Conflict-check", short: "Conflict-check",
        type: "Google Calendar · freebusy", pause: 1400,
        desc: "Booking intent? The pipeline checks the calendar before touching anything. Questions skip straight to logging.",
        tip: ["Checks Google Calendar freebusy", "before touching anything."],
        build(v, ctx) {
          const sc = ctx.sc;
          if (sc.intent === "book_appointment") {
            const cal = el("div", "hiw-cal");
            ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"].forEach((h) => {
              const chip = el(
                "span",
                "hiw-hour" + (h === "10:00" || h === "13:00" ? " is-busy" : ""),
                h
              );
              if (h === "14:00" && !sc.bad) chip.classList.add("is-target");
              cal.appendChild(chip);
            });
            if (sc.bad) cal.appendChild(el("span", "hiw-hour is-bad", "← " + sc.slot.slice(11) + " (past)"));
            v.appendChild(cal);
            const verdict = el(
              "p",
              "hiw-verdict",
              sc.bad
                ? "✗ requested slot is in the past — not bookable."
                : "✓ 14:00 tomorrow is free — booking it."
            );
            if (sc.bad) verdict.style.color = "#e5534b";
            v.appendChild(verdict);
          } else {
            v.appendChild(el("p", "hiw-verdict", "ℹ️ intent = question → no slot to check; logging for follow-up."));
          }
        },
      },
      {
        icon: "📅", name: "Book & log", short: "Book & log",
        type: "Google Calendar + log store", pause: 1400,
        desc: "Free slot → the event “Salon: {service} — {name}” is created and the call is logged. Taken, past, or no booking? Logged as conflict / no_booking for the record.",
        tip: ["Books the slot — or logs it as", "no_booking / conflict."],
        build(v, ctx) {
          const sc = ctx.sc;
          if (sc.intent === "book_appointment" && !sc.bad) {
            v.appendChild(
              el("div", "hiw-event", "📅 Salon: " + sc.service + " — " + sc.name + " · tomorrow 14:00–14:45 (Asia/Manila)")
            );
          }
          logBlock(v, [sc.logline]);
        },
      },
      {
        icon: "📣", name: "Owner alert", short: "Owner alert",
        type: "Telegram / Gmail", pause: 1100,
        desc: "The owner gets a summary the second the call ends — zero missed leads, zero phone tag. The channel is just a config value per branch.",
        tip: ["Owner gets a Telegram / Gmail", "summary instantly."],
        build(v, ctx) {
          v.appendChild(el("p", "hiw-model", CHANNEL_LABEL[ctx.platform] || "Alert channel"));
          v.appendChild(el("div", "hiw-tg", ctx.sc.alert));
        },
      },
    ],
  };

  /* ---------- per-panel state + input readers ---------- */

  const state = { dlf: { runId: 0 }, vr: { runId: 0 } };

  const readLead = (panel) => {
    const val = (id, fb) => {
      const n = panel.querySelector("#" + id);
      const t = n ? n.value.trim() : "";
      return t || fb;
    };
    return {
      name: val("hiw-lead-name", "Bea Mendoza"),
      company: val("hiw-lead-company", "Sunnyside Prints"),
      interest: val("hiw-lead-interest", "automating their Etsy order fulfilment"),
    };
  };

  const activeScenario = (panel) => {
    const chip = panel.querySelector(".hiw-chip.is-active");
    return SCENARIOS[(chip && chip.getAttribute("data-scenario")) || "bookable"];
  };

  const DEMOS = { dlf: DLF, vr: VR };

  const NODE_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#06b6d4", "#f59e0b", "#ec4899"];
  const PER_LINK = 4;
  const CW = 640;
  const CH = 300;

  const cssVar = (name, fb) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  };

  const PLATFORM_LABEL = {
    make: "Make.com scenario",
    n8n: "n8n · self-hosted",
    zapier: "Zapier Catch Hook",
  };

  const CHANNEL_LABEL = {
    make: "Make → Telegram bot (Data Store config)",
    n8n: "n8n → Telegram bot (Config node)",
    zapier: "Zapier → Gmail alert",
  };

  /* ---------- canvas flow engine (ForceGraph-style, dependency-free) ---------- */

  function buildFlow(canvas, hooks) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CW * dpr;
    canvas.height = CH * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const nodes = [];   /* filled by init(demo) */
    const edges = [];
    let sel = -1;
    let active = -1;
    const done = new Set();
    let hover = -1;
    let velocity = 1;
    let paused = false;
    let job = null; /* { edge, t, speed } */
    let pal = null;
    let palAge = 99;
    let raf = null;
    let running = true;

    const bez = (e, t) => {
      const u = 1 - t;
      const x = u * u * e.x0 + 2 * u * t * e.cx + t * t * e.x1;
      const y = u * u * e.y0 + 2 * u * t * e.cy + t * t * e.y1;
      return { x, y };
    };

    const refreshPal = () => {
      pal = {
        border: cssVar("--border", "#232c3a"),
        text: cssVar("--text", "#e6edf3"),
        muted: cssVar("--muted", "#94a3b8"),
        accent: cssVar("--accent", "#f0b429"),
        green: cssVar("--green", "#2ea886"),
        surface: cssVar("--surface", "#161d28"),
      };
      palAge = 0;
    };

    const init = (demo) => {
      nodes.length = 0;
      edges.length = 0;
      demo.stages.forEach((s, i) => {
        nodes.push({ x: 70 + i * 100, y: 150, color: NODE_COLORS[i % NODE_COLORS.length], icon: s.icon, label: s.short || s.name, sub: s.type || "" });
      });
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i];
        const b = nodes[i + 1];
        edges.push({
          x0: a.x + 24, y0: a.y, x1: b.x - 24, y1: b.y,
          cx: (a.x + b.x) / 2, cy: a.y - 13,
          ts: [0, 0.25, 0.5, 0.75].map((o) => o),
          active: false,
        });
      }
      refreshPal();
    };

    const drawNode = (n, i) => {
      const isSel = i === sel;
      const isActive = i === active;
      /* outer halo ring */
      ctx.beginPath();
      ctx.arc(n.x, n.y, 27, 0, Math.PI * 2);
      ctx.strokeStyle = n.color + (isActive ? "66" : "26");
      ctx.lineWidth = 3;
      if (isActive) {
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 16;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      /* selection ring */
      if (isSel) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.arc(n.x, n.y, 33, 0, Math.PI * 2);
        ctx.strokeStyle = pal.text;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      /* core */
      ctx.beginPath();
      ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = pal.surface;
      ctx.fill();
      ctx.strokeStyle = n.color;
      ctx.lineWidth = isActive ? 4 : 3;
      ctx.stroke();
      /* done check */
      if (done.has(i)) {
        ctx.beginPath();
        ctx.arc(n.x + 16, n.y - 16, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = pal.green;
        ctx.fill();
        ctx.strokeStyle = pal.surface;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(n.x + 12.5, n.y - 16);
        ctx.lineTo(n.x + 15.2, n.y - 13.2);
        ctx.lineTo(n.x + 19.8, n.y - 18.6);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }
      /* glyph + labels */
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillStyle = n.color;
      ctx.fillText(n.icon, n.x, n.y + 1);
      const below = i % 2 === 0;
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = pal.text;
      ctx.fillText(n.label, n.x, n.y + (below ? 44 : -40));
      ctx.font = "10.5px system-ui, sans-serif";
      ctx.fillStyle = pal.muted;
      ctx.fillText(n.sub, n.x, n.y + (below ? 58 : -54));
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!running) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, CW, CH);
      if (++palAge > 45 || !pal) refreshPal();

      /* edges + ambient packets */
      edges.forEach((e, ei) => {
        e.active = job ? job.edge === ei : active === ei + 1;
        ctx.beginPath();
        ctx.moveTo(e.x0, e.y0);
        ctx.quadraticCurveTo(e.cx, e.cy, e.x1, e.y1);
        ctx.strokeStyle = pal.border;
        ctx.globalAlpha = e.active ? 0.95 : 0.8;
        ctx.lineWidth = e.active ? 2 : 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        e.ts.forEach((t, pi) => {
          if (!paused) {
            t += 0.012 * velocity * (e.active ? 2.2 : 1);
            if (t >= 1) t -= 1;
            e.ts[pi] = t;
          }
          const p = bez(e, t);
          ctx.beginPath();
          ctx.arc(p.x, p.y, e.active ? 3.4 : 2.6, 0, Math.PI * 2);
          if (e.active) {
            ctx.shadowColor = pal.accent;
            ctx.shadowBlur = 8;
          }
          ctx.fillStyle = pal.accent;
          ctx.globalAlpha = e.active ? 0.95 : 0.55;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        });
      });

      /* job packet — the run's data traveling node to node */
      if (job) {
        const e = edges[job.edge];
        if (e) {
          if (!paused) {
            job.t += job.speed * Math.max(velocity, 0.35);
            if (job.t >= 1) {
              const arrived = job.edge + 1;
              job = null;
              if (hooks.onJobArrive) hooks.onJobArrive(arrived);
            }
          }
          if (job) {
            const p = bez(e, job.t);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
            ctx.shadowColor = pal.green;
            ctx.shadowBlur = 14;
            ctx.fillStyle = pal.green;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        } else {
          job = null;
        }
      }

      nodes.forEach(drawNode);

      if (hooks.packets) {
        const n = edges.length * PER_LINK + (job ? 1 : 0);
        hooks.packets(n);
      }
    };

    const start = () => {
      if (raf === null) raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) start();
    });

    const toLocal = (evt) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((evt.clientX - rect.left) / rect.width) * CW,
        y: ((evt.clientY - rect.top) / rect.height) * CH,
      };
    };
    const hitTest = (mx, my) => {
      for (let i = 0; i < nodes.length; i++) {
        const dx = mx - nodes[i].x;
        const dy = my - nodes[i].y;
        if (dx * dx + dy * dy < 30 * 30) return i;
      }
      return -1;
    };

    canvas.addEventListener("pointermove", (e) => {
      const p = toLocal(e);
      hover = hitTest(p.x, p.y);
      canvas.style.cursor = hover >= 0 ? "pointer" : "default";
    });
    canvas.addEventListener("pointerleave", () => {
      hover = -1;
    });
    canvas.addEventListener("click", (e) => {
      const p = toLocal(e);
      const i = hitTest(p.x, p.y);
      if (i >= 0 && hooks.onNodeClick) hooks.onNodeClick(i);
    });
    canvas.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const next = sel < 0 ? 0 : (sel + dir + nodes.length) % nodes.length;
        if (hooks.onNodeClick) hooks.onNodeClick(next);
      }
    });

    start();

    return {
      init,
      select: (i) => { sel = i; },
      setActive: (i) => { active = i; },
      markDone: (i) => done.add(i),
      resetMarks: () => { done.clear(); active = -1; job = null; sel = -1; },
      spawnJob: (target) => { job = { edge: target - 1, t: 0, speed: 0.02 }; },
      setVelocity: (v) => { velocity = v; },
      setPaused: (p) => { paused = p; },
      setOnArrive: (fn) => { hooks.onJobArrive = fn; },
      hitTest,
    };
  }

  /* ---------- per-project build ---------- */

  function buildDemo(key) {
    const demo = DEMOS[key];
    const panel = document.getElementById("hiw-panel-" + key);
    if (!panel) return null;
    const canvas = panel.querySelector(".hiw-flow");
    const statusEl = panel.querySelector(".hiw-status");
    const runBtn = panel.querySelector(".hiw-run");
    const resetBtn = panel.querySelector(".hiw-reset");
    const mStage = document.getElementById("hiw-m-stage-" + key);
    const mPackets = document.getElementById("hiw-m-packets-" + key);
    const mStatus = document.getElementById("hiw-m-status-" + key);
    const pauseBtn = panel.querySelector(".hiw-pause");
    const slider = panel.querySelector(".hiw-slider");
    const sliderVal = panel.querySelector(".hiw-slider-val");
    const chips = Array.prototype.slice.call(panel.querySelectorAll(".hiw-chip"));
    const drillSel = panel.querySelector(".hiw-drill");
    const platformSel = panel.querySelector(".hiw-platform");
    const ins = {
      icon: panel.querySelector(".hiw-ins-icon"),
      name: panel.querySelector(".hiw-ins-name"),
      tag: panel.querySelector(".hiw-ins-tag"),
      desc: panel.querySelector(".hiw-ins-desc"),
      visual: panel.querySelector(".hiw-visual"),
    };
    if (!canvas || !statusEl || !runBtn || !ins.visual) return null;

    const st = state[key];
    let sel = 0;

    const flow = buildFlow(canvas, {
      onNodeClick: (i) => select(i, browsingCtx()),
      packets: (n) => {
        if (mPackets) mPackets.textContent = String(n);
      },
    });
    if (!flow) return null;
    flow.init(demo);

    const setStatus = (mode) => {
      if (!mStatus) return;
      mStatus.classList.remove("hiw-metric-ok");
      mStatus.style.color = "";
      if (mode === "ok") mStatus.classList.add("hiw-metric-ok");
      if (mode === "warn") mStatus.style.color = "#f59e0b";
      if (mode === "bad") mStatus.style.color = "#e5534b";
    };

    const browsingCtx = () => ({
      lead: readLead(panel),
      sc: activeScenario(panel),
      live: false,
      token: () => true,
      status: (t) => { statusEl.textContent = t; },
      drill: drillSel ? drillSel.value : "none",
      platform: platformSel ? platformSel.value : "n8n",
    });

    const select = (i, ctx) => {
      const len = demo.stages.length;
      sel = (i + len) % len;
      flow.select(sel);
      const stg = demo.stages[sel];
      if (mStage) mStage.textContent = stg.short || stg.name;
      if (ins.icon) ins.icon.textContent = stg.icon;
      if (ins.name) ins.name.textContent = stg.name;
      if (ins.tag) ins.tag.textContent = stg.type || "";
      if (ins.desc) ins.desc.textContent = stg.desc;
      ins.visual.textContent = "";
      return stg.build(ins.visual, ctx);
    };

    const waitArrival = (i, id) =>
      new Promise((res) => {
        if (i === 0) { res(); return; }
        flow.spawnJob(i);
        const check = setInterval(() => {
          if (id !== st.runId) { clearInterval(check); flow.setOnArrive(null); res(); }
        }, 120);
        flow.setOnArrive((n) => {
          if (n === i) {
            clearInterval(check);
            flow.setOnArrive(null);
            res();
          }
        });
      });

    const dwell = async (id, ms) => {
      const end = Date.now() + (still() ? Math.min(ms, 80) : ms);
      while (Date.now() < end) {
        if (id !== st.runId) return;
        await rawSleep(50);
      }
    };

    const reset = () => {
      st.runId += 1;
      runBtn.disabled = false;
      resetBtn.hidden = true;
      statusEl.textContent = demo.ready;
      setStatus("ok");
      flow.resetMarks();
      select(0, browsingCtx());
    };

    runBtn.addEventListener("click", async () => {
      st.runId += 1;
      const id = st.runId;
      runBtn.disabled = true;
      resetBtn.hidden = false;
      flow.resetMarks();
      setStatus("ok");

      const ctx = {
        lead: readLead(panel),
        sc: activeScenario(panel),
        live: true,
        token: () => id === st.runId,
        status: (t) => { if (id === st.runId) statusEl.textContent = t; },
        drill: drillSel ? drillSel.value : "none",
        platform: platformSel ? platformSel.value : "n8n",
      };

      try {
        for (let i = 0; i < demo.stages.length; i++) {
          if (id !== st.runId) return;
          statusEl.textContent = demo.stages[i].name + "…";
          await select(i, ctx);
          if (i > 0) await waitArrival(i, id);
          if (id !== st.runId) return;
          flow.markDone(i);

          if (key === "dlf" && ctx.drill === "429" && i === 2) {
            setStatus("bad");
            if (mStatus) mStatus.textContent = "429";
            ctx.status("⚠️ LLM rate-limited — backing off, then retrying…");
            await dwell(id, 2200);
            if (id !== st.runId) return;
            setStatus("ok");
            if (mStatus) mStatus.textContent = "healthy";
            ctx.status("✓ retry succeeded — draft generated on the second attempt");
            await dwell(id, 700);
          }
          if (key === "dlf" && ctx.drill === "dup" && i === 4) {
            setStatus("warn");
            ctx.status("✋ duplicate detected — lead already drafted, run stopped here. No second draft.");
            await dwell(id, 1400);
            break;
          }
          if (id !== st.runId) return;
          await dwell(id, demo.stages[i].pause || 950);
        }
        if (id === st.runId) {
          if (mStatus) mStatus.textContent = "healthy";
          statusEl.textContent = demo.done;
        }
      } finally {
        if (id === st.runId) {
          flow.setActive(-1);
          runBtn.disabled = false;
          resetBtn.hidden = false;
        }
      }
    });

    resetBtn.addEventListener("click", reset);

    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
        const nowPaused = pauseBtn.getAttribute("aria-pressed") !== "true";
        pauseBtn.setAttribute("aria-pressed", String(nowPaused));
        pauseBtn.textContent = nowPaused ? "▶" : "⏸";
        flow.setPaused(nowPaused);
      });
    }

    if (slider) {
      slider.addEventListener("input", () => {
        const v = parseFloat(slider.value);
        flow.setVelocity(v);
        if (sliderVal) sliderVal.textContent = v.toFixed(1) + "x";
      });
    }

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((o) => {
          o.classList.toggle("is-active", o === chip);
          o.setAttribute("aria-pressed", String(o === chip));
        });
        reset();
      });
    });

    [drillSel, platformSel].forEach((s) => {
      if (s) s.addEventListener("change", reset);
    });

    reset();
    return { panel, reset };
  }

  /* ---------- global wiring ---------- */

  const handles = {};
  ["dlf", "vr"].forEach((key) => {
    const h = buildDemo(key);
    if (h) handles[key] = h;
  });

  const switchBtns = Array.prototype.slice.call(hiwRoot.querySelectorAll("[data-hiw-switch]"));

  const openDemo = (key) => {
    switchBtns.forEach((b) => {
      const on = b.getAttribute("data-hiw-switch") === key;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    Object.keys(handles).forEach((k) => {
      const h = handles[k];
      const show = k === key;
      if (!show && !h.panel.hidden) h.reset();
      h.panel.hidden = !show;
    });
  };

  switchBtns.forEach((b) =>
    b.addEventListener("click", () => openDemo(b.getAttribute("data-hiw-switch")))
  );

  const switchWrap = hiwRoot.querySelector(".hiw-switch");
  if (switchWrap) {
    switchWrap.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const cur = switchBtns.findIndex((b) => b.classList.contains("is-active"));
      const dir = e.key === "ArrowRight" ? 1 : switchBtns.length - 1;
      const next = switchBtns[(cur + dir) % switchBtns.length];
      openDemo(next.getAttribute("data-hiw-switch"));
      next.focus();
    });
  }

  document.querySelectorAll("[data-hiw-open]").forEach((a) => {
    a.addEventListener("click", () => openDemo(a.getAttribute("data-hiw-open")));
  });

  openDemo("dlf");

})();
