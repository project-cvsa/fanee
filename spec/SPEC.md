# Open Translation Bundle Specification

> Version 0.1.0, Mar 20 2026

## 1. Introduction
The Open Translation Bundle (OTB) provides a standardized structure for organizing translation assets. It supports both a human-readable directory structure and a compressed archive format for distribution.

### 1.1 Conformance
The keywords **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, and **MAY** in this document are to be interpreted as described in [[RFC 2119](https://tools.ietf.org/html/rfc2119)] [[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)] when, and only when, they appear in all capitals, as shown here.

## 2. Bundle Structure
An OTB container exists in two primary states: **Unpacked Mode** (a directory) and **Packed Mode** (a ZIP archive). Both modes MUST preserve the following internal hierarchy:

* **`manifest.json`**: A REQUIRED file containing bundle metadata.
* **`messages/`**: A REQUIRED directory containing locale-specific translation files.
* **Extensions**: Optional directories (e.g., `tm/`, `tb/`) MAY be added by third-party tools.

## 3. Metadata Specification
The `manifest.json` file defines the technical constraints and identity of the bundle.

### 3.1 Field Definitions
| Field | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `format` | String | **REQUIRED** | MUST be the literal value `"otb"`. |
| `version` | String | **REQUIRED** | The [semantic version](https://semver.org/) of the OTB spec (e.g., `"0.1.0"`). |
| `sourceLocale` | String | **REQUIRED** | A [BCP-47 language tag](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) representing the source text. |
| `targetLocales` | Array | **REQUIRED** | An array of BCP-47 strings for supported translations. |
| `name` | String | Optional | A human-readable identifier for the bundle. |

### 3.2 Schema Example
```json
{
    "format": "otb",
    "version": "0.1.0",
    "sourceLocale": "en",
    "targetLocales": ["es", "ja", "zh-CN"],
    "name": "Project Phoenix"
}
```

## 4. Message Data
Translation data is stored in JSON files organized by locale.

### 4.1 Format Constraints
* **File Naming**: Files MUST be named using the BCP-47 tag followed by the `.json` extension (e.g., `en.json`).
* **Data Structure**: JSON objects MUST use flat strings for keys.
* **Content Syntax**: Values MUST adhere to the [MessageFormat 2.0](https://www.unicode.org/reports/tr35/tr35-messageFormat.html) for handling variables, plurals, and gender.

### 4.2 Large-Project Organization
To accommodate high-volume projects, the `messages/` directory MAY contain sub-directories to categorize translations (e.g., `messages/web/en.json`).

## 5. Storage and Distribution
OTB supports two interchange formats to balance development speed with distribution efficiency.

### 5.1 Unpacked Mode
* Stored as a standard file system directory.
* Optimized for **Version Control Systems (VCS)** like Git.
* Supports incremental updates to individual JSON files.

### 5.2 Packed Mode
* Stored as a **ZIP archive** using **Deflate** compression.
* MUST preserve the full internal directory structure.
* Intended for distribution and tool-based ingestion.

## 6. Extensibility
The OTB format is designed to be extended without breaking core compatibility.

* **Custom Fields**: Implementations MAY add metadata to `manifest.json` using the `x-` prefix (e.g., `"x-custom-field": "value"`).
* **Custom Directories**: Tools MAY include specialized directories within the bundle root, such as `tm/` for Translation Memory or `tb/` for Terminology Bases.
