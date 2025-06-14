const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
const routes = require('./routes');

app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));
app.use(express.static(path.join(__dirname, '../frontend/html')));
console.log(path.join(__dirname, '../frontend/html'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'forum-secret',
    resave: false,
    saveUninitialized: false
}));

app.use(routes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log('Serwer wystartował na porcie ' + PORT);
});
