# Sistema de Sorteos

Proyecto estático (HTML + CSS + JS puro, sin build) listo para GitHub Pages.

## Estructura
```
index.html
css/
  base.css       reset, variables, tipografía
  layout.css     estructura de páginas
  config.css     tema de la página de configuración (claro)
  reveal.css     tema del sorteo: ruleta + resumen (oscuro)
js/
  main.js         punto de entrada
  state.js        estado global + parser de participantes
  sorteoEngine.js lógica pura del sorteo (crypto.getRandomValues, sin DOM)
  ui.js           todas las vistas (config, ruleta, revelado, resumen)
  utils.js        helpers de DOM, export CSV, slugify
```

## Cómo probarlo localmente
Los módulos ES (`type="module"`) requieren servirse por HTTP, no abrir el archivo directo (`file://`).
Desde esta carpeta:
```
python3 -m http.server 8000
```
Y abre http://localhost:8000

## Formato del archivo de participantes (.txt o .csv)
Una persona por línea, cualquiera de estos formatos:
```
3567890 Perez Perez, Pepito
3567890 Perez Perez Pepito
```

## Publicar en GitHub Pages
1. Sube esta carpeta a un repositorio.
2. Settings → Pages → Branch: main / (root).
3. Listo, no requiere build ni dependencias.
