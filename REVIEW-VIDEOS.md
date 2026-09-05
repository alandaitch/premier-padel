# Videos de revisión

Pedido de Alan: generar videos individuales de cada cambio para evaluar golpes, celebraciones, camisetas, banquillos y táctica. Grabar el estado previo antes de modificar producto cuando no exista una muestra comparable.

**No borrar ni sobreescribir videos.** Conservar MP4, capturas originales y tomas descartadas. Cada corrección usa un nombre o carpeta nuevos. Mantener las versiones anteriores para mostrar la evolución. Nunca convertir con reemplazo automático ni reutilizar el nombre de una toma existente.

## Lotes locales

- `outputs/revision-v7/`: 17 clips previos; cuatro tomas originales con oclusiones se conservan en `outtakes/`.
- `outputs/revision-v8/`: clips posteriores, separados por golpe, variante, escena y táctica.
- Cada carpeta incluye `revision.html` y `manifest.json`. Los MP4 son artefactos locales; no se empaquetan en la publicación del juego.
- El grabador local se conserva en `work/v8-recordings/`. Source-owned harness; motores V7 congelados desde el commit `815a821fbc7b013b8c1646d479592e7ac242efcc`. El origen está rotulado en pantalla.

## Integridad y revisión

1. Capturar el renderer real a 1600×900 y 30 FPS con su audio. No sustituir gameplay por video generado.
2. Diferenciar partido automático, entrenamiento con comandos programados y escena preparada. Las escenas de celebración no prueban que se haya introducido el combo en un partido.
3. Mostrar plano general y repetición corporal; mantener visibles pies, pala y pelota. En táctica y paredes preservar el vuelo continuo.
4. El endpoint escribe exclusivamente con `wx`. Para repetir, usar `?version=v8&take=2`, luego `take=3`, etc. No mover o borrar una toma para reutilizar su nombre.
5. Convertir sólo cuando el destino no exista; FFmpeg con `-n`. Comprobar dimensiones, FPS, duración, audio y decodificación completa.
6. Revisar fotogramas y reproducción. Anotar limitaciones; conservar la toma aunque no alcance el objetivo.

Los videos de terceros se consultan sólo como referencias, separados de las grabaciones del producto. No se incorporan sus imágenes o audio a las capturas ni al juego.

## Revisión unificada

`node scripts/review-gallery.mjs` crea `outputs/evolucion.html` y su registro de integridad. Incluye todas las versiones y subcarpetas de tomas descartadas. Lee los videos, calcula tamaño/SHA256 y escribe únicamente índices HTML/JSON. No sube archivos a servicios externos.

El lote V8 tiene 25 clips de golpes/paredes/escenas/táctica y 5 clips femeninos: partido, bandeja zurda, banco y dos grupos de indumentaria. Los 25 primeros se capturaron después de corregir los bancos y antes de añadir la rama visual femenina; esa rama no modifica los modelos masculinos.

## Lote V9

Siete clips adicionales en `outputs/revision-v9/`: estadio actual, referencia V8 congelada con la misma cámara, rescate exterior, bancos y tres impactos de malla (rebote vivo, falta directa, saque). La primera captura se conservó al cerrarse su pestaña; las seis pendientes se grabaron en el navegador integrado. Ningún archivo se sustituyó.

Se verificaron dimensiones, duración, audio y decodificación completa de los siete MP4. Los 102 archivos anteriores mantienen sus SHA256 originales. La comparación de estadio usa la geometría V8 congelada del commit `bb9834adacbcadfd2ce016b2bedda0e3dbf19581`; la cámara y el estado de partido son idénticos a V9.
