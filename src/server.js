// Cargar variables de entorno desde archivo .env
require("dotenv").config();

// Importar dependencias principales
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const path = require("path");
const fs = require("fs");
const http = require("http");
const WebSocket = require("ws");

// Importar rutas y configuración personalizada
const handleUsersRoutes = require("./routes/users");
const handleAuthRoutes = require("./routes/auth");
const handleChannelsRoutes = require("./routes/channels");
const setupChat = require("./web/chat");

// Configuración de puerto y ruta de archivos públicos
const PORT = process.env.PORT || 3000;
const PUBLIC_PATH = path.join(__dirname, "..", "public");

// Ruta del archivo JSON de usuarios
const USERS_PATH = path.join(__dirname, "data", "users.json");

// Leer usuarios desde users.json
function readUsers() {
    if (!fs.existsSync(USERS_PATH)) return [];

    const data = fs.readFileSync(USERS_PATH, "utf8");

    if (!data.trim()) return [];

    return JSON.parse(data);
}

// Guardar usuarios en users.json
function writeUsers(users) {
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 4));
}

// Buscar usuario por email o crearlo si viene desde Google
function findOrCreateGoogleUser(profile) {
    const users = readUsers();

    const googleEmail = profile.emails?.[0]?.value || "";
    const googleName = profile.displayName || "Usuario Google";
    const googleImg = profile.photos?.[0]?.value || "https://i.pravatar.cc/150";

    let user = users.find(u => u.email === googleEmail);

    if (!user) {
        const newId = users.length
            ? Math.max(...users.map(u => Number(u.id))) + 1
            : 1;

        user = {
            id: newId,
            name: googleName,
            password: "",
            email: googleEmail,
            rol: "user",
            img: googleImg,
            grupos: [],
            provider: "google"
        };

        users.push(user);
        writeUsers(users);
    }

    return user;
}

// Crear instancia de aplicación Express
const app = express();

// Configurar sesiones: almacena información del usuario durante su conexión
app.use(
    session({
        secret: process.env.SESSION_SECRET || "dev-secret-change-me",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // Duración: 24 horas
            httpOnly: true // Solo accesible via HTTP, no por JavaScript
        }
    })
);

// Configurar serialización y deserialización de usuario para Passport
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Configurar estrategia de autenticación con Google OAuth
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
        },
        (accessToken, refreshToken, profile, done) => {
            try {
                const user = findOrCreateGoogleUser(profile);
                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

// Inicializar Passport e integrar con sesiones
app.use(passport.initialize());
app.use(passport.session());

// Ruta para iniciar autenticación con Google
app.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

// Ruta callback que Google llama después de autenticar al usuario
app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login.html?error=google" }),
    (req, res) => {
        const user = req.user;

        // Validación de grupos
        if (!user.grupos || user.grupos.length === 0) {
            // No tiene grupos
            return res.redirect("/usuario_sin_grupo.html");
        } else {
            // Sí tiene grupos
            return res.redirect("/chat_usuario.html");
        }
    }
);

// Ruta para cerrar sesión
app.get("/auth/logout", (req, res) => {
    req.logout(() => {
        req.session.destroy(() => {
            res.redirect("/login.html");
        });
    });
});

// Ruta para obtener información del usuario autenticado
app.get("/api/me", (req, res) => {
    const sessionUser = req.session?.appUser;

    if (!req.isAuthenticated() && !sessionUser) {
        res.json({ authenticated: false });
        return;
    }

    res.json({
        authenticated: true,
        user: req.user || sessionUser
    });
});

// Middleware personalizado para procesar rutas específicas
// Middleware personalizado para procesar rutas específicas
app.use((req, res, next) => {
    if (handleUsersRoutes(req, res)) return;
    if (handleAuthRoutes(req, res)) return;
    if (handleChannelsRoutes(req, res)) return;
    next();
});

// Servir archivos estáticos desde la carpeta public
app.use(express.static(PUBLIC_PATH));

// Ruta raíz
app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, "login.html"));
});

// Crear servidor HTTP
const server = http.createServer(app);

// Crear servidor WebSocket para comunicación en tiempo real
const wss = new WebSocket.Server({ server });
setupChat(wss);

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log("Google OAuth: /auth/google");
});