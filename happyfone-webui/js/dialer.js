/**
 * dialer.js — keypad input, simulated call lifecycle, and persistent call history.
 *
 * Call physics: AVAILABLE → dial → 3s ringing → connected → hangup → WRAP_UP (5s).
 */

import {
  AUX_REASONS,
  STATUS,
  formatDuration,
  formatStateTime,
} from './aux.js';

const HISTORY_KEY = 'happyfone.history.v1';
const MAX_HISTORY = 50;
const MAX_NUMBER_LENGTH = 20;
const RING_MS = 3000;

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.number === 'string' && Number.isFinite(entry.startedAt))
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function persistHistory(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* Storage can be blocked in private or embedded contexts. */
  }
}

function removeHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

function makeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export class Dialer {
  constructor({ machine, elements, notify }) {
    this.machine = machine;
    this.el = elements;
    this.notify = notify;
    this.call = null;
    this.connectTimer = null;
    this.history = readHistory();
    this.confirmClearTimer = null;
    this.confirmClear = false;

    this.#bind();
    this.renderHistory();
    this.syncAvailability();
    machine.subscribe(() => this.syncAvailability());
  }

  #bind() {
    this.el.input.addEventListener('input', () => this.#sanitizeInput());
    this.el.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.startCall();
      }
    });

    this.el.keypad.addEventListener('click', (event) => {
      const key = event.target.closest('button[data-key]');
      if (!key || key.disabled) return;
      this.#append(key.dataset.key);
    });

    this.el.backspace.addEventListener('click', () => {
      if (this.el.input.disabled) return;
      this.el.input.value = this.el.input.value.slice(0, -1);
      this.#syncCallButton();
    });

    this.el.clear.addEventListener('click', () => {
      if (this.el.input.disabled) return;
      this.el.input.value = '';
      this.#syncCallButton();
      this.el.input.focus({ preventScroll: true });
    });

    this.el.callBtn.addEventListener('click', () => this.startCall());
    this.el.mute.addEventListener('click', () => this.toggleMute());
    this.el.hold.addEventListener('click', () => this.toggleHold());
    this.el.hangup.addEventListener('click', () => this.hangup());
    this.el.clearHistory.addEventListener('click', () => this.#onClearHistory());
  }

  #sanitizeInput() {
    const input = this.el.input;
    const cleaned = input.value.replace(/[^\d*#+]/g, '').slice(0, MAX_NUMBER_LENGTH);
    if (cleaned !== input.value) input.value = cleaned;
    this.#syncCallButton();
  }

  #append(key) {
    if (!this.machine.canDial() || this.call) return;
    if (this.el.input.value.length >= MAX_NUMBER_LENGTH) return;
    this.el.input.value += key;
    this.#syncCallButton();
  }

  #syncCallButton() {
    const hasNumber = this.el.input.value.trim().length > 0;
    this.el.callBtn.disabled = !hasNumber || !this.machine.canDial() || Boolean(this.call);
  }

  /** Re-render lock state and the contextual helper text for the current agent state. */
  syncAvailability() {
    const canDial = this.machine.canDial() && !this.call;
    const status = this.machine.status;

    this.el.input.disabled = !canDial;
    this.el.keypad.querySelectorAll('button').forEach((button) => { button.disabled = !canDial; });
    this.el.backspace.disabled = !canDial;
    this.el.clear.disabled = !canDial;
    this.el.body.classList.toggle('is-locked', !canDial);
    this.#syncCallButton();

    let mode = 'ready';
    let label = 'Ready';

    if (this.call) {
      mode = 'call';
      label = 'On call';
    } else if (status === STATUS.AUX) {
      mode = 'paused';
      label = 'Paused';
    } else if (status === STATUS.WRAP_UP) {
      mode = 'wrap';
      label = 'Wrap-up';
    }

    this.el.state.dataset.mode = mode;
    this.el.state.textContent = label;
    this.#renderHint();
  }

  #renderHint() {
    const status = this.machine.status;
    let hint = 'Enter a number or use the keypad.';
    if (this.call) {
      hint = 'Call controls are live above. Hang up when you are done.';
    } else if (status === STATUS.AUX) {
      const reason = this.machine.auxLabel();
      hint = `Dialing paused${reason ? ` — ${reason}` : ''}. Return to Available to dial.`;
    } else if (status === STATUS.WRAP_UP) {
      hint = `Wrap-up in progress — available in ${formatDuration(this.machine.wrapUpRemaining())}.`;
    }
    this.el.hint.textContent = hint;
  }

  startCall() {
    if (this.call) return;
    if (!this.machine.canDial()) {
      this.notify('Dialing is paused. Return to Available first.', 'warn');
      return;
    }

    const number = this.el.input.value.trim();
    if (!number) {
      this.notify('Enter a phone number first.', 'warn');
      this.el.input.focus({ preventScroll: true });
      return;
    }

    if (!this.machine.beginCall()) return;

    this.call = {
      number,
      startedAt: Date.now(),
      connectedAt: null,
      phase: 'ringing',
      muted: false,
      held: false,
      heldUsed: false,
    };

    this.connectTimer = window.setTimeout(() => this.#connect(), RING_MS);
    this.#renderCall();
    this.syncAvailability();
    this.notify(`Calling ${number}…`);
  }

  #connect() {
    if (!this.call || this.call.phase !== 'ringing') return;
    this.call.phase = 'connected';
    this.call.connectedAt = Date.now();
    this.connectTimer = null;
    this.#renderCall();
    this.notify('Call connected.');
  }

  toggleMute() {
    if (!this.call || this.call.phase !== 'connected') return;
    this.call.muted = !this.call.muted;
    this.#renderCall();
    this.notify(this.call.muted ? 'Microphone muted.' : 'Microphone live.');
  }

  toggleHold() {
    if (!this.call || this.call.phase !== 'connected') return;
    this.call.held = !this.call.held;
    if (this.call.held) this.call.heldUsed = true;
    this.#renderCall();
    this.notify(this.call.held ? 'Call on hold.' : 'Call resumed.');
  }

  hangup() {
    if (!this.call) return;

    const call = this.call;
    const now = Date.now();
    const connected = call.phase === 'connected';
    const durationSec = connected ? Math.max(0, Math.floor((now - call.connectedAt) / 1000)) : 0;
    let status = 'No Answer';
    if (connected) status = call.heldUsed ? 'Handled' : 'Completed';

    this.#recordCall({
      number: call.number,
      startedAt: call.startedAt,
      durationSec,
      status,
    });

    this.#clearCallState();
    this.machine.endCall();
    this.syncAvailability();
    this.notify(`Call ended — ${status.toLowerCase()}, logged to history.`);
  }

  /** Used by logout. Cancels the simulation without writing history. */
  abortActiveCall() {
    if (this.connectTimer) window.clearTimeout(this.connectTimer);
    this.connectTimer = null;
    this.call = null;
    if (this.el.callPanel) this.el.callPanel.hidden = true;
    this.#resetCallControls();
    this.syncAvailability();
  }

  #clearCallState() {
    if (this.connectTimer) window.clearTimeout(this.connectTimer);
    this.connectTimer = null;
    this.call = null;
    this.el.callPanel.hidden = true;
    this.el.callPanel.classList.remove('is-ringing', 'is-held', 'is-connected');
    this.#resetCallControls();
  }

  #resetCallControls() {
    this.el.mute.disabled = true;
    this.el.hold.disabled = true;
    this.el.mute.setAttribute('aria-pressed', 'false');
    this.el.hold.setAttribute('aria-pressed', 'false');
    this.el.muteLabel.textContent = 'Mute';
    this.el.holdLabel.textContent = 'Hold';
  }

  #renderCall() {
    const call = this.call;
    if (!call || !this.el.callPanel) return;

    const ringing = call.phase === 'ringing';
    const held = call.held;

    this.el.callPanel.hidden = false;
    this.el.callPanel.classList.toggle('is-ringing', ringing);
    this.el.callPanel.classList.toggle('is-connected', !ringing);
    this.el.callPanel.classList.toggle('is-held', held);
    this.el.callNumber.textContent = call.number;
    this.el.callState.textContent = ringing ? 'Ringing…' : held ? 'On hold' : 'Connected';
    this.el.callTimer.textContent = ringing ? '00:00' : formatDuration(Date.now() - call.connectedAt);

    this.el.mute.disabled = ringing;
    this.el.hold.disabled = ringing;
    this.el.mute.setAttribute('aria-pressed', String(call.muted));
    this.el.hold.setAttribute('aria-pressed', String(held));
    this.el.mute.classList.toggle('is-active', call.muted);
    this.el.hold.classList.toggle('is-active', held);
    this.el.muteLabel.textContent = call.muted ? 'Muted' : 'Mute';
    this.el.holdLabel.textContent = held ? 'Resume' : 'Hold';
  }

  /** Called from the app's shared timer loop. */
  tick() {
    if (this.call && this.call.phase === 'connected') {
      this.el.callTimer.textContent = formatDuration(Date.now() - this.call.connectedAt);
    }
    if (this.machine.status === STATUS.WRAP_UP) {
      this.#renderHint();
    }
  }

  #recordCall(entry) {
    this.history.unshift({
      id: makeId(),
      number: entry.number,
      startedAt: entry.startedAt,
      durationSec: entry.durationSec,
      status: entry.status,
    });
    this.history = this.history.slice(0, MAX_HISTORY);
    persistHistory(this.history);
    this.renderHistory();
  }

  renderHistory() {
    const body = this.el.historyBody;
    body.replaceChildren();

    for (const entry of this.history) {
      const row = document.createElement('tr');

      const numberCell = document.createElement('td');
      numberCell.dataset.label = 'Number';
      const numberButton = node('button', 'history-number', entry.number);
      numberButton.type = 'button';
      numberButton.title = `Load ${entry.number} into the dialer`;
      numberButton.setAttribute('aria-label', `Load ${entry.number} into the dialer`);
      numberButton.addEventListener('click', () => this.#loadNumber(entry.number));
      numberCell.appendChild(numberButton);

      const startCell = document.createElement('td');
      startCell.dataset.label = 'Start';
      const started = new Date(entry.startedAt);
      startCell.append(
        node('span', 'history-time', timeFormat.format(started)),
        node('span', 'history-date', dateFormat.format(started)),
      );

      const durationCell = document.createElement('td');
      durationCell.dataset.label = 'Duration';
      durationCell.className = 'history-duration';
      durationCell.textContent = formatDuration(Math.max(0, entry.durationSec) * 1000);

      const statusCell = document.createElement('td');
      statusCell.dataset.label = 'Status';
      const pillClass = entry.status.toLowerCase().replace(/[^a-z]+/g, '-');
      statusCell.appendChild(node('span', `status-pill is-${pillClass}`, entry.status));

      row.append(numberCell, startCell, durationCell, statusCell);
      body.appendChild(row);
    }

    const count = this.history.length;
    this.el.historyCount.textContent = String(count);
    this.el.historyEmpty.hidden = count > 0;
    this.el.clearHistory.disabled = count === 0;
    if (count === 0) this.#resetClearButton();
  }

  #loadNumber(number) {
    this.el.input.value = number;
    this.#syncCallButton();
    if (this.machine.canDial()) {
      this.el.input.focus({ preventScroll: true });
      this.notify(`${number} loaded into the dialer.`);
    } else if (this.machine.status === STATUS.AUX) {
      this.notify(`${number} loaded — dialing is paused (${this.machine.auxLabel()}).`, 'warn');
    } else {
      this.notify(`${number} loaded. Dialing unlocks when you are available.`, 'warn');
    }
  }

  #onClearHistory() {
    if (this.history.length === 0) return;

    if (!this.confirmClear) {
      this.confirmClear = true;
      this.el.clearHistory.textContent = 'Confirm?';
      this.el.clearHistory.classList.add('is-confirm');
      this.confirmClearTimer = window.setTimeout(() => this.#resetClearButton(), 3000);
      return;
    }

    this.clearHistory();
    this.notify('Call history cleared.');
  }

  #resetClearButton() {
    if (this.confirmClearTimer) window.clearTimeout(this.confirmClearTimer);
    this.confirmClearTimer = null;
    this.confirmClear = false;
    this.el.clearHistory.textContent = 'Clear';
    this.el.clearHistory.classList.remove('is-confirm');
  }

  clearHistory({ notify = false } = {}) {
    this.history = [];
    removeHistory();
    this.#resetClearButton();
    this.renderHistory();
    if (notify) this.notify('Call history cleared.');
  }
}
