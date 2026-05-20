# Color Slide custom Nostr schema

This document defines the Nostr event schemas used by the
[Color Slide](https://colorsli.de) client.

All events carry a `t` tag with value `colorslide` so they can be filtered at
the relay level alongside type-specific tags.

---

## Kind 37283 — Color Slide level (addressable, editable)

A user-published puzzle. Each level has a stable random `d` tag chosen at
first publish; republishing with the same `d` tag *replaces* the prior
revision (NIP-01 addressable semantics), so authors can edit their own
levels after publishing.

The canonical identifier of a level is its **addressable coordinate**
`37283:<author hex pubkey>:<d>`. Other Color Slide events that point at a
level (completions, save game, official list) reference the coordinate via
`a` tags, never the event id, so they survive level edits.

### Tags

- `["d", "<random slug>"]` — required, addressable d-tag. Stable for the
  lifetime of the level. The client generates 12 chars of base36 from
  `crypto.getRandomValues` on first publish.
- `["t", "colorslide"]` — required, top-level filter.
- `["t", "colorslide-level"]` — required, identifies the event as a level.
- `["t", "colorslide-logic"]` — present when the level uses non-normal
  tile behaviors (treasure / hidden). Lets clients badge or filter
  "logic levels" without parsing content.
- `["title", "<level title>"]` — required, plain text, max 64 chars.
- `["rows", "<n>"]` — number of rows in the board (string-encoded integer).
- `["cols", "<n>"]` — number of columns in the board.
- `["alt", "Color Slide level: <title> (play at https://colorsli.de)"]` — required
  NIP-31 alt text for clients that don't understand this kind.
- `["youtube", "<url>"]` — optional. A YouTube video URL whose audio plays
  in the background while the level is being played (loops indefinitely). The
  client validates the URL against a strict YouTube id regex before embedding
  and only uses the extracted video id, never the raw URL.

### Content

Stringified JSON:

```json
{
  "board": [
    ["#ef4444", "#3b82f6", null, "#10b981"],
    ["#ef4444", "#3b82f6", "#10b981", "#10b981"]
  ],
  "tiles": {
    "#ef4444": { "id": "#ef4444", "sprite": { "type": "color", "value": "#ef4444" } },
    "#3b82f6": { "id": "#3b82f6", "sprite": { "type": "color", "value": "#3b82f6" } },
    "#10b981": { "id": "#10b981", "sprite": { "type": "color", "value": "#10b981" } }
  }
}
```

- `board` is a 2D array of `(string | null)` cells. Each non-null cell is
  a **tile id** that must appear in `tiles`. `null` is an empty cell.
- `tiles` maps each tile id to a `TileKind`:
  - `id` — same as the map key.
  - `sprite` — visual content. Discriminated by `type`:
    - `{ type: "color", value: "<hex>" }`
    - `{ type: "image", url: "<https url>", sha256?: "<hex>", alt?: "<text>" }`
    - `{ type: "emoji", value: "<glyph>" }`
  - `behavior` — optional gameplay role. Discriminated by `type`:
    - `{ type: "normal" }` (default if omitted)
    - `{ type: "treasure", group: "<id>" }` — when 4 of these clear,
      reveal all `hidden` tiles whose `group` matches.
    - `{ type: "hidden", group: "<id>" }` — visible-but-unmatchable
      until the matching treasure group is cleared.
  - `label` — optional short human-readable name.

Default color tiles MUST use the hex string itself as their id, so a
board referencing `"#ef4444"` resolves to its palette entry trivially.

### Validation rules (enforced by the editor before publish)

1. Each non-null tile id must appear in a multiple of 4 cells.
2. No row or column may contain a run of 4 or more identical tile ids
   (after projecting hidden tiles to per-cell unique sentinels — hidden
   tiles can never form runs at start).
3. At least one non-null cell must be present.

Clients SHOULD re-validate on read and ignore boards that fail.

### Editing

Only the original author can edit a level: NIP-01 addressable replacement
is keyed by `(kind, pubkey, d)`, so a different pubkey publishing with the
same d-tag creates a *separate* level under their own coordinate, not a
replacement of the original.

When deduping query results, the client keeps the highest `created_at` per
coordinate. Relays that honour addressable replacement will only return one
revision per coordinate anyway; the client-side dedupe is defense-in-depth.

---

## Kind 37284 — Color Slide reusable image tile (addressable)

A user-owned uploaded-image sprite that can be picked from a personal
library when building levels. Created automatically the first time the
user adds a new image tile in the editor.

Only image tiles get library entries:

- **Color tiles** — the hex IS the id; infinite variety at zero cost.
- **Emoji tiles** — universal Unicode; the editor's built-in picker is
  sufficient, nothing per-user worth persisting.
- **Behavior (treasure / hidden)** — level-scoped, only meaningful in
  the context of a specific level's groupings.

The level event still embeds a full snapshot of its palette, so play
does NOT depend on resolving these events. The library is purely a
"remember my uploaded images" facet.

### d-tag

`d` is the in-palette tile id: `img:<sha256>`, content-addressed from
the Blossom hash. Re-uploading the same image collapses to a replacement
(NIP-01 addressable semantics).

### Tags

- `["d", "img:<sha256>"]` — required.
- `["t", "colorslide"]` — required.
- `["t", "colorslide-tile"]` — required, identifies the event as a tile.
- `["title", "<label>"]` — optional, user-given friendly name.
- `["alt", "Color Slide tile: <summary> (https://colorsli.de)"]` —
  required NIP-31 alt text.
- `["image", "<url>"]` — the Blossom URL.
- `["x", "<sha256>"]` — the content hash.
- `["alt-text", "<text>"]` — accessibility text (kept separate from the
  NIP-31 `alt` because it describes the *image*, not the event).

### Content

Stringified JSON containing the `TileKind` minus the `behavior` field:

```json
{
  "id": "img:8e9a...",
  "sprite": { "type": "image", "url": "https://...", "sha256": "8e9a...", "alt": "My cat" },
  "label": "Mittens"
}
```

### Library querying

The "pick from library" UI in the level editor queries:

```
{ kinds: [37284], authors: [user.pubkey], '#t': ['colorslide-tile'], limit: 500 }
```

Filtered by the current user's `pubkey` — there is no global tile feed
(today). Other users' tiles can still be referenced by addressable
coordinate, but the editor's UI scopes the library to the author so the
picker is a personal "saved tiles" view rather than a directory.

---

## Kind 30888 — Official Color Slide progression list (addressable, replaceable)

Curates the level progression shown on the Play page. Only events authored
by trusted admin pubkeys (configured in `src/lib/admin.ts`) are honoured by the
client; any other publisher is ignored.

### Tags

- `["d", "official-levels"]` — required, identifies the list. Always this exact value.
- `["t", "colorslide"]` — required.
- `["a", "37283:<author>:<d>", "", "level"]` — one per level, in **play
  order**. References the addressable coordinate of the level so an admin
  doesn't have to republish the list every time a level author edits a
  level.
- `["alt", "Color Slide official level progression (https://colorsli.de)"]` —
  required NIP-31 alt text.

### Content

Empty string. All payload lives in tags so the relay can index changes.

### Trust model

`useOfficialLevels` queries `kind: 30888` filtered by `authors:
ADMIN_PUBKEYS` and `#d: ['official-levels']`. The d-tag alone is NOT a trust
boundary — anyone can publish an addressable event with the same d-tag.

---

## Kind 1 — Color Slide completion (optional, public)

Standard text note that doubles as a leaderboard entry. Uses kind 1 (rather
than a custom kind) so the completion shows up in any generic Nostr feed
reader as a human-readable result, while structured tags allow the leaderboard
hooks to aggregate scores at the relay level.

**This event is optional.** It is published only when
`AppConfig.publishCompletions` is true (default true, toggleable from the
post-completion modal). Whether or not the kind-1 event is published, the
player's *private* save game (kind 30078, see below) is always updated so
sequential unlocking continues to work and progress is preserved across
devices.

Players who opt out simply do not appear on the leaderboard.

### Required tags

- `["t", "colorslide"]`
- `["t", "colorslide-completion"]`
- `["a", "37283:<author>:<d>", "", "level"]` — addressable coordinate of
  the level cleared. Coordinates are used (not event ids) so a leaderboard
  follows a level across edits.
- `["score", "<n>"]` — integer score, see `src/lib/scoring.ts`.
- `["time", "<seconds>"]` — wall-clock seconds spent on the level.
- `["moves", "<n>"]` — slide moves used.
- `["r", "https://colorsli.de"]` — reference to the game.

### Content

Human-readable summary, e.g.:

```
Cleared "Sunrise" in Color Slide -> 8420 pts, 1:32, 28 moves. Play at https://colorsli.de
```

### Trust caveat

Anyone can publish a kind 1 with these tags claiming any score. v1 of Color
Slide treats the network as authoritative; future versions may add a trusted
scorer pubkey set or proof-of-play challenge events.

---

## Kind 30078 — Color Slide save game (NIP-78, addressable, encrypted)

Per-user "save file" that records which levels the player has cleared. Drives
the sequential unlock logic in `/play` and persists progress across
devices independently of the public leaderboard.

The event itself is public (anyone can see "this user has a Color Slide save
game") but the `content` payload is NIP-44 ciphertext encrypted to the user's
own pubkey, so the actual list of cleared levels is unreadable without the
user's nsec.

### Tags

- `["d", "colorslide-progress"]` — required, identifies this NIP-78 slot.
  Always this exact value.
- `["t", "colorslide"]`
- `["alt", "Color Slide saved progress (encrypted, https://colorsli.de)"]`

### Content

NIP-44 ciphertext (encrypted with `peer = self.pubkey`) of the JSON:

```json
{
  "completed": ["37283:<author>:<d>", "37283:<author>:<d>", "..."]
}
```

`completed` is an unordered, de-duplicated list of level *coordinates* the
player has cleared at least once. Coordinates (not event ids) are stored so
unlocks survive level edits — when an author republishes a level, existing
completions still apply.

There are intentionally no scores or timestamps here — kind-1 completions
are the source of truth for any leaderboard / personal-best display.

### Replacement semantics

Standard NIP-78 replaceability: only the most recent event per
`(pubkey, kind, d)` is retained. The client reads the latest event, decrypts
it, merges in the new completion coordinate, encrypts the result, and
republishes.

### Failure handling

Any publish failure (sign rejection, relay timeout) lands in the in-app
"pending events" queue, which persists to localStorage and offers a one-click
retry. This applies to every Nostr write the client makes — completions,
levels, official-list edits, and save-game updates alike.

---

## Relay configuration

The client reads/writes to a single set of relays defined in
`src/lib/constants.ts`. In development this is a single private relay so
in-progress content stays scoped; in production it uses a public relay set.
Switching between the two is automatic based on `import.meta.env.DEV`.
