const broadcast = require("../utils/broadcast");
const { getUsers } = require("../models/users");
const {
    getChannelById,
    getChannelsForUser,
    userCanAccessChannel
} = require("../models/channels");

let connections = [];

function normalizeId(id) {
    return Number(id);
}

function findDbUser(userFromClient) {
    if (!userFromClient) return null;

    const users = getUsers();
    const clientId = normalizeId(userFromClient.id);

    return users.find(user => {
        if (Number(user.id) === clientId) return true;
        if (user.email && userFromClient.email && user.email === userFromClient.email) return true;
        return false;
    }) || null;
}

function safeUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        rol: user.rol,
        img: user.img,
        grupos: Array.isArray(user.grupos) ? user.grupos : [],
        provider: user.provider
    };
}

function send(ws, payload) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

function getChannelConnections(channelId) {
    return connections.filter(connection => Number(connection.channelId) === Number(channelId));
}

function getChannelMembers(channelId) {
    const users = getUsers();

    return users
        .filter(user => userCanAccessChannel(user, channelId))
        .map(user => ({
            id: user.id,
            name: user.name,
            rol: user.rol,
            img: user.img,
            connected: connections.some(connection =>
                Number(connection.user.id) === Number(user.id) &&
                Number(connection.channelId) === Number(channelId)
            )
        }));
}

function broadcastChannelUsers(channelId) {
    const channelConnections = getChannelConnections(channelId);
    const users = getChannelMembers(channelId);

    broadcast(channelConnections, {
        type: "users",
        channelId: Number(channelId),
        users
    });
}

function joinChannel(connection, channelId) {
    const channel = getChannelById(channelId);

    if (!channel || !userCanAccessChannel(connection.user, channelId)) {
        send(connection.ws, {
            type: "error",
            message: "No tienes permiso para entrar a este canal."
        });
        return false;
    }

    const previousChannelId = connection.channelId;
    connection.channelId = Number(channelId);

    send(connection.ws, {
        type: "channel_joined",
        channel
    });

    send(connection.ws, {
        type: "users",
        channelId: Number(channelId),
        users: getChannelMembers(channelId)
    });

    broadcast(getChannelConnections(channelId), {
        type: "system",
        channelId: Number(channelId),
        text: `${connection.user.name} se unió a #${channel.name}`
    });

    if (previousChannelId && Number(previousChannelId) !== Number(channelId)) {
        broadcastChannelUsers(previousChannelId);
    }

    broadcastChannelUsers(channelId);
    return true;
}

function setupChat(wss) {
    wss.on("connection", (ws, req) => {
        let currentConnection = null;
        const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;

        ws.on("message", (msg) => {
            let data;

            try {
                data = JSON.parse(msg);
            } catch (error) {
                send(ws, { type: "error", message: "Mensaje inválido." });
                return;
            }

            if (data.type === "login") {
                const dbUser = findDbUser(data.user);

                if (!dbUser) {
                    send(ws, {
                        type: "error",
                        message: "Usuario no encontrado en la base de datos."
                    });
                    ws.close();
                    return;
                }

                const allowedChannels = getChannelsForUser(dbUser);

                currentConnection = {
                    id: `${dbUser.id}-${Date.now()}`,
                    user: safeUser(dbUser),
                    ws,
                    channelId: null
                };

                connections.push(currentConnection);

                console.log(`${new Date().toISOString()} - 🟢 Cliente conectado (${dbUser.name} | ${ip})`);

                send(ws, {
                    type: "channels",
                    channels: allowedChannels
                });

                if (allowedChannels.length === 0) {
                    send(ws, {
                        type: "no_channels",
                        message: "No tienes canales asignados. Pide a un administrador que te agregue a un grupo."
                    });
                    return;
                }

                joinChannel(currentConnection, allowedChannels[0].id);
                return;
            }

            if (!currentConnection) {
                send(ws, {
                    type: "error",
                    message: "Debes iniciar sesión antes de usar el chat."
                });
                return;
            }

            if (data.type === "join_channel") {
                joinChannel(currentConnection, data.channelId);
                return;
            }

            if (data.type === "chat") {
                const channelId = currentConnection.channelId;

                if (!channelId || !userCanAccessChannel(currentConnection.user, channelId)) {
                    send(ws, {
                        type: "error",
                        message: "No tienes permiso para enviar mensajes en este canal."
                    });
                    return;
                }

                const text = String(data.text || "").trim();
                if (!text) return;

                broadcast(getChannelConnections(channelId), {
                    type: "chat",
                    channelId,
                    user: currentConnection.user.name,
                    userId: currentConnection.user.id,
                    text
                });
            }
        });

        ws.on("close", () => {
            if (currentConnection) {
                console.log(`${new Date().toISOString()} - 🔴 Cliente desconectado (${currentConnection.user.name} | ${ip})`);

                const oldChannelId = currentConnection.channelId;
                connections = connections.filter(connection => connection !== currentConnection);

                if (oldChannelId) {
                    broadcast(getChannelConnections(oldChannelId), {
                        type: "system",
                        channelId: oldChannelId,
                        text: `${currentConnection.user.name} salió`
                    });

                    broadcastChannelUsers(oldChannelId);
                }
            }
        });
    });
}

module.exports = setupChat;
