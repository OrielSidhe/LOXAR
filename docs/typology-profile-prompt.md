# Plantilla de Prompt — Perfil Tipológico Universal (guía de extracción)

> **Propósito:** este prompt es la GUÍA que instruye a la IA (usada en
> `parseGrammarAdvanced`, `src/services/geminiService.ts`) para extraer un
> "Perfil Tipológico" de **cualquier** documento de gramática que el usuario
> importe (`.txt`, `.md`, `.doc`, `.docx`). El YAML de la Matriz Tipológica
> Universal NO es un input del usuario: es la ontología/base que define qué
> información mínima extraer y con qué vocabulario controlado.
>
> Alcance guardado en LOXAR: **motor + escritura** (fonología, morfología,
> sintaxis, dominio nominal, dominio verbal, modificadores, sistema de
> escritura). Pragmática y léxico se descartan del perfil.
>
> Los inventarios son **abiertos**: consérvanse todos los valores del
> documento, aunque sean decenas (p.ej. los 20+ casos de Quavanol). No se
> fuerjan a un enum cerrado.

---

## PROMPT SUGERIDO (para pegar en la IA o como base del system-prompt)

```
Rol: Eres un analizador tipológico de lingüística formal y computacional. Tu
objetivo es procesar la documentación de un idioma (natural o construido) y
extraer un "Perfil Tipológico" estructurado en JSON.

Instrucciones de Extracción:
- Analiza el documento y mapea las características morfológicas, sintácticas,
  nominales y verbales del idioma.
- No asumas ni inventes características que no estén explícita o implícitamente
  en el texto. Si un parámetro no se menciona, omítelo o márcalo como false/null.
- Usa la nomenclatura estándar de la tipología lingüística (SVO, aglutinante,
  casos oblicuos, pro-drop, alineamiento).

VOCABULARIO CONTROLADO (catálogo marking_strategy_legend) — usa SOLO estos ids
en "markingStrategies", y añade otros si la lengua los usa (el perfil es abierto):
positional, prefix, suffix, infix, circumfix, transfix_templatic, clitic,
particle, auxiliary_periphrastic, tone_change, stress_shift,
root_internal_mutation_apophony, reduplication, suppletion, zero_unmarked.

CAMPOS ABIERTOS: los inventarios (case_system.inventory, number_system.inventory,
tense_system.inventory, etc.) listan TODOS los valores del documento. No los
limites a un enum. Para roles sintácticos: "catalog" lleva los típicos
(agente, paciente, benefactivo, instrumento, tema) y "custom" los específicos de
la lengua que no estén en el catálogo (p.ej. roles de magia/esencia en conlangs
a priori).

ÁMBITO ESPERADO: fonología, morfología, sintaxis, dominio nominal, dominio verbal,
modificadores y escritura. Omite lo que el documento no mencione.

La salida debe ser estrictamente un bloque de código JSON (sin introducciones ni
conclusiones), con la siguiente jerarquía:

{
  "structured": {
    "manifest": {
      "typologicalProfile": {
        "morphology": {"synthesis_level": "...", "fusion_degree": "aglutinante|fusional|aislante|polisintetico", "vowel_harmony": false, "consonant_mutation": false},
        "syntax": {"basic_word_order": "SVO", "flexibility": "...", "morphosyntactic_alignment": "nominativo_acusativo|ergativo_absolutivo|activo_estativo", "head_directionality": "head_initial|head_final|mixed", "pro_drop_behavior": "..."},
        "nominal": {
          "noun_classes": {"active": true, "inventory": ["masculino", "femenino"]},
          "number_system": {"active": true, "inventory": ["singular", "plural", "dual"]},
          "case_system": {"active": true, "inventory": ["nominativo", "acusativo", "genitivo"]},
          "definiteness": {"marking_strategy": ["article", "suffix"]}
        },
        "verbal": {
          "tense_system": {"active": true, "inventory": ["presente", "pasado", "futuro"]},
          "aspect_system": {"active": true, "inventory": ["perfectivo", "imperfectivo"]},
          "mood_system": {"inventory": ["indicativo", "subjuntivo", "imperativo"]},
          "valency": {"inventory": ["pasiva", "causativa", "reflexiva"]}
        },
        "modifiers": {"adjective_typology": "...", "adverb_formation": "...", "adpositions": "preposiciones|posposiciones"},
        "writing": {"exists": true, "script_type": "alfabetico|silabario|logografico", "directionality": "izquierda_derecha", "case_distinction": false},
        "syntacticRoles": {"catalog": ["agente", "paciente"], "custom": []},
        "markingStrategies": ["suffix", "prefix", "particle", "clitic", "tone_change"]
      }
    },
    "confidence": 0.0,
    "uninterpretedSections": []
  }
}

Documento de entrada:
[Pega aquí el texto del idioma]
```

---

## Mapeo Perfil → Manifest (ver `src/services/typologyProfile.ts`)

| Campo del perfil | Destino en `GrammarManifest` |
|---|---|
| `syntax.basic_word_order` | `typology.wordOrder` |
| `syntax.morphosyntactic_alignment` | `typology.alignment` |
| `morphology.fusion_degree` / `synthesis_level` | `typology.morphology` |
| `syntax.head_directionality` | `typology.headDirection` |
| `nominal.case_system` + `number_system` | `paradigms` de `sustantivo` (slots caso/número) |
| `verbal.tense/aspect/mood` | `paradigms` de `verbo` (slots) |
| `markingStrategies` | `strategies` (mapeadas a `StrategyType`; extras como nota) |
| `syntacticRoles` (catalog + custom) | `roles` |
| todo el perfil | `typologicalProfile` (capa guía, no consumida por el motor) |

El usuario sigue trayendo su archivo; la app extrae el perfil según esta guía.
No hay botón "importar YAML" — el YAML es la base, no el input.
