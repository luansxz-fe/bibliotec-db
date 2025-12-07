-- Banco de dados BIBLIOTEC
CREATE DATABASE IF NOT EXISTS bibliotec_db;
USE bibliotec_db;

-- 1. Tabela de usuários
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de livros (12 livros)
CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    year INT,
    pages INT,
    available BOOLEAN DEFAULT TRUE,
    total_copies INT DEFAULT 5,
    available_copies INT DEFAULT 3
);

-- 3. Tabela de favoritos
CREATE TABLE favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, book_id)
);

-- 4. Tabela de reservas
CREATE TABLE reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    status ENUM('reserved', 'picked_up', 'returned', 'cancelled') DEFAULT 'reserved',
    reserve_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pickup_date DATE,
    due_date DATE,
    return_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Inserir os 12 livros
INSERT INTO books (title, author, category, description, year, pages) VALUES
('Orgulho e Preconceito', 'Jane Austen', 'Romance', 'Um clássico da literatura sobre relacionamentos e classes sociais na Inglaterra do século XIX.', 1813, 432),
('1984', 'George Orwell', 'Ficção', 'Uma distopia sobre vigilância governamental e controle social em um futuro totalitário.', 1949, 328),
('O Senhor dos Anéis', 'J.R.R. Tolkien', 'Fantasia', 'A épica jornada para destruir o Um Anel e salvar a Terra-média das forças do mal.', 1954, 1178),
('Dom Casmurro', 'Machado de Assis', 'Clássico', 'A dúvida sobre a traição de Capitu através dos olhos do ciumento Bentinho.', 1899, 256),
('Harry Potter e a Pedra Filosofal', 'J.K. Rowling', 'Fantasia', 'O início da jornada do jovem bruxo Harry Potter na escola de magia de Hogwarts.', 1997, 223),
('Duna', 'Frank Herbert', 'Ficção Científica', 'Uma saga épica no deserto planeta Arrakis, fonte da valiosa especiaria melange.', 1965, 412),
('O Apanhador no Campo de Centeio', 'J.D. Salinger', 'Drama', 'A história de Holden Caulfield e sua visão crítica da sociedade americana.', 1951, 234),
('O Silêncio dos Inocentes', 'Thomas Harris', 'Suspense', 'Clarice Starling busca a ajuda do genial e perigoso Hannibal Lecter.', 1988, 338),
('Steve Jobs', 'Walter Isaacson', 'Biografia', 'A biografia autorizada do visionário cofundador da Apple.', 2011, 656),
('O Livro dos Abraços', 'Eduardo Galeano', 'Poesia', 'Pequenas histórias que celebram a humanidade e a solidariedade.', 1989, 128),
('Sapiens', 'Yuval Noah Harari', 'História', 'Uma breve história da humanidade desde a Idade da Pedra até os dias atuais.', 2011, 464),
('O Poder do Hábito', 'Charles Duhigg', 'Autoajuda', 'Como os hábitos funcionam e como podemos transformá-los.', 2012, 408);

-- Criar usuário admin (senha: admin123)
INSERT INTO users (name, email, password) VALUES 
('Administrador', 'admin@bibliotec.com', '$2b$10$YourHashedPasswordHere');