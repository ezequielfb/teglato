import { describe, expect, it } from 'vitest';
import { COATS, COAT_MAP, getCoat } from '../src/renderer/rig/coats.ts';
import type { CoatId } from '../src/shared/types.ts';

const EXPECTED_COATS: CoatId[] = [
  'tuxedo',
  'orange-tabby',
  'brown-tabby',
  'calico',
  'siamese',
  'black',
  'white',
  'blue-gray',
  'gray-white',
  'orange-white',
  'tortoiseshell',
  'cream',
  'silver',
];

describe('coats', () => {
  it('define todas as 13 pelagens do vídeo de referência', () => {
    expect(COATS).toHaveLength(13);
    expect(COATS.map((c) => c.id)).toEqual(EXPECTED_COATS);
  });

  it('garante cores hexadecimais válidas em todas as pelagens', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    for (const coat of COATS) {
      expect(COAT_MAP[coat.id]).toBe(coat);
      expect(coat.baseColor).toMatch(hexPattern);
      expect(coat.secondaryColor).toMatch(hexPattern);
      expect(coat.eyeColor).toMatch(hexPattern);
      expect(coat.outlineColor).toMatch(hexPattern);
    }
  });

  it('faz fallback seguro para tuxedo caso receba um id desconhecido', () => {
    expect(getCoat('unknown-coat' as CoatId).id).toBe('tuxedo');
  });
});
