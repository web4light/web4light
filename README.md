# 🌳 Panoramatix — High-Assurance Web4 & SPARK System
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![SPARK Verified](https://img.shields.io/badge/SPARK-8%2F8%20VCs%20PASSED-brightgreen.svg)](src-ada/)
[![Tests](https://img.shields.io/badge/Coverage-100%25-success.svg)](tests/)
> **Panoramatix** je vysoce spolehlivá řídicí architektura kombinující formálně verifikovaný kód v jazyce **Ada/SPARK** s moderním frontendovým a serverovým ekosystémem v **TypeScriptu** a automatizovanou pipeline.
---
## ⚡ Klíčové Vlastnosti
- 🛡️ **Formální verifikace (SPARK):** 100 % dokázaných verifikačních podmínek (8/8 VCs PASSED) pomocí solverů Z3, CVC5 a Alt-Ergo (žádné přetečení, žádné runtime výjimky).
- 🔄 **Automatizovaná AI Pipeline (N8N):** Průběžná analýza kódu, validace a generování typových rozhraní.
- 🧪 **100% Test Coverage:** Komplexní testovací sada v Jestu pro veškerá rozhraní bufferu.
- 📜 **Svobodný software:** Chráněno licencí GNU General Public License v3.0 (GPL-3.0).
---
## 📁 Struktura Repozitáře
```text
panoramatix/
├── src-ada/            # Formálně verifikované Ada/SPARK specifikace a těla (.ads, .adb)
├── src/                # TypeScript/React frontend & generované wrappery
├── tests/              # Testy a integrační ověření (100% pokrytí)
├── server.ts           # Backend server a API rozhraní
├── package.json        # Projektová konfigurace a závislosti
└── LICENSE             # GNU General Public License v3.0
