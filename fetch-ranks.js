#!/usr/bin/env node
// fetch-ranks.js — Fetch current ClawHub search rankings for IMA skills
// Reads config.json, queries api.wulong.dev search API, writes snapshot JSON

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.wulong.dev/clawhub-skill-score/v1';
const SEARCH_LIMIT = 50; // max results per query
const DELAY_MS = 2000;   // delay between search requests to avoid rate limits

async function fetchSearch(query) {
  const url = `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Search API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const dataDir = path.join(__dirname, 'data');
  const snapshotsDir = path.join(dataDir, 'snapshots');
  fs.mkdirSync(snapshotsDir, { recursive: true });

  // Read config
  const config = JSON.parse(fs.readFileSync(path.join(dataDir, 'config.json'), 'utf8'));

  // Deduplicate keywords (many skills share "ima" and "ima studio")
  const uniqueKeywords = [...new Set(config.skills.flatMap(s => s.keywords))];
  console.log(`Fetching rankings for ${uniqueKeywords.length} unique keywords across ${config.skills.length} skills...`);

  // Fetch search results for each unique keyword
  const searchResults = {};
  for (let i = 0; i < uniqueKeywords.length; i++) {
    const kw = uniqueKeywords[i];
    console.log(`  [${i + 1}/${uniqueKeywords.length}] Searching: "${kw}"`);
    try {
      const data = await fetchSearch(kw);
      searchResults[kw] = data.results || [];
    } catch (e) {
      console.error(`    ⚠️ Error: ${e.message}`);
      searchResults[kw] = [];
    }
    if (i < uniqueKeywords.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // Build snapshot: for each skill × keyword, find rank
  const results = [];
  for (const skill of config.skills) {
    for (const keyword of skill.keywords) {
      const searchHits = searchResults[keyword] || [];
      const idx = searchHits.findIndex(r => r.slug === skill.slug);

      results.push({
        skill: skill.slug,
        keyword,
        rank: idx >= 0 ? idx + 1 : null,         // 1-indexed, null = not found in top N
        score: idx >= 0 ? searchHits[idx].score : null,
        topScore: searchHits.length > 0 ? searchHits[0].score : null,
      });
    }
  }

  // Summary stats
  const ranked = results.filter(r => r.rank !== null);
  const top5 = results.filter(r => r.rank !== null && r.rank <= 5);
  const top10 = results.filter(r => r.rank !== null && r.rank <= 10);
  const top20 = results.filter(r => r.rank !== null && r.rank <= 20);

  const snapshot = {
    timestamp: new Date().toISOString(),
    searchLimit: SEARCH_LIMIT,
    totalCombos: results.length,
    summary: {
      ranked: ranked.length,
      top5: top5.length,
      top10: top10.length,
      top20: top20.length,
      unranked: results.length - ranked.length,
    },
    results,
  };

  // Write snapshot
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const snapshotPath = path.join(snapshotsDir, `${today}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`\n✅ Snapshot written: ${snapshotPath}`);

  // Update index
  const indexPath = path.join(dataDir, 'index.json');
  let index = { dates: [] };
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  }
  if (!index.dates.includes(today)) {
    index.dates.push(today);
    index.dates.sort();
  }
  index.latest = today;
  index.updatedAt = snapshot.timestamp;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  // Print summary
  console.log(`\n📊 Summary:`);
  console.log(`  Total combos: ${results.length}`);
  console.log(`  Ranked (top ${SEARCH_LIMIT}): ${ranked.length}`);
  console.log(`  Top 5: ${top5.length}`);
  console.log(`  Top 10: ${top10.length}`);
  console.log(`  Top 20: ${top20.length}`);
  console.log(`  Unranked: ${results.length - ranked.length}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
