import type { ApparatusId } from './types';

export interface ApparatusPart {
  id: string;
  name: string;
  description: string;
  interactive?: 'toggle-stopcock' | 'inspect';
}

export interface ApparatusInfo {
  id: ApparatusId;
  name: string;
  short: string;
  category: 'glassware' | 'instrument' | 'reagent' | 'safety';
  movable: boolean;
  description: string;
  capacity?: string;
  parts: ApparatusPart[];
}

export const APPARATUS_CATALOGUE: Record<ApparatusId, ApparatusInfo> = {
  burette: {
    id: 'burette',
    name: 'Burette',
    short: 'Burette',
    category: 'glassware',
    movable: true,
    capacity: '50.00 mL, 0.10 mL graduations',
    description:
      'A precision glass tube with a PTFE stopcock, used to deliver variable, accurately measured volumes of titrant. Read the bottom of the meniscus at eye level.',
    parts: [
      { id: 'tube', name: 'Graduated tube', description: '50 mL capacity. Read the meniscus at the bottom of the curve, to 0.01 mL.' },
      { id: 'stopcock', name: 'Stopcock', description: 'Controls flow. Pinch or click it to open and close; use dropwise flow near the endpoint.', interactive: 'toggle-stopcock' },
      { id: 'tip', name: 'Delivery tip', description: 'Delivers titrant directly into the flask neck to avoid splashing.' },
    ],
  },
  flask: {
    id: 'flask',
    name: 'Conical flask',
    short: 'Flask',
    category: 'glassware',
    movable: true,
    capacity: '250 mL',
    description:
      'The reaction vessel. Its conical shape allows swirling without spilling. The indicator colour change is observed here.',
    parts: [
      { id: 'body', name: 'Conical body', description: 'Holds the analyte and indicator. Swirl gently during titration.' },
      { id: 'neck', name: 'Neck', description: 'Receives the burette tip and limits splashing.' },
    ],
  },
  pipette: {
    id: 'pipette',
    name: 'Volumetric pipette',
    short: 'Pipette',
    category: 'glassware',
    movable: true,
    capacity: '25.00 mL',
    description:
      'Delivers one accurately known aliquot. A single calibration mark makes it more precise than a measuring cylinder.',
    parts: [
      { id: 'bulb', name: 'Bulb', description: 'Provides the suction volume for exactly 25.00 mL.' },
      { id: 'mark', name: 'Calibration mark', description: 'Fill until the meniscus rests on this line.' },
    ],
  },
  beaker: {
    id: 'beaker',
    name: 'Beaker',
    short: 'Beaker',
    category: 'glassware',
    movable: true,
    capacity: '250 mL',
    description: 'A general-purpose vessel for holding, mixing and roughly measuring liquids.',
    parts: [{ id: 'body', name: 'Beaker body', description: 'Approximate graduations; not for precise titration volumes.' }],
  },
  cylinder: {
    id: 'cylinder',
    name: 'Measuring cylinder',
    short: 'Cylinder',
    category: 'glassware',
    movable: true,
    capacity: '100 mL',
    description: 'For measuring larger volumes approximately. Less precise than a volumetric pipette.',
    parts: [{ id: 'body', name: 'Graduated body', description: 'Read at eye level; ±0.5 mL typical accuracy.' }],
  },
  washBottle: {
    id: 'washBottle',
    name: 'Wash bottle',
    short: 'Wash bottle',
    category: 'instrument',
    movable: true,
    capacity: '500 mL',
    description:
      'Distilled water for rinsing glassware and washing the flask walls. Adding water changes dilution, not the amount of acid or base.',
    parts: [{ id: 'spout', name: 'Delivery spout', description: 'Directs a fine stream of distilled water.' }],
  },
  retortStand: {
    id: 'retortStand',
    name: 'Retort stand & clamp',
    short: 'Retort stand',
    category: 'instrument',
    movable: false,
    description:
      'A heavy base and steel rod that hold the burette vertically above the flask. Always clamp the burette before filling.',
    parts: [
      { id: 'rod', name: 'Steel rod', description: 'Vertical support, 0.9 m.' },
      { id: 'clamp', name: 'Burette clamp', description: 'Holds the burette securely. Drop the burette near it to snap.', interactive: 'inspect' },
    ],
  },
  hclBottle: {
    id: 'hclBottle',
    name: 'Unknown HCl',
    short: 'HCl',
    category: 'reagent',
    movable: false,
    description:
      'The analyte: hydrochloric acid of unknown concentration. A 25.00 mL aliquot is transferred to the flask.',
    parts: [{ id: 'label', name: 'Reagent label', description: '“HCl — concentration unknown. Standardise by titration with 0.1000 M NaOH.”' }],
  },
  naohBottle: {
    id: 'naohBottle',
    name: 'Sodium hydroxide',
    short: 'NaOH',
    category: 'reagent',
    movable: false,
    description: 'The titrant: standardised 0.1000 mol dm⁻³ sodium hydroxide.',
    parts: [{ id: 'label', name: 'Reagent label', description: '0.1000 M NaOH, standardised. Corrosive — handle with care.' }],
  },
  indicator: {
    id: 'indicator',
    name: 'Phenolphthalein',
    short: 'Indicator',
    category: 'reagent',
    movable: false,
    description:
      'A pH indicator that is colourless below pH 8.2 and pink above it. Three drops are enough for a 25 mL aliquot.',
    parts: [{ id: 'dropper', name: 'Dropper tip', description: 'Delivers 0.05 mL per drop.' }],
  },
};

export const MOVABLE_APPARATUS = (Object.values(APPARATUS_CATALOGUE) as ApparatusInfo[])
  .filter((item) => item.movable)
  .map((item) => item.id);

export const APPARATUS_ORDER: ApparatusId[] = [
  'burette',
  'flask',
  'pipette',
  'beaker',
  'cylinder',
  'washBottle',
  'retortStand',
  'hclBottle',
  'naohBottle',
  'indicator',
];
