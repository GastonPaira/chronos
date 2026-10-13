import ancientEgypt from './ancient-egypt.json';
import ancientGreece from './ancient-greece.json';
import romanEmpire from './roman-empire.json';
import byzantineEmpire from './byzantine-empire.json';
import crusadesChivalry from './crusades-chivalry.json';
import vikings from './vikings.json';
import ageOfExploration from './age-of-exploration.json';
import theReformation from './the-reformation.json';
import theRenaissance from './the-renaissance.json';
import industrialRevolution from './industrial-revolution.json';
import worldWars from './world-wars.json';
import coldWarSpaceRace from './cold-war-space-race.json';

const questionsData = [
  ...ancientEgypt,
  ...ancientGreece,
  ...romanEmpire,
  ...byzantineEmpire,
  ...crusadesChivalry,
  ...vikings,
  ...ageOfExploration,
  ...theReformation,
  ...theRenaissance,
  ...industrialRevolution,
  ...worldWars,
  ...coldWarSpaceRace,
];

export default questionsData;

export function getQuestionsByIds(ids: string[]): import('@/types').Question[] {
  const all = questionsData as import('@/types').Question[];
  const map = new Map(all.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter((q): q is import('@/types').Question => q !== undefined);
}
