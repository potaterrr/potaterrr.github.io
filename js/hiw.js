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

  const SVGNS = "http://www.w3.org/2000/svg";

  const still = () =>
    document.documentElement.classList.contains("reduce-motion") ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const svgEl = (tag, cls, text) => {
    const n = document.createElementNS(SVGNS, tag);
    if (cls) n.setAttribute("class", cls);
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
    const chip = panel.querySelector(".hiw-scenario.is-active");
    return SCENARIOS[(chip && chip.getAttribute("data-scenario")) || "bookable"];
  };

  const DEMOS = { dlf: DLF, vr: VR };

  /* ---------- SVG canvas (nodes, edges, tooltips) ---------- */

  const NODE_W = 150;
  const NODE_H = 64;
  const POS = [
    { x: 30, y: 46 }, { x: 245, y: 46 }, { x: 460, y: 46 },
    { x: 460, y: 252 }, { x: 245, y: 252 }, { x: 30, y: 252 },
  ];
  const EDGE_D = [
    "M 180 78 H 245",
    "M 395 78 H 460",
    "M 535 110 V 252",
    "M 460 284 H 395",
    "M 245 284 H 180",
  ];

  function buildSvg(svg, key, stages) {
    const defs = svgEl("defs");
    const filt = svgEl("filter");
    filt.setAttribute("id", "hiw-glow-" + key);
    filt.setAttribute("x", "-20%");
    filt.setAttribute("y", "-20%");
    filt.setAttribute("width", "140%");
    filt.setAttribute("height", "140%");
    const blur = svgEl("feGaussianBlur");
    blur.setAttribute("stdDeviation", "4");
    blur.setAttribute("result", "blur");
    const comp = svgEl("feComposite");
    comp.setAttribute("in", "SourceGraphic");
    comp.setAttribute("in2", "blur");
    comp.setAttribute("operator", "over");
    filt.appendChild(blur);
    filt.appendChild(comp);
    defs.appendChild(filt);
    svg.appendChild(defs);

    const edgeEls = EDGE_D.map((d) => {
      const g = svgEl("g", "hiw-edge");
      const base = svgEl("path", "hiw-edge-base");
      base.setAttribute("d", d);
      const flow = svgEl("path", "hiw-edge-flow");
      flow.setAttribute("d", d);
      flow.setAttribute("filter", "url(#hiw-glow-" + key + ")");
      g.appendChild(base);
      g.appendChild(flow);
      svg.appendChild(g);
      return g;
    });

    const nodeEls = stages.map((stg, i) => {
      const p = POS[i];
      const g = svgEl("g", "hiw-node");
      g.setAttribute("transform", "translate(" + p.x + "," + p.y + ")");
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", "Stage " + (i + 1) + ": " + stg.name);

      const rect = svgEl("rect", "hiw-node-rect");
      rect.setAttribute("width", String(NODE_W));
      rect.setAttribute("height", String(NODE_H));
      rect.setAttribute("rx", "10");
      g.appendChild(rect);

      const emoji = svgEl("text", "hiw-node-emoji", stg.icon);
      emoji.setAttribute("x", "14");
      emoji.setAttribute("y", "27");
      g.appendChild(emoji);

      const label = svgEl("text", "hiw-node-label", stg.short || stg.name);
      label.setAttribute("x", "14");
      label.setAttribute("y", "49");
      g.appendChild(label);

      const badge = svgEl("g", "hiw-badge");
      const circ = svgEl("circle");
      circ.setAttribute("cx", "137");
      circ.setAttribute("cy", "12");
      circ.setAttribute("r", "9");
      const check = svgEl("path");
      check.setAttribute("d", "M 133 12 l 3 3 l 6 -7");
      badge.appendChild(circ);
      badge.appendChild(check);
      g.appendChild(badge);

      const lines = stg.tip || [stg.desc];
      const tipW = 224;
      const tipH = 30 + lines.length * 17;
      const below = p.y < 150;
      const tx = Math.max(5, Math.min(p.x, 640 - tipW - 6)) - p.x;
      const ty = below ? NODE_H + 10 : -10 - tipH;
      const tip = svgEl("g", "hiw-tip");
      tip.setAttribute("transform", "translate(" + tx + "," + ty + ")");
      const trect = svgEl("rect");
      trect.setAttribute("width", String(tipW));
      trect.setAttribute("height", String(tipH));
      trect.setAttribute("rx", "8");
      tip.appendChild(trect);
      const ttitle = svgEl("text", "hiw-tip-title", "Purpose:");
      ttitle.setAttribute("x", "10");
      ttitle.setAttribute("y", "20");
      tip.appendChild(ttitle);
      lines.forEach((ln, li) => {
        const t = svgEl("text", "hiw-tip-line", ln);
        t.setAttribute("x", "10");
        t.setAttribute("y", String(38 + li * 17));
        tip.appendChild(t);
      });
      g.appendChild(tip);

      svg.appendChild(g);
      return g;
    });

    return { edgeEls, nodeEls };
  }

  /* ---------- per-project wiring ---------- */

  function buildDemo(key) {
    const demo = DEMOS[key];
    const panel = document.getElementById("hiw-panel-" + key);
    if (!panel) return null;
    const svg = panel.querySelector(".hiw-canvas");
    const detail = {
      num: panel.querySelector(".hiw-detail .hiw-stage-num"),
      icon: panel.querySelector(".hiw-detail .hiw-node-icon"),
      name: panel.querySelector(".hiw-detail .hiw-node-name"),
      type: panel.querySelector(".hiw-detail .hiw-node-type"),
      desc: panel.querySelector(".hiw-detail .hiw-node-desc"),
      visual: panel.querySelector(".hiw-detail .hiw-visual"),
    };
    const statusEl = panel.querySelector(".hiw-status");
    const runBtn = panel.querySelector(".hiw-run");
    const resetBtn = panel.querySelector(".hiw-reset");
    if (!svg || !detail.visual || !statusEl || !runBtn) return null;

    const st = state[key];
    const { edgeEls, nodeEls } = buildSvg(svg, key, demo.stages);
    let sel = 0;

    const browsingCtx = () => ({
      lead: readLead(panel),
      sc: activeScenario(panel),
      live: false,
      token: () => true,
      status: (t) => { statusEl.textContent = t; },
    });

    const select = (i, ctx) => {
      sel = (i + demo.stages.length) % demo.stages.length;
      const stg = demo.stages[sel];
      detail.num.textContent = String(sel + 1).padStart(2, "0");
      detail.icon.textContent = stg.icon;
      detail.name.textContent = stg.name;
      detail.type.textContent = stg.type || "";
      detail.desc.textContent = stg.desc;
      nodeEls.forEach((n, j) => n.classList.toggle("is-active", j === sel));
      edgeEls.forEach((e, j) => e.classList.toggle("is-active", j === sel - 1));
      detail.visual.textContent = "";
      return stg.build(detail.visual, ctx);
    };

    const reset = () => {
      st.runId += 1;
      runBtn.disabled = false;
      resetBtn.hidden = true;
      statusEl.textContent = demo.ready;
      nodeEls.forEach((n) => n.classList.remove("is-done", "is-active"));
      edgeEls.forEach((e) => e.classList.remove("is-active"));
      select(0, browsingCtx());
    };

    const dwell = async (id, ms) => {
      const end = Date.now() + (still() ? Math.min(ms, 80) : ms);
      while (Date.now() < end) {
        if (id !== st.runId) return;
        await rawSleep(50);
      }
    };

    runBtn.addEventListener("click", async () => {
      st.runId += 1;
      const id = st.runId;
      runBtn.disabled = true;
      resetBtn.hidden = false;

      const ctx = {
        lead: readLead(panel),
        sc: activeScenario(panel),
        live: true,
        token: () => id === st.runId,
        status: (t) => { if (id === st.runId) statusEl.textContent = t; },
      };

      try {
        for (let i = 0; i < demo.stages.length; i++) {
          if (id !== st.runId) return;
          statusEl.textContent = demo.stages[i].name + "…";
          await select(i, ctx);
          if (id !== st.runId) return;
          nodeEls[i].classList.add("is-done");
          await dwell(id, demo.stages[i].pause || 950);
        }
        if (id === st.runId) statusEl.textContent = demo.done;
      } finally {
        if (id === st.runId) {
          runBtn.disabled = false;
          resetBtn.hidden = false;
        }
      }
    });

    resetBtn.addEventListener("click", reset);

    nodeEls.forEach((g, i) => {
      g.addEventListener("click", () => {
        if (i === sel) return;
        select(i, browsingCtx());
      });
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(i, browsingCtx());
        }
      });
    });

    svg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        select(sel - 1, browsingCtx());
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        select(sel + 1, browsingCtx());
      }
    });

    panel.querySelectorAll(".hiw-scenario").forEach((chip) => {
      chip.addEventListener("click", () => {
        panel.querySelectorAll(".hiw-scenario").forEach((o) => {
          o.classList.toggle("is-active", o === chip);
          o.setAttribute("aria-pressed", String(o === chip));
        });
        reset();
      });
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
