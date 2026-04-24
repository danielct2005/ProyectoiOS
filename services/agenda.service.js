/**
 * ===== AGENDA: SERVICES =====
 * Lógica de agenda (sin UI)
 */

import { getState, addImportantDate, updateImportantDate, deleteImportantDate } from '../../core/state.js';
import { generateId } from '../../utils/dom.js';

/**
 * Crea nuevo evento
 */
export function createEvent(title, date, type = 'recordatorio', description = '') {
  return {
    id: generateId(),
    title: title.trim(),
    date: new Date(date).toISOString(),
    type,
    description: description?.trim() || '',
    createdAt: new Date().toISOString()
  };
}

/**
 * Agrega evento
 */
export function addEvent(event) {
  addImportantDate(event);
  return { success: true, event };
}

/**
 * Actualiza evento
 */
export function updateEvent(id, updates) {
  updateImportantDate(id, updates);
  return { success: true };
}

/**
 * Elimina evento
 */
export function removeEvent(id) {
  deleteImportantDate(id);
  return { success: true };
}

/**
 * Obtiene eventos de hoy
 */
export function getTodayEvents() {
  const state = getState();
  const today = new Date().toISOString().split('T')[0];
  return state.importantDates.filter(e => e.date.startsWith(today));
}

/**
 * Obtiene eventos de la semana
 */
export function getWeekEvents() {
  const state = getState();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return state.importantDates.filter(e => new Date(e.date) >= weekAgo);
}

/**
 * Obtiene eventos próximos
 */
export function getUpcomingEvents(days = 30) {
  const state = getState();
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return state.importantDates
    .filter(e => new Date(e.date) >= now && new Date(e.date) <= future)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Obtiene eventos por tipo
 */
export function getEventsByType(type) {
  const state = getState();
  return state.importantDates.filter(e => e.type === type);
}