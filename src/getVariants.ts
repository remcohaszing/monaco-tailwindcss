import postcss, { AtRule, Node } from 'postcss';
import postcssSelectorParser from 'postcss-selector-parser';
import { JitContext } from 'tailwindcss/src/lib/setupContextUtils.js';

function isAtRule(node: Node): node is AtRule {
  return node.type === 'atrule';
}

function escape(className: string): string {
  const node = postcssSelectorParser.className({ value: className });
  return node.value;
}

function removeBrackets(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i += 1) {
    const isBracket = (str[i] === '{' || str[i] === '}') && str[i - 1] !== '\\';
    if (!isBracket) {
      result += str[i];
    }
  }
  return result;
}

export function getVariants(jitContext: JitContext): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [variantName, variantIdsAndFns] of jitContext.variantMap) {
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
        separator: jitContext.tailwindConfig.separator!,
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

      definition = removeBrackets(
        String(container).replace(`.${escape(`${variantName}:${placeholder}`)}`, '&'),
      )
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
