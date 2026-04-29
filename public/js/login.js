import { login } from "./services/api.js";
import { showError, clearError, saveUser } from "./ui/loginUI.js";

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    clearError();

    try {
        if (!email || !password) {
            showError("Debes ingresar usuario y contraseña");
            return;
        }

        const data = await login(email, password);
        data.user.role = data.user.rol;
        saveUser(data.user);

        if (data.user.role === "admin") {
            window.location.href = "/admi_inicio.html";
            return;
        }

        const grupos = Array.isArray(data.user.grupos) ? data.user.grupos : [];

        if (grupos.length === 0) {
            window.location.href = "/usuario_sin_grupo.html";
            return;
        }

        window.location.href = "/chat.html";
    } catch (err) {
        console.error("Error de login:", err);
        showError(err.message || "Credenciales inválidas");
    }
});
