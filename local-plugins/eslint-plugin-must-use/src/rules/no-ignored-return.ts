import ts from "typescript";
import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";
import type { ParserServicesWithTypeInformation } from "@typescript-eslint/typescript-estree";

const { RuleCreator, getParserServices } = ESLintUtils;

const createRule = RuleCreator(
  (ruleName: string) =>
    `https://github.com/your-org/eslint-plugin-must-use/blob/main/docs/${ruleName}.md`
);

const log = {
  debug: (...args: unknown[]) => {
    if (process.env.DEBUG?.includes("eslint-plugin-must-use")) {
      console.debug("[no-ignored-return]", ...args);
    }
  },
} as const;

function isThenable(checker: ts.TypeChecker, type: ts.Type): boolean {
  const thenProperty = type.getProperty("then");
  if (!thenProperty) return false;
  const thenType = checker.getTypeOfSymbol(thenProperty);
  return thenType.getCallSignatures().length > 0;
}

function isVoidLike(type: ts.Type): boolean {
  if (type.flags & (ts.TypeFlags.Void | ts.TypeFlags.Undefined | ts.TypeFlags.Never)) {
    return true;
  }
  if (type.isUnion()) {
    return type.types.every((t) => isVoidLike(t));
  }
  return false;
}

const STDLIB_COLLECTION_EXEMPT: Readonly<Record<string, ReadonlySet<string>>> = {
  Array: new Set(["push", "unshift", "splice", "fill", "copyWithin", "sort", "reverse"]),
  Map: new Set(["set", "delete", "clear"]),
  Set: new Set(["add", "delete", "clear"]),
  WeakMap: new Set(["set", "delete"]),
  WeakSet: new Set(["add", "delete"]),
};

type NodeMap = ParserServicesWithTypeInformation["esTreeNodeToTSNodeMap"];

function isStdlibCollectionCall(
  node: TSESTree.CallExpression,
  program: ts.Program,
  checker: ts.TypeChecker,
  esTreeNodeToTSNodeMap: NodeMap,
): boolean {
  if (node.callee.type !== "MemberExpression") return false;
  if (node.callee.property.type !== "Identifier") return false;
  const methodName = node.callee.property.name;

  const receiverTsNode = esTreeNodeToTSNodeMap.get(node.callee.object);
  if (!receiverTsNode) return false;

  let receiverType = checker.getTypeAtLocation(receiverTsNode);

  if (receiverType.isUnion()) {
    const nonNullish = receiverType.types.filter(
      (t) => !(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))
    );
    if (nonNullish.length === 1) {
      receiverType = nonNullish[0];
    } else {
      log.debug(
        "isStdlibCollectionCall: union has multiple non-null members, skipping exemption",
        { unionTypes: checker.typeToString(receiverType) }
      );
    }
  }

  const symbol = receiverType.getSymbol();
  if (!symbol) return false;

  const exemptMethods = STDLIB_COLLECTION_EXEMPT[symbol.getName()];
  if (!exemptMethods?.has(methodName)) return false;

  const declarations = symbol.getDeclarations();
  return declarations?.some((d) => program.isSourceFileDefaultLibrary(d.getSourceFile())) ?? false;
}

type MessageIds = "ignoredReturn";
type Options = readonly [];

export const noIgnoredReturn = createRule({
  name: "no-ignored-return",
  meta: {
    type: "problem",
    docs: {
      description:
        "Require that non-void return values are used, or that the function is changed to return void",
    },
    schema: [],
    messages: {
      ignoredReturn:
        'Return value of type "{{type}}" is ignored. Either use it, or change the function to return void.',
    },
  },
  defaultOptions: [] as const,
  create(context: Readonly<RuleContext<MessageIds, Options>>) {
    const services = getParserServices(context);
    const checker = services.program.getTypeChecker();

    function checkCall(node: TSESTree.CallExpression) {
      if (node.callee.type === "Super") return;

      if (isStdlibCollectionCall(node, services.program, checker, services.esTreeNodeToTSNodeMap)) return;

      const signature = services.getResolvedSignature(node);
      if (!signature) return;

      const returnType = checker.getReturnTypeOfSignature(signature);

      if (isThenable(checker, returnType)) return;

      if (!isVoidLike(returnType)) {
        context.report({
          node,
          messageId: "ignoredReturn",
          data: { type: checker.typeToString(returnType) },
        });
      }
    }

    return {
      "ExpressionStatement > CallExpression"(node: TSESTree.CallExpression) {
        checkCall(node);
      },
      "ExpressionStatement > ChainExpression > CallExpression"(node: TSESTree.CallExpression) {
        checkCall(node);
      },
    };
  },
});
