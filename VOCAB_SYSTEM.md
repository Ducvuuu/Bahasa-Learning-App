# Vocabulary System

## Overview

Vocabulary is organised into **decks**, each covering a topic. There are two kinds of deck: **core decks** (built-in, loaded from JSON files) and **custom decks** (created by the user in-app).

---

## Core Decks

Defined in `core_volcab/`. Each file is one deck. Order in `manifest.json` → `coreFiles` controls display order.

| File | Deck ID | Title |
|------|---------|-------|
| `pronouns-questions.json` | `pronouns-questions` | Pronouns & Questions |
| `food-actions.json` | `food-actions` | Food & Actions |
| `home-everyday.json` | `home-everyday` | Home & Everyday |
| `time-calendar.json` | `time-calendar` | Time & Calendar |
| `indonesian-food.json` | `indonesian-food` | Indonesian Food |
| `places-locations.json` | `places-locations` | Places & Locations |
| `family.json` | `family` | Family |

### Word object shape

```json
{ "indo": "Saya", "eng": "I / Me", "emoji": "🙋‍♂️" }
```

Some words also carry a `"family"` object with root meaning and affixed forms — used by the word modal to render word-family trees.

### How `deckId` is assigned

`loadAllContent()` in `script.js` derives `deckId` from the filename at load time:

```js
const deckId = manifest.coreFiles[i].split('/').pop().replace('.json', '');
word.deckId = deckId;
```

No `deckId` field is needed inside the JSON files themselves.

### Adding a new core deck

1. Create `core_volcab/<slug>.json` — array of word objects (no `deckId` or `day` needed).
2. Add the path to `manifest.json` → `coreFiles`.
3. Add an entry to `coreDeckTitles` in `script.js`:
   ```js
   'my-new-deck': 'My New Deck',
   ```

---

## Custom Decks

Created by the user via the **New Deck** button. Metadata is stored in `userDecks`:

```js
{ id: "1714000000000", title: "Fruit", icon: "🍎", desc: "Common fruit words", colorIdx: 2 }
```

Words are stored in `customWords` keyed by the deck's `id`:

```js
customWords["1714000000000"] = [
  { id: "custom_1714000000000_1714000001_0", indo: "Apel", eng: "Apple", emoji: "🍎" }
]
```

Custom word IDs are generated as `custom_<deckId>_<timestamp>_<index>`.

---

## Progress Tracking

### `coreKnown` — `number[]`
Array of `originalIndex` values (position in the flat `coreVocabulary` array) for words the user has marked known. Persisted to localStorage and Firestore.

> `originalIndex` is stable as long as files are loaded in the same order defined in `manifest.json`. Do not reorder or remove files without migrating this array.

### `customKnown` — `string[]`
Array of custom word `id` strings for known custom words.

### `masteryTimestamps`
Records when each word was marked known — used by the Practice tab for spaced repetition bucketing.

```js
{
  core:    { [originalIndex]: "ISO timestamp" },
  songs:   { [songId]: { [wordId]: "ISO timestamp" } },
  stories: { [storyId]: { [wordId]: "ISO timestamp" } },
  custom:  { [customWordId]: "ISO timestamp" }
}
```

### `deletedDecks` — `string[]`
deckId strings for core decks the user has hidden/reset. Hidden decks are excluded from the deck overview grid.

---

## Storage

| Data | localStorage key | Also in Firestore |
|------|-----------------|-------------------|
| `coreKnown` | `indoAdventure_coreKnown` | ✅ |
| `customWords` | `indoAdventure_customWords` | ✅ |
| `customKnown` | `indoAdventure_customKnown` | ✅ |
| `deletedDecks` | `indoAdventure_deletedDecks` | ✅ |
| `masteryTimestamps` | `indoAdventure_timestamps` | ✅ |
| `mnemonics` | `indoAdventure_mnemonics` | ✅ (URLs only) |

Mnemonic images are stored as files in **Firebase Storage** at `mnemonics/<uid>/<vocabId>`. Only the download URL is stored in Firestore/localStorage.

---

## Migration Note

Prior to April 2026 the system used a `day` number (1–7) on each word and as the key for `customWords` and `deletedDecks`. `loadCustomWords()` contains a one-time migration that converts any leftover numeric keys to the current deckId slug format.
