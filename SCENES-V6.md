# Escenas de partido V6

Cada punto real produce un evento de resultado. Un director independiente pausa el reloj de simulación y coordina celebración, caminata, descanso y regreso. Espacio, golpe base o «Continuar» omiten la escena sin repetirla ni sumar puntos. La pausa congela también la escena. Entrenamiento mantiene sus lanzamientos ágiles sin interludios.

Después del primer juego y durante el cambio del tie-break sólo se cambia de lado. Juegos impares posteriores incluyen banco y entrenador. Fin de set incluye descanso salvo fin de partido. Las pausas se comprimen para el videojuego: no obligan a esperar los máximos reglamentarios de 90/120 segundos. Caminatas por las puertas duran unos seis segundos por trayecto, y pueden omitirse.

Los extremos visuales de la pista cambian al preparar el siguiente punto: jugadores y cámara se orientan frente al estadio fijo; los controles conservan orientación intuitiva para el usuario. El marcador, servidor, paredes y equipos permanecen en coordenadas canónicas coherentes.

Frustración depende de déficit de juegos y sets y último punto. El entrenador gesticula y dialoga con la pareja. Lebrón tiene una variante de discusión más intensa a mayor desventaja. **Todos los diálogos son ficción escrita para este juego; no son citas, conductas documentadas ni voz clonada del jugador.** La interfaz del banco muestra «Escena ficticia».

Cuatro pruebas del director verifican descanso correcto, omisión sin repetición, aumento de frustración y un partido completo de IA con todas sus escenas hasta el resultado final. Las escenas de inspección visual son fixtures etiquetados; no sustituyen la prueba del flujo real.

## Verificación de interfaz

En la app local se jugaron cuatro puntos desde el botón de partido rápido y saque por Espacio. Se observó celebración tras el 0–40, cierre del primer juego, pausa durante celebración, reanudación sin alterar 0–1 y omisión por Espacio con siguiente servicio rival. Una prueba separada reasignó pausa a P y confirmó entrar/continuar; después restauró controles predeterminados. El primer encuadre de celebración recortaba una pareja separada: se remitió al renderer para corregir distancia según separación y relación de aspecto antes de publicar.

La omisión y la reanudación recuperan inmediatamente la cámara de juego para no perder el saque. Las escenas descartan combos, teclas, carga y movimiento táctil pendientes al empezar; ningún golpe viejo debe dispararse al finalizar el descanso.
