/* Niagara HA adaptation of hdc1104/niagara-humidifer (2026).
 * Modified: HA entities/services replace Web Bluetooth; movable Lovelace card.
 * See LICENSE and THIRD_PARTY_NOTICES.md in this directory.
 */
const MODES = ['정지', '1단계', '2단계', '3단계', '4단계', '5단계', '6단계', '자동', '필터 건조'];
const TITLES = {timer: '꺼짐 예약', target: '목표 습도', mode: '운전 모드'};
class NiagaraCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this._busy = false;
    this._panel = null;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${new URL('./reference-style.css', import.meta.url)}">
      <style>
        :host{display:block;--accent:#147b80;--ink:#20383b;--muted:#718486;--line:#e0e9e8;--soft:#edf5f3;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
        ha-card{display:block;background:#f6f8f6;border-radius:24px;color:var(--ink);overflow:hidden}
        main{padding:20px 16px;gap:16px;max-width:540px}button{min-height:40px}
        .card{box-shadow:none}.heading h1{font-size:25px}.metrics b{font-size:32px}
        .setting{min-height:142px}.connection-actions .danger{color:#9b432a;background:#fff0e9}
        .error{color:#ae4c32}details{font-size:11px}dl{display:grid;grid-template-columns:auto 1fr;gap:8px}dd{margin:0;overflow-wrap:anywhere}
        footer{margin-top:0}#message{min-height:20px}.option.selected{background:var(--accent);color:white}
      </style>
      <ha-card><main>
        <header class="card"><div class="heading"><div class="brand"><span class="drop">◕</span><h1>Niagara</h1></div><span id="badge" class="badge">미연결</span></div>
          <p id="description"></p><div class="connection-actions"><button id="connect" class="primary">가습기 연결</button><button id="disconnect" class="danger">연결 해제</button><button id="refresh">상태 다시 받기</button><button id="diagnose">수신 진단</button></div><small id="updated"></small>
        </header>
        <section class="metrics" aria-label="현재 가습기 상태">
          <article><span>습도</span><div><b id="humidity">—</b><small>%</small></div></article>
          <article><span>온도</span><div><b id="temperature">—</b><small>°C</small></div></article>
          <article><span>물량</span><div><b id="water">—</b><small>/ 6</small></div></article>
        </section>
        <section class="settings" aria-label="가습기 설정">
          <button class="setting" data-panel="timer"><span>◷ 꺼짐 예약</span><strong id="timer">—</strong><small>0–12시간</small><i>선택⌄</i></button>
          <button class="setting" data-panel="target"><span>♧ 목표 습도</span><strong id="target">—</strong><small>40–60%</small><i>선택⌄</i></button>
          <button class="setting" data-panel="mode"><span>≋ 운전 모드</span><strong id="mode">—</strong><small>정지 · 가습 · 자동</small><i>선택⌄</i></button>
        </section>
        <section id="choices" class="card" hidden><div class="choice-heading"><h2 id="choices-title"></h2><small>선택 즉시 적용</small><button id="close" aria-label="선택 닫기">×</button></div><div id="options" class="option-grid"></div></section>
        <p id="message" role="status" aria-live="polite"></p>
        <footer><span>Niagara · Home Assistant BLE</span><button id="details-toggle">연결 정보</button></footer>
        <section id="details" class="card" hidden><dl><dt>상태</dt><dd id="connection"></dd><dt>수신 건수</dt><dd id="rx"></dd><dt>읽기 요청</dt><dd id="reads"></dd><dt>마지막 패킷 길이</dt><dd id="packet-length"></dd><dt>마지막 전송</dt><dd id="command"></dd><dt>진단</dt><dd id="diagnostic"></dd></dl><p>연결 해제는 자동 재연결을 중단합니다. 가습 운전은 유지됩니다.</p></section>
      </main></ha-card>`;
    this.$('connect').onclick = () => this._call('button', 'press', 'reconnect');
    this.$('disconnect').onclick = () => this._call('button', 'press', 'disconnect');
    this.$('diagnose').onclick = () => this._call('button', 'press', 'diagnose');
    this.$('refresh').onclick = () => this._call('button', 'press', 'refresh');
    this.$('close').onclick = () => {this._panel = null; this._renderOptions();};
    this.$('details-toggle').onclick = () => {this.$('details').hidden = !this.$('details').hidden;};
    this.shadowRoot.querySelectorAll('[data-panel]').forEach(button => {
      button.onclick = () => {this._panel = this._panel === button.dataset.panel ? null : button.dataset.panel; this._renderOptions();};
    });
  }
  $(id) { return this.shadowRoot.getElementById(id); }
  static getStubConfig(hass) {
    const prefixes = NiagaraCard.prefixes(hass);
    return {entity_prefix: prefixes.length === 1 ? prefixes[0] : '', title: 'Niagara'};
  }
  static prefixes(hass) {
    return Object.keys(hass?.states || {}).filter(id => /^select\.niagara_[a-z0-9_]+_mode$/.test(id))
      .map(id => id.slice('select.'.length, -'_mode'.length));
  }
  static getConfigElement() { return document.createElement('niagara-card-editor'); }
  setConfig(config) {
    const prefix = config.entity_prefix || '';
    if (prefix && !/^[a-z0-9_]+$/.test(prefix)) throw new Error('entity_prefix에는 소문자, 숫자, 밑줄을 사용하세요');
    this._config = {...config, entity_prefix: prefix};
    this.shadowRoot.querySelector('h1').textContent = config.title || 'Niagara';
    this._render();
  }
  set hass(hass) {this._hass = hass; this._render();}
  getCardSize() { return 7; }
  getGridOptions() { return {columns: 12, min_columns: 6, rows: 'auto'}; }
  _id(domain, key) {return `${domain}.${this._prefix || this._config.entity_prefix}_${key}`;}
  _entity(domain, key) {return this._hass?.states[this._id(domain, key)];}
  _value(domain, key) {
    const value = this._entity(domain, key)?.state;
    return value && !['unknown', 'unavailable'].includes(value) ? value : null;
  }
  _can(domain, key) {return this._entity(domain, key) && this._entity(domain, key).state !== 'unavailable';}
  _render() {
    if (!this._config || !this._hass) return;
    const prefixes = NiagaraCard.prefixes(this._hass);
    this._prefix = this._config.entity_prefix || (prefixes.length === 1 ? prefixes[0] : '');
    const connected = this._value('binary_sensor', 'connected') === 'on';
    const fresh = this._value('binary_sensor', 'fresh') === 'on';
    this.$('badge').textContent = connected ? '연결됨' : '미연결';
    this.$('badge').classList.toggle('connected', connected);
    const state = !this._prefix && prefixes.length > 1
      ? '여러 가습기가 있습니다. 카드 편집에서 기기를 선택하세요.'
      : this._value('sensor', 'connection') || 'Niagara BLE 통합을 추가하거나 카드 편집에서 기기를 선택하세요.';
    this.$('description').textContent = state;
    for (const [id, key] of [['humidity', 'humidity'], ['temperature', 'temperature'], ['water', 'water_level'], ['target', 'target_humidity'], ['mode', 'mode']]) {
      const value = fresh ? this._value('sensor', key) : null;
      this.$(id).textContent = value === null ? '—' : value + (id === 'target' ? '%' : '');
    }
    const timer = fresh ? this._value('number', 'timer') : null;
    this.$('timer').textContent = timer === null ? '—' : Number(timer) === 0 ? '예약 꺼짐' : `${timer}시간`;
    const received = this._value('sensor', 'last_received');
    const date = received ? new Date(received) : null;
    this.$('updated').textContent = date && !Number.isNaN(date.getTime()) ? `마지막 수신 ${date.toLocaleString('ko-KR')}` : 'Home Assistant Bluetooth · 상태 수신 대기';
    this.$('connect').hidden = connected;
    this.$('connect').disabled = this._busy || !this._can('button', 'reconnect');
    this.$('disconnect').disabled = this._busy || !this._can('button', 'disconnect');
    this.$('diagnose').disabled = this._busy || !connected;
    this.$('refresh').disabled = this._busy || !connected || !this._can('button', 'refresh');
    this.shadowRoot.querySelectorAll('[data-panel]').forEach(button => {
      const key = button.dataset.panel;
      button.disabled = this._busy || !connected || !this._can(key === 'timer' ? 'number' : 'select', key);
    });
    this.$('connection').textContent = state;
    this.$('rx').textContent = this._value('sensor', 'rx_count') || '0';
    const rxAttrs = this._entity('sensor', 'rx_count')?.attributes || {};
    this.$('reads').textContent = String(rxAttrs.read_request_count ?? 0);
    this.$('packet-length').textContent = String(rxAttrs.last_packet_length ?? '—');
    this.$('command').textContent = this._value('sensor', 'last_command') || '—';
    this.$('diagnostic').textContent = this._value('sensor', 'diagnostic') || '—';
    const pending = this._entity('sensor', 'last_command')?.attributes.pending_command;
    if (pending) this.$('message').textContent = '설정 반영 대기 중입니다. 표시값은 마지막으로 수신한 기기 상태입니다.';
    else if (!this._message) this.$('message').textContent = fresh ? '가습기에서 받은 실제 상태입니다.' : '상태 알림을 기다립니다. 전송 성공만으로 상태를 표시하지 않습니다.';
    this._renderOptions();
  }
  _renderOptions() {
    this.$('choices').hidden = !this._panel;
    this.shadowRoot.querySelectorAll('[data-panel]').forEach(button => {
      button.classList.toggle('active', button.dataset.panel === this._panel);
      button.setAttribute('aria-expanded', String(button.dataset.panel === this._panel));
    });
    this.$('options').replaceChildren();
    if (!this._panel || !this._config || !this._hass) return;
    const kind = this._panel;
    this.$('choices-title').textContent = TITLES[kind];
    const entity = this._entity(kind === 'timer' ? 'number' : 'select', kind);
    const options = kind === 'timer' ? Array.from({length: 13}, (_, i) => i) : entity?.attributes.options || (kind === 'mode' ? MODES : ['40%', '45%', '50%', '55%', '60%']);
    const fresh = this._value('binary_sensor', 'fresh') === 'on';
    options.forEach(value => {
      const button = document.createElement('button');
      button.className = 'option';
      const selected = fresh && String(value) === entity?.state;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = kind === 'timer' ? (value ? `${value}시간` : '예약 해제') : value;
      button.disabled = this._busy || this._value('binary_sensor', 'connected') !== 'on' || !this._can(kind === 'timer' ? 'number' : 'select', kind);
      button.onclick = () => this._apply(kind, value);
      this.$('options').append(button);
    });
  }
  async _apply(kind, value) {
    this._panel = null;
    await this._call(kind === 'timer' ? 'number' : 'select', kind === 'timer' ? 'set_value' : 'select_option', kind, kind === 'timer' ? {value: Number(value)} : {option: value});
  }
  async _call(domain, service, key, data = {}) {
    if (this._busy || !this._config || !this._hass || !this._prefix) return;
    this._busy = true;
    this._message = true;
    this.$('message').classList.remove('error');
    this.$('message').textContent = '요청을 전송하고 있습니다…';
    this._render();
    try {
      await this._hass.callService(domain, service, {entity_id: this._id(domain, key), ...data});
      this.$('message').textContent = key === 'disconnect' ? '연결 해제를 요청했습니다. 가습 운전은 유지됩니다.' : '요청을 전송했습니다. 실제 상태는 수신 알림으로 확인합니다.';
    } catch (error) {
      this.$('message').textContent = error?.message || String(error);
      this.$('message').classList.add('error');
    } finally {this._busy = false; this._render();}
  }
}

class NiagaraCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {...config};
    this._renderEditor();
  }
  _renderEditor() {
    if (!this._config) return;
    const config = this._config;
    this.replaceChildren();
    const row = document.createElement('label');
    row.textContent = '가습기 선택';
    const select = document.createElement('select');
    select.style.cssText = 'display:block;width:100%;padding:12px;margin:8px 0';
    const automatic = document.createElement('option');
    automatic.value = ''; automatic.textContent = '자동 선택 (가습기 한 대)'; select.append(automatic);
    const prefixes = NiagaraCard.prefixes(this._hass);
    if (config.entity_prefix && !prefixes.includes(config.entity_prefix)) prefixes.push(config.entity_prefix);
    for (const prefix of prefixes) {
      const option = document.createElement('option'); option.value = prefix;
      option.textContent = this._hass?.states[`select.${prefix}_mode`]?.attributes.friendly_name || prefix;
      select.append(option);
    }
    select.value = config.entity_prefix || '';
    select.onchange = () => this._change('entity_prefix', select.value);
    row.append(select); this.append(row);
    for (const [key, label, fallback] of [['title', '표시 이름', 'Niagara'], ['entity_prefix', '엔티티 접두사 (자동 선택은 비워 두세요)', '']]) {
      const row = document.createElement('label');
      row.style.cssText = 'display:block;margin:16px 0';
      row.textContent = label + ' ';
      const input = document.createElement('input');
      input.value = config[key] || fallback;
      input.style.cssText = 'display:block;width:100%;box-sizing:border-box;padding:12px;margin-top:8px';
      input.onchange = () => this._change(key, input.value);
      row.append(input); this.append(row);
    }
  }
  _change(key, value) {
    this._config = {...this._config, [key]: value};
    this.dispatchEvent(new CustomEvent('config-changed', {detail: {config: this._config}, bubbles: true, composed: true}));
  }
  set hass(value) {
    const first = !this._hass;
    this._hass = value;
    if (first) this._renderEditor();
  }
}
if (!customElements.get('niagara-card')) customElements.define('niagara-card', NiagaraCard);
if (!customElements.get('niagara-card-editor')) customElements.define('niagara-card-editor', NiagaraCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === 'niagara-card')) window.customCards.push({type: 'niagara-card', name: 'Niagara 가습기', description: '온습도 · 운전 모드 · 예약 · BLE 연결', preview: false});
