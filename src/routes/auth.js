const { getUsers } = require("../models/users");

function handleAuthRoutes(req, res) {
    if (req.url.startsWith("/api/login")) {
        const method = req.method;

        // POST /api/login
        if (method === "POST") {
            let body = "";
            req.on("data", chunk => (body += chunk));
            req.on("end", () => {
                try {
                    const { email, password } = JSON.parse(body);
                    const users = getUsers();
                    const user = users.find(u => u.email === email && u.password === password);

                    if (!user) {
                        res.writeHead(401, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "Credenciales inválidas" }));
                        return;
                    }

                    const safeUser = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        rol: user.rol,
                        img: user.img,
                        grupos: Array.isArray(user.grupos) ? user.grupos : [],
                        provider: user.provider || "local"
                    };

                    req.session.appUser = safeUser;

                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        message: "Login exitoso",
                        user: safeUser
                    }));
                } catch (err) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "JSON inválido" }));
                }
            });
            return true;
        }
    }

    return false;
}

module.exports = handleAuthRoutes;
