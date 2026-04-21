import ancientEgypt from './ancient-egypt.json';
import ancientGreece from './ancient-greece.json';
import romanEmpire from './roman-empire.json';
import byzantineEmpire from './byzantine-empire.json';
import crusadesChivalry from './crusades-chivalry.json';
import vikings from './vikings.json';

const questionsData = [
  ...ancientEgypt,
  ...ancientGreece,
  ...romanEmpire,
  ...byzantineEmpire,
  ...crusadesChivalry,
  ...vikings,
];

export default questionsData;

export function getQuestionsByIds(ids: string[]): import('@/types').Question[] {
  const all = questionsData as import('@/types').Question[];
  const map = new Map(all.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter((q): q is import('@/types').Question => q !== undefined);
}
