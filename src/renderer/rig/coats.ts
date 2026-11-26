import type { CoatId } from '../../shared/types.ts';

/** Tipo de padronagem desenhada pelo `catRenderer`. */
export type CoatPattern =
  | 'tuxedo'
  | 'tabby'
  | 'calico'
  | 'siamese'
  | 'solid'
  | 'bicolor'
  | 'tortoiseshell';

/** Definição visual completa de uma pelagem. */
export interface CoatDefinition {
  id: CoatId;
  /** Nome original exibido no vídeo. */
  label: string;
  /** Subtítulo amigável em português para a janela de configurações. */
  subtitle: string;
  pattern: CoatPattern;
  /** Cor principal da pelagem. */
  baseColor: string;
  /** Cor secundária (peito, focinho, barriga ou pontos escuros). */
  secondaryColor: string;
  /** Cor de listras ou manchas adicionais. */
  markingColor: string;
  /** Segunda cor de mancha (usada no Calico e Tortoiseshell). */
  markingColorAlt: string;
  /** Cor das pontas das patas (meinhas ou pontas siamesas). */
  pawTipColor: string;
  /** Cor da parte interna das orelhas. */
  innerEarColor: string;
  /** Cor do narizinho. */
  noseColor: string;
  /** Cor da íris dos olhos. */
  eyeColor: string;
  /** Cor da pupila. */
  pupilColor: string;
  /** Contorno sutil (essencial para pelagens claras como White e Cream). */
  outlineColor: string;
}

/**
 * Todas as 13 pelagens exatamente na mesma ordem dos botões exibidos no vídeo do LittleOne:
 * Tuxedo, Orange tabby, Brown tabby, Calico, Siamese, Black, White,
 * Blue gray, Gray & white, Orange & white, Tortoiseshell, Cream, Silver.
 */
export const COATS: readonly CoatDefinition[] = [
  {
    id: 'tuxedo',
    label: 'Tuxedo',
    subtitle: 'Frajola',
    pattern: 'tuxedo',
    baseColor: '#1f2127',
    secondaryColor: '#f7f7f9',
    markingColor: '#17191e',
    markingColorAlt: '#f7f7f9',
    pawTipColor: '#f7f7f9',
    innerEarColor: '#6d5c66',
    noseColor: '#df8b9c',
    eyeColor: '#f2c144',
    pupilColor: '#14151a',
    outlineColor: '#121318',
  },
  {
    id: 'orange-tabby',
    label: 'Orange tabby',
    subtitle: 'Laranja listrado',
    pattern: 'tabby',
    baseColor: '#e6943c',
    secondaryColor: '#fce4c6',
    markingColor: '#b9611c',
    markingColorAlt: '#cf7227',
    pawTipColor: '#fce4c6',
    innerEarColor: '#d9897c',
    noseColor: '#d9787b',
    eyeColor: '#7eb252',
    pupilColor: '#181a14',
    outlineColor: '#9c4f16',
  },
  {
    id: 'brown-tabby',
    label: 'Brown tabby',
    subtitle: 'Rajado marrom',
    pattern: 'tabby',
    baseColor: '#947e67',
    secondaryColor: '#e6d8c8',
    markingColor: '#4c3e32',
    markingColorAlt: '#635141',
    pawTipColor: '#d7cab9',
    innerEarColor: '#b2877f',
    noseColor: '#a86764',
    eyeColor: '#86b850',
    pupilColor: '#161812',
    outlineColor: '#43362b',
  },
  {
    id: 'calico',
    label: 'Calico',
    subtitle: 'Tricolor',
    pattern: 'calico',
    baseColor: '#f8f6f2',
    secondaryColor: '#ffffff',
    markingColor: '#e08538',
    markingColorAlt: '#2b2a2f',
    pawTipColor: '#f8f6f2',
    innerEarColor: '#e5a4aa',
    noseColor: '#e594a3',
    eyeColor: '#d6a536',
    pupilColor: '#15161b',
    outlineColor: '#cfc8be',
  },
  {
    id: 'siamese',
    label: 'Siamese',
    subtitle: 'Siamês',
    pattern: 'siamese',
    baseColor: '#ede0cc',
    secondaryColor: '#483a32',
    markingColor: '#58473e',
    markingColorAlt: '#3b2e28',
    pawTipColor: '#483a32',
    innerEarColor: '#6d574c',
    noseColor: '#3b2e28',
    eyeColor: '#6bb8eb',
    pupilColor: '#121923',
    outlineColor: '#b8a68e',
  },
  {
    id: 'black',
    label: 'Black',
    subtitle: 'Preto',
    pattern: 'solid',
    baseColor: '#1d1e24',
    secondaryColor: '#282a31',
    markingColor: '#16171c',
    markingColorAlt: '#26282f',
    pawTipColor: '#1d1e24',
    innerEarColor: '#5f505a',
    noseColor: '#3d373d',
    eyeColor: '#f5c745',
    pupilColor: '#101115',
    outlineColor: '#101116',
  },
  {
    id: 'white',
    label: 'White',
    subtitle: 'Branco',
    pattern: 'solid',
    baseColor: '#f5f6f8',
    secondaryColor: '#ffffff',
    markingColor: '#e5e7ec',
    markingColorAlt: '#eceef2',
    pawTipColor: '#ffffff',
    innerEarColor: '#eeb5be',
    noseColor: '#ea9aa8',
    eyeColor: '#6bb8eb',
    pupilColor: '#141920',
    outlineColor: '#c9cdd6',
  },
  {
    id: 'blue-gray',
    label: 'Blue gray',
    subtitle: 'Cinza azulado',
    pattern: 'solid',
    baseColor: '#6e7c8c',
    secondaryColor: '#8190a1',
    markingColor: '#5a6675',
    markingColorAlt: '#7a8999',
    pawTipColor: '#6e7c8c',
    innerEarColor: '#9c8a96',
    noseColor: '#4d535e',
    eyeColor: '#e5ad42',
    pupilColor: '#15171c',
    outlineColor: '#4c5764',
  },
  {
    id: 'gray-white',
    label: 'Gray & white',
    subtitle: 'Cinza e branco',
    pattern: 'bicolor',
    baseColor: '#76818d',
    secondaryColor: '#f4f5f7',
    markingColor: '#626c77',
    markingColorAlt: '#f4f5f7',
    pawTipColor: '#f4f5f7',
    innerEarColor: '#b8949c',
    noseColor: '#df95a3',
    eyeColor: '#78b85c',
    pupilColor: '#161815',
    outlineColor: '#565f69',
  },
  {
    id: 'orange-white',
    label: 'Orange & white',
    subtitle: 'Laranja e branco',
    pattern: 'bicolor',
    baseColor: '#ea933d',
    secondaryColor: '#f9f7f3',
    markingColor: '#cf7422',
    markingColorAlt: '#f9f7f3',
    pawTipColor: '#f9f7f3',
    innerEarColor: '#e49f9b',
    noseColor: '#e68e98',
    eyeColor: '#84b755',
    pupilColor: '#171914',
    outlineColor: '#b56722',
  },
  {
    id: 'tortoiseshell',
    label: 'Tortoiseshell',
    subtitle: 'Escaminha',
    pattern: 'tortoiseshell',
    baseColor: '#282425',
    secondaryColor: '#d47c35',
    markingColor: '#d9833a',
    markingColorAlt: '#7e5536',
    pawTipColor: '#2c2625',
    innerEarColor: '#7a5c58',
    noseColor: '#563f3b',
    eyeColor: '#e7b13d',
    pupilColor: '#151414',
    outlineColor: '#181515',
  },
  {
    id: 'cream',
    label: 'Cream',
    subtitle: 'Creme',
    pattern: 'solid',
    baseColor: '#f0dec1',
    secondaryColor: '#f9efe0',
    markingColor: '#dfc6a0',
    markingColorAlt: '#e6d0ae',
    pawTipColor: '#f6ead6',
    innerEarColor: '#e2a7a3',
    noseColor: '#df989d',
    eyeColor: '#7eb25c',
    pupilColor: '#181915',
    outlineColor: '#c9b28e',
  },
  {
    id: 'silver',
    label: 'Silver',
    subtitle: 'Prateado rajado',
    pattern: 'tabby',
    baseColor: '#bcc3cb',
    secondaryColor: '#eff2f5',
    markingColor: '#69727c',
    markingColorAlt: '#828b96',
    pawTipColor: '#e8ecf0',
    innerEarColor: '#c49aa2',
    noseColor: '#b47982',
    eyeColor: '#72b56e',
    pupilColor: '#161918',
    outlineColor: '#7f8791',
  },
];

export const COAT_MAP: Readonly<Record<CoatId, CoatDefinition>> = Object.fromEntries(
  COATS.map((coat) => [coat.id, coat]),
) as Record<CoatId, CoatDefinition>;

/** Retorna a definição da pelagem ou faz fallback seguro para Tuxedo. */
export function getCoat(id: CoatId): CoatDefinition {
  return COAT_MAP[id] ?? COAT_MAP.tuxedo;
}
