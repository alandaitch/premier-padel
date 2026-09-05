# Física V6 · juego exterior y remate paralelo

## Comportamiento

La pelota exterior conserva velocidad, altura y efecto: no hay un premio artificial para aterrizar cerca del defensor. El jugador puede correr hasta ocho metros fuera de cada lateral y siete metros en la dirección longitudinal. Ese corredor limita al cuerpo; no crea una pared invisible para la pelota.

La devolución exterior permite cuatro intenciones: automática, puerta, alta y cara rival de la red. Puerta apunta a un plano de paso por la abertura real; dirección, altura y potencia pueden provocar fallo contra poste/malla, un pique dentro o una salida por la otra puerta. Alta calcula una parábola sobre el cerramiento. Red prolonga la trayectoria por la puerta hacia la cara del rival: la colisión frena la pelota y los piques deciden el punto. No se concede punto al tocar la red.

La ayuda actúa al elegir la velocidad inicial. Después se ejecutan gravedad, resistencia cuadrática, Magnus y colisiones pasivas existentes. No hay desplazamiento de la pelota en medio del vuelo para garantizar rescates ni ganadores.

«Paralelo alto» agrega una dirección cercana a la línea y selección de profundidad para un remate que trepa fuera del alcance; puede terminar por cuatro. Depende de posición, altura y calidad de contacto. Un rival bien ubicado todavía puede interceptarlo antes de subir. «Traérmela», por tres y por cuatro siguen disponibles.

## Evidencia

`game/physics.test.ts`: 52 pruebas aprobadas, incluyendo:

- Feed real de práctica, por tres izquierdo con potencia máxima: segundo pique exterior más allá de diez metros en ambos ejes, sin rescate forzado.
- Feed real, por tres derecho a potencia 0,82: rival sale, devuelve por puerta, toca cara rival de red, primer pique rival y segundo pique ganador. No se recolocan cuerpos ni pelota durante ese rally.
- Por tres colocado a potencia 0,55: rescates naturales por ambos laterales, entrada/salida de jugadores a través de puertas.
- Fixtures simétricos: atravesar puerta contraria tras pique legal continúa; atravesarla sin pique rival pierde al caer fuera. Mala dirección golpea cerramiento.
- Fixture de remate alcanzable desde cerca de red: paralelo alto pica en campo rival, llega a 4,09 m y sale por el fondo. Se aísla el vuelo sin jugadores; no prueba que sea imparable frente a IA.
- Cambios de lado una vez por juego impar y cada seis puntos del tie-break; primer juego sin descanso; descanso de set.
- Conservadas regresiones de servicio bajo, paredes, doble pared, restitución, conservación de energía pasiva, liftado, contrapared, bandeja, víbora, carga y partido completo.

## Límites

Las trayectorias están asistidas al golpear; no son una medición calibrada contra captura óptica de partidos. El alto devuelve su mejor opción disponible, sin garantizar la salida. La zona exterior del jugador es finita y una pelota potente puede quedar irrecuperable. La malla aún usa una respuesta simplificada; faltan red deformable y colisiones detalladas pala/cuerpo/red. El indicador de destino de una devolución baja marca el plano de entrada, no necesariamente su primer pique.

Fuentes: [reglas FIP 2026](https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf), [The Padel School con Saska Huttunen](https://thepadelschool.com/padel-tips/the-biggest-padel-smash-in-finland). Investigación visual y alcance de sus inferencias en `PADEL-REVIEW-V6.md`.
