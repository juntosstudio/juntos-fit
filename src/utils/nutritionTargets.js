function macroValue(value) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return 0
  }

  const number = Number(value)

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return 0
  }

  return number
}

// Calculates calories immediately from every macro
// entered so far. Blank macros count as zero.
export function calculateCaloriesFromMacros(
  form,
) {
  const proteinGrams = macroValue(
    form.protein_grams,
  )
  const carbGrams = macroValue(
    form.carb_grams,
  )
  const fatGrams = macroValue(
    form.fat_grams,
  )

  return String(
    proteinGrams * 4 +
      carbGrams * 4 +
      fatGrams * 9,
  )
}
