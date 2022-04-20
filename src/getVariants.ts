import postcss, { AtRule, Node } from 'postcss';
import postcssSelectorParser from 'postcss-selector-parser';

import { JitState } from './types';

function isAtRule(node: Node): node is AtRule {
  return node.type === 'atrule';
}

function escape(className: string): string {
  const node = postcssSelectorParser.className({ value: className });
  return node.value;
}

export function getVariants(state: JitState): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [variantName, variantIdsAndFns] of state.jitContext.variantMap) {
    const placeholder = '__variant_placeholder__';

    const root = postcss.root({
      nodes: [
        postcss.rule({
          selector: `.${escape(placeholder)}`,
          nodes: [],
        }),
      ],
    });

    const definitions: string[] = [];

    for (const [, fn] of variantIdsAndFns) {
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
