# Walkthrough: crea una lengua flexiva tipo latín (sin saber lingüística)

Objetivo: validar la Fase 5 (Grammar Wizard + desglose por palabra en el canvas) con pasos concretos y sin "capacitación previa".

## 0. Arranca la app
```
npm run tauri:dev
```
Abre la pestaña **Gramática**.

## 1. Usa el Asistente de gramática (en vez de un tour)
- La primera vez que entres con la gramática vacía, el **Asistente de gramática** se abre solo (una vez por sesión). Si no, pulsa el botón **"Asistente de gramática"** en la cabecera.
- Elige la tarjeta **"Flexivo (tipo Latín / Español)"**.
- Escribe un nombre, p.ej. `MiLenguaFlexiva`.
- Paso 3 → **Crear gramática**.

Hecho esto, LOXAR ya rellenó:
- **Tipología:** SVO, caso Nominativo-Acusativo, morfología Fusional.
- **Fonología:** inventario consonántico/vocálico tipo latín + estructuras de sílaba.
- **Paradigmas de partida:** `verbo` con ranuras *tiempo / persona / número*; `sustantivo` con *caso / número / género*.
- El área de **tonos está oculta** porque una lengua flexiva no los usa (por eso el asistente la ahorra).

Cada sección tiene un icono **(i)** que explica el concepto en lenguaje de conlanger (p.ej. "Un paradigma de inflexión es la tabla de todas las formas de una palabra según tiempo/número/persona…").

## 2. Ve tu oración en el canvas
- Ve a **Sintaxis → Canvas Sintáctico**.
- Si el lienzo está vacío, se auto-rellena con Sujeto–Verbo–Objeto tomados de tu léxico.
- Para reconstruirlo desde tu gramática en cualquier momento: botón **"↻ Sincronizar con gramática"**. Esto hace que los cambios de tipología/paradigma se reflejen gráficamente (no solo en el preview).

## 3. Desglose por palabra (morfología visible)
- En el lienzo, cada nodo de **palabra** ligado a tu léxico tiene un botón **🔍** en su cabecera.
- Pulsa 🔍 en el nodo del **verbo**.
- Se abre el panel **"Desglose morfológico"** (abajo a la derecha) con:
  - La **forma superficial** calculada.
  - Una cadena de **morfemas**: raíz (verde) → afijos (índigo) → mutaciones/tono (ámbar) → partículas (turquesa).
  - Filas editables por cada rasgo del paradigma (p.ej. `tense`, `person`, `number`).
- Escribe en `tense`: `past`, `person`: `3`, `number`: `sg`.
  - Verás la raíz + los sufijos aparecer en la cadena (p.ej. `cant → cant-t-i-…`).
  - **El cuadro de la palabra en el lienzo cambia en vivo** → esa es la "repercusión gráfica" de tus cambios semánticos.

## 4. Añade una excepción (tipo ser / estar)
- En **Morfología → Excepciones**, registra una forma supletiva para un verbo irregular (como `ir → fui`). El motor la aplica antes que las reglas.

## 5. Funciona sin internet
- Sin API key de Gemini, el **Preview** y el **canvas** siguen calculando localmente desde tu gramática. La inducción de reglas desde texto (AI Mapper) queda deshabilitada con un aviso, pero todo lo demás funciona offline.

## Qué comprobar (criterios de éxito)
- [ ] El asistente pre-rellena tipología + fonología + paradigmas y oculta tonos para el perfil flexivo.
- [ ] El canvas muestra S-V-O y el botón "Sincronizar" lo reconstruye.
- [ ] Al elegir rasgos en el desglose, la cadena de morfemas y el cuadro del lienzo se actualizan en vivo.
- [ ] Sin API key, Preview + canvas siguen operando (motor local).
