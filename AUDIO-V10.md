# Audio de presentación V10

## Resultado

El banquillo tiene intercambios sintéticos breves entre entrenador y jugadores.

Las voces usan tonos, ruido filtrado y contornos musicales originales.

No contienen palabras, grabaciones ni imitaciones de personas reales.

El remate agrega una exhalación corta durante el contacto.

Los niveles quedan acotados antes del control maestro existente.

## Scheduler

`PresentationAudioScheduler` transforma estados visuales en eventos sonoros puros.

No usa Web Audio, temporizadores ni mutaciones del partido.

Su método principal tiene este contrato:

```ts
scheduler.update({
  presentation,
  contact,
  enabled,
  paused,
}): PresentationAudioCue[];
```

`reset()` limpia deduplicación al comenzar otro partido.

`presentation: null` cierra el descanso activo.

Un descanso cerrado no puede reanudar voces después de omitirlo.

`paused: true` congela los turnos pendientes.

Los contactos presentes durante una pausa quedan consumidos silenciosamente.

`enabled: false` consume eventos sin producir ráfagas al reactivar sonido.

## Turnos del banquillo

La fase visual dura exactamente diez segundos.

Los seis turnos ocurren dentro de ese intervalo.

| Segundo | Hablante   | Variante |
| ------: | ---------- | -------: |
|    0,75 | Entrenador |        0 |
|    2,15 | Jugador A  |        0 |
|    3,65 | Entrenador |        1 |
|    5,20 | Jugador B  |        1 |
|    6,90 | Entrenador |        2 |
|    8,25 | Jugador A  |        2 |

La frustración selecciona modos calmo, tenso o frustrado.

La intensidad expresiva permanece entre 0,38 y 0,62.

Cada turno dura menos de un segundo.

No quedan sonidos programados después del banquillo.

## Exhalación del remate

El identificador combina jugador y tiempo exacto del contacto.

Cada contacto de tipo `remate` produce como máximo una exhalación.

Otros golpes nunca activan este sonido.

La calidad o potencia ajusta una intensidad entre 0,42 y 0,70.

La posición `x` controla el paneo estéreo.

La síntesis combina aire filtrado y un tono corporal descendente.

La cola completa dura 180 milisegundos.

## Integración

`PadelAudio.playPresentationCue(cue)` reproduce cualquier evento del scheduler.

La interfaz debe llamar `update` una vez por cuadro visible.

También debe pasar `contactPoint` desde el estado físico actual.

El scheduler debe reiniciarse junto con la referencia de `PadelMatch`.

El modo menú debe usar `enabled: false` antes de una interacción sonora.

Después de interactuar, la exhibición automática puede usar el volumen actual.

## Integración terminada

La aplicación llama al scheduler con presentación y contacto actuales.

Se reinicia al reemplazar el partido y respeta pausa y volumen.

El contexto de audio sólo arranca tras una interacción del usuario.

## Validación

`game/presentation-audio.test.ts` contiene cuatro pruebas específicas.

Verifican alternancia, deduplicación, pausa, silencio, omisión y reinicio.

También verifican una sola exhalación por contacto de remate.

Las cuatro pruebas pasaron.

`npm run typecheck` pasó sin errores.

`oxfmt` validó los archivos TypeScript modificados.

La evaluación tímbrica final requiere escuchar una captura del navegador.
