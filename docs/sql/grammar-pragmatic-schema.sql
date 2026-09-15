-- =============================================================================
-- LOXAR — Esquema SQL: Base de Datos de Léxico y Motor Gramatical
-- Capa Pragmática (v1.0)
-- =============================================================================
-- Este script crea las tablas de catálogo y la Capa Pragmática.
-- Se ejecuta sobre la base existente `loxar.db` (SQLite / Tauri).
-- =============================================================================

-- ── 1. Catálogo global de funciones gramaticales ──────────────────────────
-- Invocable desde cualquier parte del código y la UI.
CREATE TABLE IF NOT EXISTS grammatical_functions (
    id          TEXT PRIMARY KEY,           -- p. ej. "sustantivo", "verbo"
    label       TEXT NOT NULL,              -- etiqueta visible
    category    TEXT NOT NULL CHECK (category IN ('noun','verb','adjective','adverb','particle','morpheme','phrase')),
    description TEXT,
    fills_slots TEXT NOT NULL DEFAULT '[]', -- JSON array de PragmaticBlockId
    common_in   TEXT NOT NULL DEFAULT '[]', -- JSON array de PragmaticClauseTypeId
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 2. Raíces etimológicas / morfológicas ─────────────────────────────────
CREATE TABLE IF NOT EXISTS roots (
    id          TEXT PRIMARY KEY,
    lexicon_id  TEXT NOT NULL,              -- raíz del lexema (p. ej. "ama-")
    etymology   TEXT,                       -- origen etimológico
    morph_type  TEXT,                       -- tipo morfológico (stem, root, base)
    language    TEXT NOT NULL DEFAULT '',   -- idioma de origen
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 3. Léxema (entidad central) ───────────────────────────────────────────
-- Un lexema puede tener múltiples significados y múltiples funciones.
CREATE TABLE IF NOT EXISTS lexemes (
    id              TEXT PRIMARY KEY,
    text            TEXT NOT NULL,          -- forma léxica (p. ej. "amar", "run")
    root_id         TEXT REFERENCES roots(id) ON DELETE SET NULL,
    function_id     TEXT REFERENCES grammatical_functions(id) ON DELETE SET NULL,
    category        TEXT,                   -- categoría estándar (sustantivo, verbo, ...)
    phonology_ref   TEXT,                   -- referencia al perfil fonológico
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lexemes_text        ON lexemes(text);
CREATE INDEX IF NOT EXISTS idx_lexemes_root        ON lexemes(root_id);
CREATE INDEX IF NOT EXISTS idx_lexemes_function    ON lexemes(function_id);

-- ── 4. Significados (relación 1:N con lexema) ─────────────────────────────
CREATE TABLE IF NOT EXISTS meanings (
    id          TEXT PRIMARY KEY,
    lexeme_id   TEXT NOT NULL REFERENCES lexemes(id) ON DELETE CASCADE,
    meaning     TEXT NOT NULL,              -- definición / significado
    language    TEXT NOT NULL DEFAULT '',   -- idioma de la definición
    semantic_field TEXT,                    -- campo semántico (p. ej. "alimentación")
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_meanings_lexeme ON meanings(lexeme_id);

-- ── 5. Tipos de oración pragmática (nodos raíz) ──────────────────────────
CREATE TABLE IF NOT EXISTS pragmatic_clause_types (
    id              TEXT PRIMARY KEY,       -- afirmacion, pregunta, orden, ...
    label           TEXT NOT NULL,
    description     TEXT,
    default_order   TEXT NOT NULL DEFAULT '[]', -- JSON array de PragmaticBlockId
    templates       TEXT NOT NULL DEFAULT '{}', -- JSON: { typology: [template strings] }
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 6. Bloques de construcción estructural ────────────────────────────────
CREATE TABLE IF NOT EXISTS construction_blocks (
    id              TEXT PRIMARY KEY,       -- E, A, R, I, C, K, Q, F
    label           TEXT NOT NULL,
    description     TEXT,
    required        INTEGER NOT NULL DEFAULT 0,
    morphology_override TEXT DEFAULT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 7. Mapeo: Tipo de oración → Bloques (con orden) ──────────────────────
CREATE TABLE IF NOT EXISTS clause_type_blocks (
    clause_type_id  TEXT NOT NULL REFERENCES pragmatic_clause_types(id) ON DELETE CASCADE,
    block_id        TEXT NOT NULL REFERENCES construction_blocks(id),
    slot_order      INTEGER NOT NULL,       -- posición en la oración
    default_function_id TEXT REFERENCES grammatical_functions(id),
    PRIMARY KEY (clause_type_id, block_id)
);

-- ── 8. Relleno de slots: qué funciones gramaticales llenan cada bloque ──
CREATE TABLE IF NOT EXISTS block_slot_fillers (
    block_id           TEXT NOT NULL REFERENCES construction_blocks(id) ON DELETE CASCADE,
    function_id        TEXT NOT NULL REFERENCES grammatical_functions(id),
    PRIMARY KEY (block_id, function_id)
);

-- ── 9. Plantillas pre-llenadas por tipología ─────────────────────────────
CREATE TABLE IF NOT EXISTS sentence_templates (
    id          TEXT PRIMARY KEY,
    clause_type_id  TEXT NOT NULL REFERENCES pragmatic_clause_types(id),
    typology    TEXT NOT NULL CHECK (typology IN ('flexive','agglutinative','isolating')),
    template    TEXT NOT NULL,              -- cadena de ejemplo
    gloss       TEXT,                       -- gloss interlinear opcional
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_templates_clause ON sentence_templates(clause_type_id, typology);

-- =============================================================================
-- Datos de ejemplo: catálogo global de funciones gramaticales
-- =============================================================================
INSERT OR IGNORE INTO grammatical_functions (id, label, category, fills_slots, common_in) VALUES
    ('sustantivo',       'Sustantivo',       'noun',      '["E","R","K","F","C"]',     '["afirmacion","pregunta","orden","reporte"]'),
    ('verbo',            'Verbo',            'verb',      '["A"]',                       '["afirmacion","pregunta","orden","reporte","deseo"]'),
    ('adjetivo',         'Adjetivo',         'adjective', '["Q","K"]',                   '["afirmacion","nominal"]'),
    ('adverbio',         'Adverbio',         'adverb',    '["I","C","Q"]',               '["afirmacion","pregunta","exclamation"]'),
    ('partícula',        'Partícula',        'particle',  '["I"]',                       '["orden","deseo","pregunta"]'),
    ('pronombre',        'Pronombre',        'morpheme',  '["E","R"]',                   '["afirmacion","pregunta","orden"]'),
    ('nombre_propio',    'Nombre propio',    'noun',      '["E"]',                       '["afirmacion","reporte"]'),
    ('sustantivo_oblicuo','Sust. oblicuo',   'noun',      '["C"]',                       '["afirmacion","condicional"]'),
    ('preposicion',      'Preposición',      'morpheme',  '["C"]',                       '["afirmacion","condicional"]'),
    ('partícula_verbal', 'Partícula verbal', 'particle',  '["A"]',                       '["afirmacion","orden"]'),
    ('adverbio_modal',   'Adverbio modal',   'adverb',    '["I"]',                       '["orden","deseo","pregunta"]');

-- =============================================================================
-- Datos de ejemplo: bloques de construcción
-- =============================================================================
INSERT OR IGNORE INTO construction_blocks (id, label, description, required) VALUES
    ('E', 'Entidad',  'Actor / Sujeto — quien realiza la acción',           1),
    ('A', 'Acción',   'Núcleo del proceso — verbo o núcleo verbal',         1),
    ('R', 'Receptor', 'Paciente / Blanco — quien recibe la acción',         0),
    ('I', 'Intención','Fuerza ilocutiva / partícula modal',                 0),
    ('C', 'Condición','Circunstancia / entorno de la acción',               0),
    ('K', 'Konsekvenco','Desenlace / resultado de la acción',               0),
    ('Q', 'Qualitajo','Atributo / adjectivación del sujeto u objeto',       0),
    ('F', 'Effekto',  'Efecto secundario / consecuencia colateral',         0);

-- =============================================================================
-- Datos de ejemplo: tipos de oración pragmática
-- =============================================================================
INSERT OR IGNORE INTO pragmatic_clause_types (id, label, description, default_order) VALUES
    ('afirmacion',  'Afirmación',  'Oración declarativa positiva',             '["E","A","R","I","C","K","Q","F"]'),
    ('nominal',     'Nominal',     'Oración nominal sin verbo nuclear',         '["E","Q","C"]'),
    ('pregunta',    'Pregunta',    'Interrogativa (la sintaxis base compartida)','["E","A","R","I","C"]'),
    ('orden',       'Orden',       'Imperativo / mandato',                     '["A","E","R","I"]'),
    ('reporte',     'Reporte',     'Reporte de discurso / narrativa',          '["E","A","R","K","C"]'),
    ('deseo',       'Deseo',       'Expresión de deseo / voluntad',            '["I","A","E","R"]'),
    ('exclamation', 'Exclamación', 'Exclamación emotiva',                     '["Q","E","A","K"]'),
    ('verse',       'Verso',       'Oración poética / métrica',                '["E","Q","A","K","F"]'),
    ('justicial',   'Justicial',   'Sentencia donde consecuencia y receptor preceden a la entidad','["K","R","A","E","I","C","Q"]');

-- =============================================================================
-- Datos de ejemplo: mapeo clause_type → blocks (orden)
-- =============================================================================
-- Afirmación: E -> A -> R -> I -> C -> K -> Q -> F
INSERT OR IGNORE INTO clause_type_blocks (clause_type_id, block_id, slot_order) VALUES
    ('afirmacion','E',1),('afirmacion','A',2),('afirmacion','R',3),('afirmacion','I',4),
    ('afirmacion','C',5),('afirmacion','K',6),('afirmacion','Q',7),('afirmacion','F',8);

-- Nominal: E -> Q -> C
INSERT OR IGNORE INTO clause_type_blocks (clause_type_id, block_id, slot_order) VALUES
    ('nominal','E',1),('nominal','Q',2),('nominal','C',3);

-- Pregunta: E -> A -> R -> I -> C
INSERT OR IGNORE INTO clause_type_blocks (clause_type_id, block_id, slot_order) VALUES
    ('pregunta','E',1),('pregunta','A',2),('pregunta','R',3),('pregunta','I',4),('pregunta','C',5);

-- Orden: A -> E -> R -> I
INSERT OR IGNORE INTO clause_type_blocks (clause_type_id, block_id, slot_order) VALUES
    ('orden','A',1),('orden','E',2),('orden','R',3),('orden','I',4);

-- Reporte: E -> A -> R -> K -> C
INSERT OR IGNORE INTO clause_type_blocks (clause_type_id, block_id, slot_order) VALUES
    ('reporte','E',1),('reporte','A',2),('reporte','R',3),('reporte','K',4),('reporte','C',5);

-- Deseo: I -> A -> E -> R
INSERT OR IGNORE INTO clause_type_blocks (clause_type_id, block_id, slot_order) VALUES
    ('deseo','I',1),('deseo','A',2),('deseo','E',3),('deseo','R',4);

-- Exclamación: Q -> E -> A -> K
INSERT OR IGNORE INTO clause_type_blocks (clause_type_id, block_id, slot_order) VALUES
    ('exclamation','Q',1),('exclamation','E',2),('exclamation','A',3),('exclamation','K',4);

-- Verso: E -> Q -> A -> K -> F
INSERT OR IGNORE INTO clause_type_blocks (clause_type_id, block_id, slot_order) VALUES
    ('verse','E',1),('verse','Q',2),('verse','A',3),('verse','K',4),('verse','F',5);

-- Justicial: K -> R -> A -> E -> I -> C -> Q
INSERT OR IGNORE INTO clause_type_blocks (clause_type_id, block_id, slot_order) VALUES
    ('justicial','K',1),('justicial','R',2),('justicial','A',3),('justicial','E',4),
    ('justicial','I',5),('justicial','C',6),('justicial','Q',7);

-- =============================================================================
-- Datos de ejemplo: fillers (qué funciones llenan cada bloque)
-- =============================================================================
INSERT OR IGNORE INTO block_slot_fillers (block_id, function_id) VALUES
    ('E','sustantivo'),('E','pronombre'),('E','nombre_propio'),
    ('A','verbo'),('A','partícula_verbal'),
    ('R','sustantivo'),('R','pronombre'),
    ('I','partícula'),('I','adverbio_modal'),
    ('C','adverbio'),('C','sustantivo_oblicuo'),('C','preposicion'),
    ('K','sustantivo'),('K','verbo'),('K','adjetivo'),
    ('Q','adjetivo'),('Q','adverbio'),
    ('F','sustantivo'),('F','verbo'),('F','adjetivo');

-- =============================================================================
-- Datos de ejemplo: plantillas por tipología
-- =============================================================================
INSERT OR IGNORE INTO sentence_templates (id, clause_type_id, typology, template, gloss) VALUES
    -- Flexivo
    ('tpl-flex-afirmacion-1','afirmacion','flexive','am-o','yo-amar-1sg'),
    ('tpl-flex-afirmacion-2','afirmacion','flexive','am-as','tú-amar-2sg'),
    ('tpl-flex-afirmacion-3','afirmacion','flexive','am-a-mos','amar-1pl'),
    -- Aglutinante
    ('tpl-agglut-afirmacion-1','afirmacion','agglutinative','gelir-gen-der-i','venir-PST-3SG-DECL'),
    ('tpl-agglut-afirmacion-2','afirmacion','agglutinative','gelir-gen-der-i-mis','venir-PST-3PL-DECL'),
    -- Aislante
    ('tpl-isol-afirmacion-1','afirmacion','isolating','yo amar ahora','SVO + adv'),
    ('tpl-isol-afirmacion-2','afirmacion','isolating','él comer pan','SVO'),
    -- Pregunta flexivo
    ('tpl-flex-pregunta-1','pregunta','flexive','am-o?','¿amar-1sg?'),
    -- Orden flexivo
    ('tpl-flex-orden-1','orden','flexive','ama!','¡amar!'),
    -- Justicial (universal)
    ('tpl-just-afirmacion-1','justicial','flexive','K-R-A-E','consecuencia-receptor-acción-entidad');
