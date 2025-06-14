document.addEventListener('DOMContentLoaded', () => {
    const isPostPage = window.location.pathname.endsWith('/post.html');
    let currentUser = null;
    const postId = isPostPage ? new URLSearchParams(window.location.search).get('post') : null;

    // Sprawdź sesję (czy użytkownik zalogowany)
    fetch('/api/session')
        .then(res => res.json())
        .then(data => {
            currentUser = data.user;
            updateUserUI();
            if (isPostPage) {
                loadPost();
                loadComments();
            } else {
                loadCategories().then(() => loadPosts());
            }
        });

    function updateUserUI() {
        const userInfo = document.getElementById('user-info');
        if (currentUser) {
            userInfo.innerHTML = '<span style="color:white;">Zalogowano jako ' + currentUser.username +
                ' (<a href="#" id="logout-link" style="color:white;">Wyloguj</a> | <a href="#" id="change-pass-link" style="color:white;">Zmień hasło</a>)</span>';
        } else {
            userInfo.innerHTML = '<a href="login.html" style="color:white;">Zaloguj</a> | <a href="register.html" style="color:white;">Rejestracja</a>';
        }

        // Obsługa kliknięcia "Wyloguj"
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                fetch('/api/logout').then(res => {
                    currentUser = null;
                    window.location.href = 'index.html';
                });
            });
        }
        // Obsługa zmiany hasła
        const changePassLink = document.getElementById('change-pass-link');
        if (changePassLink) {
            changePassLink.addEventListener('click', (e) => {
                e.preventDefault();
                const newPass = prompt('Podaj nowe hasło:');
                if (newPass) {
                    fetch('/api/account', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: newPass })
                    }).then(res => {
                        if (res.ok) {
                            alert('Hasło zmienione.');
                        } else {
                            alert('Błąd zmiany hasła.');
                        }
                    });
                }
            });
        }
        // Pokaż/ukryj sekcję dodawania wpisu lub komentarza w zależności od strony
        if (!isPostPage) {
            document.getElementById('new-post-section').style.display = currentUser ? 'block' : 'none';
            if (currentUser && currentUser.isAdmin) {
                document.getElementById('category-admin').style.display = 'flex';
            }
        } else {
            document.getElementById('new-comment-section').style.display = currentUser ? 'block' : 'none';
        }
    }

    async function loadCategories() {
        const res = await fetch('/api/categories');
        const categories = await res.json();
        const catFilter = document.getElementById('category-filter');
        const postCatSelect = document.getElementById('post-category');
        // Wyczyść listy kategorii (zachowaj "Wszystkie" w filtrze)
        postCatSelect.innerHTML = '';
        for (let i = catFilter.options.length - 1; i > 0; i--) {
            catFilter.remove(i);
        }
        for (const cat of categories) {
            const opt1 = document.createElement('option');
            opt1.value = cat.id;
            opt1.textContent = cat.name;
            postCatSelect.appendChild(opt1);
            const opt2 = document.createElement('option');
            opt2.value = cat.id;
            opt2.textContent = cat.name;
            catFilter.appendChild(opt2);
        }
    }

    async function loadPosts(categoryId = '') {
        let url = '/api/posts';
        if (categoryId) {
            url += '?category=' + categoryId;
        }
        const res = await fetch(url);
        const posts = await res.json();
        const postsDiv = document.getElementById('posts');
        postsDiv.innerHTML = '';
        for (const post of posts) {
            const postDiv = document.createElement('div');
            postDiv.className = 'post';
            postDiv.id = 'post-' + post.id;
            // Tytuł wpisu jako link do strony post.html
            const titleElem = document.createElement('h3');
            const titleLink = document.createElement('a');
            titleLink.href = 'post.html?post=' + post.id;
            titleLink.textContent = post.title;
            titleElem.appendChild(titleLink);
            postDiv.appendChild(titleElem);
            // Metadane: autor, kategoria, data
            const metaDiv = document.createElement('div');
            metaDiv.className = 'meta';
            const dateStr = new Date(post.created_at).toLocaleString('pl-PL');
            metaDiv.innerHTML =
                'Autor: ' + post.authorName + '<br>' +
                'Kategoria: ' + post.categoryName + '<br>' +
                'Dodano: ' + dateStr;
            postDiv.appendChild(metaDiv);
            // Akcje (usuń) jeśli uprawniony
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';
            if (currentUser && (currentUser.id === post.user_id || currentUser.isAdmin)) {
                const delLink = document.createElement('a');
                delLink.href = '#';
                delLink.textContent = 'Usuń';
                delLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm('Usunąć wpis "' + post.title + '"?')) {
                        fetch('/api/posts/' + post.id, { method: 'DELETE' })
                            .then(res => {
                                if (res.ok) {
                                    postsDiv.removeChild(postDiv);
                                } else {
                                    alert('Błąd usuwania wpisu.');
                                }
                            });
                    }
                });
                actionsDiv.appendChild(delLink);
            }
            postDiv.appendChild(actionsDiv);
            postsDiv.appendChild(postDiv);
        }
    }

    async function loadPost() {
        const res = await fetch('/api/posts/' + postId);
        if (!res.ok) {
            alert('Wpis nie znaleziony.');
            window.location.href = 'index.html';
            return;
        }
        const post = await res.json();
        document.getElementById('post-title').textContent = post.title;
        const dateStr = new Date(post.created_at).toLocaleString('pl-PL');
        document.getElementById('post-meta').textContent =
            'Autor: ' + post.authorName + ' | Kategoria: ' + post.categoryName + ' | Data: ' + dateStr;
        document.getElementById('post-content').textContent = post.content;
        // Akcje dla wpisu (Edytuj/Usuń)
        const actionsDiv = document.getElementById('post-actions');
        if (currentUser && (currentUser.id === post.user_id || currentUser.isAdmin)) {
            const editLink = document.createElement('a');
            editLink.href = '#';
            editLink.textContent = 'Edytuj';
            editLink.addEventListener('click', (e) => {
                e.preventDefault();
                const newTitle = prompt('Edytuj tytuł:', post.title);
                if (newTitle === null) return;
                const newContent = prompt('Edytuj treść:', post.content);
                if (newContent === null) return;
                fetch('/api/posts/' + post.id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newTitle, content: newContent })
                }).then(res => {
                    if (res.ok) {
                        post.title = newTitle;
                        post.content = newContent;
                        document.getElementById('post-title').textContent = newTitle;
                        document.getElementById('post-content').textContent = newContent;
                    } else {
                        alert('Błąd edycji wpisu.');
                    }
                });
            });
            const delLink = document.createElement('a');
            delLink.href = '#';
            delLink.textContent = 'Usuń';
            delLink.style.marginLeft = '10px';
            delLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Usunąć ten wpis?')) {
                    fetch('/api/posts/' + post.id, { method: 'DELETE' })
                        .then(res => {
                            if (res.ok) {
                                window.location.href = 'index.html';
                            } else {
                                alert('Błąd usuwania wpisu.');
                            }
                        });
                }
            });
            actionsDiv.appendChild(editLink);
            actionsDiv.appendChild(document.createTextNode(' '));
            actionsDiv.appendChild(delLink);
        }
    }

    async function loadComments() {
        const res = await fetch('/api/posts/' + postId + '/comments');
        const comments = await res.json();
        const commentsDiv = document.getElementById('comments');
        commentsDiv.innerHTML = '';
        for (const comment of comments) {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            commentDiv.id = 'comment-' + comment.id;
            const contentP = document.createElement('p');
            contentP.className = 'content';
            contentP.textContent = comment.content;
            commentDiv.appendChild(contentP);
            const metaDiv = document.createElement('div');
            metaDiv.className = 'meta';
            const dateStr = new Date(comment.created_at).toLocaleString('pl-PL');
            metaDiv.textContent = 'Autor: ' + comment.authorName + ', ' + dateStr;
            commentDiv.appendChild(metaDiv);
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';
            if (currentUser && (currentUser.id === comment.user_id || currentUser.isAdmin)) {
                const editLink = document.createElement('a');
                editLink.href = '#';
                editLink.textContent = 'Edytuj';
                editLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    const newContent = prompt('Edytuj komentarz:', comment.content);
                    if (newContent === null) return;
                    fetch('/api/comments/' + comment.id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: newContent })
                    }).then(res => {
                        if (res.ok) {
                            comment.content = newContent;
                            contentP.textContent = newContent;
                        } else {
                            alert('Błąd edycji komentarza.');
                        }
                    });
                });
                const delLink = document.createElement('a');
                delLink.href = '#';
                delLink.textContent = 'Usuń';
                delLink.style.marginLeft = '10px';
                delLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm('Usunąć komentarz?')) {
                        fetch('/api/comments/' + comment.id, { method: 'DELETE' })
                            .then(res => {
                                if (res.ok) {
                                    commentsDiv.removeChild(commentDiv);
                                } else {
                                    alert('Błąd usuwania komentarza.');
                                }
                            });
                    }
                });
                actionsDiv.appendChild(editLink);
                actionsDiv.appendChild(document.createTextNode(' '));
                actionsDiv.appendChild(delLink);
            }
            commentDiv.appendChild(actionsDiv);
            commentsDiv.appendChild(commentDiv);
        }
    }

    // Eventy specyficzne dla strony głównej vs strony wpisu
    if (!isPostPage) {
        document.getElementById('category-filter').addEventListener('change', (e) => {
            loadPosts(e.target.value);
        });
        document.getElementById('add-category-btn').addEventListener('click', (e) => {
            e.preventDefault();
            const name = document.getElementById('new-category-name').value.trim();
            if (!name) return;
            fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name })
            })
                .then(res => res.json())
                .then(cat => {
                    if (cat && cat.id) {
                        // Dodaj nową kategorię do list
                        const catFilter = document.getElementById('category-filter');
                        const opt = document.createElement('option');
                        opt.value = cat.id;
                        opt.textContent = cat.name;
                        catFilter.appendChild(opt);
                        const postCatSelect = document.getElementById('post-category');
                        const opt2 = document.createElement('option');
                        opt2.value = cat.id;
                        opt2.textContent = cat.name;
                        postCatSelect.appendChild(opt2);
                        document.getElementById('new-category-name').value = '';
                    } else {
                        alert('Nie udało się dodać kategorii.');
                    }
                });
        });
        document.getElementById('new-post-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('new-post-title').value;
            const content = document.getElementById('new-post-content').value;
            const category = document.getElementById('post-category').value;
            fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title, content: content, categoryId: category })
            }).then(res => res.json()).then(data => {
                if (data && data.id) {
                    window.location.href = 'post.html?post=' + data.id;
                } else {
                    alert('Nie udało się dodać wpisu.');
                }
            });
        });
    } else {
        document.getElementById('new-comment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const content = document.getElementById('comment-content').value;
            fetch('/api/posts/' + postId + '/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content })
            }).then(res => {
                if (res.ok) {
                    document.getElementById('comment-content').value = '';
                    loadComments();
                } else {
                    alert('Nie udało się dodać komentarza.');
                }
            });
        });
    }
});
