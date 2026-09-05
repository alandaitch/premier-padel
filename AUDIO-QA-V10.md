# QA de audio V10

## Archivos finales

Se analizaron estas tomas sin reencodificarlas:

- `banquillos-charla-toma02.webm`
- `remate-exhalacion-toma02.webm`

Ambas contienen video VP9 y audio Opus.

El audio es estéreo a `48 kHz`.

Banquillos decodifica `33,96 s` de audio.

Remate decodifica `11,94 s` de audio.

La diferencia final entre pistas queda debajo de `24 ms`.

## Banquillos

Las seis ventanas programadas contienen energía sobre su entorno inmediato.

| Ventana |  Tiempo |         RMS | Incremento |        Pico |
| ------- | ------: | ----------: | ---------: | ----------: |
| 1       | 10,75 s | -57,02 dBFS |   +4,05 dB | -39,00 dBFS |
| 2       | 12,15 s | -56,22 dBFS |   +4,57 dB | -40,73 dBFS |
| 3       | 13,65 s | -56,26 dBFS |   +5,16 dB | -39,68 dBFS |
| 4       | 15,20 s | -55,01 dBFS |   +5,97 dB | -39,73 dBFS |
| 5       | 16,90 s | -57,03 dBFS |   +3,80 dB | -40,37 dBFS |
| 6       | 18,25 s | -56,02 dBFS |   +5,00 dB | -40,05 dBFS |

El pico global alcanza `-18,38 dBFS`.

No existen muestras recortadas a `0 dBFS`.

## Remate

La ventana del contacto comienza cerca de `2,79 s`.

Su RMS alcanza `-39,09 dBFS` durante `220 ms`.

Esto supera el entorno previo por `22,24 dB`.

Su pico alcanza `-18,60 dBFS`.

El pico global alcanza `-17,96 dBFS`.

No existen muestras recortadas a `0 dBFS`.

El golpe y la exhalación comparten la misma ventana.

La mezcla WebM no permite separarlos de forma concluyente.

Estos números prueban señal, margen y temporización.

No prueban audibilidad subjetiva de la exhalación.

## Muestra de escucha

`banquillo-voz-muestra.wav` concatena las seis ventanas.

La muestra dura `4,20 s`.

Usa PCM estéreo de `16 bits` a `48 kHz`.

Recibió `+18 dB` únicamente para facilitar la escucha.

Su pico queda en `-21,0 dBFS`.

La fuente del juego y los videos permanecen sin cambios.

## Método y límites

FFmpeg decodificó cada pista completa a PCM flotante.

Cada toma emitió una advertencia aislada sobre un encabezado Opus.

La decodificación terminó correctamente pese a esa advertencia.

Conviene verificar el audio convertido por Root antes de entregar.

Se calcularon RMS, picos y muestras cercanas al límite digital.

Cada incremento compara la ventana con sus `330 ms` previos.

No se realizó una evaluación auditiva humana.
