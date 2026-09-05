# Premier Padel 3D

Juego de pádel 3D para navegador, en español, construido con Three.js, React y TypeScript.

Es una implementación independiente y no oficial, inspirada en el circuito profesional y en simuladores deportivos de ritmo táctico. El foco está en las reglas específicas del pádel: paredes, saque de abajo, puertas, salidas por tres, recuperación exterior, bandeja, víbora, remate y juego de red.

> Estado actual: V10 jugable. El proyecto busca aportes para mejorar animación, táctica, accesibilidad y rendimiento.

## Jugar

La versión pública está disponible en [premier-padel-alan.alandaitch.chatgpt.site](https://premier-padel-alan.alandaitch.chatgpt.site/).

## Características

- Partido rápido, torneo y entrenamiento masculino o femenino.
- Dobles 2×2 con IA, marcador de juegos, sets, tie-break y Star Point.
- Pelota con gravedad, giro, Magnus, rebotes en césped, vidrio, malla y red.
- Saque de abajo, segundo saque y let.
- Plano, volea, globo, bandeja, víbora, remate, dejada, chiquita, bajada y contrapared.
- Remate cargado con dirección, ventana de precisión y variantes por tres, por cuatro y paralelo.
- Recuperación exterior por puertas, por arriba o hacia la cara rival de la red.
- Cambio de lado, bancos, entrenador, árbitro, festejos y sonido Web Audio sintetizado.
- Remapeo de teclado, soporte de mando y controles táctiles.

## Requisitos

- Node.js 22.13 o posterior.
- npm 10 o posterior.

## Desarrollo local

```sh
git clone https://github.com/alandaitch/premier-padel.git
cd premier-padel
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

Abrí `http://localhost:5173` y esperá a que el botón **JUGAR PARTIDO** esté activo.

## Validación

```sh
npm run typecheck
npm test
npm run build
```

La suite actual cubre física, puntuación, paredes, rescates exteriores, controles, mando, presentaciones, carga del remate y disposición exterior. Antes de abrir un pull request, ejecutá los tres comandos.

## Controles predeterminados

| Acción | Teclado |
| --- | --- |
| Moverse | `W A S D` o flechas |
| Saque / golpe directo | `Espacio` |
| Golpe base | `J` |
| Control | `K` |
| Cargar remate | mantener `L` |
| Globo | `J → K` |
| Toque corto | `K → J` |
| Víbora / volea | `J + K` |
| Apuntar | `Q / E` |
| Esperar vidrio | `B` |
| Cambiar jugador | `Tab` |
| Retorno exterior | `F` |
| Pausa | `Escape` |

El remapeo completo está disponible en Configuración dentro del juego. El entrenamiento incluye 18 ejercicios para practicar todos los golpes y recuperaciones.

## Arquitectura

| Ruta | Responsabilidad |
| --- | --- |
| `app/padel-game.tsx` | Ciclo de juego, interfaz, inputs, remapeo y persistencia local. |
| `game/physics.ts` | Simulación a 120 Hz, reglas, puntuación, IA y pelota. |
| `game/renderer.ts` | Escena Three.js, jugadores, estadio, cámaras y animación. |
| `game/audio.ts` | Sonido espacial sintetizado con Web Audio. |
| `game/arena-layout.ts` | Obstáculos exteriores, rutas y colisiones con bancos, árbitro y gradas. |
| `game/match-presentation.ts` | Cambios de lado, bancos, celebraciones y director de escenas. |
| `game/*.test.ts` | Pruebas del motor y reglas. |

La simulación y el render se mantienen separados: evitá mover la pelota desde el renderer o codificar reglas de partido en componentes React.

## Dónde aportar

Las prioridades actuales están documentadas en [`REVIEW-V10.md`](REVIEW-V10.md):

1. Continuidad de pies, torso y pala en bandeja, víbora y remate.
2. Modelos humanos, árbitro, público y materiales del estadio.
3. Tácticas individuales, lectura de pared y variedad de rescates.
4. Mezcla, pasos, público, arbitraje y accesibilidad de audio.

Leé [`CONTRIBUTING.md`](CONTRIBUTING.md) antes de empezar. Los videos de revisión y archivos de trabajo locales están ignorados a propósito: no deben entrar al repositorio.

## Licencia y marcas

El código se publica bajo [MIT](LICENSE).

**Premier Padel**, nombres de torneos, nombres de jugadores y marcas visibles pertenecen a sus respectivos titulares. Este proyecto es fan-made, no oficial y no está afiliado, patrocinado ni aprobado por Premier Padel, FIP, jugadores, marcas o desarrolladores de otros simuladores. Los nombres se usan para identificar el contexto deportivo. Las figuras, texturas procedurales, modelos y sonidos fueron creados para este proyecto; no se distribuyen assets de videojuegos comerciales ni videos de terceros.

## Referencias técnicas

- [Reglamento FIP de pádel](https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf)
- [Dinámica y criterios del motor](PADEL-DYNAMICS.md)
- [Revisión visual V10](REVIEW-V10.md)
- [Política de capturas y videos](REVIEW-VIDEOS.md)
