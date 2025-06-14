-- Struktura tabel
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE categories (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE posts (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE comments (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Przykładowe dane
INSERT INTO users (username, password, is_admin) VALUES
('admin', 'admin123', 1),
('janek', 'qwerty', 0),
('maks', 'qwerty1', 0);

INSERT INTO categories (name) VALUES
('Ogólne'),
('Wędkarstwo spławikowe'),
('Wędkarstwo spinningowe');

INSERT INTO posts (user_id, category_id, title, content, created_at) VALUES
(1, 2, 'Jak złowić karpia?', 'Chętnie przyjmę porady dotyczące łowienia karpi na wodach stojących.', '2025-06-01 10:00:00'),
(2, 3, 'Najlepsze przynęty na szczupaka', 'Podzielcie się swoimi najlepszymi przynętami na szczupaki.', '2025-06-05 15:30:00'),
(1, 1, 'Witamy na forum wędkarskim', 'To jest pierwszy post na forum. Zachęcamy do dzielenia się swoimi historiami i poradami wędkarskimi.', '2025-06-01 09:00:00');

INSERT INTO comments (post_id, user_id, content, created_at) VALUES
(1, 2, 'Ja złowiłem 10kg karpia, polecam kukurydzę.', '2025-06-02 08:00:00'),
(1, 1, 'Gratulacje, dzięki za wskazówkę!', '2025-06-02 10:00:00'),
(2, 1, 'Spróbuj też obrotówek, działają świetnie.', '2025-06-06 12:00:00');
