import { State } from 'tailwindcss-language-service';
import { AtRule, Container, Node } from 'postcss'

function isAtRule(node: Node): node is AtRule {
  return node.type === 'atrule'
}

export default function getVariants(state: State): Record<string, string> {
  function escape(className: string): string {
    let node = state.modules.postcssSelectorParser.module.className()
    node.value = className
    return node.raws?.value ?? node.value
  }

  let result = {}
  // [name, [sort, fn]]
  // [name, [[sort, fn]]]
  Array.from(state.jitContext.variantMap as Map<string, [any, any]>).forEach(
    ([variantName, variantFnOrFns]) => {
      let fns = (Array.isArray(variantFnOrFns[0]) ? variantFnOrFns : [variantFnOrFns]).map(
        ([_sort, fn]) => fn
      )

      let placeholder = '__variant_placeholder__'

      let root = state.modules.postcss.module.root({
        nodes: [
          state.modules.postcss.module.rule({
            selector: `.${escape(placeholder)}`,
            nodes: [],
          }),
        ],
      })

      let classNameParser = state.modules.postcssSelectorParser.module((selectors) => {
        return selectors.first.filter(({ type }) => type === 'class').pop().value
      })

      function getClassNameFromSelector(selector) {
        return classNameParser.transformSync(selector)
      }

      function modifySelectors(modifierFunction) {
        root.each((rule) => {
          if (rule.type !== 'rule') {
            return
          }

          rule.selectors = rule.selectors.map((selector) => {
            return modifierFunction({
              get className() {
                return getClassNameFromSelector(selector)
              },
              selector,
            })
          })
        })
        return root
      }

      let definitions = []

      for (let fn of fns) {
        let definition: string
        let container = root.clone()
        let returnValue = fn({
          container,
          separator: state.separator,
          modifySelectors,
          format: (def: string) => {
            definition = def.replace(/:merge\(([^)]+)\)/g, '$1')
          },
          wrap: (rule: Container) => {
            if (isAtRule(rule)) {
              definition = `@${rule.name} ${rule.params}`
            }
          },
        })

        if (!definition) {
          definition = returnValue
        }

        if (definition) {
          definitions.push(definition)
          continue
        }

        container.walkDecls((decl) => {
          decl.remove()
        })

        definition = container
          .toString()
          .replace(`.${escape(`${variantName}:${placeholder}`)}`, '&')
          .replace(/(?<!\\)[{}]/g, '')
          .replace(/\s*\n\s*/g, ' ')
          .trim()

        if (!definition.includes(placeholder)) {
          definitions.push(definition)
        }
      }

      result[variantName] = definitions.join(', ') || null
    }
  )
  return result
}
