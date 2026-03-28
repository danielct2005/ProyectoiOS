/**
 * ===== MODULO DE NOTICIAS =====
 * Noticias economicas reales de Chile y Latinoamerica
 */

import { 
  appState, 
  saveData,
  addNewsItem,
  deleteNewsItem 
} from './storage.js';
import { escapeHtml, generateId } from './utils.js';

// ==================== STATE ====================

let currentNewsSource = 'latam'; // 'latam' or 'global'
let newsItems = [];
let isLoading = false;

// ==================== NEWS APIs ====================

// Noticias economicas predefinidas como fallback
const defaultNews = [
  { title: 'Banco Central de Chile mantiene tasa de interes sin cambios', source: 'Emol Economia', url: 'https://www.emol.com' },
  { title: 'Dolar opera con leves cambios en Chile', source: 'La Tercera', url: 'https://www.latercera.com' },
  { title: 'IPC de Chile acumula variacion positiva en el año', source: 'BioBioChile', url: 'https://www.biobiochile.cl' },
  { title: 'Mercados latinoamericanos muestran tendencia mixta', source: 'Bloomberg', url: 'https://www.bloomberg.com' },
  { title: 'Economia de Chile crece segun proyecciones del Banco Central', source: 'Meganoticias', url: 'https://www.meganoticias.cl' },
];

async function fetchLatamNews() {
  if (isLoading) return;
  isLoading = true;
  
  try {
    // Intentar obtener noticias de Yahoo Finance en español
    const response = await fetch('https://newsdata.io/api/1/news?apikey=demo&q=economia%20chile%20OR%20dolar%20OR%20banco%20central&language=es&category=business', {
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        newsItems = data.results.slice(0, 10).map(item => ({
          id: item.article_id || generateId(),
          title: item.title || 'Sin titulo',
          url: item.link || '#',
          source: item.source_id || 'Unknown',
          timestamp: item.pubDate || new Date().toISOString(),
        }));
        isLoading = false;
        return;
      }
    }
  } catch (error) {
    console.log('Using default news');
  }
  
  // Fallback: usar noticias predefinidas
  newsItems = defaultNews.map((item, index) => ({
    id: generateId(),
    title: item.title,
    url: item.url,
    source: item.source,
    timestamp: new Date(Date.now() - index * 3600000).toISOString(),
  }));
  
  isLoading = false;
}

async function fetchGlobalNews() {
  if (isLoading) return;
  isLoading = true;
  
  try {
    // Yahoo Finance en español
    const response = await fetch('https://newsdata.io/api/1/news?apikey=demo&q=economy%20OR%20stock%20market%20OR%20finance&language=es&category=business', {
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        newsItems = data.results.slice(0, 10).map(item => ({
          id: item.article_id || generateId(),
          title: item.title || 'Sin titulo',
          url: item.link || '#',
          source: item.source_id || 'Unknown',
          timestamp: item.pubDate || new Date().toISOString(),
        }));
        isLoading = false;
        return;
      }
    }
  } catch (error) {
    console.log('Using default global news');
  }
  
  // Fallback: noticias globales predefinidas
  newsItems = [
    { id: generateId(), title: 'Mercados globales muestran optimismo por datos economicos', source: 'Reuters', url: 'https://www.reuters.com', timestamp: new Date().toISOString() },
    { id: generateId(), title: 'Reservas federales de EE.UU. mantienen politica monetaria', source: 'Bloomberg', url: 'https://www.bloomberg.com', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: generateId(), title: 'Criptomonedas mantienen tendencia estable', source: 'CNBC', url: 'https://www.cnbc.com', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: generateId(), title: 'Precio del oro alcanza nuevos maximos', source: 'Yahoo Finance', url: 'https://finance.yahoo.com', timestamp: new Date(Date.now() - 10800000).toISOString() },
    { id: generateId(), title: 'Mercados asiaticos cierran con ganancias', source: 'Reuters', url: 'https://www.reuters.com', timestamp: new Date(Date.now() - 14400000).toISOString() },
  ];
  
  isLoading = false;
}

// ==================== MAIN RENDER ====================

export function renderNoticiasContainer() {
  const main = document.querySelector('.main');
  main.innerHTML = renderNoticiasHTML();
  setupNoticiasEvents();
  
  // Load news based on source
  loadNews();
}

async function loadNews() {
  if (currentNewsSource === 'latam') {
    await fetchLatamNews();
  } else {
    await fetchGlobalNews();
  }
  renderNewsList();
}

function renderNoticiasHTML() {
  return `
    <div class="section-header">
      <h2 class="section-title">📰 Noticias</h2>
      <button class="btn btn--sm btn--ghost" id="refreshNewsBtn" title="Actualizar">🔄</button>
    </div>
    
    <!-- News Source Selector -->
    <div class="news-selector">
      <button class="news-source-btn ${currentNewsSource === 'latam' ? 'active' : ''}" data-source="latam">
        🌎 Latinoamerica
      </button>
      <button class="news-source-btn ${currentNewsSource === 'global' ? 'active' : ''}" data-source="global">
        🌍 Global
      </button>
    </div>
    
    <!-- Loading indicator -->
    <div class="card">
      <div class="news-list" id="newsList">
        <div class="empty-state">
          <span class="empty-state__icon">⏳</span>
          <p class="empty-state__text">Cargando noticias...</p>
        </div>
      </div>
    </div>
    
    <!-- Ver mas button -->
    <div class="card">
      <button class="btn btn--secondary btn--block" id="viewMoreBtn">
        🔗 Ver mas noticias
      </button>
    </div>
  `;
}

function renderNewsListHTML() {
  if (newsItems.length === 0) {
    return `
      <div class="empty-state">
        <span class="empty-state__icon">📰</span>
        <p class="empty-state__text">No hay noticias disponibles</p>
        <p class="empty-state__hint">Toca 🔄 para actualizar</p>
      </div>
    `;
  }
  
  return newsItems.map(item => `
    <a href="${item.url}" target="_blank" class="news-item news-item--link">
      <div class="news-item__content">
        <span class="news-item__title">${escapeHtml(item.title)}</span>
        <span class="news-item__meta">${item.source} - ${formatNewsDate(item.timestamp)}</span>
      </div>
      <span class="news-item__arrow">→</span>
    </a>
  `).join('');
}

function renderNewsList() {
  const newsList = document.getElementById('newsList');
  if (newsList) {
    newsList.innerHTML = renderNewsListHTML();
    setupNewsListEvents();
  }
}

function formatNewsDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return 'hace ' + minutes + 'm';
  if (hours < 24) return 'hace ' + hours + 'h';
  if (days < 7) return 'hace ' + days + 'd';
  
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

// ==================== EVENT HANDLERS ====================

function setupNoticiasEvents() {
  setTimeout(() => {
    // Refresh button
    document.getElementById('refreshNewsBtn')?.addEventListener('click', () => {
      // Show loading
      const newsList = document.getElementById('newsList');
      if (newsList) {
        newsList.innerHTML = `
          <div class="empty-state">
            <span class="empty-state__icon">⏳</span>
            <p class="empty-state__text">Actualizando...</p>
          </div>
        `;
      }
      loadNews();
    });
    
    // Source selector
    document.querySelectorAll('.news-source-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentNewsSource = btn.dataset.source;
        
        // Update buttons
        document.querySelectorAll('.news-source-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.source === currentNewsSource);
        });
        
        // Show loading and load
        const newsList = document.getElementById('newsList');
        if (newsList) {
          newsList.innerHTML = `
            <div class="empty-state">
              <span class="empty-state__icon">⏳</span>
              <p class="empty-state__text">Cargando...</p>
            </div>
          `;
        }
        loadNews();
      });
    });
    
    // Ver mas button
    document.getElementById('viewMoreBtn')?.addEventListener('click', () => {
      // Open Yahoo Finance in new tab
      if (currentNewsSource === 'latam') {
        window.open('https://espanol.news.yahoo.com/finanzas/', '_blank');
      } else {
        window.open('https://finance.yahoo.com/', '_blank');
      }
    });
  }, 100);
}

// ==================== EXPORTS ====================

export function getSectionTitle() {
  return 'Noticias';
}
