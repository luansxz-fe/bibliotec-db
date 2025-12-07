// Sistema BIBLIOTEC - Versão com API Backend
const API_URL = 'http://localhost:3000/api';

const app = {
    currentUser: null,
    token: localStorage.getItem('bibliotec_token'),
    
    // Inicializar
    init() {
        if (this.token) {
            this.checkAuth();
        }
        this.loadBooks();
        this.setupEventListeners();
    },
    
    // Verificar autenticação
    async checkAuth() {
        try {
            const response = await fetch(`${API_URL}/profile`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (response.ok) {
                this.currentUser = await response.json();
                this.updateUI();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
        }
    },
    
    // Login
    async login(email, password) {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                this.showMessage(data.error, 'error');
                return false;
            }
            
            this.token = data.token;
            this.currentUser = data.user;
            
            localStorage.setItem('bibliotec_token', this.token);
            localStorage.setItem('bibliotec_user', JSON.stringify(this.currentUser));
            
            this.showMessage(data.message, 'success');
            this.updateUI();
            
            return true;
        } catch (error) {
            this.showMessage('Erro ao conectar com o servidor', 'error');
            return false;
        }
    },
    
    // Registrar
    async register(name, email, password) {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                this.showMessage(data.error, 'error');
                return false;
            }
            
            this.showMessage(data.message, 'success');
            return true;
        } catch (error) {
            this.showMessage('Erro ao conectar com o servidor', 'error');
            return false;
        }
    },
    
    // Carregar livros
    async loadBooks() {
        try {
            const search = document.getElementById('searchInput')?.value || '';
            const category = document.getElementById('categoryFilter')?.value || '';
            
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (category && category !== 'all') params.append('category', category);
            
            const response = await fetch(`${API_URL}/books?${params}`);
            const books = await response.json();
            
            this.renderBooks(books);
        } catch (error) {
            console.error('Erro ao carregar livros:', error);
            this.showMessage('Erro ao carregar livros', 'error');
        }
    },
    
    // Renderizar livros
    renderBooks(books) {
        const grid = document.getElementById('bookGrid');
        if (!grid) return;
        
        if (books.length === 0) {
            grid.innerHTML = `
                <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: white;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Nenhum livro encontrado</h3>
                    <p>Tente alterar os termos da busca ou filtro</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = books.map(book => `
            <div class="book-card">
                <div class="book-cover">${book.title.charAt(0)}</div>
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p>${book.author}</p>
                    <span class="category">${book.category}</span>
                    <div class="book-availability">
                        <span class="status ${book.available_copies > 0 ? 'available' : 'unavailable'}">
                            ${book.available_copies > 0 ? 'Disponível' : 'Indisponível'}
                        </span>
                    </div>
                    <div class="book-actions">
                        <button onclick="app.toggleFavorite(${book.id})" id="favBtn${book.id}">
                            <i class="fas fa-heart"></i> Favoritar
                        </button>
                        <button onclick="app.reserveBook(${book.id})" ${book.available_copies <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-bookmark"></i> Reservar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Verificar favoritos
        if (this.currentUser) {
            this.checkFavorites();
        }
    },
    
    // Favoritar livro
    async toggleFavorite(bookId) {
        if (!this.currentUser) {
            this.showMessage('Faça login para favoritar livros', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/favorites/${bookId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                this.showMessage(data.error, 'error');
                return;
            }
            
            this.showMessage(data.message, 'success');
            
            // Atualizar botão
            const button = document.getElementById(`favBtn${bookId}`);
            if (button) {
                if (data.isFavorite) {
                    button.innerHTML = '<i class="fas fa-heart"></i> Remover Favorito';
                    button.style.background = '#e74c3c';
                } else {
                    button.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
                    button.style.background = '';
                }
            }
            
            this.updateFavorites();
        } catch (error) {
            this.showMessage('Erro ao favoritar livro', 'error');
        }
    },
    
    // Verificar favoritos
    async checkFavorites() {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch(`${API_URL}/favorites`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (response.ok) {
                const favorites = await response.json();
                favorites.forEach(book => {
                    const button = document.getElementById(`favBtn${book.id}`);
                    if (button) {
                        button.innerHTML = '<i class="fas fa-heart"></i> Remover Favorito';
                        button.style.background = '#e74c3c';
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao verificar favoritos:', error);
        }
    },
    
    // Reservar livro
    async reserveBook(bookId) {
        if (!this.currentUser) {
            this.showMessage('Faça login para reservar livros', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/reservations/${bookId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                this.showMessage(data.error, 'error');
                return;
            }
            
            this.showMessage(data.message, 'success');
            
            // Atualizar disponibilidade
            this.loadBooks();
            this.updateReservations();
        } catch (error) {
            this.showMessage('Erro ao reservar livro', 'error');
        }
    },
    
    // Cancelar reserva
    async cancelReservation(reservationId) {
        try {
            const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                this.showMessage(data.error, 'error');
                return;
            }
            
            this.showMessage(data.message, 'success');
            this.updateReservations();
            this.loadBooks();
        } catch (error) {
            this.showMessage('Erro ao cancelar reserva', 'error');
        }
    },
    
    // Atualizar lista de favoritos
    async updateFavorites() {
        const list = document.getElementById('favoritesList');
        if (!list) return;
        
        if (!this.currentUser) {
            list.innerHTML = '<p class="empty-message">Faça login para ver seus favoritos</p>';
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/favorites`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!response.ok) {
                list.innerHTML = '<p class="empty-message">Erro ao carregar favoritos</p>';
                return;
            }
            
            const favorites = await response.json();
            
            if (favorites.length === 0) {
                list.innerHTML = '<p class="empty-message">Nenhum livro favoritado</p>';
                return;
            }
            
            list.innerHTML = favorites.map(book => `
                <div class="favorite-item">
                    <div>
                        <strong>${book.title}</strong>
                        <p style="color: #666; font-size: 0.9rem;">${book.author} • ${book.category}</p>
                    </div>
                    <div>
                        <button onclick="app.toggleFavorite(${book.id})" style="background: #e74c3c;">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            list.innerHTML = '<p class="empty-message">Erro ao carregar favoritos</p>';
        }
    },
    
    // Atualizar lista de reservas
    async updateReservations() {
        const list = document.getElementById('reservationsList');
        if (!list) return;
        
        if (!this.currentUser) {
            list.innerHTML = '<p class="empty-message">Faça login para ver suas reservas</p>';
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/reservations`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!response.ok) {
                list.innerHTML = '<p class="empty-message">Erro ao carregar reservas</p>';
                return;
            }
            
            const reservations = await response.json();
            
            const activeReservations = reservations.filter(r => 
                r.status === 'reserved' || r.status === 'picked_up'
            );
            
            if (activeReservations.length === 0) {
                list.innerHTML = '<p class="empty-message">Nenhuma reserva ativa</p>';
                return;
            }
            
            list.innerHTML = activeReservations.map(res => `
                <div class="reservation-item">
                    <div>
                        <strong>${res.title}</strong>
                        <p style="color: #666; font-size: 0.9rem;">
                            ${res.author} • 
                            Reservado em ${new Date(res.reserve_date).toLocaleDateString('pt-BR')} •
                            Status: ${this.getStatusText(res.status)}
                        </p>
                    </div>
                    <div>
                        ${res.status === 'reserved' ? `
                            <button onclick="app.cancelReservation(${res.id})" style="background: #e74c3c;">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            list.innerHTML = '<p class="empty-message">Erro ao carregar reservas</p>';
        }
    },
    
    getStatusText(status) {
        const statusMap = {
            'reserved': 'Aguardando retirada',
            'picked_up': 'Em posse',
            'returned': 'Devolvido',
            'cancelled': 'Cancelado'
        };
        return statusMap[status] || status;
    },
    
    // Atualizar interface
    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        
        if (this.currentUser) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (userName) userName.textContent = this.currentUser.name.split(' ')[0];
            
            this.updateFavorites();
            this.updateReservations();
        }
    },
    
    // Logout
    logout() {
        localStorage.removeItem('bibliotec_token');
        localStorage.removeItem('bibliotec_user');
        this.token = null;
        this.currentUser = null;
        window.location.reload();
    },
    
    // Configurar eventos
    setupEventListeners() {
        // Busca
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.loadBooks());
        }
        
        // Filtro
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.loadBooks());
        }
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                const success = await this.login(email, password);
                if (success) {
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                }
            });
        }
        
        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('name').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                if (password !== confirmPassword) {
                    this.showMessage('As senhas não coincidem', 'error');
                    return;
                }
                
                const success = await this.register(name, email, password);
                if (success) {
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                }
            });
        }
    },
    
    // Mostrar mensagem
    showMessage(text, type = 'info') {
        // Verificar se já existe um container
        let container = document.getElementById('messageContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'messageContainer';
            document.body.appendChild(container);
        }
        
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                             type === 'error' ? 'exclamation-circle' : 
                             'info-circle'}"></i>
            <span>${text}</span>
        `;
        
        container.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 3000);
    }
};

// Funções globais
window.logout = () => app.logout();
window.deleteAccount = async () => {
    if (!confirm('Tem certeza que deseja excluir sua conta? Esta ação é irreversível!')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/profile`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${app.token}` }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            app.showMessage(data.error, 'error');
            return;
        }
        
        app.showMessage(data.message, 'success');
        setTimeout(() => {
            app.logout();
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        app.showMessage('Erro ao excluir conta', 'error');
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});