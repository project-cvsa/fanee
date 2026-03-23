# Open Translation Bundle Specification

> Version 0.3.0, Mar 23 2026

## 1. Abstract

The Open Translation Bundle (OTB) defines a standardized directory structure and metadata schema for the encapsulation, distribution, and resolution of localization resources.

## 2. Terminology and Conformance

### 2.1 Conformance Keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14) [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.

### 2.2 Terms

| Term | Definition |
|------|------------|
| **OTB** | Open Translation Bundle — the encapsulating format defined by this specification |
| **Bundle** | An OTB container in either Packed (`.otb` archive) or Unpacked (directory tree) form |
| **Packed Mode** | The Packed form of a Bundle: a ZIP-compressed archive using the Deflate algorithm |
| **Unpacked Mode** | The Unpacked form of a Bundle: a standard filesystem directory tree |
| **Root Directory** | The top-level directory of an Unpacked Bundle, or the root path within a Packed Bundle archive |
| **Module** | A sub-directory within `modules/` containing its own `manifest.json`; Modules MUST recursively adhere to this specification |
| **Namespace** | An identifier **derived** from the directory path under `modules/`; see Section 4.2 |
| **Resource file** | A JSON file named with a BCP-47 tag (e.g., `en-US.json`) containing translation key-value pairs |
| **BCP-47** | The IETF BCP-47 standard for language tags; see [RFC 5646](https://www.rfc-editor.org/rfc/rfc5646) |
| **Message key** | A flat string identifier for a single translation entry within a Resource file; see Section 6.3 |
| **Message value** | The translation string associated with a Message key; see Section 6.4 |
| **Resolution context** | A configuration that specifies which Module's namespace a tool is operating within; used at Development and Runtime phases |
| **Standalone** | A manifest field (`standalone: true`) that opt a Module out of the parent-merge behavior during the Bundle phase |
| **Extension field** | A field with the prefix `x-` in `manifest.json`; used for tool-specific customization |

### 2.3 Phase Model

OTB serves three distinct tool phases. Each phase has different responsibilities, and different subsets of this specification apply to each.

| Phase | Description | Key Responsibilities |
|-------|-------------|----------------------|
| **Development / Translation** | Tools used to author and edit the OTB source bundle | Manage `sourceLocale`, `targetLocales`, and Resource file content |
| **Bundle** | Tools that process the OTB source bundle into a form suitable for Runtime consumption | Resolve Module hierarchy, perform parent-to-child merging, produce output in tool-defined format; may also pass OTB through unchanged |
| **Runtime** | Tools that read processed bundle output and provide an API to applications | Load locale data for a configured Resolution context, resolve keys against the current context, provide translation API |

**Phase isolation:** A tool MAY implement one or more phases. A Bundle tool MAY pass the OTB source through unchanged (for example, for mobile applications that parse OTB directly at Runtime). The specification does not mandate which phases a tool must implement.

**Fields by phase:** Only the fields listed in Section 5 as applicable to a given phase are relevant to tools operating in that phase. A tool operating in a later phase (Bundle or Runtime) **MUST NOT** require fields marked as Development-phase only.

## 3. Physical Representation

### 3.1 Persistence Formats

An OTB Bundle exists in two interchangeable formats:

* **Unpacked Mode:** A standard filesystem directory tree.
* **Packed Mode:** A ZIP-compressed archive using the Deflate algorithm.

### 3.2 Media Identification

* **Media Type:** `application/vnd.otb+zip`.
* **File Extension:** `.otb`.

## 4. Bundle Architecture and Module Hierarchy

OTB's directory structure is minimal and flexible. A bundle may use only `manifest.json` and `messages/` for flat Resource files, or additionally include `modules/` for nested Module directories with Namespace derivation and parent-to-child merge.

The Module hierarchy (Namespace, Resolution context, Merge) is an **optional enhancement**. Users and tools **MAY** use OTB without requiring or implementing these features.

The internal hierarchy of an OTB container **MUST** be preserved across both Packed and Unpacked modes.

### 4.1 Root Directory Constraints

The Root Directory **MUST** contain:

1. **`manifest.json`**: **REQUIRED**. Contains the bundle's structural and identity metadata.

The Root Directory **MUST** also contain at least one of:

1. **`messages/`**: **OPTIONAL**. A directory containing locale-specific Resource files.
2. **`modules/`**: **OPTIONAL**. A directory containing Modules.

Additionally, plugins and other tools **MAY** place their own directory structures at the Root Directory level for purposes beyond the core OTB specification. These directories and their contents are outside the scope of this specification.

### 4.2 Namespace Derivation

Namespace is **derived from the directory path** under `modules/`. It is formed by joining directory names with a colon (`:`) from the root `modules/` downward.

| Path under `modules/` | Namespace |
|-----------------------|-----------|
| `modules/web/` | `"web"` |
| `modules/web/modules/billing/` | `"web:billing"` |

### 4.3 Module Definition

A **Module** is any sub-directory within `modules/` that contains its own `manifest.json`. Modules **MUST** recursively adhere to this specification.

### 4.4 Merge Algorithm

A Bundle-phase tool **SHALL** produce merged output for each leaf Resolution context. The merge proceeds root-to-leaf:

1. Starting from the root namespace, recursively collect all Resource files along the path to the target Module.
2. Merge them in order from root to leaf. **Descendant values override ancestor values** for the same Message key.
3. The resulting merged dataset constitutes the output for that leaf context.

### 4.5 Standalone Modules

If a Module declares `"standalone": true` in its `manifest.json`, the Bundle tool **SHALL NOT** merge any ancestor data into that Module. The Module's output contains only its own Resource file data.

### 4.6 Module Isolation

Modules that share the same parent **MUST NOT** reference each other's data. Each leaf context's merged output is independent.

## 5. Metadata Schema

The `manifest.json` file **SHALL** use the following property definitions:

| Property | Type | Requirement | Phase | Description |
|:---------|:-----|:------------|:------|:------------|
| `format` | String | **REQUIRED** | All | **MUST** be the literal value `"otb"`. |
| `specVersion` | String | **REQUIRED** | All | Semantic version of this specification (e.g., `"0.3.0"`). |
| `bundleVersion` | String | **OPTIONAL** | All | Project-specific versioning (e.g., `"1.0.4-build.22"`). |
| `standalone` | Boolean | **OPTIONAL** | Bundle | If `true`, this Module's output will not inherit ancestor data during merge. Default: `false`. |
| `sourceLocale` | String | **REQUIRED** | Development | BCP-47 tag representing the source text language. |
| `targetLocales` | Array | **REQUIRED** | Development | List of BCP-47 tags for supported translations. |
| `name` | String | **OPTIONAL** | Development | Human-readable identifier for the bundle. |
| `x-*` | Any | **OPTIONAL** | All | Extension fields for tool-specific customization. Keys **MUST** begin with `x-`. Interpretation and valid values are determined by the implementer. |

**Extension fields (`x-*`)**: Tools MAY use extension fields to store tool-specific data. For example, `x-plugin-name`, `x-tool-config`, etc. A tool operating in a phase **SHOULD** preserve extension fields it does not understand. A tool **MAY** define its own schema for extension fields.

## 6. Data Formatting and Integrity

### 6.1 Resource File Naming

Resource files **MUST** be named using a BCP-47 tag with a `.json` extension (e.g., `en-US.json`, `de-DE.json`).

### 6.2 Resource File Formatting and Encoding

* **Encoding:** All files **MUST** be UTF-8 encoded without a Byte Order Mark (BOM).
* **Line Endings:** All files **MUST** utilize the **LF** (U+000A) character.

### 6.3 Message Key Constraints

Message keys **MUST** be flat strings conforming to the regular expression `^[a-zA-Z0-9_.\-]+$`.

### 6.4 Message Value Syntax

Message values **MUST** be valid [Unicode MessageFormat 2.0](https://www.unicode.org/reports/tr35/tr35-messageFormat.html) strings.

## 7. Tool Behavior Guidance

### 7.1 Development / Translation Phase

* A tool **SHOULD** validate that a Resource file exists for every locale listed in `targetLocales`.
* A Resource file **MAY** exist for a locale not listed in `targetLocales`; the tool **SHOULD** emit a warning but **MAY** allow it.
* A tool **MUST** treat duplicate Message keys within a single Resource file as an error.

### 7.2 Bundle Phase

* A Bundle tool **MUST** fail with a clear error if a `manifest.json` cannot be parsed as valid JSON.
* A Bundle tool **MUST** fail if a **required** field is missing or has an incorrect type.
* A Bundle tool **SHOULD** warn on duplicate Message keys across Modules that share the same Namespace.
* A Bundle tool **MUST NOT** fail on unknown optional fields; it **SHOULD** ignore them.
* A Bundle tool **MUST NOT** fail on unknown extension fields (`x-*`); it **SHOULD** preserve them in output if passing through OTB format.

### 7.3 Runtime Phase

* A Runtime tool **MUST** provide a mechanism to set the Resolution context.
* A Runtime tool **MUST** resolve Message keys against the currently configured Resolution context, returning the corresponding Message value.
* If a Message key is not found in the current context, the Runtime tool **MAY** return an implementation-defined fallback value and **MAY** emit a warning.
* A Runtime tool **MUST NOT** require or interpret `sourceLocale`, `targetLocales`, or any field marked as Development-phase only in Section 5.

## 8. Extension and Tool-Specific Directories

Plugins and external tools **MAY** create directories at the Root Directory level for their own purposes. Tool-specific directories **MUST** begin with `x-` (e.g., `x-mytool/`, `x-plugin-name/`). Examples include but are not limited to:

* Plugin configuration directories
* Tool-specific assets or resources
* Build artifacts

These directories **MUST NOT** conflict with the reserved paths `manifest.json`, `messages/`, and `modules/`. The interpretation and structure of tool-specific directories are outside the scope of this specification.
