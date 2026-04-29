import {
    addMessage,
    addSystemMessage,
    clearMessages,
    renderChannels,
    setActiveChannel,
    showNoChannels,
    showSocketError,
    updateUserList
} from "../ui/chatUI.js";

let socket;
let currentUser;
let currentChannelId = null;

export function connect(user) {
    currentUser = user;
    const wsUrl = location.hostname === "localhost" ? "ws://localhost:3000" : `wss://${location.host}`;

    socket = new WebSocket(wsUrl);

    socket.addEventListener("open", () => {
        socket.send(JSON.stringify({
            type: "login",
            user
        }));
    });

    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case "channels":
                renderChannels(data.channels, joinChannel);
                break;

            case "channel_joined":
                currentChannelId = Number(data.channel.id);
                clearMessages();
                setActiveChannel(data.channel);
                break;

            case "chat":
                if (Number(data.channelId) !== Number(currentChannelId)) return;
                addMessage(data.user, data.text, Number(data.userId) === Number(currentUser.id));
                break;

            case "system":
                if (data.channelId && Number(data.channelId) !== Number(currentChannelId)) return;
                addSystemMessage(data.text);
                break;

            case "users":
                if (data.channelId && Number(data.channelId) !== Number(currentChannelId)) return;
                updateUserList(data.users);
                break;

            case "no_channels":
                showNoChannels(data.message);
                break;

            case "error":
                showSocketError(data.message);
                break;

            default:
                console.warn("Tipo de mensaje desconocido:", data.type);
        }
    });
}

export function joinChannel(channelId) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
        type: "join_channel",
        channelId: Number(channelId)
    }));
}

export function sendMessage(text) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
        type: "chat",
        text
    }));
}
