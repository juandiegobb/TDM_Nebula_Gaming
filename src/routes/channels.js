const { getUsers, saveUsers } = require("../models/users");
const { getChannels, saveChannels } = require("../models/channels");

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

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
    });
}

function normalizeMemberIds(memberIds) {
    if (!Array.isArray(memberIds)) return [];

    return [...new Set(
        memberIds
            .map(id => Number(id))
            .filter(id => Number.isInteger(id) && id > 0)
    )];
}

function getSafeUsers() {
    return getUsers().map(safeUser);
}

function assignUsersToChannel(users, memberIds, channelId) {
    const selectedMemberIds = normalizeMemberIds(memberIds);
    const existingUserIds = users.map(user => Number(user.id));
    const invalidIds = selectedMemberIds.filter(id => !existingUserIds.includes(id));

    if (invalidIds.length) {
        return {
            ok: false,
            error: `Usuario(s) inválido(s): ${invalidIds.join(", ")}`
        };
    }

    users.forEach(user => {
        if (!selectedMemberIds.includes(Number(user.id))) return;
        if (!Array.isArray(user.grupos)) user.grupos = [];

        const groups = user.grupos.map(Number);
        if (!groups.includes(Number(channelId))) {
            user.grupos.push(Number(channelId));
        }
    });

    return { ok: true, selectedMemberIds };
}

function removeUsersFromChannel(users, channelId) {
    users.forEach(user => {
        if (!Array.isArray(user.grupos)) return;
        user.grupos = user.grupos.filter(id => Number(id) !== Number(channelId));
    });
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

    if (!isAdmin(req)) {
        sendJson(res, 403, { error: "Solo un administrador puede gestionar canales y usuarios." });
        return true;
    }

    const parts = req.url.split("?")[0].split("/").filter(Boolean);

    // GET /api/channels/available-users
    // Lista usuarios reales desde users.json para seleccionarlos en el modal.
    if (req.method === "GET" && parts.length === 3 && parts[2] === "available-users") {
        sendJson(res, 200, getSafeUsers());
        return true;
    }

    // GET /api/channels
    if (req.method === "GET" && parts.length === 2) {
        sendJson(res, 200, buildChannelsWithUsers());
        return true;
    }

    // GET /api/channels/:id/users
    if (req.method === "GET" && parts.length === 4 && parts[3] === "users") {
        const channelId = Number(parts[2]);
        const channel = buildChannelsWithUsers().find(item => Number(item.id) === channelId);
        if (!channel) {
            sendJson(res, 404, { error: "Canal no encontrado" });
            return true;
        }
        sendJson(res, 200, channel.users);
        return true;
    }

    // POST /api/channels
    // Crea un canal y recibe los usuarios seleccionados en el modal.
    // Después actualiza users.json agregando el id del canal al arreglo grupos de cada usuario.
    if (req.method === "POST" && parts.length === 2) {
        parseBody(req)
            .then(({ name, description, img, memberIds, rules }) => {
                const cleanName = String(name || "").trim();
                if (!cleanName) {
                    sendJson(res, 400, { error: "El nombre es obligatorio" });
                    return;
                }

                const users = getUsers();
                const channels = getChannels();
                const newChannelId = channels.length
                    ? Math.max(...channels.map(c => Number(c.id))) + 1
                    : 1;

                const assignResult = assignUsersToChannel(users, memberIds, newChannelId);
                if (!assignResult.ok) {
                    sendJson(res, 400, { error: assignResult.error });
                    return;
                }

                const newChannel = {
                    id: newChannelId,
                    name: cleanName,
                    description: String(description || "").trim(),
                    img: img || null,
                    rules: Array.isArray(rules) ? rules.map(rule => String(rule).trim()).filter(Boolean) : []
                };

                channels.push(newChannel);
                saveChannels(channels);
                saveUsers(users);

                sendJson(res, 201, {
                    ...newChannel,
                    users: users
                        .filter(user => assignResult.selectedMemberIds.includes(Number(user.id)))
                        .map(safeUser),
                    userCount: assignResult.selectedMemberIds.length
                });
            })
            .catch(() => sendJson(res, 400, { error: "JSON inválido" }));
        return true;
    }

    // PUT /api/channels/:id
    // Actualiza el canal y sincroniza la lista de miembros.
    if (req.method === "PUT" && parts.length === 3) {
        const channelId = Number(parts[2]);
        parseBody(req)
            .then(({ name, description, img, memberIds, rules }) => {
                const cleanName = String(name || "").trim();
                if (!cleanName) {
                    sendJson(res, 400, { error: "El nombre es obligatorio" });
                    return;
                }

                const users = getUsers();
                const channels = getChannels();
                const channelIndex = channels.findIndex(c => Number(c.id) === channelId);
                if (channelIndex === -1) {
                    sendJson(res, 404, { error: "Canal no encontrado" });
                    return;
                }

                removeUsersFromChannel(users, channelId);
                const assignResult = assignUsersToChannel(users, memberIds, channelId);
                if (!assignResult.ok) {
                    sendJson(res, 400, { error: assignResult.error });
                    return;
                }

                const updatedChannel = {
                    ...channels[channelIndex],
                    name: cleanName,
                    description: String(description || "").trim(),
                    img: img || null,
                    rules: Array.isArray(rules) ? rules.map(rule => String(rule).trim()).filter(Boolean) : []
                };

                channels[channelIndex] = updatedChannel;
                saveChannels(channels);
                saveUsers(users);

                sendJson(res, 200, {
                    ...updatedChannel,
                    users: users
                        .filter(user => assignResult.selectedMemberIds.includes(Number(user.id)))
                        .map(safeUser),
                    userCount: assignResult.selectedMemberIds.length
                });
            })
            .catch(() => sendJson(res, 400, { error: "JSON inválido" }));
        return true;
    }

    // DELETE /api/channels/:id
    if (req.method === "DELETE" && parts.length === 3) {
        const channelId = Number(parts[2]);
        const channels = getChannels();
        const users = getUsers();
        const channelIndex = channels.findIndex(c => Number(c.id) === channelId);

        if (channelIndex === -1) {
            sendJson(res, 404, { error: "Canal no encontrado" });
            return true;
        }

        channels.splice(channelIndex, 1);
        removeUsersFromChannel(users, channelId);
        saveChannels(channels);
        saveUsers(users);

        sendJson(res, 200, { message: "Canal eliminado correctamente" });
        return true;
    }

    sendJson(res, 404, { error: "Ruta no encontrada" });
    return true;
}

module.exports = handleChannelsRoutes;
