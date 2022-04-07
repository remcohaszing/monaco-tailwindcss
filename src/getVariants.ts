import { AtRule, Container, Node } from 'postcss';

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
  // [name, [sort, fn]]
  // [name, [[sort, fn]]]
  for (const [variantName, variantFnOrFns] of state.jitContext.variantMap) {
    const fns = (Array.isArray(variantFnOrFns[0]) ? variantFnOrFns : [variantFnOrFns]).map(
      ([_sort, fn]) => fn,
    );

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
      (selectors) => selectors.first.filter(({ type }) => type === 'class').pop().value,
    );

    function getClassNameFromSelector(selector: string) {
      return classNameParser.transformSync(selector);
    }

    function modifySelectors(modifierFunction) {
      root.each((rule) => {
        if (rule.type !== 'rule') {
          return;
        }

        rule.selectors = rule.selectors.map((selector) =>
          modifierFunction({
            get className() {
              return getClassNameFromSelector(selector);
            },
            selector,
          }),
        );
      });
      return root;
    }

    const definitions = [];

    let definition: string | null = null;
    for (const fn of fns) {
      const container = root.clone();
      const returnValue = fn({
        container,
        separator: state.separator,
        modifySelectors,
        format(def: string) {
          definition = def.replace(/:merge\(([^)]+)\)/g, '$1');
        },
        wrap(rule: Container) {
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

      definition = container
        .toString()
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
