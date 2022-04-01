import { fromRatio, names as namedColors } from '@ctrl/tinycolor';
import { editor, IPosition, IRange, languages } from 'monaco-editor/esm/vs/editor/editor.api.js';
import { CompletionContext, CompletionTriggerKind } from 'vscode-languageserver-protocol';
import * as ls from 'vscode-languageserver-types';

import { WorkerAccessor } from './workerManager';

function lsRangeToMonacoRange(range: ls.Range): IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

function lsColorInformationToMonacoColorInformation(
  color: ls.ColorInformation,
): languages.IColorInformation {
  return {
    color: color.color,
    range: lsRangeToMonacoRange(color.range),
  };
}

function lsHoverToMonacoHover(hover: ls.Hover): languages.Hover {
  const contents = [hover.contents].flat();

  return {
    contents: contents.map((content) => ({
      value:
        typeof content === 'string'
          ? content
          : 'language' in content
          ? `\`\`\`${content.language}\n${content.value}\n\`\`\``
          : content.value,
    })),
    range: hover.range ? lsRangeToMonacoRange(hover.range) : undefined,
  };
}

function monacoPositionToLsPosition(position: IPosition): ls.Position {
  return {
    line: position.lineNumber - 1,
    character: position.column - 1,
  };
}

function monacoCompletionTriggerKindToLsCompletionTriggerKind(
  completionTriggerKind: languages.CompletionTriggerKind,
): CompletionTriggerKind {
  switch (completionTriggerKind) {
    // Invoke
    case 0:
      return 1;
    // TriggerCharacter
    case 1:
      return 2;
    // TriggerForIncompleteCompletions
    default:
      return 3;
  }
}

function lsCompletionItemKindToMonacoCompletionItemKind(
  completionItemKind: ls.CompletionItemKind,
): languages.CompletionItemKind {
  switch (completionItemKind) {
    // Text
    case 1:
      return 18;
    // Method
    case 2:
      return 0;
    // Function
    case 3:
      return 1;
    // Constructor
    case 4:
      return 2;
    // Field
    case 5:
      return 3;
    // Variable
    case 6:
      return 4;
    // Class
    case 7:
      return 5;
    // Interface
    case 8:
      return 7;
    // Module
    case 9:
      return 8;
    // Property
    case 10:
      return 9;
    // Unit
    case 11:
      return 12;
    // Value
    case 12:
      return 13;
    // Enum
    case 13:
      return 15;
    // Keyword
    case 14:
      return 17;
    // Snippet
    case 15:
      return 27;
    // Color
    case 16:
      return 19;
    // File
    case 17:
      return 20;
    // Reference
    case 18:
      return 21;
    // Folder
    case 19:
      return 23;
    // EnumMember
    case 20:
      return 16;
    // Constant
    case 21:
      return 14;
    // Struct
    case 22:
      return 6;
    // Event
    case 23:
      return 10;
    // Operator
    case 24:
      return 11;
    // TypeParameter
    default:
      return 24;
  }
}

function monacoCompletionItemKindToLsCompletionItemKind(
  completionItemKind: languages.CompletionItemKind,
): ls.CompletionItemKind {
  switch (completionItemKind) {
    // Text
    case 18:
      return 1;
    // Method
    case 0:
      return 2;
    // Function
    case 1:
      return 3;
    // Constructor
    case 2:
      return 4;
    // Field
    case 3:
      return 5;
    // Variable
    case 4:
      return 6;
    // Class
    case 5:
      return 7;
    // Interface
    case 7:
      return 8;
    // Module
    case 8:
      return 9;
    // Property
    case 9:
      return 10;
    // Unit
    case 12:
      return 11;
    // Value
    case 13:
      return 12;
    // Enum
    case 15:
      return 13;
    // Keyword
    case 17:
      return 14;
    // Snippet
    case 27:
      return 15;
    // Color
    case 19:
      return 16;
    // File
    case 20:
      return 17;
    // Reference
    case 21:
      return 18;
    // Folder
    case 23:
      return 19;
    // EnumMember
    case 16:
      return 20;
    // Constant
    case 14:
      return 21;
    // Struct
    case 6:
      return 22;
    // Event
    case 10:
      return 23;
    // Operator
    case 11:
      return 24;
    // TypeParameter
    default:
      return 25;
  }
}

function monacoCompletionContextToLsCompletionContext(
  completionContext: languages.CompletionContext,
): CompletionContext {
  return {
    triggerKind: monacoCompletionTriggerKindToLsCompletionTriggerKind(
      completionContext.triggerKind,
    ),
    triggerCharacter: completionContext.triggerCharacter,
  };
}

function lsCommandToMonacoCommand(command: ls.Command): languages.Command {
  return {
    title: command.title,
    id: command.command,
    arguments: command.arguments,
  };
}

function lsCompletionItemToMonacoCompletionItem(
  completionItem: ls.CompletionItem,
): languages.CompletionItem {
  return {
    label: completionItem.label,
    kind: lsCompletionItemKindToMonacoCompletionItemKind(completionItem.kind!),
    tags: completionItem.tags,
    detail: completionItem.detail,
    documentation:
      completionItem.documentation && typeof completionItem.documentation === 'object'
        ? { value: completionItem.documentation.value }
        : completionItem.documentation,
    sortText: completionItem.sortText,
    filterText: completionItem.filterText,
    preselect: completionItem.preselect,
    insertText: completionItem.insertText ?? completionItem.label,
    // @ts-expect-error XXX we need a fallback range here.
    range:
      completionItem.textEdit &&
      lsRangeToMonacoRange(
        'range' in completionItem.textEdit
          ? completionItem.textEdit.range
          : completionItem.textEdit.replace,
      ),
    command: completionItem.command && lsCommandToMonacoCommand(completionItem.command),
    commitCharacters: completionItem.commitCharacters,
  };
}

function monacoCompletionItemToLsCompletionItem(
  completionItem: languages.CompletionItem,
): ls.CompletionItem {
  return {
    label:
      typeof completionItem.label === 'string' ? completionItem.label : completionItem.label.label,
    data: [completionItem.label],
    kind: monacoCompletionItemKindToLsCompletionItemKind(completionItem.kind),
    tags: completionItem.tags as undefined,
    detail: completionItem.detail,
    documentation:
      completionItem.documentation && typeof completionItem.documentation === 'object'
        ? { value: completionItem.documentation.value, kind: 'markdown' }
        : completionItem.documentation,
    sortText: completionItem.sortText,
    filterText: completionItem.filterText,
    preselect: completionItem.preselect,
    insertText: completionItem.insertText,
  };
}

function lsCompletionListToMonacoCompletionList(
  completionList: ls.CompletionList,
): languages.CompletionList {
  return {
    incomplete: completionList.isIncomplete,
    suggestions: completionList.items.map(lsCompletionItemToMonacoCompletionItem),
  };
}

const colorNames = Object.values(namedColors);
const editableColorRegex = new RegExp(
  `-\\[(${colorNames.join('|')}|((?:#|rgba?\\(|hsla?\\())[^\\]]+)\\]$`,
);
const stylesheet = document.createElement('style');
document.head.append(stylesheet);

function colorValueToHex(value: number): string {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, '0');
}

function createColorClass(color: languages.IColor): string {
  const hex = `${colorValueToHex(color.red)}${colorValueToHex(color.green)}${colorValueToHex(
    color.blue,
  )}`;
  const className = `tailwindcss-color-decoration-${hex}`;
  const selector = `.${className}`;
  for (const rule of stylesheet.sheet!.cssRules) {
    if ((rule as CSSStyleRule).selectorText === selector) {
      return className;
    }
  }
  stylesheet.sheet!.insertRule(`${selector}{background-color:#${hex}}`);
  return className;
}

export function createColorProvider(getWorker: WorkerAccessor): languages.DocumentColorProvider {
  const modelMap = new WeakMap<editor.ITextModel, string[]>();

  editor.onWillDisposeModel((model) => {
    modelMap.delete(model);
  });

  return {
    async provideDocumentColors(model) {
      const worker = await getWorker(model.uri);

      const editableColors: languages.IColorInformation[] = [];
      const nonEditableColors: languages.IColorInformation[] = [];
      const colors = await worker.getDocumentColors(String(model.uri), model.getLanguageId());
      for (const lsColor of colors) {
        const monacoColor = lsColorInformationToMonacoColorInformation(lsColor);
        const text = model.getValueInRange(monacoColor.range);
        if (editableColorRegex.test(text)) {
          editableColors.push(monacoColor);
        } else {
          nonEditableColors.push(monacoColor);
        }
      }

      modelMap.set(
        model,
        model.deltaDecorations(
          modelMap.get(model) ?? [],
          nonEditableColors.map(({ color, range }) => ({
            range,
            options: {
              beforeContentClassName: `colorpicker-color-decoration ${createColorClass(color)}`,
            },
          })),
        ),
      );

      return editableColors;
    },

    provideColorPresentations(model, colorInformation) {
      const className = model.getValueInRange(colorInformation.range);
      const match = new RegExp(
        `-\\[(${colorNames.join('|')}|(?:(?:#|rgba?\\(|hsla?\\())[^\\]]+)\\]$`,
        'i',
      ).exec(className);

      if (!match) {
        return [];
      }

      const [currentColor] = match;

      const isNamedColor = colorNames.includes(currentColor);
      const color = fromRatio({
        r: colorInformation.color.red,
        g: colorInformation.color.green,
        b: colorInformation.color.blue,
        a: colorInformation.color.alpha,
      });

      let hexValue = color.toHex8String(
        !isNamedColor && (currentColor.length === 4 || currentColor.length === 5),
      );
      if (hexValue.length === 5) {
        hexValue = hexValue.replace(/f$/, '');
      } else if (hexValue.length === 9) {
        hexValue = hexValue.replace(/ff$/, '');
      }

      const rgbValue = color.toRgbString().replace(/ /g, '');
      const hslValue = color.toHslString().replace(/ /g, '');
      const prefix = className.slice(0, Math.max(0, match.index));

      return [
        { label: `${prefix}-[${hexValue}]` },
        { label: `${prefix}-[${rgbValue}]` },
        { label: `${prefix}-[${hslValue}]` },
      ];
    },
  };
}

export function createHoverProvider(getWorker: WorkerAccessor): languages.HoverProvider {
  return {
    async provideHover(model, position) {
      const worker = await getWorker(model.uri);

      const hover = await worker.doHover(
        String(model.uri),
        model.getLanguageId(),
        monacoPositionToLsPosition(position),
      );

      return hover && lsHoverToMonacoHover(hover);
    },
  };
}

export function createCompletionItemProvider(
  getWorker: WorkerAccessor,
): languages.CompletionItemProvider {
  return {
    async provideCompletionItems(model, position, context) {
      const worker = await getWorker(model.uri);

      const completionList = await worker.doComplete(
        String(model.uri),
        model.getLanguageId(),
        monacoPositionToLsPosition(position),
        monacoCompletionContextToLsCompletionContext(context),
      );

      return completionList && lsCompletionListToMonacoCompletionList(completionList);
    },

    async resolveCompletionItem(item) {
      const worker = await getWorker();

      const result = await worker.resolveCompletionItem(
        monacoCompletionItemToLsCompletionItem(item),
      );

      return lsCompletionItemToMonacoCompletionItem(result);
    },
  };
}
