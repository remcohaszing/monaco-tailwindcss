import { State, Variant } from '@tailwindcss/language-service';

// from https://github.com/tailwindlabs/tailwindcss-intellisense/blob/main/packages/tailwindcss-language-server/src/projects.ts#L1366
export function getVariants(state: State): Array<Variant> {
  if (!state.designSystem) {
    return [];
  }
  const variants = Array.from(state.designSystem.getVariants());

  const prefix = state.designSystem.theme.prefix ?? '';
  if (prefix.length > 0) {
    variants.unshift({
      name: prefix,
      values: [],
      isArbitrary: false,
      hasDash: true,
      selectors: () => ['&'],
    });
  }

  return variants.map<Variant>(variant => ({
    ...variant,
    selectors(a) {
      if (!a) {
        return [variant.name];
      }
      const { value, label } = a;
      return variant.selectors({
        value,
        modifier: label,
      });
    },
  }));
}
