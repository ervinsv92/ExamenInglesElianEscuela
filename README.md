# English Quest (Fourth Grade)

Juego tipo quiz para practicar:

- Weather
- Seasons
- Clothes

## Archivos clave

- `data/questions.json`: preguntas, opciones y respuesta correcta.
- `data/image-map.json`: mapeo de IDs de imagen a URL.
- `js/app.js`: lógica del juego en memoria.

## Cómo colocar imágenes

1. Abre `data/image-map.json`.
2. Busca el ID que quieras (por ejemplo `weather_cloudy`).
3. Pega la URL de tu imagen en el campo `"url"`.

Ejemplo:

```json
"weather_cloudy": { "label": "Cloudy", "url": "https://tu-servidor/cloudy.png" }
```

## Reglas del juego

- Muestra una pregunta por pantalla.
- Preguntas y respuestas aparecen en orden aleatorio.
- No muestra si una respuesta está mal hasta terminar la ronda.
- Si hay errores, crea una ronda de refuerzo solo con esas preguntas.
- Repite rondas de refuerzo hasta lograr todas correctas.
