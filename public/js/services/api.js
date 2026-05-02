const API_USERS_URL = "/api/users";
const API_LOGIN_URL = "/api/login";

export async function login(email, password) {
    const res = await fetch(API_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) throw new Error("Credenciales inválidas");
    return res.json();
}

export async function getUsers() {
    const res = await fetch(API_USERS_URL);

    if (!res.ok) throw new Error("Error al cargar items");
    return res.json();
}

export async function getUser(id) {
    const res = await fetch(`${API_USERS_URL}/${id}`);

    if (!res.ok) throw new Error("Usuario no encontrado");
    return res.json();
}

export async function createUser(data) {
    const res = await fetch(API_USERS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error("Error al crear usuario");
    return res.json();
}

export async function updateUser(id, data) {
    const res = await fetch(`${API_USERS_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error("Error al actualizar usuario");
    return res.json();
}

export async function deleteUser(id) {
    const res = await fetch(`${API_USERS_URL}/${id}`, { method: "DELETE" });
    
    if (!res.ok) throw new Error("Error al eliminar usuario");
    return res.json();
}
export async function getCurrentUser() {
    const res = await fetch("/api/me");
    if (!res.ok) throw new Error("No se pudo verificar la sesión");
    return res.json();
}


export async function getChannelsWithUsers() {
    const user = localStorage.getItem("user");
    const headers = {};
    if (user) headers["x-user"] = encodeURIComponent(user);

    const res = await fetch("/api/channels", { headers });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "No se pudieron cargar los canales" }));
        throw new Error(error.error || "No se pudieron cargar los canales");
    }

    return res.json();
}
export async function addMemberToChannel(channelId, userId) {
    const res = await fetch(`/api/channels/${channelId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error("Error al añadir miembro");
    return res.json();
}

export async function removeMemberFromChannel(channelId, userId) {
    const res = await fetch(`/api/channels/${channelId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error("Error al quitar miembro");
    return res.json();
}
export async function getAvailableUsersForChannels() {
    const user = localStorage.getItem("user");
    const headers = {};
    if (user) headers["x-user"] = encodeURIComponent(user);

    const res = await fetch("/api/channels/available-users", { headers });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "No se pudieron cargar los usuarios" }));
        throw new Error(error.error || "No se pudieron cargar los usuarios");
    }

    return res.json();
}

export async function createChannelWithMembers(data) {
    const user = localStorage.getItem("user");
    const headers = { "Content-Type": "application/json" };
    if (user) headers["x-user"] = encodeURIComponent(user);

    const res = await fetch("/api/channels", {
        method: "POST",
        headers,
        body: JSON.stringify(data)
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Error al crear el canal" }));
        throw new Error(error.error || "Error al crear el canal");
    }

    return res.json();
}

export async function updateChannelWithMembers(channelId, data) {
    const user = localStorage.getItem("user");
    const headers = { "Content-Type": "application/json" };
    if (user) headers["x-user"] = encodeURIComponent(user);

    const res = await fetch(`/api/channels/${channelId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Error al actualizar el canal" }));
        throw new Error(error.error || "Error al actualizar el canal");
    }

    return res.json();
}
