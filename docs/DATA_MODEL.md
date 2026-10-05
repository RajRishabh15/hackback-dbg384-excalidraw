# Data Model Specification

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
  SCENE_DOCUMENT {
    string id PK "Unique Share or Room ID"
    bytes ciphertext "Deflated AES-GCM Encrypted Blob"
    bytes iv "12-byte Initialization Vector"
    number version "Sequential Scene Version Counter"
    number updated "Epoch Timestamp Milliseconds"
  }

  CANVAS_ELEMENT {
    string id PK "Element UUID"
    string type "rectangle | ellipse | diamond | arrow | line | freedraw | text | image | frame"
    number x "X coordinate position"
    number y "Y coordinate position"
    number width "Element bounding width"
    number height "Element bounding height"
    number angle "Rotation angle in radians"
    string strokeColor "Stroke color hex string"
    string backgroundColor "Fill color hex string"
    string fillStyle "hachure | cross-hatch | solid | zigzag"
    number strokeWidth "Stroke thickness px"
    number roughness "RoughJS roughness factor"
    number opacity "Opacity 0-100"
    number seed "RoughJS render random seed"
    number version "Mutation version counter"
    number versionNonce "Random integer for tie-breaking"
    string index "Fractional index order key"
    boolean isDeleted "Soft deletion flag"
    number updated "Epoch timestamp ms"
    number created "Creation epoch timestamp ms"
    string frameId FK "Parent Frame ID (nullable)"
    string containerId FK "Bound Container ID (nullable)"
    string fileId FK "Referenced Binary Asset ID (nullable)"
  }

  BOUND_ELEMENT_REF {
    string id FK "Referenced Arrow or Text Element ID"
    string type "arrow | text"
  }

  IMAGE_ASSET {
    string id PK "FileId content hash"
    string dataURL "Base64 data or blob URL"
    string mimeType "MIME type (image/png, image/svg+xml, etc.)"
    number created "Creation timestamp ms"
    number lastRetrieved "Cache retrieval timestamp"
  }

  LIBRARY_ENTRY {
    string id PK "Unique Library Item UUID"
    string name "Display name"
    string status "published | unpublished"
    number created "Creation epoch timestamp"
  }

  SCENE_DOCUMENT ||--o{ CANVAS_ELEMENT : "stores encrypted snapshot of"
  CANVAS_ELEMENT ||--o{ BOUND_ELEMENT_REF : "embeds array of"
  CANVAS_ELEMENT |o--o| IMAGE_ASSET : "references via fileId"
  CANVAS_ELEMENT |o--o| CANVAS_ELEMENT : "groups under frameId"
  LIBRARY_ENTRY ||--o{ CANVAS_ELEMENT : "contains template elements"
```

---

## 2. Entity Details & Schema Definitions

### 1. `SCENE_DOCUMENT`
- **Purpose:** Cloud persistence document holding an encrypted canvas snapshot.
- **Fields:**
  - `id`: `string` (Primary Key). Random hexadecimal room/share ID.
  - `ciphertext`: `bytes` (Encrypted binary array).
  - `iv`: `bytes` (12-byte initialization vector).
  - `version`: `number` (Monotonically increasing version counter).
  - `updated`: `number` (Epoch timestamp).
- **Constraints & Indexes:** Unique index on `id`.

### 2. `CANVAS_ELEMENT`
- **Purpose:** Fundamental visual item rendered on the whiteboard.
- **Fields:**
  - `id`: `string` (Primary Key). Random unique string.
  - `type`: `string` (`rectangle`, `ellipse`, `diamond`, `arrow`, `line`, `freedraw`, `text`, `image`, `frame`, `stickynote`).
  - `x`: `number` (Canvas coordinate X).
  - `y`: `number` (Canvas coordinate Y).
  - `width`: `number` (Bounding width).
  - `height`: `number` (Bounding height).
  - `angle`: `number` (Rotation angle).
  - `strokeColor`: `string` (Hex stroke color).
  - `backgroundColor`: `string` (Hex fill color).
  - `fillStyle`: `string` (`hachure`, `solid`, `cross-hatch`, `zigzag`).
  - `strokeWidth`: `number` (Line width).
  - `roughness`: `number` (RoughJS style parameter).
  - `opacity`: `number` (0 to 100).
  - `seed`: `number` (Random seed for deterministic rough path generation).
  - `version`: `number` (Incremented on every property mutation).
  - `versionNonce`: `number` (Random integer for deterministic tie-breaking in multiplayer sync).
  - `index`: `string` (Fractional indexing key for Z-order position).
  - `isDeleted`: `boolean` (Soft deletion tombstone).
  - `groupIds`: `string[]` (Array of parent group IDs ordered deepest to shallowest).
  - `frameId`: `string | null` (Foreign key to parent frame element).
  - `containerId`: `string | null` (Foreign key to parent container for bound labels).
  - `fileId`: `string | null` (Foreign key to `IMAGE_ASSET`).
  - `boundElements`: `BOUND_ELEMENT_REF[] | null` (Embedded array of bound arrow/text IDs).
  - `created`: `number | null` (Creation epoch ms).
  - `updated`: `number` (Last update epoch ms).
  - `locked`: `boolean` (Interaction lock flag).

### 3. `IMAGE_ASSET`
- **Purpose:** Stores binary image data referenced by image canvas elements.
- **Fields:**
  - `id`: `string` (Primary Key). SHA content hash identifier.
  - `dataURL`: `string` (Data URL or storage object path).
  - `mimeType`: `string` (Image format MIME type).
  - `created`: `number` (Timestamp).
  - `lastRetrieved`: `number` (Cache eviction timestamp).

### 4. `LIBRARY_ENTRY`
- **Purpose:** Reusable visual template item in shape libraries.
- **Fields:**
  - `id`: `string` (Primary Key).
  - `name`: `string` (Optional label).
  - `status`: `string` (`published` or `unpublished`).
  - `elements`: `CANVAS_ELEMENT[]` (Embedded element hierarchy).
  - `created`: `number` (Timestamp).
