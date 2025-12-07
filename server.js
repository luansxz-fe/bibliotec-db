// server.js - Backend COMPLETO em um único arquivo
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'bibliotec_db'
});

// Conectar ao MySQL
db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err);
        return;
    }
    console.log('✅ Conectado ao MySQL');
});

// Middleware de autenticação
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bibliotec_secret');
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido.' });
    }
};

// ==================== ROTAS DE AUTENTICAÇÃO ====================
// Registrar usuário
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Verificar se email já existe
        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) return res.status(400).json({ error: 'Email já cadastrado.' });
            
            // Criptografar senha
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Criar usuário
            db.query(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, hashedPassword],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    const userId = result.insertId;
                    
                    // Gerar token
                    const token = jwt.sign(
                        { userId, email },
                        process.env.JWT_SECRET || 'bibliotec_secret',
                        { expiresIn: '7d' }
                    );
                    
                    res.status(201).json({
                        message: 'Usuário criado com sucesso!',
                        token,
                        user: { id: userId, name, email }
                    });
                }
            );
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(400).json({ error: 'Email ou senha incorretos.' });
        
        const user = results[0];
        
        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Email ou senha incorretos.' });
        
        // Gerar token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'bibliotec_secret',
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login realizado com sucesso!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    });
});

// ==================== ROTAS DE LIVROS ====================
// Obter todos os livros
app.get('/api/books', (req, res) => {
    const search = req.query.search || '';
    const category = req.query.category || '';
    
    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];
    
    if (search) {
        query += ' AND (title LIKE ? OR author LIKE ? OR category LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (category && category !== 'all') {
        query += ' AND category = ?';
        params.push(category);
    }
    
    query += ' ORDER BY title';
    
    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Obter livro por ID
app.get('/api/books/:id', (req, res) => {
    db.query('SELECT * FROM books WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Livro não encontrado.' });
        res.json(results[0]);
    });
});

// ==================== ROTAS DE FAVORITOS ====================
// Obter favoritos do usuário
app.get('/api/favorites', authenticate, (req, res) => {
    const userId = req.userId;
    
    db.query(
        `SELECT b.* FROM books b 
         INNER JOIN favorites f ON b.id = f.book_id 
         WHERE f.user_id = ?`,
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// Adicionar/remover favorito
app.post('/api/favorites/:bookId', authenticate, (req, res) => {
    const userId = req.userId;
    const bookId = req.params.bookId;
    
    // Verificar se já é favorito
    db.query(
        'SELECT * FROM favorites WHERE user_id = ? AND book_id = ?',
        [userId, bookId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (results.length > 0) {
                // Remover favorito
                db.query(
                    'DELETE FROM favorites WHERE user_id = ? AND book_id = ?',
                    [userId, bookId],
                    (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: 'Livro removido dos favoritos.', isFavorite: false });
                    }
                );
            } else {
                // Adicionar favorito
                db.query(
                    'INSERT INTO favorites (user_id, book_id) VALUES (?, ?)',
                    [userId, bookId],
                    (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: 'Livro adicionado aos favoritos!', isFavorite: true });
                    }
                );
            }
        }
    );
});

// ==================== ROTAS DE RESERVAS ====================
// Obter reservas do usuário
app.get('/api/reservations', authenticate, (req, res) => {
    const userId = req.userId;
    
    db.query(
        `SELECT r.*, b.title, b.author, b.category 
         FROM reservations r 
         INNER JOIN books b ON r.book_id = b.id 
         WHERE r.user_id = ? 
         ORDER BY r.reserve_date DESC`,
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// Criar reserva
app.post('/api/reservations/:bookId', authenticate, (req, res) => {
    const userId = req.userId;
    const bookId = req.params.bookId;
    
    // Verificar limite de reservas (máx 3 reservas ativas)
    db.query(
        `SELECT COUNT(*) as count FROM reservations 
         WHERE user_id = ? AND status IN ('reserved', 'picked_up')`,
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (results[0].count >= 3) {
                return res.status(400).json({ error: 'Limite de 3 reservas ativas atingido.' });
            }
            
            // Verificar se já reservou este livro
            db.query(
                `SELECT * FROM reservations 
                 WHERE user_id = ? AND book_id = ? AND status IN ('reserved', 'picked_up')`,
                [userId, bookId],
                (err, results) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    if (results.length > 0) {
                        return res.status(400).json({ error: 'Você já reservou este livro.' });
                    }
                    
                    // Verificar disponibilidade
                    db.query(
                        'SELECT available_copies FROM books WHERE id = ?',
                        [bookId],
                        (err, results) => {
                            if (err) return res.status(500).json({ error: err.message });
                            
                            if (results.length === 0 || results[0].available_copies <= 0) {
                                return res.status(400).json({ error: 'Livro indisponível no momento.' });
                            }
                            
                            // Criar reserva
                            db.query(
                                `INSERT INTO reservations (user_id, book_id, reserve_date) 
                                 VALUES (?, ?, NOW())`,
                                [userId, bookId],
                                (err, result) => {
                                    if (err) return res.status(500).json({ error: err.message });
                                    
                                    // Atualizar contador de cópias disponíveis
                                    db.query(
                                        'UPDATE books SET available_copies = available_copies - 1 WHERE id = ?',
                                        [bookId],
                                        (err) => {
                                            if (err) return res.status(500).json({ error: err.message });
                                            
                                            res.status(201).json({
                                                message: 'Livro reservado com sucesso!',
                                                reservationId: result.insertId
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// Cancelar reserva
app.delete('/api/reservations/:reservationId', authenticate, (req, res) => {
    const userId = req.userId;
    const reservationId = req.params.reservationId;
    
    // Verificar se a reserva pertence ao usuário
    db.query(
        'SELECT book_id FROM reservations WHERE id = ? AND user_id = ?',
        [reservationId, userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'Reserva não encontrada.' });
            }
            
            const bookId = results[0].book_id;
            
            // Cancelar reserva
            db.query(
                'UPDATE reservations SET status = "cancelled" WHERE id = ?',
                [reservationId],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    // Devolver cópia ao estoque
                    db.query(
                        'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
                        [bookId],
                        (err) => {
                            if (err) return res.status(500).json({ error: err.message });
                            
                            res.json({ message: 'Reserva cancelada com sucesso!' });
                        }
                    );
                }
            );
        }
    );
});

// ==================== ROTAS DO USUÁRIO ====================
// Obter perfil
app.get('/api/profile', authenticate, (req, res) => {
    const userId = req.userId;
    
    db.query(
        'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
            res.json(results[0]);
        }
    );
});

// Atualizar perfil
app.put('/api/profile', authenticate, (req, res) => {
    const userId = req.userId;
    const { name, phone } = req.body;
    
    db.query(
        'UPDATE users SET name = ?, phone = ? WHERE id = ?',
        [name, phone, userId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Perfil atualizado com sucesso!' });
        }
    );
});

// Excluir conta
app.delete('/api/profile', authenticate, (req, res) => {
    const userId = req.userId;
    
    db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Conta excluída com sucesso!' });
    });
});

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📚 API disponível em: http://localhost:${PORT}`);
    console.log('📖 Endpoints disponíveis:');
    console.log('  POST   /api/register     - Registrar usuário');
    console.log('  POST   /api/login        - Fazer login');
    console.log('  GET    /api/books        - Listar livros');
    console.log('  GET    /api/books/:id    - Detalhes do livro');
    console.log('  GET    /api/favorites    - Favoritos do usuário');
    console.log('  POST   /api/favorites/:id- Toggle favorito');
    console.log('  GET    /api/reservations - Reservas do usuário');
    console.log('  POST   /api/reservations/:id - Reservar livro');
    console.log('  DELETE /api/reservations/:id - Cancelar reserva');
    console.log('  GET    /api/profile      - Perfil do usuário');
    console.log('  PUT    /api/profile      - Atualizar perfil');
    console.log('  DELETE /api/profile      - Excluir conta');
});