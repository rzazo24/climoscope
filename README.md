# climoscope

Una app de clima minimalista, en HTML/CSS/JS puro — sin frameworks, sin build tools, sin API key. Usa la [API de Open-Meteo](https://open-meteo.com/) para geocoding y pronóstico.

## Funcionalidad

- Buscador de ciudades con autocompletado
- Ciudades recientes, persistidas en `localStorage`
- Clima actual: temperatura, sensación térmica, humedad y viento (con brújula SVG)
- Pronóstico por horas (próximas 24h)
- Pronóstico de 7 días
- Toggle °C/°F
- Fondo dinámico según el clima y la hora del día

## Cómo correrlo localmente

No hay build ni dependencias que instalar. Como los archivos usan `fetch` y rutas relativas, hace falta servirlos por HTTP (abrir `index.html` directo con `file://` puede fallar por CORS en algunos navegadores). Cualquier servidor estático sirve, por ejemplo:

```bash
python3 -m http.server 8000
```

y abrir `http://localhost:8000` en el navegador.

## Estructura

```
index.html       estructura de la página
css/style.css     estilos
js/app.js         lógica: geocoding, fetch de clima, render, estado
```

## Despliegue

Publicado en GitHub Pages desde la rama `main`, sirviendo desde la raíz del repo (no requiere build).
