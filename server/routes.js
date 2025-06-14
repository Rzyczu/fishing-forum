const express = require('express');
const router = express.Router();
const db = require('./db');
const bcrypt = require('bcrypt');

const loginAttempts = {};

// Rejestracja nowego użytkownika
router.post('/api/register', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
        return res.status(400).send('Brak nazwy użytkownika lub hasła');
    }
    // Domyślnie nowy użytkownik nie jest adminem (is_admin = 0)
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).send('Błąd szyfrowania hasła');
        db.query('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 0)',
            [username, hash], (err2, result) => {
                if (err2) {
                    if (err2.code === 'ER_DUP_ENTRY') {
                        return res.redirect('/register.html?error=exists');
                    } else {
                        return res.status(500).send('Błąd bazy danych');
                    }
                }
                req.session.user = { id: result.insertId, username: username, isAdmin: false };
                return res.redirect('/');
            });
    });
});

// Logowanie użytkownika
router.post('/api/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const now = Date.now();

    if (!username || !password) {
        return res.redirect('/login.html?error=1');
    }

    // Inicjalizacja rekordu prób
    if (!loginAttempts[username]) {
        loginAttempts[username] = { count: 0, blockedUntil: null };
    }

    const attempt = loginAttempts[username];

    // Sprawdzenie blokady
    if (attempt.blockedUntil && now < attempt.blockedUntil) {
        return res.redirect('/login.html?error=locked');
    }

    db.query('SELECT id, username, password, is_admin FROM users WHERE username = ?',
        [username], (err, results) => {
            if (err) return res.status(500).send('Błąd bazy danych');
            if (results.length === 0) {
                attempt.count++;
                if (attempt.count >= 3) {
                    attempt.blockedUntil = now + 5 * 60 * 1000; // 5 minut blokady
                    attempt.count = 0; // resetujemy licznik po nałożeniu blokady
                }
                return res.redirect('/login.html?error=1');
            }
            const user = results[0];
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) return res.status(500).send('Błąd porównania haseł');
                if (isMatch) {
                    return loginSuccess(req, res, user, username);
                } else {
                    // Sprawdź, czy to hasło jawne (stary wpis)
                    if (user.password === password) {
                        // Hasło pasuje, więc od razu szyfrujemy i zapisujemy
                        bcrypt.hash(password, 10, (err2, hash) => {
                            if (!err2) {
                                db.query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
                            }
                            return loginSuccess(req, res, user, username);
                        });
                    } else {
                        attempt.count++;
                        if (attempt.count >= 3) {
                            attempt.blockedUntil = now + 5 * 60 * 1000;
                            attempt.count = 0;
                        }
                        return res.redirect('/login.html?error=1');
                    }
                }
            });

            function loginSuccess(req, res, user, username) {
                loginAttempts[username] = { count: 0, blockedUntil: null };
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    isAdmin: (user.is_admin ? true : false)
                };
                return res.redirect('/');
            }
        });
});

// Wylogowanie
router.get('/api/logout', (req, res) => {
    req.session.destroy(() => { });
    res.clearCookie('connect.sid');
    return res.sendStatus(204);
});

// Informacje o bieżącej sesji (zalogowany użytkownik)
router.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.json({ user: null });
    }
});

// Pobierz listę kategorii
router.get('/api/categories', (req, res) => {
    db.query('SELECT id, name FROM categories', (err, results) => {
        if (err) return res.status(500).send('Błąd bazy danych');
        res.json(results);
    });
});

// Dodaj nową kategorię (wymaga admina)
router.post('/api/categories', (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).send('Brak uprawnień');
    }
    const name = req.body.name;
    if (!name) {
        return res.status(400).send('Brak nazwy kategorii');
    }
    db.query('INSERT INTO categories (name) VALUES (?)', [name], (err, result) => {
        if (err) return res.status(500).send('Błąd bazy danych');
        res.json({ id: result.insertId, name: name });
    });
});

// Pobierz listę wpisów (z opcjonalnym filtrem kategorii)
router.get('/api/posts', (req, res) => {
    let sql = 'SELECT posts.id, posts.title, posts.content, posts.created_at, posts.user_id, ' +
        'users.username AS authorName, categories.name AS categoryName ' +
        'FROM posts JOIN users ON posts.user_id = users.id ' +
        'JOIN categories ON posts.category_id = categories.id';

    const params = [];  // ← DODAJ TO

    if (req.query.category) {
        sql += ' WHERE posts.category_id = ?';
        params.push(req.query.category);
    }

    const sort = (req.query.sort === 'asc') ? 'ASC' : 'DESC';
    sql += ' ORDER BY posts.created_at ' + sort;

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).send('Błąd bazy danych');
        res.json(results);
    });
});

// Pobierz pojedynczy wpis (po ID)
router.get('/api/posts/:id', (req, res) => {
    const postId = req.params.id;
    db.query(
        'SELECT posts.id, posts.title, posts.content, posts.created_at, posts.user_id, ' +
        'users.username AS authorName, categories.name AS categoryName ' +
        'FROM posts JOIN users ON posts.user_id = users.id ' +
        'JOIN categories ON posts.category_id = categories.id ' +
        'WHERE posts.id = ?',
        [postId], (err, results) => {
            if (err) return res.status(500).send('Błąd bazy danych');
            if (results.length === 0) return res.status(404).send('Not found');
            res.json(results[0]);
        });
});

// Dodaj nowy wpis (wymaga zalogowania)
router.post('/api/posts', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Nie zalogowano');
    }
    const title = req.body.title;
    const content = req.body.content;
    const categoryId = req.body.categoryId;
    if (!title || !content || !categoryId) {
        return res.status(400).send('Brak danych wpisu');
    }
    const userId = req.session.user.id;
    db.query('INSERT INTO posts (user_id, category_id, title, content) VALUES (?, ?, ?, ?)',
        [userId, categoryId, title, content], (err, result) => {
            if (err) return res.status(500).send('Błąd bazy danych');
            res.json({ id: result.insertId });
        });
});

// Edytuj wpis (autor lub admin)
router.put('/api/posts/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Nie zalogowano');
    }
    const postId = req.params.id;
    const newTitle = req.body.title;
    const newContent = req.body.content;
    if (!newTitle || !newContent) {
        return res.status(400).send('Brak danych do edycji');
    }
    // Sprawdź, czy wpis istnieje i czy użytkownik ma prawa do edycji
    db.query('SELECT user_id FROM posts WHERE id = ?', [postId], (err, results) => {
        if (err) return res.status(500).send('Błąd bazy danych');
        if (results.length === 0) return res.status(404).send('Not found');
        const authorId = results[0].user_id;
        if (!req.session.user.isAdmin && req.session.user.id !== authorId) {
            return res.status(403).send('Brak uprawnień');
        }
        // Aktualizuj wpis
        db.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [newTitle, newContent, postId],
            (err2) => {
                if (err2) return res.status(500).send('Błąd bazy danych');
                res.sendStatus(200);
            }
        );
    });
});

// Usuń wpis (autor lub admin)
router.delete('/api/posts/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Nie zalogowano');
    }
    const postId = req.params.id;
    db.query('SELECT user_id FROM posts WHERE id = ?', [postId], (err, results) => {
        if (err) return res.status(500).send('Błąd bazy danych');
        if (results.length === 0) return res.status(404).send('Not found');
        const authorId = results[0].user_id;
        if (!req.session.user.isAdmin && req.session.user.id !== authorId) {
            return res.status(403).send('Brak uprawnień');
        }
        db.query('DELETE FROM posts WHERE id = ?', [postId], (err2) => {
            if (err2) return res.status(500).send('Błąd bazy danych');
            res.sendStatus(200);
        });
    });
});

// Pobierz komentarze do wpisu
router.get('/api/posts/:id/comments', (req, res) => {
    const postId = req.params.id;
    db.query(
        'SELECT comments.id, comments.content, comments.created_at, comments.user_id, users.username AS authorName ' +
        'FROM comments JOIN users ON comments.user_id = users.id ' +
        'WHERE comments.post_id = ? ORDER BY comments.created_at ASC',
        [postId], (err, results) => {
            if (err) return res.status(500).send('Błąd bazy danych');
            res.json(results);
        });
});

// Dodaj komentarz (wymaga zalogowania)
router.post('/api/posts/:id/comments', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Nie zalogowano');
    }
    const postId = req.params.id;
    const content = req.body.content;
    if (!content) {
        return res.status(400).send('Brak treści komentarza');
    }
    const userId = req.session.user.id;
    db.query('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
        [postId, userId, content], (err) => {
            if (err) return res.status(500).send('Błąd bazy danych');
            res.sendStatus(201);
        });
});

// Edytuj komentarz (autor lub admin)
router.put('/api/comments/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Nie zalogowano');
    }
    const commentId = req.params.id;
    const newContent = req.body.content;
    if (!newContent) {
        return res.status(400).send('Brak treści');
    }
    db.query('SELECT user_id FROM comments WHERE id = ?', [commentId], (err, results) => {
        if (err) return res.status(500).send('Błąd bazy danych');
        if (results.length === 0) return res.status(404).send('Not found');
        const authorId = results[0].user_id;
        if (!req.session.user.isAdmin && req.session.user.id !== authorId) {
            return res.status(403).send('Brak uprawnień');
        }
        db.query('UPDATE comments SET content = ? WHERE id = ?', [newContent, commentId], (err2) => {
            if (err2) return res.status(500).send('Błąd bazy danych');
            res.sendStatus(200);
        });
    });
});

// Usuń komentarz (autor lub admin)
router.delete('/api/comments/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Nie zalogowano');
    }
    const commentId = req.params.id;
    db.query('SELECT user_id FROM comments WHERE id = ?', [commentId], (err, results) => {
        if (err) return res.status(500).send('Błąd bazy danych');
        if (results.length === 0) return res.status(404).send('Not found');
        const authorId = results[0].user_id;
        if (!req.session.user.isAdmin && req.session.user.id !== authorId) {
            return res.status(403).send('Brak uprawnień');
        }
        db.query('DELETE FROM comments WHERE id = ?', [commentId], (err2) => {
            if (err2) return res.status(500).send('Błąd bazy danych');
            res.sendStatus(200);
        });
    });
});

// Zmiana hasła (edytuj dane konta zalogowanego użytkownika)
router.put('/api/account', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Nie zalogowano');
    }
    const newPass = req.body.password;
    if (!newPass) {
        return res.status(400).send('Brak hasła');
    }
    const userId = req.session.user.id;
    bcrypt.hash(newPass, 10, (err, hash) => {
        if (err) return res.status(500).send('Błąd szyfrowania hasła');
        db.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId], (err2) => {
            if (err2) return res.status(500).send('Błąd bazy danych');
            res.sendStatus(200);
        });
    });
});

module.exports = router;
