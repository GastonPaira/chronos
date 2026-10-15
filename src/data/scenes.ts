// Escenas: una línea que te pone "dentro" de la época antes de cada pregunta.
// Son ambientación general de la categoría (no dan pistas sobre la respuesta); a cada pregunta le toca una siempre la misma.
// Para sumar una categoría nueva: agregá acá al menos 4 escenas (las revisa catalog.test.ts).

import type { LocalizedString } from '@/types';
import { hashString } from '@/lib/questions';

const scene = (en: string, es: string): LocalizedString => ({ en, es });

export const SCENES: Record<string, LocalizedString[]> = {
  'ancient-egypt': [
    scene('Thebes, around 1350 BC. The Nile is rising, and the farmers watch the sky.', 'Tebas, alrededor del 1350 a. C. El Nilo crece y los campesinos miran el cielo.'),
    scene('Giza, 2560 BC. Thousands of workers drag huge stones under the burning sun.', 'Guiza, 2560 a. C. Miles de obreros arrastran enormes piedras bajo el sol ardiente.'),
    scene('Memphis, a market morning. Boats full of grain, papyrus and gold line the river.', 'Menfis, una mañana de mercado. Barcos llenos de grano, papiro y oro llenan el río.'),
    scene('Deep inside a temple, a priest lights a lamp and the painted walls begin to glow.', 'En lo profundo de un templo, un sacerdote enciende una lámpara y las paredes pintadas empiezan a brillar.'),
  ],
  'ancient-greece': [
    scene('Athens, 430 BC. In the agora, people argue about laws, gods and the meaning of life.', 'Atenas, 430 a. C. En el ágora, la gente discute sobre leyes, dioses y el sentido de la vida.'),
    scene('Olympia, 476 BC. The crowd goes silent as the runners take their places.', 'Olimpia, 476 a. C. La multitud calla mientras los corredores toman sus lugares.'),
    scene('A ship leaves Piraeus at dawn, its sails full of the Aegean wind.', 'Un barco sale del Pireo al amanecer, con las velas llenas del viento del Egeo.'),
    scene('Sparta, a cold morning. Boys are already running, and nobody complains.', 'Esparta, una mañana fría. Los niños ya están corriendo y nadie se queja.'),
  ],
  'roman-empire': [
    scene('Rome, 80 AD. The Colosseum shakes with the roar of fifty thousand people.', 'Roma, 80 d. C. El Coliseo vibra con el rugido de cincuenta mil personas.'),
    scene('A Roman road, somewhere in Gaul. A legion marches, step after step, toward the north.', 'Un camino romano, en algún lugar de la Galia. Una legión marcha, paso tras paso, hacia el norte.'),
    scene('The Forum at noon. Senators in white togas hurry past the merchants.', 'El Foro al mediodía. Senadores con togas blancas pasan deprisa entre los mercaderes.'),
    scene('Pompeii, a normal morning. Bread is baking, and the mountain is quiet… for now.', 'Pompeya, una mañana normal. Se hornea el pan y la montaña está tranquila… por ahora.'),
  ],
  'byzantine-empire': [
    scene('Constantinople, 537 AD. Light pours through the windows of the new Hagia Sophia.', 'Constantinopla, 537 d. C. La luz entra por las ventanas de la nueva Santa Sofía.'),
    scene('The Hippodrome is full. Chariots thunder around the track, and the city holds its breath.', 'El Hipódromo está lleno. Los carros rugen por la pista y la ciudad contiene el aliento.'),
    scene('On the great walls, guards watch the sea for enemy ships.', 'En las grandes murallas, los guardias vigilan el mar en busca de barcos enemigos.'),
    scene('A monk bends over a page, painting gold onto a holy icon.', 'Un monje se inclina sobre una página y pinta oro en un icono sagrado.'),
  ],
  'crusades-chivalry': [
    scene('A castle courtyard at dawn. A young squire polishes his knight’s armor.', 'El patio de un castillo al amanecer. Un joven escudero pule la armadura de su caballero.'),
    scene('A dusty road to Jerusalem. Pilgrims and soldiers walk side by side under a hot sun.', 'Un camino polvoriento a Jerusalén. Peregrinos y soldados caminan juntos bajo un sol ardiente.'),
    scene('A tournament field. Banners wave, trumpets sound, and two knights lower their lances.', 'Un campo de torneo. Ondean estandartes, suenan trompetas y dos caballeros bajan sus lanzas.'),
    scene('Night in a stone fortress. A guard on the tower sees fires moving in the distance.', 'Noche en una fortaleza de piedra. Un guardia en la torre ve fuegos moverse a lo lejos.'),
  ],
  vikings: [
    scene('The North Sea, 793 AD. A long, dark ship slides toward an undefended island.', 'El mar del Norte, 793 d. C. Un barco largo y oscuro se desliza hacia una isla sin defensa.'),
    scene('A longhouse in winter. The fire cracks while the storyteller recites old sagas.', 'Una casa larga en invierno. El fuego crepita mientras el narrador recita viejas sagas.'),
    scene('Iceland, deep fog. Sailors tie up their boat and look at the new, empty land.', 'Islandia, niebla espesa. Los marineros amarran su barco y miran la tierra nueva y vacía.'),
    scene('A market on the Dnieper river. Furs, amber and silver change hands.', 'Un mercado en el río Dniéper. Pieles, ámbar y plata cambian de manos.'),
  ],
  'age-of-exploration': [
    scene('Lisbon, 1497. Four ships wait in the harbor, loaded with food, maps and hope.', 'Lisboa, 1497. Cuatro barcos esperan en el puerto, cargados de comida, mapas y esperanza.'),
    scene('Mid-Atlantic. Weeks without land, and the crew starts to whisper about turning back.', 'En medio del Atlántico. Semanas sin ver tierra, y la tripulación empieza a susurrar sobre volver.'),
    scene('A captain bends over a map by candlelight and draws a coast no European has seen.', 'Un capitán se inclina sobre un mapa a la luz de una vela y dibuja una costa que ningún europeo ha visto.'),
    scene('At last, a bird. Then a green line on the horizon.', 'Por fin, un pájaro. Luego, una línea verde en el horizonte.'),
  ],
  'the-reformation': [
    scene('Wittenberg, 1517. A monk walks to the church door with a hammer and a long list.', 'Wittenberg, 1517. Un monje camina hacia la puerta de la iglesia con un martillo y una larga lista.'),
    scene('A printing shop in Germany. The press clicks all night, and pamphlets pile up.', 'Una imprenta en Alemania. La prensa suena toda la noche y los panfletos se amontonan.'),
    scene('A crowded church. The preacher speaks in plain German, and everyone finally understands.', 'Una iglesia llena. El predicador habla en alemán sencillo y por fin todos entienden.'),
    scene('A quiet village divided: some families go to the old church, others to the new one.', 'Una aldea tranquila y dividida: unas familias van a la iglesia antigua y otras a la nueva.'),
  ],
  'the-renaissance': [
    scene('Florence, 1490. In a workshop full of paint and dust, an apprentice grinds blue stone for a master.', 'Florencia, 1490. En un taller lleno de pintura y polvo, un aprendiz muele piedra azul para un maestro.'),
    scene('A rich banker’s palace. Poets, painters and scientists share dinner and big ideas.', 'El palacio de un rico banquero. Poetas, pintores y científicos comparten la cena y grandes ideas.'),
    scene('A scholar finds an old Greek book in a dusty library and reads it twice.', 'Un erudito encuentra un viejo libro griego en una biblioteca polvorienta y lo lee dos veces.'),
    scene('Under a huge dome, builders lift stone higher than anyone thought possible.', 'Bajo una enorme cúpula, los constructores levantan piedra más alto de lo que nadie creía posible.'),
  ],
  'industrial-revolution': [
    scene('Manchester, 1840. Chimneys fill the sky with smoke, and the looms never stop.', 'Manchester, 1840. Las chimeneas llenan el cielo de humo y los telares nunca se detienen.'),
    scene('A railway station. The first steam trains hiss, and people stare in wonder and fear.', 'Una estación de tren. Los primeros trenes de vapor silban y la gente mira con asombro y miedo.'),
    scene('Dawn at a coal mine. Workers, some of them only children, walk down into the dark.', 'Amanecer en una mina de carbón. Los trabajadores, algunos solo niños, bajan a la oscuridad.'),
    scene('A crowded street in London. Gas lamps flicker, and the city never sleeps.', 'Una calle llena de gente en Londres. Las lámparas de gas parpadean y la ciudad nunca duerme.'),
  ],
  'world-wars': [
    scene('A muddy trench in 1916. Soldiers write letters home and wait for the whistle.', 'Una trinchera embarrada en 1916. Los soldados escriben cartas a casa y esperan el silbato.'),
    scene('A radio in a small kitchen. The family stops talking to hear the news from far away.', 'Una radio en una cocina pequeña. La familia deja de hablar para oír las noticias de lejos.'),
    scene('A factory at night. The women who work there keep the whole country going.', 'Una fábrica de noche. Las mujeres que trabajan allí sostienen a todo el país.'),
    scene('A city in ruins, years later. People begin to rebuild, brick by brick.', 'Una ciudad en ruinas, años después. La gente empieza a reconstruir, ladrillo a ladrillo.'),
  ],
  'cold-war-space-race': [
    scene('A school in 1957. Everyone looks up: a small metal ball is crossing the sky.', 'Una escuela en 1957. Todos miran arriba: una pequeña bola de metal cruza el cielo.'),
    scene('Mission control. A room full of men in white shirts, watching one tiny dot on a screen.', 'Control de misión. Una sala llena de hombres con camisa blanca, mirando un punto diminuto en una pantalla.'),
    scene('Berlin, a gray morning. A wall divides one street, and families wave across it.', 'Berlín, una mañana gris. Un muro divide una calle y las familias se saludan de un lado al otro.'),
    scene('July 1969. A whole planet holds its breath and listens to a crackling radio.', 'Julio de 1969. Un planeta entero contiene el aliento y escucha una radio con ruido.'),
  ],
};

/** The scene that opens a question: always the same one for the same question. */
export function pickScene(categoryId: string, questionId: string): LocalizedString | undefined {
  const scenes = SCENES[categoryId];
  if (!scenes?.length) return undefined;
  return scenes[(hashString(questionId) >>> 8) % scenes.length];
}
