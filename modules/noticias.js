/**
 * ===== MODULO DE NOTICIAS =====
 * Noticias economicas de Chile y Hacker News
 */

import { 
  appState, 
  saveData,
  addNewsItem,
  deleteNewsItem 
} from './storage.js';
import { escapeHtml, generateId } from './utils.js';

// ==================== STATE ====================

let currentNewsSource = 'chile'; // 'chile' or 'hackernews'
let hackerNewsItems = [];
let isLoadingHN = false;

// ==================== HACKER NEWS API ====================

async function fetchHackerNews() {
  if (isLoadingHN) return;
  isLoadingHN = true;
  
  try {
    // Get top 15 stories IDs
    const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const storyIds = await response.json();
    
    // Get first 10 stories
    const topStories = storyIds.slice(0, 10);
    
    const stories = await Promise.all(
      topStories.map(async (id) => {
        const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return storyResponse.json();
      })
    );
    
    hackerNewsItems = stories.map(story => ({
      id: story.id,
      title: story.title,
      url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      source: 'Hacker News',
      timestamp: new Date(story.time * 1000).toISOString(),
      score: story.score,
      type: story.type
    }));
    
  } catch (error) {
    console.error('Error fetching Hacker News:', error);
    hackerNewsItems = [];
  }
  
  isLoadingHN = false;
}

// ==================== MAIN RENDER ====================

export function renderNoticiasContainer() {
  const main = document.querySelector('.main');
  main.innerHTML = renderNoticiasHTML();
  setupNoticiasEvents();
  
  // Load Hacker News if needed
  if (currentNewsSource === 'hackernews') {
    fetchHackerNews().then(() => renderNewsList());
  }
}

function renderNoticiasHTML() {
  return `
    <div class="section-header">
      <h2 class="section-title">📰 Noticias</h2>
      <button class="btn btn--sm btn--ghost" id="refreshNewsBtn" title="Actualizar">🔄</button>
    </div>
    
    <!-- News Source Selector -->
    <div class="news-selector">
      <button class="news-source-btn ${currentNewsSource === 'chile' ? 'active' : ''}" data-source="chile">
        CL - Chile Editables
      </button>
      <button class="news-source-btn ${currentNewsSource === 'hackernews' ? 'active' : ''}" data-source="hackernews">
        HN - Hacker News
      </button>
    </div>
    
    <!-- News List -->
    <div class="card">
      <div class="news-list" id="newsList">
        ${renderNewsListHTML()}
      </div>
    </div>
    
    <!-- Add News Button (only for Chile) -->
    ${currentNewsSource === 'chile' ? `
      <div class="card">
        <button class="btn btn--primary btn--block" id="addNewsBtn">
          ➕ Agregar Noticia
        </button>
      </div>
    ` : ''}
    
    <!-- Add News Modal -->
    <div class="modal" id="addNewsModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Agregar Noticia</h3>
        <form id="addNewsForm">
          <div class="form-group">
            <label class="form-label" for="newsTitle">Titulo de la noticia</label>
            <input type="text" id="newsTitle" class="form-input" placeholder="Ej: Dolar baja a $950" required>
          </div>
          <button type="submit" class="btn btn--primary btn--block">Agregar</button>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelAddNewsBtn">Cancelar</button>
        </form>
      </div>
    </div>
  `;
}

function renderNewsListHTML() {
  if (currentNewsSource === 'chile') {
    // Show manual Chile news
    if (appState.news.length === 0) {
      return `
        <div class="empty-state">
          <span class="empty-state__icon">📰</span>
          <p class="empty-state__text">Sin noticias</p>
          <p class="empty-state__hint">Agrega noticias economicas chilenas</p>
        </div>
      `;
    }
    
    return appState.news.map(item => `
      <div class="news-item" data-id="${item.id}">
        <div class="news-item__content">
          <span class="news-item__title">${escapeHtml(item.title)}</span>
          <span class="news-item__meta">${formatNewsDate(item.timestamp)}</span>
        </div>
        <button class="btn-action btn-action--delete" data-action="delete" data-id="${item.id}" title="Eliminar">🗑️</button>
      </div>
    `).join('');
    
  } else {
    // Show Hacker News
    if (hackerNewsItems.length === 0) {
      return `
        <div class="empty-state">
          <span class="empty-state__icon">⏳</span>
          <p class="empty-state__text">Cargando noticias...</p>
        </div>
      `;
    }
    
    return hackerNewsItems.map(item => `
      <a href="${item.url}" target="_blank" class="news-item news-item--link">
        <div class="news-item__content">
          <span class="news-item__title">${escapeHtml(item.title)}</span>
          <span class="news-item__meta">${item.source} - ${item.score} puntos - ${formatNewsDate(item.timestamp)}</span>
        </div>
        <span class="news-item__arrow">→</span>
      </a>
    `).join('');
  }
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
      if (currentNewsSource === 'hackernews') {
        fetchHackerNews().then(() => renderNewsList());
      }
    });
    
    // Source selector
    document.querySelectorAll('.news-source-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentNewsSource = btn.dataset.source;
        
        // Update buttons
        document.querySelectorAll('.news-source-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.source === currentNewsSource);
        });
        
        // Re-render
        renderNoticiasContainer();
      });
    });
    
    // Add news button
    document.getElementById('addNewsBtn')?.addEventListener('click', () => {
      document.getElementById('addNewsModal')?.classList.add('visible');
    });
    
    // Add news form
    setupAddNewsForm();
    
    // News list events
    setupNewsListEvents();
  }, 100);
}

function setupNewsListEvents() {
  // Delete buttons for Chile news
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      
      Swal.fire({
        title: 'Eliminar noticia?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Si, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ff3b30'
      }).then(result => {
        if (result.isConfirmed) {
          deleteNewsItem(id);
          renderNewsList();
        }
      });
    });
  });
}

function setupAddNewsForm() {
  const modal = document.getElementById('addNewsModal');
  const form = document.getElementById('addNewsForm');
  const cancelBtn = document.getElementById('cancelAddNewsBtn');
  
  cancelBtn?.addEventListener('click', () => {
    modal?.classList.remove('visible');
  });
  
  modal?.querySelector('.modal__backdrop')?.addEventListener('click', () => {
    modal.classList.remove('visible');
  });
  
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('newsTitle').value.trim();
    
    if (!title) {
      Swal.fire({ title: 'Titulo requerido', icon: 'error' });
      return;
    }
    
    addNewsItem(title, 'Manual');
    modal?.classList.remove('visible');
    form.reset();
    renderNewsList();
  });
}

// ==================== EXPORTS ====================

export function getSectionTitle() {
  return 'Noticias';
}
