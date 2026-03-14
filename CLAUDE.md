# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

Static web app — no build step. Serve locally (fetch requires HTTP):

```bash
cd ~/english-trainer && python -m http.server 8000
```

Then open http://localhost:8000.

## Architecture

Single-page app with 5 screens managed by showing/hiding `.screen` divs:

- **Home** (`home-screen`): Level list with lock/unlock logic
- **Level Menu** (`level-menu-screen`): Choice between "Cours" (lessons) and "QCM" (quiz)
- **Lesson** (`lesson-screen`): Interactive mini-lessons with navigation (Précédent/Suivant)
- **Quiz** (`quiz-screen`): One question at a time with immediate feedback
- **Results** (`results-screen`): Score + error recap

**Flow:** Home → Level Menu → Cours or QCM. Only the QCM validates a level.

**Files:**
- `index.html` — All 5 screens in one page
- `app.js` — All logic: screen navigation, quiz flow, lesson rendering, localStorage persistence
- `style.css` — Responsive styles (mobile breakpoint at 600px)
- `questions.json` — ~200 questions across 5 levels (~40 each, 20 drawn per quiz)
- `lessons.json` — Interactive lessons for all 5 levels (3-4 lessons per level)

**Key mechanics:**
- Questions are fill-in-the-blank with 4 options; `answer` is the 0-based index of the correct option
- Levels unlock sequentially: 70% correct on level N unlocks level N+1
- Best score per level is persisted in `localStorage` under key `english-trainer-progress`
- Lessons are optional and do not affect progression
- All UI text and explanations are in French

## Question Format

```json
{
  "type": "fill-in",
  "category": "grammar" | "vocabulary",
  "sentence": "She has worked here _____ ten years.",
  "options": ["since", "for", "during", "ago"],
  "answer": 1,
  "explanation": "French explanation of why this answer is correct."
}
```

## Lesson Format

Each level in `lessons.json` contains an array of lessons. Each lesson has a `title` and `sections` array with 3 types:

```json
{
  "type": "explanation",
  "content": "Text with **bold** markdown support and \\n line breaks."
}
```

```json
{
  "type": "examples",
  "items": [
    { "en": "English sentence with **bold**.", "fr": "French translation." }
  ]
}
```

```json
{
  "type": "exercise",
  "sentence": "She has been waiting _____ 3 o'clock.",
  "options": ["for", "since"],
  "answer": 1,
  "explanation": "French explanation."
}
```

Exercises are inline (2 options), use event delegation for click handling, and give immediate green/red feedback.
