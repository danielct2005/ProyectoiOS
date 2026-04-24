/**
 * ===== ECONOMIA: UI =====
 * Renderizado de HTML para Economía/Indicadores
 */

import { formatPercent, formatCurrency, createEmptyState } from '../utils/index.js';

/**
 * Renderiza la vista de Economía
 * @returns {string}
 */
export function renderEconomiaView(indicators = {}) {
  const { uf, utm, euro, dolar, ipc, imacec } = indicators;
  
  return `
    <div class="section-header">
      <h2 class="section-title">Economía</h2>
      <div class="section-header__actions">
        <button class="btn btn--sm btn--secondary" id="refreshIndicatorsBtn">🔄 Actualizar</button>
      </div>
    </div>
    
    <div class="indicators-grid">
      ${renderIndicatorCard('UF', uf?.value, uf?.date, 'unidades')}
      ${renderIndicatorCard('UTM', utm?.value, utm?.date, 'unidades')}
      ${renderIndicatorCard('Dólar', dolar?.value, dolar?.date, 'pesos')}
      ${renderIndicatorCard('Euro', euro?.value, euro?.date, 'pesos')}
    </div>
    
    <div class="indicators-section">
      <h3>Indicadores Mensuales</h3>
      ${renderIndicatorCard('IPC', ipc?.value, ipc?.date, 'percent')}
      ${renderIndicatorCard('IMACEC', imacec?.value, imacec?.date, 'percent')}
    </div>
  `;
}

function renderIndicatorCard(name, value, date, type) {
  if (!value) {
    return `
      <div class="indicator-card">
        <div class="indicator-card__name">${name}</div>
        <div class="indicator-card__value">--</div>
        <div class="indicator-card__date">Sin datos</div>
      </div>
    `;
  }
  
  const formatted = type === 'percent' ? formatPercent(value) : 
                   type === 'pesos' ? formatCurrency(value) : value;
  
  return `
    <div class="indicator-card">
      <div class="indicator-card__name">${name}</div>
      <div class="indicator-card__value">${formatted}</div>
      <div class="indicator-card__date">${date || 'Actualizado hoy'}</div>
    </div>
  `;
}