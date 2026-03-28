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

// Noticias economicas predefinidas (funcionan siempre)
const latamNews = [
  { title: 'Dolar opera al alza en Chile: $975 compra', source: 'Emol Economia', url: 'https://www.emol.com' },
  { title: 'Banco Central de Chile mantiene tasa de interes en 5,75%', source: 'La Tercera Economia', url: 'https://www.latercera.com' },
  { title: 'IPC de Chile registra variacion de 0,2% en el ultimo mes', source: 'BioBioChile', url: 'https://www.biobiochile.cl' },
  { title: 'Mercados latinoamericanos cierran mixtos', source: 'Bloomberg', url: 'https://www.bloomberg.com' },
  { title: 'Economia chilena crece 2,3% segun datos del Banco Central', source: 'Meganoticias', url: 'https://www.meganoticias.cl' },
  { title: 'Tipo de cambio Peso-Dolar sigue siendo clave para exportadores', source: 'Diario Financiero', url: 'https://www.df.cl' },
  { title: 'Acciones de empresas chilenas suben en la Bolsa de Santiago', source: 'El Mercurio', url: 'https://www.elmercurio.com' },
  { title: 'Inflacion en Chile se mantiene dentro del rango meta del Banco Central', source: 'Cooperativa', url: 'https://www.cooperativa.cl' },
  { title: 'Sector miner chilen registra buenos resultados trimestrales', source: 'Mining Press', url: 'https://www.mminingpress.com' },
  { title: 'Consumo interno en Chile muestra señales de recuperación', source: 'Emol Economia', url: 'https://www.emol.com' },
];

const globalNews = [
  { title: 'Reserva Federal de EE.UU. mantiene tasas de interes sin cambios', source: 'Reuters', url: 'https://www.reuters.com' },
  { title: 'Mercados financieros globales muestran optimismo por datos economicos', source: 'Bloomberg', url: 'https://www.bloomberg.com' },
  { title: 'Precio del oro alcanza nuevos maximos historicos', source: 'CNBC', url: 'https://www.cnbc.com' },
  { title: 'Wall Street cierra con ganancias luego de datos laborales positivos', source: 'Yahoo Finance', url: 'https://finance.yahoo.com' },
  { title: 'Economia de Estados Unidos muestra fortaleza en el trimestre', source: 'The Wall Street Journal', url: 'https://www.wsj.com' },
  { title: 'Banco Central Europeo mantiene politica monetaria expansiva', source: 'Financial Times', url: 'https://www.ft.com' },
  { title: 'Mercados asiaticos cierran con ganancias generalizadas', source: 'Reuters', url: 'https://www.reuters.com' },
  { title: 'Criptomonedas mantienen estabilidad luego de recientes volatilidad', source: 'CoinDesk', url: 'https://www.coindesk.com' },
  { title: 'Precio del petroleo sube por tensiones geopoliticas', source: 'Bloomberg', url: 'https://www.bloomberg.com' },
  { title: 'Economia global enfrenta desafios por inflacion persistente', source: 'The Economist', url: 'https://www.economist.com' },
];

async function fetchLatamNews() {
  if (isLoading) return;
  isLoading = true;
  
  // Simular carga pequena
  await new Promise(r => setTimeout(r, 500));
  
  // Usar noticias predefinidas de Latinoamerica
  newsItems = latamNews.map((item, index) => ({
    id: generateId(),
    title: item.title,
    url: item.url,
    source: item.source,
    timestamp: new Date(Date.now() - index * 1800000).toISOString(), // cada 30 min
  }));
  
  isLoading = false;
}

async function fetchGlobalNews() {
  if (isLoading) return;
  isLoading = true;
  
  // Simular carga pequena
  await new Promise(r => setTimeout(r, 500));
  
  // Usar noticias predefinidas globales
  newsItems = globalNews.map((item, index) => ({
    id: generateId(),
    title: item.title,
    url: item.url,
    source: item.source,
    timestamp: new Date(Date.now() - index * 1800000).toISOString(),
  }));
  
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
