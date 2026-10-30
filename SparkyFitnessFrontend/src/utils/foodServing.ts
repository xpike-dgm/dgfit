type ServingLike = {
  serving_size?: number | null;
  serving_unit?: string | null;
  serving_description?: string | null;
};

export function formatServingLabel(variant: ServingLike): string {
  const description = variant.serving_description?.trim();
  if (description) return description;

  const unit = variant.serving_unit?.trim() || '';
  if (variant.serving_size == null) return unit;
  return `${variant.serving_size} ${unit}`.trim();
}

export function formatQuantityServingLabel(
  quantity: number,
  variant: ServingLike
): string {
  if (
    variant.serving_size === quantity &&
    variant.serving_description?.trim()
  ) {
    return variant.serving_description.trim();
  }

  return `${quantity} ${variant.serving_unit || ''}`.trim();
}

// DG FIT shows every unit in Turkish. Units are stored by their English names
// (the shared conversion tables key on them), so only the label changes.
const UNIT_LABELS_TR: Record<string, string> = {
  piece: 'adet',
  pieces: 'adet',
  serving: 'porsiyon',
  servings: 'porsiyon',
  portion: 'porsiyon',
  slice: 'dilim',
  slices: 'dilim',
  tbsp: 'yemek kaşığı',
  tablespoon: 'yemek kaşığı',
  tsp: 'çay kaşığı',
  teaspoon: 'çay kaşığı',
  cup: 'su bardağı',
  cups: 'su bardağı',
  glass: 'bardak',
  can: 'kutu',
  bottle: 'şişe',
  packet: 'paket',
  bag: 'poşet',
  bowl: 'kase',
  plate: 'tabak',
  handful: 'avuç',
  scoop: 'ölçek',
  bar: 'bar',
  stick: 'çubuk',
  whole: 'bütün',
  container: 'kap',
  liter: 'l',
  litre: 'l',
};

export function unitLabelTr(unit: string | null | undefined): string {
  const trimmed = unit?.trim() ?? '';
  return UNIT_LABELS_TR[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * What one unit of a variant is called in the amount picker. The quantity a
 * person types is counted in the variant's own unit (100 → 100 g, 2 → 2
 * porsiyon), so the picker shows the unit, not the variant's reference size.
 */
export function variantUnitLabel(variant: ServingLike): string {
  const description = variant.serving_description?.trim();
  if (description) return description;
  return unitLabelTr(variant.serving_unit);
}

const fmtAmount = (value: number) =>
  value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

/** A ready-made amount for the quick chips, e.g. "100 g" or "1 porsiyon (250 g)". */
export function variantChipLabel(variant: ServingLike): string {
  const description = variant.serving_description?.trim();
  const size = Number(variant.serving_size) || 1;
  if (description) {
    return size === 1 ? description : `${fmtAmount(size)} × ${description}`;
  }
  return `${fmtAmount(size)} ${unitLabelTr(variant.serving_unit)}`.trim();
}
