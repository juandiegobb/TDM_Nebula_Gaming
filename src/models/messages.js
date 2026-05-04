const fs = require("fs");
const path = require("path");

const MESSAGES_PATH = path.join(__dirname, "..", "data", "messages.json");
const MAX_MESSAGES_PER_CHANNEL = 500;

function ensureMessagesFile() {
    if (!fs.existsSync(MESSAGES_PATH)) {
        fs.writeFileSync(MESSAGES_PATH, JSON.stringify({}, null, 4));
    }
}

function readMessages() {
    ensureMessagesFile();

    try {
        const data = fs.readFileSync(MESSAGES_PATH, "utf8");
        if (!data.trim()) return {};

        const parsed = JSON.parse(data);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        console.error("Error leyendo messages.json:", error);
        return {};
    }
}

function writeMessages(messages) {
    fs.writeFileSync(MESSAGES_PATH, JSON.stringify(messages, null, 4));
}

function getMessagesByChannel(channelId) {
    const messages = readMessages();
    const key = String(Number(channelId));

    return Array.isArray(messages[key]) ? messages[key] : [];
}

function addMessageToChannel(channelId, message) {
    const messages = readMessages();
    const key = String(Number(channelId));

    if (!Array.isArray(messages[key])) {
        messages[key] = [];
    }

    const storedMessage = {
        id: message.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        channelId: Number(channelId),
        user: message.user,
        userId: message.userId,
        userRole: message.userRole,
        userImg: message.userImg,
        text: message.text,
        createdAt: message.createdAt || new Date().toISOString()
    };

    messages[key].push(storedMessage);

    if (messages[key].length > MAX_MESSAGES_PER_CHANNEL) {
        messages[key] = messages[key].slice(-MAX_MESSAGES_PER_CHANNEL);
    }

    writeMessages(messages);
    return storedMessage;
}

module.exports = {
    getMessagesByChannel,
    addMessageToChannel
};
