import { getAvailableUsersForChannels, createChannelWithMembers } from "./services/api.js";

// ===============================
// VARIABLES
// ===============================
const modal = document.getElementById("crearServidorModal");
const paso1 = document.getElementById("paso1");
const paso2 = document.getElementById("paso2");

let availableUsers = [];
let selectedMemberIds = new Set();
let imageDataUrl = null;

// ===============================
// ABRIR / CERRAR MODAL
// ===============================
document.getElementById("openCrearServidor").addEventListener("click", () => {
    modal.classList.add("open");
});

document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("closeModal2").addEventListener("click", closeModal);

modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

function closeModal() {
    modal.classList.remove("open");
    resetModal();
}

// ===============================
// RESET
// ===============================
function resetModal() {
    paso1.classList.remove("hidden");
    paso2.classList.add("hidden");

    document.getElementById("serverName").value = "";
    document.getElementById("serverDesc").value = "";
    document.getElementById("serverImgUrl").value = "";

    document.getElementById("nameCount").textContent = "0/100";
    document.getElementById("descCount").textContent = "0/500";

    document.querySelector(".img-preview")?.remove();

    selectedMemberIds.clear();
    imageDataUrl = null;

    closeMembersPanel();
    renderSelectedMembersPreview();
}

// ===============================
// CONTADORES
// ===============================
document.getElementById("serverName").addEventListener("input", function () {
    document.getElementById("nameCount").textContent = `${this.value.length}/100`;
});

document.getElementById("serverDesc").addEventListener("input", function () {
    document.getElementById("descCount").textContent = `${this.value.length}/500`;
});

// ===============================
// IMAGEN
// ===============================
document.getElementById("imageUpload").addEventListener("click", () => {
    document.getElementById("imgInput").click();
});

document.getElementById("imgInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        imageDataUrl = reader.result;
        setImagePreview(imageDataUrl);
    };
    reader.readAsDataURL(file);

    document.getElementById("serverImgUrl").value = "";
});

document.getElementById("serverImgUrl").addEventListener("input", function () {
    const value = this.value.trim();
    imageDataUrl = null;

    if (!value) {
        clearImagePreview();
        return;
    }

    setImagePreview(value);
    document.getElementById("imgInput").value = "";
});

function setImagePreview(url) {
    clearImagePreview();

    const img = document.createElement("img");
    img.className = "img-preview";
    img.src = url;

    document.getElementById("imageUpload").appendChild(img);
}

function clearImagePreview() {
    document.querySelector(".img-preview")?.remove();
}

// ===============================
// PASOS
// ===============================
document.getElementById("irPaso2").addEventListener("click", () => {
    const name = document.getElementById("serverName").value.trim();

    if (!name) {
        alert("El nombre es obligatorio");
        return;
    }

    paso1.classList.add("hidden");
    paso2.classList.remove("hidden");
});

// ===============================
// MIEMBROS (API)
// ===============================
document.getElementById("goToMembers").addEventListener("click", async () => {
    const panel = document.getElementById("membersPanel");
    const list = document.getElementById("membersList");

    panel.classList.remove("hidden");
    list.innerHTML = `<div class="members-empty">Cargando usuarios...</div>`;

    try {
        availableUsers = await getAvailableUsersForChannels();
        renderMembers();
    } catch (error) {
        list.innerHTML = `<div class="members-empty error">Error cargando usuarios</div>`;
    }
});

document.getElementById("closeMembersPanel").addEventListener("click", closeMembersPanel);
document.getElementById("confirmMembersBtn").addEventListener("click", closeMembersPanel);

function closeMembersPanel() {
    document.getElementById("membersPanel").classList.add("hidden");
}

// ===============================
// RENDER USUARIOS
// ===============================
function renderMembers(search = "") {
    const list = document.getElementById("membersList");
    const query = search.toLowerCase();

    const filtered = availableUsers.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );

    if (!filtered.length) {
        list.innerHTML = `<div class="members-empty">No hay usuarios</div>`;
        return;
    }

    list.innerHTML = filtered.map(user => {
        const checked = selectedMemberIds.has(user.id) ? "checked" : "";

        return `
            <label class="member-option">
                <input type="checkbox" value="${user.id}" ${checked}>
                <img 
    src="${user.img || 'https://i.pravatar.cc/150'}" 
    alt="${user.name}" 
    class="member-avatar"
/>

<span>${user.name}</span>
            </label>
        `;
    }).join("");

    list.querySelectorAll("input").forEach(input => {
        input.addEventListener("change", () => {
            const id = Number(input.value);

            if (input.checked) selectedMemberIds.add(id);
            else selectedMemberIds.delete(id);

            renderSelectedMembersPreview();
        });
    });
}

// ===============================
// BUSCADOR
// ===============================
document.getElementById("membersSearch").addEventListener("input", (e) => {
    renderMembers(e.target.value);
});

// ===============================
// PREVIEW MIEMBROS
// ===============================
function renderSelectedMembersPreview() {
    const container = document.getElementById("selectedMembersPreview");

    const selected = availableUsers.filter(user =>
        selectedMemberIds.has(user.id)
    );

    if (!selected.length) {
        container.innerHTML = `<span class="members-empty">Sin miembros seleccionados</span>`;
        return;
    }

    container.innerHTML = selected.map(user => `
        <span class="member-chip">
            ${user.name}
        </span>
    `).join("");
}

// ===============================
// REGLAS
// ===============================
document.getElementById("addRuleBtn").addEventListener("click", () => {
    const text = prompt("Nueva regla:");
    if (!text) return;

    const li = document.createElement("li");
    li.innerHTML = `
        <span class="rule-dot">●</span>
        <span class="rule-text">${text}</span>
        <button class="rule-remove">✕</button>
    `;

    document.getElementById("rulesList").appendChild(li);
});

document.getElementById("rulesList").addEventListener("click", (e) => {
    if (e.target.classList.contains("rule-remove")) {
        e.target.closest("li").remove();
    }
});

// ===============================
// CREAR CANAL (API)
// ===============================
document.getElementById("crearServidorBtn").addEventListener("click", async () => {

    const name = document.getElementById("serverName").value.trim();
    const desc = document.getElementById("serverDesc").value.trim();
    const imgUrl = document.getElementById("serverImgUrl").value.trim();
    const img = imgUrl || imageDataUrl || null;

    const rules = Array.from(document.querySelectorAll(".rule-text"))
        .map(el => el.textContent.trim());

    if (!name) {
        alert("El nombre es obligatorio");
        return;
    }

    const payload = {
        name,
        description: desc,
        img,
        memberIds: [...selectedMemberIds],
        rules
    };

    try {
        await createChannelWithMembers(payload);

        closeModal();
        alert("Canal creado 🚀");

    } catch (error) {
        alert("Error: " + error.message);
    }
});