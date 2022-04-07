import { AtRule, Node } from 'postcss';
import { Container } from 'postcss-selector-parser';

import { JitState } from '..';

function isAtRule(node: Node): node is AtRule {
  return node.type === 'atrule';
}

export default function getVariants(state: JitState): Record<string, string | null> {
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

    const classNameParser = state.modules.postcssSelectorParser.module(
      (selectors) =>
        (selectors.first as Container).filter(({ type }) => type === 'class').pop()!.value,
    );

    const definitions: string[] = [];

    for (const fn of fns) {
      let definition: string | null | undefined;
      const container = root.clone();
      const returnValue = fn({
        container,
        separator: state.separator,
        modifySelectors(modifierFunction) {
          root.each((rule) => {
            if (rule.type !== 'rule') {
              return;
            }

            // eslint-disable-next-line no-param-reassign
            rule.selectors = rule.selectors.map((selector) =>
              modifierFunction({
                get className() {
                  return classNameParser.transformSync(selector);
                },
                selector,
              }),
            );
          });
          return root;
        },
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
