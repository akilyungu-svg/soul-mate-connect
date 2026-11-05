const grid = document.querySelector("#profile-grid");
const filters = document.querySelector("#filters");
const count = document.querySelector("#result-count");
const dialog = document.querySelector("#profile-dialog");
const dialogContent = document.querySelector("#dialog-content");
let whatsappNumber = "";

document.querySelector("#year").textContent = new Date().getFullYear();
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();

async function loadConfig() {
  try { const r = await fetch("/api/config"); const d = await r.json(); whatsappNumber = d.whatsapp || ""; } catch {}
}
function whatsappLink(profile) {
  const message = `Hello Soul Mate Connect matchmaker. I am interested in profile #${profile.id} (${profile.display_name}, ${profile.age}, ${profile.county}). Please help me request an introduction.`;
  return whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}` : "";
}
function optionsFor(select, values) {
  const current = select.value;
  const label = select.options[0].textContent;
  select.innerHTML = `<option value="">${esc(label)}</option>` + [...new Set(values.filter(Boolean))].sort().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  select.value = current;
}
function card(p) {
  const image = p.image_url ? `<img src="${esc(p.image_url)}" alt="Approved portrait of ${esc(p.display_name)}" loading="lazy" onerror="this.parentElement.textContent='${esc(initials(p.display_name))}'">` : esc(initials(p.display_name));
  return `<article class="profile-card">
    <div class="profile-image">${image}</div><div class="profile-info">
      <h3>${esc(p.display_name)}, ${esc(p.age)}</h3><div class="profile-meta">${esc(p.county)} · ${esc(p.occupation)}</div>
      <span class="profile-tag">${esc(p.relationship_preference)}</span>
      <div class="profile-actions"><button class="outline-button" data-view="${p.id}">View profile</button></div>
    </div></article>`;
}
async function fetchProfiles(query = "") {
  grid.innerHTML = `<div class="empty-state">Loading profiles…</div>`;
  try {
    const r = await fetch(`/api/profiles${query}`);
    if (!r.ok) throw new Error("Unable to load profiles");
    const profiles = await r.json();
    count.textContent = `${profiles.length} profile${profiles.length === 1 ? "" : "s"} found`;
    if (!profiles.length) { grid.innerHTML = `<div class="empty-state">No profiles match those filters yet. Try changing your search.</div>`; return; }
    grid.innerHTML = profiles.map(card).join("");
    optionsFor(filters.elements.county, profiles.map(p=>p.county));
    optionsFor(filters.elements.occupation, profiles.map(p=>p.occupation));
    optionsFor(filters.elements.relationship_preference, profiles.map(p=>p.relationship_preference));
  } catch { grid.innerHTML = `<div class="empty-state">We couldn't load profiles. Please try again later.</div>`; count.textContent = ""; }
}
filters.addEventListener("submit", e => {
  e.preventDefault();
  const params = new URLSearchParams(new FormData(filters));
  for (const [k,v] of [...params]) if (!v) params.delete(k);
  fetchProfiles(params.toString() ? `?${params}` : "");
});
filters.addEventListener("reset", () => setTimeout(()=>fetchProfiles(), 0));
grid.addEventListener("click", async e => {
  const btn = e.target.closest("[data-view]");
  if (!btn) return;
  try {
    const r = await fetch(`/api/profiles/${btn.dataset.view}`);
    if (!r.ok) throw new Error();
    const p = await r.json();
    const link = whatsappLink(p);
    dialogContent.innerHTML = `
      <p class="eyebrow">SOUL MATE CONNECT · MEMBER PROFILE</p>
      <div class="dialog-profile-image">${p.image_url ? `<img src="${esc(p.image_url)}" alt="Approved portrait of ${esc(p.display_name)}">` : esc(initials(p.display_name))}</div>
      <h2 style="font:32px 'Playfair Display',serif">${esc(p.display_name)}, ${esc(p.age)}</h2>
      <p class="profile-meta">${esc(p.county)} · ${esc(p.occupation)}</p>
      <p class="profile-tag">${esc(p.relationship_preference)}</p>
      <p class="dialog-copy">${esc(p.bio)}</p>
      ${p.interests ? `<p class="dialog-copy"><b>Interests:</b> ${esc(p.interests)}</p>` : ""}
      ${link ? `<a class="whatsapp-button" target="_blank" rel="noopener noreferrer" href="${link}">CONTACT MATCHMAKER ON WHATSAPP ↗</a>` : `<p class="notice">The matchmaker's WhatsApp number has not been configured yet.</p>`}
      <p class="profile-meta">Introductions are made only with the agreement of the people involved.</p>`;
    dialog.showModal();
  } catch { alert("This profile is currently unavailable."); }
});
document.querySelector(".dialog-close").addEventListener("click", ()=>dialog.close());
loadConfig().then(()=>fetchProfiles());
