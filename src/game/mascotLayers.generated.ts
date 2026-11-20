// GENERATED FILE - run `npm run build:mascot-layers` to update.
export const MASCOT_SOURCE = {
  "width": 1086,
  "height": 1448
} as const;

export const MASCOT_LAYER_RECTS = {
  "leg-back": [
    0.384,
    0.6,
    0.723,
    0.985
  ],
  "leg-front": [
    0.089,
    0.6,
    0.383,
    0.985
  ],
  "torso": [
    0.239,
    0.38,
    0.699,
    0.659
  ],
  "arm-left": [
    0.119,
    0.4,
    0.339,
    0.659
  ],
  "plate-arm": [
    0.519,
    0.23,
    0.939,
    0.639
  ],
  "head": [
    0.121,
    0.005,
    0.579,
    0.44
  ]
} as const;

export type MascotLayerName = keyof typeof MASCOT_LAYER_RECTS;

export const MASCOT_PIVOTS = {
  "leg-back": [
    0.5535,
    0.61
  ],
  "leg-front": [
    0.236,
    0.61
  ],
  "arm-left": [
    0.229,
    0.41
  ],
  "head": [
    0.35,
    0.435
  ]
} as const satisfies Partial<Record<MascotLayerName, readonly [number, number]>>;

export const MASCOT_EXPRESSION_HEADS = {
  "normal": "mascot/head-normal.png",
  "blink": "mascot/head-blink.png",
  "happy": "mascot/head-happy.png",
  "shock": "mascot/head-shock.png",
  "sad": "mascot/head-sad.png"
} as const;

export type MascotExpression = keyof typeof MASCOT_EXPRESSION_HEADS;

export const MASCOT_PLATE = {
  "x": 0.7675,
  "y": 0.2762,
  "radiusX": 0.176
} as const;
