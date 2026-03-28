/**
 * ===== MÓDULO DE ECONOMÍA =====
 * Indicadores económicos y conversor de monedas
 */

import { appState, saveData } from './storage.js';
import { 
  formatCurrency, 
  parseNumber, 
  escapeHtml,
  addThousandsSeparator,
  createEmptyState 
} from './utils.js';
import * as API from './api.js';

// ==================== STATE ====================

// Estado local del conversor
let currentFromCurrency = 'CLP';
let currentToCurrency = 'UF';

// Valores actuales de indicadores
let indicators = {
  uf: 0,
  dolar: 0,
  euro: 0,
  utm: 0
};

// ==================== MAIN RENDER ====================

export function renderEconomiaContainer() {
  const main = document.querySelector('.main');
  main.innerHTML = renderEconomiaHTML();
  setupEconomiaEvents();
  loadEconomicIndicators();
}

function renderEconomiaHTML() {
  return `
    <div class="section-header">
      <h2 class="section-title">Economía</h2>
      <button class="btn btn--sm btn--ghost" id="refreshIndicatorsBtn" title="Actualizar">🔄</button>
    </div>
    
    <!-- Indicadores Económicos -->
    <div class="card">
      <h3 class="card__title mb-2">📊 Indicadores Económicos</h3>
      <div class="indicators-grid">
        <div class="indicator-item">
          <span class="indicator-item__label">UF</span>
          <span class="indicator-item__value" id="ufValue">Cargando...</span>
        </div>
        <div class="indicator-item">
          <span class="indicator-item__label">USD</span>
          <span class="indicator-item__value" id="dolarValue">Cargando...</span>
        </div>
        <div class="indicator-item">
          <span class="indicator-item__label">EUR</span>
          <span class="indicator-item__value" id="euroValue">Cargando...</span>
        </div>
        <div class="indicator-item">
          <span class="indicator-item__label">UTM</span>
          <span class="indicator-item__value" id="utmValue">Cargando...</span>
        </div>
      </div>
      <p class="text-muted text-sm mt-2" id="indicatorsDate"></p>
    </div>
    
    <!-- Conversor de Monedas -->
    <div class="card">
      <h3 class="card__title mb-2">💱 Conversor de Monedas</h3>
      
      <!-- From -->
      <div class="form-group">
        <label class="form-label">De</label>
        <div class="currency-selector">
          <select id="fromCurrency" class="form-input">
            <option value="CLP" ${currentFromCurrency === 'CLP' ? 'selected' : ''}>🇨🇱 CLP (Peso)</option>
            <option value="UF" ${currentFromCurrency === 'UF' ? 'selected' : ''}>🇨🇱 UF</option>
            <option value="USD" ${currentFromCurrency === 'USD' ? 'selected' : ''}>🇺🇸 USD (Dólar)</option>
            <option value="EUR" ${currentFromCurrency === 'EUR' ? 'selected' : ''}>🇪🇺 EUR (Euro)</option>
            <option value="UTM" ${currentFromCurrency === 'UTM' ? 'selected' : ''}>🇨🇱 UTM</option>
          </select>
        </div>
        <input type="text" id="fromAmount" class="form-input mt-1" placeholder="0" inputmode="numeric">
      </div>
      
      <!-- Botón swap -->
      <div class="converter-swap">
        <button class="btn btn--ghost" id="swapCurrencies">⬇️⬆️</button>
      </div>
      
      <!-- To -->
      <div class="form-group">
        <label class="form-label">A</label>
        <div class="currency-selector">
          <select id="toCurrency" class="form-input">
            <option value="CLP" ${currentToCurrency === 'CLP' ? 'selected' : ''}>🇨🇱 CLP (Peso)</option>
            <option value="UF" ${currentToCurrency === 'UF' ? 'selected' : ''}>🇨🇱 UF</option>
            <option value="USD" ${currentToCurrency === 'USD' ? 'selected' : ''}>🇺🇸 USD (Dólar)</option>
            <option value="EUR" ${currentToCurrency === 'EUR' ? 'selected' : ''}>🇪🇺 EUR (Euro)</option>
            <option value="UTM" ${currentToCurrency === 'UTM' ? 'selected' : ''}>🇨🇱 UTM</option>
          </select>
        </div>
        <div class="converter-result" id="conversionResult">
          <span class="converter-result__value">$0</span>
          <span class="converter-result__rate text-muted text-sm"></span>
        </div>
      </div>
      
      <button class="btn btn--primary btn--block mt-2" id="convertBtn">Convertir</button>
    </div>
    
    <!-- Tasas de Cambio -->
    <div class="card">
      <h3 class="card__title mb-2">📋 Tasas de Cambio</h3>
      <div class="rates-list">
        <div class="rate-item">
          <span>1 UF =</span>
          <span class="rate-item__value" id="rateUF">Cargando...</span>
        </div>
        <div class="rate-item">
          <span>1 USD =</span>
          <span class="rate-item__value" id="rateUSD">Cargando...</span>
        </div>
        <div class="rate-item">
          <span>1 EUR =</span>
          <span class="rate-item__value" id="rateEUR">Cargando...</span>
        </div>
        <div class="rate-item">
          <span>1 UTM =</span>
          <span class="rate-item__value" id="rateUTM">Cargando...</span>
        </div>
      </div>
    </div>
  `;
}

// ==================== EVENT HANDLERS ====================

function setupEconomiaEvents() {
  setTimeout(() => {
    // Refresh indicators
    document.getElementById('refreshIndicatorsBtn')?.addEventListener('click', () => {
      API.clearCache();
      loadEconomicIndicators();
    });
    
    // Currency selectors
    document.getElementById('fromCurrency')?.addEventListener('change', (e) => {
      currentFromCurrency = e.target.value;
      performConversion();
    });
    
    document.getElementById('toCurrency')?.addEventListener('change', (e) => {
      currentToCurrency = e.target.value;
      performConversion();
    });
    
    // From amount input
    addThousandsSeparator(document.getElementById('fromAmount'));
    document.getElementById('fromAmount')?.addEventListener('input', performConversion);
    
    // Swap button
    document.getElementById('swapCurrencies')?.addEventListener('click', () => {
      const from = document.getElementById('fromCurrency');
      const to = document.getElementById('toCurrency');
      const temp = from.value;
      from.value = to.value;
      to.value = temp;
      currentFromCurrency = from.value;
      currentToCurrency = to.value;
      performConversion();
    });
    
    // Convert button
    document.getElementById('convertBtn')?.addEventListener('click', performConversion);
  }, 100);
}

// ==================== ECONOMIC INDICATORS ====================

async function loadEconomicIndicators() {
  // Show loading state
  updateIndicatorUI('ufValue', 'Cargando...');
  updateIndicatorUI('dolarValue', 'Cargando...');
  updateIndicatorUI('euroValue', 'Cargando...');
  updateIndicatorUI('utmValue', 'Cargando...');
  
  const [uf, dolar, euro, utm] = await Promise.allSettled([
    API.getCurrentUF(),
    API.getCurrentDolar(),
    API.getCurrentEuro(),
    API.getCurrentUTM()
  ]);
  
  // Update indicators state
  indicators.uf = uf.status === 'fulfilled' && uf.value ? uf.value : 0;
  indicators.dolar = dolar.status === 'fulfilled' && dolar.value ? dolar.value : 0;
  indicators.euro = euro.status === 'fulfilled' && euro.value ? euro.value : 0;
  indicators.utm = utm.status === 'fulfilled' && utm.value ? utm.value : 0;
  
  // Update UI
  updateIndicatorUI('ufValue', indicators.uf > 0 ? formatCurrency(Math.round(indicators.uf)) : 'Sin conexión');
  updateIndicatorUI('dolarValue', indicators.dolar > 0 ? formatCurrency(Math.round(indicators.dolar)) : 'Sin conexión');
  updateIndicatorUI('euroValue', indicators.euro > 0 ? formatCurrency(Math.round(indicators.euro)) : 'Sin conexión');
  updateIndicatorUI('utmValue', indicators.utm > 0 ? formatCurrency(Math.round(indicators.utm)) : 'Sin conexión');
  
  // Update rates list
  updateRateUI('rateUF', indicators.uf > 0 ? formatCurrency(Math.round(indicators.uf)) : 'N/A');
  updateRateUI('rateUSD', indicators.dolar > 0 ? formatCurrency(Math.round(indicators.dolar)) : 'N/A');
  updateRateUI('rateEUR', indicators.euro > 0 ? formatCurrency(Math.round(indicators.euro)) : 'N/A');
  updateRateUI('rateUTM', indicators.utm > 0 ? formatCurrency(Math.round(indicators.utm)) : 'N/A');
  
  // Update date
  const dateEl = document.getElementById('indicatorsDate');
  if (dateEl) {
    dateEl.textContent = 'Última actualización: ' + new Date().toLocaleString('es-CL');
  }
  
  // Re-calculate conversion if there's an amount
  performConversion();
}

function updateIndicatorUI(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateRateUI(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ==================== CONVERTER ====================

function performConversion() {
  const fromAmount = parseNumber(document.getElementById('fromAmount')?.value || '0');
  const resultEl = document.getElementById('conversionResult');
  
  if (fromAmount <= 0 || Object.values(indicators).every(v => v === 0)) {
    if (resultEl) {
      resultEl.querySelector('.converter-result__value').textContent = '$0';
      resultEl.querySelector('.converter-result__rate').textContent = '';
    }
    return;
  }
  
  // Convert to CLP first, then to target currency
  const inCLP = toCLP(fromAmount, currentFromCurrency);
  const result = fromCLP(inCLP, currentToCurrency);
  
  if (resultEl) {
    resultEl.querySelector('.converter-result__value').textContent = formatCurrency(Math.round(result));
    
    // Show rate
    const rate = result / fromAmount;
    resultEl.querySelector('.converter-result__rate').textContent = 
      `1 ${currentFromCurrency} = ${rate.toFixed(4)} ${currentToCurrency}`;
  }
}

function toCLP(amount, currency) {
  switch (currency) {
    case 'CLP': return amount;
    case 'UF': return amount * indicators.uf;
    case 'USD': return amount * indicators.dolar;
    case 'EUR': return amount * indicators.euro;
    case 'UTM': return amount * indicators.utm;
    default: return amount;
  }
}

function fromCLP(amount, currency) {
  switch (currency) {
    case 'CLP': return amount;
    case 'UF': return indicators.uf > 0 ? amount / indicators.uf : 0;
    case 'USD': return indicators.dolar > 0 ? amount / indicators.dolar : 0;
    case 'EUR': return indicators.euro > 0 ? amount / indicators.euro : 0;
    case 'UTM': return indicators.utm > 0 ? amount / indicators.utm : 0;
    default: return amount;
  }
}

// ==================== EXPORTS ====================

export function getSectionTitle() {
  return 'Economía';
}
