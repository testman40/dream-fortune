import { filterAndSortDreams, getSearchOutcome, initialGroup } from "./search.js";
import { addHistory, clearHistory, getFavorites, getHistory, isFavorite, toggleFavorite } from "./storage.js";
import { setupPwa } from "./pwa.js";

const categories = [
  ["動物", "♞"], ["人物", "♙"], ["場所", "⌂"], ["行動", "↝"], ["乗り物", "◇"],
  ["自然", "☾"], ["身体", "♡"], ["物", "♢"], ["出来事", "✦"]
];
const state = { dreams: [], versionHistory: [], currentView: "home", previousView: "home", aboutReturnView: "home", currentDetail: null, composing: false };
const byId = (id) => document.getElementById(id);
const create = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const announce = (message) => { byId("live-region").textContent = ""; requestAnimationFrame(() => { byId("live-region").textContent = message; }); };

function dreamById(id) { return state.dreams.find((dream) => dream.id === id); }
function setEmpty(container, text) { container.replaceChildren(create("p", "empty-state", text)); }

function resultCard(dream) {
  const button = create("button", "result-card");
  button.type = "button";
  button.append(create("strong", "", dream.keyword), create("small", "", dream.category), create("p", "", dream.summary));
  button.addEventListener("click", () => showDetail(dream.id));
  return button;
}

function renderCards(container, dreams, emptyMessage) {
  container.replaceChildren();
  if (!dreams.length) return setEmpty(container, emptyMessage);
  dreams.forEach((dream) => container.append(resultCard(dream)));
}

function renderSuggestions(container, query, suggestions) {
  container.replaceChildren(create("p", "empty-state", `「${query}」に一致する夢は見つかりませんでした。`));
  container.append(create("h3", "suggestion-heading", suggestions.length ? "近い夢のキーワード" : "近いキーワードは見つかりませんでした"));
  if (!suggestions.length) return;
  const list = create("div", "suggestion-list");
  suggestions.forEach((dream) => {
    const button = create("button", "suggestion-card"); button.type = "button";
    button.append(create("strong", "", dream.keyword), create("small", "", dream.category));
    button.addEventListener("click", () => showDetail(dream.id));
    list.append(button);
  });
  container.append(list);
}

function renderStoredLists() {
  const history = getHistory().map(dreamById).filter(Boolean);
  const favorites = getFavorites().map(dreamById).filter(Boolean);
  renderCards(byId("recent-home-list"), history.slice(0, 3), "まだ検索履歴はありません。");
  renderCards(byId("history-list"), history, "まだ検索履歴はありません。辞典から夢を開くと、ここに保存されます。");
  renderCards(byId("favorites-list"), favorites, "お気に入りはまだありません。夢の詳細から登録できます。");
}

function showView(name, options = {}) {
  document.querySelectorAll(".view").forEach((view) => { const active = view.id === `${name}-view`; view.hidden = !active; view.classList.toggle("is-active", active); });
  document.querySelectorAll(".bottom-nav [data-view]").forEach((button) => button.setAttribute("aria-current", button.dataset.view === name ? "page" : "false"));
  if (name !== "detail" && name !== "about") state.previousView = name;
  state.currentView = name;
  if (name === "dictionary") renderDictionary();
  if (name === "history" || name === "favorites" || name === "home") renderStoredLists();
  if (!options.preserveScroll) window.scrollTo({ top: 0, behavior: "smooth" });
  const heading = document.querySelector(`#${name}-view h1, #${name}-view h2, #${name}-view button`);
  if (options.focus && heading) heading.focus?.();
}

function runSearch(input, targetList, section, count) {
  const query = input.value.trim();
  if (!query) { announce("検索キーワードを入力してください。"); input.focus(); return; }
  const { matches, suggestions } = getSearchOutcome(state.dreams, query);
  if (matches.length) renderCards(targetList, matches, "");
  else renderSuggestions(targetList, query, suggestions);
  if (section) section.hidden = false;
  if (count) count.textContent = `${matches.length}件`;
  announce(matches.length ? `${matches.length}件の候補が見つかりました。` : suggestions.length ? `一致する夢はありません。近いキーワードを${suggestions.length}件表示しました。` : "一致する夢も近いキーワードも見つかりませんでした。");
  section?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderVersionHistory() {
  const list = byId("version-history-list"); list.replaceChildren();
  state.versionHistory.forEach((entry) => {
    const card = create("article", "version-card");
    const heading = create("div", "version-card__heading");
    const title = create("h3", "", `Ver${entry.version}`);
    const time = create("time", "", entry.dateLabel); time.dateTime = entry.date;
    heading.append(title, time);
    const changes = create("ul"); entry.changes.forEach((change) => changes.append(create("li", "", change)));
    card.append(heading, changes); list.append(card);
  });
  if (state.versionHistory[0]) byId("current-version").textContent = `Ver${state.versionHistory[0].version}`;
}

function renderCategories() {
  const grid = byId("category-grid");
  categories.forEach(([name, icon]) => {
    const button = create("button", "category-button"); button.type = "button";
    button.append(create("span", "", icon), document.createTextNode(name));
    button.addEventListener("click", () => { byId("category-filter").value = name; byId("dictionary-search").value = ""; showView("dictionary"); });
    grid.append(button);
    byId("category-filter").append(new Option(name, name));
  });
}

function renderDictionary() {
  const dreams = filterAndSortDreams(state.dreams, byId("dictionary-search").value, byId("category-filter").value);
  const list = byId("dictionary-list"); list.replaceChildren();
  byId("dictionary-count").textContent = `${dreams.length}件を、あいうえお順で表示しています。`;
  if (!dreams.length) return setEmpty(list, "条件に一致する夢がありません。");
  const grouped = new Map();
  dreams.forEach((dream) => { const group = initialGroup(dream.reading); if (!grouped.has(group)) grouped.set(group, []); grouped.get(group).push(dream); });
  grouped.forEach((items, group) => {
    const section = create("section", "dictionary-group");
    section.append(create("h3", "", `${group}行`));
    const cards = create("div", "card-list"); items.forEach((dream) => cards.append(resultCard(dream)));
    section.append(cards); list.append(section);
  });
}

function detailCard(title, text, className = "") {
  const card = create("section", `detail-card ${className}`.trim()); card.append(create("h3", "", title), create("p", "", text)); return card;
}

function showDetail(id) {
  const dream = dreamById(id); if (!dream) return;
  state.previousView = state.currentView === "detail" ? state.previousView : state.currentView;
  state.currentDetail = id; addHistory(id); renderStoredLists();
  const content = byId("detail-content"); content.replaceChildren();
  const hero = create("section", "detail-card detail-hero");
  const title = create("h2", "", dream.keyword); title.id = "detail-title"; title.tabIndex = -1;
  hero.append(create("p", "eyebrow", "DREAM MESSAGE"), title, create("p", "detail-meta", `${dream.category}・${dream.reading}`));
  const favorite = create("button", "favorite-button"); favorite.type = "button";
  const updateFavorite = () => { const active = isFavorite(id); favorite.textContent = active ? "★ お気に入りから解除" : "☆ お気に入りに登録"; favorite.setAttribute("aria-pressed", String(active)); };
  favorite.addEventListener("click", () => { const active = toggleFavorite(id); updateFavorite(); renderStoredLists(); announce(active ? "お気に入りに登録しました。" : "お気に入りから解除しました。"); });
  updateFavorite(); hero.append(favorite); content.append(hero);
  const grid = create("div", "detail-grid");
  grid.append(detailCard("基本的な意味", dream.summary), detailCard("良い意味", dream.positive), detailCard("注意する意味", dream.caution));
  const patterns = create("section", "detail-card wide"); patterns.append(create("h3", "", "状況別の意味"));
  const patternList = create("div", "pattern-list"); dream.patterns.forEach((pattern) => { const item = create("div", "pattern-item"); item.append(create("h4", "", pattern.title), create("p", "", pattern.text)); patternList.append(item); }); patterns.append(patternList); grid.append(patterns);
  const related = create("section", "detail-card wide"); related.append(create("h3", "", "関連する夢"));
  const relatedList = create("div", "related-list"); dream.related.map(dreamById).filter(Boolean).forEach((item) => { const button = create("button", "related-button", item.keyword); button.type = "button"; button.addEventListener("click", () => showDetail(item.id)); relatedList.append(button); });
  if (!relatedList.children.length) relatedList.append(create("p", "", "関連する夢はありません。")); related.append(relatedList); grid.append(related); content.append(grid);
  showView("detail", { preserveScroll: true }); window.scrollTo({ top: 0, behavior: "smooth" }); title.focus();
}

function bindEvents() {
  document.querySelectorAll("[data-search-form]").forEach((form) => {
    const input = form.querySelector("[data-search-input]");
    input.addEventListener("compositionstart", () => { state.composing = true; });
    input.addEventListener("compositionend", () => { state.composing = false; });
    form.addEventListener("submit", (event) => {
      event.preventDefault(); if (state.composing || event.isComposing) return;
      if (form.closest("#dictionary-view")) { renderDictionary(); announce(`${filterAndSortDreams(state.dreams, input.value, byId("category-filter").value).length}件を表示しました。`); }
      else runSearch(input, byId("home-result-list"), byId("home-results"), byId("home-result-count"));
    });
  });
  document.querySelectorAll(".bottom-nav [data-view]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
  byId("category-filter").addEventListener("change", renderDictionary);
  byId("clear-dictionary-filter").addEventListener("click", () => { byId("dictionary-search").value = ""; byId("category-filter").value = ""; renderDictionary(); });
  document.querySelectorAll("[data-clear-history]").forEach((button) => button.addEventListener("click", () => { clearHistory(); renderStoredLists(); announce("検索履歴を削除しました。"); }));
  byId("detail-back").addEventListener("click", () => showView(state.previousView || "home", { focus: true }));
  byId("version-history-button").addEventListener("click", () => { state.aboutReturnView = state.currentView === "detail" ? state.previousView : state.currentView; showView("about"); byId("about-title").focus(); });
  byId("about-back").addEventListener("click", () => showView(state.aboutReturnView || "home", { focus: true }));
}

async function init() {
  try {
    const [dreamResponse, versionResponse] = await Promise.all([fetch("./data/dreams.json"), fetch("./data/version-history.json")]);
    if (!dreamResponse.ok || !versionResponse.ok) throw new Error("data load failed");
    [state.dreams, state.versionHistory] = await Promise.all([dreamResponse.json(), versionResponse.json()]);
    renderCategories(); bindEvents(); renderStoredLists(); renderDictionary(); renderVersionHistory(); setupPwa(byId("install-button"), announce);
  } catch {
    document.querySelectorAll(".search-card input, .search-card button").forEach((control) => { control.disabled = true; });
    setEmpty(byId("recent-home-list"), "夢占いデータを読み込めませんでした。ローカルサーバーから開き直してください。");
    announce("夢占いデータを読み込めませんでした。");
  }
}

init();
