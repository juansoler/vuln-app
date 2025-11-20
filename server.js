const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Configuración de la base de datos
const DB_PATH = process.env.DB_PATH || './data.db';
const db = new sqlite3.Database(DB_PATH);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// VULNERABILIDAD: CORS totalmente abierto
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// Inicializar base de datos
db.serialize(() => {
  // Crear tabla de usuarios
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  // Crear tabla de comentarios
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT,
    content TEXT
  )`);

  // VULNERABILIDAD: Contraseña en texto plano
  // Insertar usuario admin si no existe
  db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')`);
  
  // Insertar algunos usuarios adicionales para IDOR
  db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('user1', 'password123', 'user')`);
  db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('user2', 'qwerty', 'user')`);
});

// Helper para generar HTML básico
function layout(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 600px;
      width: 100%;
    }
    h1 { color: #333; margin-bottom: 20px; }
    h2 { color: #555; margin: 20px 0 10px; }
    form { margin: 20px 0; }
    input[type="text"], input[type="password"], textarea {
      width: 100%;
      padding: 12px;
      margin: 8px 0;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 14px;
    }
    textarea { min-height: 100px; font-family: Arial, sans-serif; }
    button {
      background: #667eea;
      color: white;
      padding: 12px 30px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 10px;
    }
    button:hover { background: #5568d3; }
    .error { color: red; margin: 10px 0; }
    .success { color: green; margin: 10px 0; }
    .comment {
      background: #f9f9f9;
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
      border-left: 4px solid #667eea;
    }
    .comment-author { font-weight: bold; color: #667eea; margin-bottom: 5px; }
    .nav { margin-bottom: 20px; }
    .nav a {
      color: #667eea;
      text-decoration: none;
      margin-right: 15px;
      font-weight: bold;
    }
    .nav a:hover { text-decoration: underline; }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-size: 12px;
    }
    .user-info {
      background: #fff3cd;
      padding: 15px;
      border-radius: 5px;
      border: 1px solid #ffc107;
    }
  </style>
</head>
<body>
  <div class="container">
    ${bodyHtml}
  </div>
</body>
</html>
  `;
}

// RUTA: Página de login (GET /)
app.get('/', (req, res) => {
  const error = req.query.error;
  let errorMsg = '';
  
  if (error === 'invalid') {
    errorMsg = '<p class="error">Usuario o contraseña incorrectos</p>';
  }

  const html = layout('Login - Vuln App', `
    <h1>🔓 Login</h1>
    <p style="color: #666; margin-bottom: 20px;">Aplicación vulnerable para taller de seguridad</p>
    ${errorMsg}
    <form method="POST" action="/login">
      <input type="text" name="username" placeholder="Usuario" required>
      <input type="password" name="password" placeholder="Contraseña" required>
      <button type="submit">Iniciar sesión</button>
    </form>
    <p style="margin-top: 20px; font-size: 12px; color: #999;">
      Usuario de prueba: admin / admin
    </p>
  `);
  
  res.send(html);
});

// RUTA: Login (POST /login)
// VULNERABILIDAD: SQL Injection - query construida con concatenación directa
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // VULNERABLE: Concatenación directa sin prepared statements
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  
  db.get(query, (err, user) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.redirect('/?error=invalid');
    }

    if (user) {
      // VULNERABILIDAD: Cookies inseguras (sin HttpOnly, Secure, firma, etc.)
      res.cookie('user', user.username);
      res.cookie('role', user.role);
      res.redirect('/dashboard');
    } else {
      res.redirect('/?error=invalid');
    }
  });
});

// RUTA: Dashboard (GET /dashboard)
// VULNERABILIDAD: Autenticación basada solo en cookies no firmadas
app.get('/dashboard', (req, res) => {
  const username = req.cookies.user;
  const role = req.cookies.role;

  if (!username) {
    return res.redirect('/');
  }

  const html = layout('Dashboard', `
    <div class="nav">
      <a href="/dashboard">Dashboard</a>
      <a href="/comments">Comentarios</a>
      <a href="/admin?user=${username}">Admin Panel</a>
      <a href="/logout">Salir</a>
    </div>
    <h1>Bienvenido, ${username}! 👋</h1>
    <p style="margin: 20px 0; color: #666;">Tu rol: <strong>${role}</strong></p>
    <p style="color: #999; font-size: 14px;">
      Esta es tu área personal. Desde aquí puedes acceder a diferentes secciones.
    </p>
  `);

  res.send(html);
});

// RUTA: Comentarios (GET /comments)
// VULNERABILIDAD: XSS almacenado - no se escapa el HTML
app.get('/comments', (req, res) => {
  const username = req.cookies.user;

  if (!username) {
    return res.redirect('/');
  }

  db.all("SELECT * FROM comments ORDER BY id DESC", (err, comments) => {
    if (err) {
      return res.send('Error al cargar comentarios');
    }

    let commentsHtml = '';
    comments.forEach(comment => {
      // VULNERABLE: Se renderiza directamente sin escapar HTML
      commentsHtml += `
        <div class="comment">
          <div class="comment-author">${comment.author}</div>
          <div>${comment.content}</div>
        </div>
      `;
    });

    const html = layout('Comentarios', `
      <div class="nav">
        <a href="/dashboard">Dashboard</a>
        <a href="/comments">Comentarios</a>
        <a href="/admin?user=${username}">Admin Panel</a>
        <a href="/logout">Salir</a>
      </div>
      <h1>💬 Comentarios</h1>
      
      <h2>Nuevo comentario</h2>
      <form method="POST" action="/comments">
        <input type="text" name="author" placeholder="Tu nombre" required>
        <textarea name="content" placeholder="Escribe tu comentario..." required></textarea>
        <button type="submit">Publicar</button>
      </form>

      <h2>Comentarios recientes</h2>
      ${commentsHtml || '<p style="color: #999;">No hay comentarios todavía.</p>'}
    `);

    res.send(html);
  });
});

// RUTA: Crear comentario (POST /comments)
// VULNERABILIDAD: No se sanitiza el input, permitiendo XSS
app.post('/comments', (req, res) => {
  const { author, content } = req.body;

  // VULNERABLE: Se inserta directamente sin sanitización
  db.run("INSERT INTO comments (author, content) VALUES (?, ?)", [author, content], (err) => {
    if (err) {
      console.error('Error al insertar comentario:', err);
    }
    res.redirect('/comments');
  });
});

// RUTA: Panel de admin (GET /admin)
// VULNERABILIDAD: IDOR / Control de acceso roto - cualquiera puede ver datos de cualquier usuario
app.get('/admin', (req, res) => {
  const requestedUser = req.query.user;

  if (!requestedUser) {
    const html = layout('Admin Panel', `
      <h1>Admin Panel</h1>
      <p class="error">Especifica un usuario: /admin?user=admin</p>
    `);
    return res.send(html);
  }

  // VULNERABLE: No verifica autenticación ni autorización
  db.get("SELECT * FROM users WHERE username = ?", [requestedUser], (err, user) => {
    if (err || !user) {
      const html = layout('Admin Panel', `
        <h1>Admin Panel</h1>
        <p class="error">Usuario no encontrado</p>
      `);
      return res.send(html);
    }

    // VULNERABLE: Muestra la contraseña en texto plano
    const html = layout('Admin Panel', `
      <div class="nav">
        <a href="/dashboard">Dashboard</a>
        <a href="/comments">Comentarios</a>
        <a href="/logout">Salir</a>
      </div>
      <h1>🔐 Admin Panel</h1>
      <div class="user-info">
        <h2>Información del usuario: ${user.username}</h2>
        <p><strong>ID:</strong> ${user.id}</p>
        <p><strong>Username:</strong> ${user.username}</p>
        <p><strong>Password:</strong> ${user.password}</p>
        <p><strong>Role:</strong> ${user.role}</p>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        Prueba con: /admin?user=user1 o /admin?user=user2
      </p>
    `);

    res.send(html);
  });
});

// RUTA: Debug endpoint (GET /debug/env)
// VULNERABILIDAD: Exposición de variables de entorno y secretos
app.get('/debug/env', (req, res) => {
  const html = layout('Debug - Environment Variables', `
    <h1>🐛 Debug - Environment Variables</h1>
    <p style="color: #666; margin-bottom: 20px;">Variables de entorno del sistema:</p>
    <pre>${JSON.stringify(process.env, null, 2)}</pre>
  `);

  res.send(html);
});

// RUTA: Logout
app.get('/logout', (req, res) => {
  res.clearCookie('user');
  res.clearCookie('role');
  res.redirect('/');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🔓 Aplicación vulnerable corriendo en http://localhost:${PORT}`);
  console.log(`📊 Base de datos: ${DB_PATH}`);
  console.log(`⚠️  Esta aplicación es INTENCIONALMENTE INSEGURA para propósitos educativos`);
});
