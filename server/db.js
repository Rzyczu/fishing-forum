const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fishing_forum'
});

db.connect(err => {
    if (err) {
        console.error('Błąd połączenia z bazą:', err);
    } else {
        console.log('Połączono z bazą danych MySQL.');
    }
});

module.exports = db;
