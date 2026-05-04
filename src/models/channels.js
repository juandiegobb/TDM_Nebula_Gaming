const fs = require("fs");
const path = require("path");

const CHANNELS_FILE = path.join(__dirname, "..", "data", "channels.json");

function getChannels() {
    if (!fs.existsSync(CHANNELS_FILE)) return [];
    const data = fs.readFileSync(CHANNELS_FILE, "utf8");
    if (!data.trim()) return [];
    return JSON.parse(data);
}

function saveChannels(channels) {
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
}

function getChannelById(channelId) {
    const id = Number(channelId);
    return getChannels().find(channel => Number(channel.id) === id) || null;
}

function getChannelsForUser(user) {
    const channels = getChannels();
    if (!user) return [];
    if (user.rol === "admin") return channels;
    const userGroups = Array.isArray(user.grupos) ? user.grupos.map(Number) : [];
    return channels.filter(channel => userGroups.includes(Number(channel.id)));
}

function userCanAccessChannel(user, channelId) {
    if (!user) return false;
    if (user.rol === "admin") return Boolean(getChannelById(channelId));
    const userGroups = Array.isArray(user.grupos) ? user.grupos.map(Number) : [];
    return userGroups.includes(Number(channelId));
}

module.exports = {
    getChannels,
    saveChannels,
    getChannelById,
    getChannelsForUser,
    userCanAccessChannel
};