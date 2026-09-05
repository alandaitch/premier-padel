# Contribuir a Premier Padel 3D

Gracias por querer continuar el proyecto. Buscamos cambios pequeños, comprobables y que preserven la jugabilidad completa.

## Antes de programar

1. Leé el [README](README.md), especialmente la arquitectura y prioridades.
2. Abrí una issue si el cambio modifica reglas, controles o el flujo de partido.
3. Para tareas visuales, revisá [`REVIEW-V10.md`](REVIEW-V10.md) y grabá una muestra nueva si cambia algo visible.

## Entorno

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
npm run typecheck
npm test
npm run build
```

Probá al menos: iniciar Partido rápido, sacar con Espacio, jugar un punto, pausar, volver al menú y abrir un ejercicio de entrenamiento.

## Reglas de contribución

- Conservá la separación entre física, renderer, audio e interfaz.
- Agregá pruebas cuando cambies reglas, puntuación, trayectorias o controles.
- Usá nombres y textos en español dentro de la interfaz.
- No incluyas secretos, `.env`, configuraciones de hosting, videos de referencia ni capturas locales.
- No agregues logos, texturas, modelos, música o video de terceros sin permiso compatible.
- No sustituyas grabaciones existentes: cada revisión visual usa nombres nuevos.
- Explicá el impacto en rendimiento si modificás el renderer o el bucle a 120 Hz.

## Pull requests

Cada pull request debe incluir:

- Problema y comportamiento antes/después.
- Pruebas ejecutadas.
- Riesgos o límites conocidos.
- Captura o video nuevo si modifica render, animación, UI o audio.

Las contribuciones se aceptan bajo la licencia MIT del repositorio.
