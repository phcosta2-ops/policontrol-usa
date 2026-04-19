let token = localStorage.getItem("pc-token") || "";
export function setToken(t) { token = t; if (t) localStorage.setItem("pc-token", t); else localStorage.removeItem("pc-token"); }
export function getToken() { return token; }
async function req(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 401) { setToken(""); window.location.reload(); throw new Error("Unauthorized"); }
  return res.json();
}
export async function login(u, p) { const d = await req("POST", "/api/login", { username: u, password: p }); if (d.token) { setToken(d.token); return d.user; } throw new Error(d.error || "Login failed"); }
export async function logout() { await req("POST", "/api/logout").catch(() => {}); setToken(""); }
export async function getMe() { return req("GET", "/api/me"); }
export async function loadData() { return req("GET", "/api/data"); }
export async function saveData(data) { return req("PUT", "/api/data", data); }
