const { getUsers, saveUsers } = require("../models/users");

function sendJson(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

function getLoggedUser(req) {
    if (req.isAuthenticated && req.isAuthenticated()) return req.user;
    return req.session?.appUser || null;
}

function isAdmin(req) {
    const user = getLoggedUser(req);
    return user && user.rol === "admin";
}

function handleMembersRoutes(req, res) {
    const match = req.url.match(/^\/api\/channels\/(\d+)\/members$/);
    if (!match) return false;

    const channelId = Number(match[1]);

    if (!isAdmin(req)) {
        sendJson(res, 403, { error: "Solo un administrador puede gestionar miembros." });
        return true;
    }

    if (req.method === "POST") {
        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", () => {
            try {
                const { userId } = JSON.parse(body);
                if (!userId) { sendJson(res, 400, { error: "Se requiere userId" }); return; }

                const users = getUsers();
                const index = users.findIndex(u => u.id === Number(userId));
                if (index === -1) { sendJson(res, 404, { error: "Usuario no encontrado" }); return; }

                const user = users[index];
                if (!Array.isArray(user.grupos)) user.grupos = [];
                if (!user.grupos.map(Number).includes(channelId)) {
                    user.grupos.push(channelId);
                    saveUsers(users);
                }

                sendJson(res, 200, { message: "Usuario añadido al canal", user });
            } catch { sendJson(res, 400, { error: "JSON inválido" }); }
        });
        return true;
    }

    if (req.method === "DELETE") {
        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", () => {
            try {
                const { userId } = JSON.parse(body);
                if (!userId) { sendJson(res, 400, { error: "Se requiere userId" }); return; }

                const users = getUsers();
                const index = users.findIndex(u => u.id === Number(userId));
                if (index === -1) { sendJson(res, 404, { error: "Usuario no encontrado" }); return; }

                const user = users[index];
                if (!Array.isArray(user.grupos)) user.grupos = [];
                user.grupos = user.grupos.filter(g => Number(g) !== channelId);
                saveUsers(users);

                sendJson(res, 200, { message: "Usuario quitado del canal", user });
            } catch { sendJson(res, 400, { error: "JSON inválido" }); }
        });
        return true;
    }

    sendJson(res, 405, { error: "Método no permitido" });
    return true;
}

module.exports = handleMembersRoutes;