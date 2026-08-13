const normalize = (value = "") => value.normalize("NFKC").toLocaleLowerCase("ja")
  .replace(/[\s　、。,.!！?？・「」『』（）()]/g, "");

function directScore(dream, query) {
  const keyword = normalize(dream.keyword);
  const aliases = dream.aliases.map(normalize).filter(Boolean);
  const reading = normalize(dream.reading);

  if (query === keyword) return 1000;
  if (aliases.includes(query)) return 900;
  if (query.length >= 2 && keyword.length >= 2 && (keyword.includes(query) || query.includes(keyword))) return 800 + Math.min(keyword.length, 40);
  if (keyword.length === 1 && singleCharacterTermInPhrase(query, keyword)) return 780;
  if (query.length >= 2 && aliases.some((alias) => alias.length >= 2 && (alias.includes(query) || query.includes(alias)))) return 700;
  if (query === reading || (query.length >= 2 && reading.length >= 2 && (reading.includes(query) || query.includes(reading)))) return 600;
  return 0;
}

function singleCharacterTermInPhrase(query, term) {
  const particles = "がをにはとのへで";
  const index = query.indexOf(term);
  if (index < 0) return false;
  const before = index === 0 ? "" : query[index - 1];
  const after = index === query.length - 1 ? "" : query[index + 1];
  return (!before || particles.includes(before)) && (!after || particles.includes(after));
}

export function searchDreams(dreams, rawQuery) {
  const query = normalize(rawQuery);
  if (!query) return [];

  return dreams.map((dream) => ({ dream, score: directScore(dream, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.dream.reading.localeCompare(b.dream.reading, "ja"))
    .map((entry) => entry.dream);
}

export function suggestDreams(dreams, rawQuery, limit = 5) {
  const query = normalize(rawQuery);
  if (query.length < 2) return [];

  return dreams.map((dream) => {
    const terms = [dream.keyword, dream.reading, ...dream.aliases].map(normalize).filter(Boolean);
    const relatedTerms = (dream.relatedTerms || []).map(normalize).filter(Boolean);
    let score = 0;

    if (query.length >= 4) {
      for (const term of terms) {
        const maxDistance = Math.min(3, Math.max(1, Math.floor(Math.max(query.length, term.length) * .28)));
        if (Math.abs(query.length - term.length) > maxDistance) continue;
        const distance = levenshtein(query, term, maxDistance);
        if (distance <= maxDistance) score = Math.max(score, 500 - distance * 60 - Math.abs(query.length - term.length) * 10);
      }
    }

    if (relatedTerms.some((term) => query === term || (term.length >= 2 && (query.includes(term) || term.includes(query))))) {
      score = Math.max(score, 200);
    }
    return { dream, score };
  }).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.dream.reading.localeCompare(b.dream.reading, "ja"))
    .slice(0, limit)
    .map((entry) => entry.dream);
}

export function getSearchOutcome(dreams, rawQuery) {
  const matches = searchDreams(dreams, rawQuery);
  return { matches, suggestions: matches.length ? [] : suggestDreams(dreams, rawQuery, 5) };
}

export function filterAndSortDreams(dreams, rawQuery = "", category = "") {
  const base = rawQuery.trim() ? searchDreams(dreams, rawQuery) : [...dreams];
  return base.filter((dream) => !category || dream.category === category)
    .sort((a, b) => a.reading.localeCompare(b.reading, "ja"));
}

export function initialGroup(reading) {
  const first = normalize(reading).charAt(0);
  const groups = [
    ["あ", /^[あいうえお]/], ["か", /^[かきくけこがぎぐげご]/], ["さ", /^[さしすせそざじずぜぞ]/],
    ["た", /^[たちつてとだぢづでど]/], ["な", /^[なにぬねの]/], ["は", /^[はひふへほばびぶべぼぱぴぷぺぽ]/],
    ["ま", /^[まみむめも]/], ["や", /^[やゆよ]/], ["ら", /^[らりるれろ]/], ["わ", /^[わをん]/]
  ];
  return (groups.find(([, pattern]) => pattern.test(first)) || ["その他"])[0];
}

function levenshtein(left, right, cutoff) {
  const a = Array.from(left);
  const b = Array.from(right);
  let previous = b.map((_, index) => index + 1);
  previous.unshift(0);

  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= b.length; column += 1) {
      const value = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1)
      );
      current.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > cutoff) return cutoff + 1;
    previous = current;
  }
  return previous[b.length];
}
