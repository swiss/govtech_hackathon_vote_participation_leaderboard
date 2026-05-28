# Canton Voter Turnout Leaderboard Data Specification

This document defines the input data format required to support a Swiss canton-level voter turnout leaderboard for each vote (Abstimmung).

## Core Requirements

1. **Multiple Votes Support:** The input data must represent a collection of voting events.
2. **Canton Identification:** Each canton must be uniquely identified (preferably using official 2-letter ISO abbreviations).
3. **Turnout Representation:** Turnout values must represent the voter participation percentage (0.0 to 100.0).

---

## Proposed JSON Schema

The input should be a JSON array of vote objects.

### JSON Example

```json
[
  {
    "id": "2026-05-17-research-act",
    "date": "2026-05-17",
    "title": "Federal Act on Research and Innovation",
    "cantons": [
      { "id": "ZH", "label": "Zürich", "value": 61.2, "FederalCouncillor": 0 },
      { "id": "BE", "label": "Bern", "value": 54.5, "FederalCouncillor": 1  },
      { "id": "LU", "label": "Luzern", "value": 58.1, "FederalCouncillor": 0  },
      { "id": "UR", "label": "Uri", "value": 49.3, "FederalCouncillor": 0  },
      { "id": "SZ", "label": "Schwyz", "value": 52.8, "FederalCouncillor": 0  }
    ]
  },
  {
    "id": "2026-05-17-tax-reform",
    "date": "2026-05-17",
    "title": "Corporate Tax Reform",
    "cantons": [
      { "id": "ZH", "label": "Zürich", "value": 59.4, "FederalCouncillor": 0 },
      { "id": "BE", "label": "Bern", "value": 52.1, "FederalCouncillor": 1 },
      { "id": "LU", "label": "Luzern", "value": 55.7, "FederalCouncillor": 0 },
      { "id": "UR", "label": "Uri", "value": 46.2, "FederalCouncillor": 0 },
      { "id": "SZ", "label": "Schwyz", "value": 50.1, "FederalCouncillor": 0 }
    ]
  }
]
```

---

## Schema Definitions

### Vote Object Fields

| Field | Type | Description | Mandatory |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Unique identifier for the voting event (e.g. `YYYY-MM-DD-kebab-case-title`). | Yes |
| `date` | `string` | Date of the vote in ISO-8601 format (`YYYY-MM-DD`). | Yes |
| `title` | `string` | Title or description of the voting template/proposition. | Yes |
| `cantons` | `array` | List of 26 canton voter turnout records. | Yes |

### Canton Turnout Object Fields (inside `cantons` array)

| Field | Type | Description | Mandatory |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Official 2-letter abbreviation of the canton (e.g., `ZH`, `BE`, `GE`). Used as the D3 key. | Yes |
| `label` | `string` | Display name of the canton (e.g., `"Zürich"`, `"Bern"`). | Yes |
| `value` | `number` | Voter turnout rate in percentage (e.g., `61.2`). | Yes |
