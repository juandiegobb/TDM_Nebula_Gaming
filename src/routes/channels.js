const { getUsers } = require("../models/users");
const { getChannels } = require("../models/channels");

function safeUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        rol: user.rol,
        img: user.img,
        grupos: Array.isArray(user.grupos) ? user.grupos : [],
        provider: user.provider || "local"
    };
}

function getLoggedUser(req) {
    if (req.isAuthenticated && req.isAuthenticated()) return req.user;
    if (req.session?.appUser) return req.session.appUser;
    
    // Leer desde localStorage enviado como header
    try {
        const userHeader = req.headers["x-user"];
        if (userHeader) return JSON.parse(decodeURIComponent(userHeader));
    } catch {}
    
    return null;
}

function isAdmin(req) {
    const user = getLoggedUser(req);
    return user && user.rol === "admin";
}

function sendJson(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

function buildChannelsWithUsers() {
    const users = getUsers();
    const channels = getChannels();

    return channels.map(channel => {
        const channelId = Number(channel.id);
        const members = users
            .filter(user => Array.isArray(user.grupos) && user.grupos.map(Number).includes(channelId))
            .map(safeUser);

        return {
            ...channel,
            users: members,
            userCount: members.length
        };
    });
}

function handleChannelsRoutes(req, res) {
    if (!req.url.startsWith("/api/channels")) return false;

    if (req.method !== "GET") {
        sendJson(res, 405, { error: "Método no permitido" });
        return true;
    }

    if (!isAdmin(req)) {
        sendJson(res, 403, { error: "Solo un administrador puede ver los canales y sus usuarios." });
        return true;
    }

    const parts = req.url.split("?")[0].split("/").filter(Boolean);

    // GET /api/channels
    if (parts.length === 2) {
        sendJson(res, 200, buildChannelsWithUsers());
        return true;
    }

    // GET /api/channels/:id/users
    if (parts.length === 4 && parts[3] === "users") {
        const channelId = Number(parts[2]);
        const channel = buildChannelsWithUsers().find(item => Number(item.id) === channelId);

        if (!channel) {
            sendJson(res, 404, { error: "Canal no encontrado" });
            return true;
        }

        sendJson(res, 200, channel.users);
        return true;
    }

    sendJson(res, 404, { error: "Ruta no encontrada" });
    return true;
}

module.exports = handleChannelsRoutes;
