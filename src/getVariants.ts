import { AtRule, Node } from 'postcss';

import { JitState } from './types';

function isAtRule(node: Node): node is AtRule {
  return node.type === 'atrule';
}

export function getVariants(state: JitState): Record<string, string | null> {
  function escape(className: string): string {
    const node = state.modules.postcssSelectorParser.module.className({ value: className });
    return node.value;
  }

  const result: Record<string, string | null> = {};
  for (const [variantName, variantIdsAndFns] of state.jitContext.variantMap) {
    const fns = variantIdsAndFns.map(([, fn]) => fn);

    const placeholder = '__variant_placeholder__';

    const root = state.modules.postcss.module.root({
      nodes: [
        state.modules.postcss.module.rule({
          selector: `.${escape(placeholder)}`,
          nodes: [],
        }),
      ],
    });

    const definitions: string[] = [];

    for (const fn of fns) {
      let definition: string | undefined;
      const container = root.clone();
      const returnValue = fn({
        container,
        separator: state.separator!,
        format(def) {
          definition = def.replace(/:merge\(([^)]+)\)/g, '$1');
        },
        wrap(rule) {
          if (isAtRule(rule)) {
            definition = `@${rule.name} ${rule.params}`;
          }
        },
      });

      if (!definition) {
        definition = returnValue;
      }

      if (definition) {
        definitions.push(definition);
        continue;
      }

      container.walkDecls((decl) => {
        decl.remove();
      });

      definition = String(container)
        .replace(`.${escape(`${variantName}:${placeholder}`)}`, '&')
        .replace(/(?<!\\)[{}]/g, '')
        .replace(/\s*\n\s*/g, ' ')
        .trim();

      if (!definition.includes(placeholder)) {
        definitions.push(definition);
      }
    }

    result[variantName] = definitions.join(', ') || null;
  }

  return result;
}
