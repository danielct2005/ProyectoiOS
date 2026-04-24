/**
 * ===== AGENDA: UI =====
 * Renderizado de HTML para Agenda/Calendario
 */

import { formatDate, escapeHtml, createEmptyState } from '../utils/index.js';

/**
 * Renderiza la vista de Agenda
 * @returns {string}
 */
export function renderAgendaView() {
  return `
    <div class="section-header">
      <h2 class="section-title">Agenda</h2>
      <div class="section-header__actions">
        <button class="btn btn--sm btn--primary" id="addEventBtn">➕ Agregar</button>
      </div>
    </div>
    
    <div class="agenda-tabs">
      <button class="agenda-tab active" data-view="lista">📝 Lista</button>
      <button class="agenda-tab" data-view="calendario">📅 Calendario</button>
    </div>
    
    <div class="agenda-content"></div>
    
    ${renderAddEventModal()}
  `;
}

/**
 * Renderiza item de evento
 * @param {Object} e 
 * @returns {string}
 */
export function renderEventItem(e) {
  const isToday = e.date.split('T')[0] === new Date().toISOString().split('T')[0];
  const isPast = new Date(e.date) < new Date();
  
  const icons = {
    'cumple': '🎂',
    'pago': '💳',
    'recordatorio': '⏰',
    'trabajo': '💼',
    'personal': '👤',
    'salud': '🏥',
    'default': '📌'
  };
  
  const icon = icons[e.type] || icons.default;
  
  return `
    <div class="event-item ${isToday ? 'event-item--today' : ''} ${isPast ? 'event-item--past' : ''}" data-id="${e.id}">
      <div class="event-item__icon">${icon}</div>
      <div class="event-item__content">
        <div class="event-item__title">${escapeHtml(e.title)}</div>
        <div class="event-item__date">${formatDate(e.date, 'long')}</div>
        ${e.description ? `<div class="event-item__desc">${escapeHtml(e.description)}</div>` : ''}
      </div>
      <div class="event-item__actions">
        <button class="btn btn--sm btn--ghost edit-event-btn" data-id="${e.id}">✏️</button>
        <button class="btn btn--sm btn--ghost delete-event-btn" data-id="${e.id}">🗑️</button>
      </div>
    </div>
  `;
}

function renderAddEventModal() {
  return `
    <div class="modal" id="eventModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Agregar Evento</h3>
        <form id="eventForm">
          <div class="form-group">
            <label class="form-label" for="eventTitle">Título</label>
            <input type="text" id="eventTitle" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="eventDate">Fecha</label>
            <input type="datetime-local" id="eventDate" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="eventType">Tipo</label>
            <select id="eventType" class="form-input">
              <option value="recordatorio">Recordatorio</option>
              <option value="pago">Pago</option>
              <option value="cumple">Cumpleaños</option>
              <option value="trabajo">Trabajo</option>
              <option value="personal">Personal</option>
              <option value="salud">Salud</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="eventDescription">Descripción (opcional)</label>
            <textarea id="eventDescription" class="form-input" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="eventReminder"> Recordar提前
            </label>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelEventBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}