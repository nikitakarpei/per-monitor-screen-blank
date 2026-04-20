import ts from "typescript";
import type { Rule } from "eslint";
import { ESLintUtils } from "@typescript-eslint/utils";

const { RuleCreator, getParserServices } = ESLintUtils;

const createRule = RuleCreator(
  (ruleName: string) =>
    `https://github.com/your-org/eslint-plugin-must-use/blob/main/docs/${ruleName}.md`
);

// Structured logging utility - disabled by default
const log = {
  debug: (...args: unknown[]) => {
    // Disabled by default; enable via DEBUG env var for troubleshooting
    if (process.env.DEBUG?.includes("eslint-plugin-must-use")) {
      console.debug("[no-ignored-return]", ...args);
    }
  },
} as const;

function isThenable(checker: ts.TypeChecker, type: ts.Type): boolean {
  // A type is thenable (Promise-like) if it has a callable `then` method.
  // This catches Promise, Thenable, and custom promise implementations
  // that the string-prefix check would miss.
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

// Methods on stdlib collection types whose return values are idiomatically ignored.
// These APIs return `this` or metadata (length, boolean) for chaining — callers
// never need the value, and the signatures can't be changed.
const STDLIB_COLLECTION_EXEMPT: Readonly<Record<string, ReadonlySet<string>>> = {
  Array: new Set(["push", "unshift", "splice", "fill", "copyWithin", "sort", "reverse"]),
  Map: new Set(["set", "delete", "clear"]),
  Set: new Set(["add", "delete", "clear"]),
  WeakMap: new Set(["set", "delete"]),
  WeakSet: new Set(["add", "delete"]),
};

// Type for the parser services - extracted from context to match actual runtime type
type ParserServices = ReturnType<typeof getParserServices>;

function isStdlibCollectionCall(
  node: Rule.Node,
  program: ts.Program,
  checker: ts.TypeChecker,
  esTreeNodeToTSNodeMap: ParserServices['esTreeNodeToTSNodeMap'],
): boolean {
  // Type assertions needed because Rule.Node lacks ESTree-specific properties under Node16
  const callNode = node as { callee: { type: string; property: { type: string; name: string }; object: unknown } };
  const callee = callNode.callee;
  if (callee.type !== "MemberExpression") return false;
  if (callee.property.type !== "Identifier") return false;
  const methodName = callee.property.name;

  const receiverTsNode = esTreeNodeToTSNodeMap.get(callee.object);
  if (!receiverTsNode) return false;

  let receiverType = checker.getTypeAtLocation(receiverTsNode);

  // Optional chains produce T | undefined — unwrap to check the real receiver type
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

  // Confirm the type comes from TypeScript's own lib, not a project class named "Map"
  const declarations = symbol.getDeclarations();
  return declarations?.some((d) => program.isSourceFileDefaultLibrary(d.getSourceFile())) ?? false;
}

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
  create(context: { report: (options: { node: Rule.Node; messageId: string; data: { type: string } }) => void }) {
    const services = getParserServices(context as Parameters<ReturnType<typeof RuleCreator>>[0]);
    const checker = services.program.getTypeChecker();

    function checkCall(node: Rule.Node) {
      // Skip super() calls — the return value is always `this` which is already bound
      const callNode = node as { callee?: { type: string } };
      if (callNode.callee?.type === "Super") return;

      if (isStdlibCollectionCall(node, services.program, checker, services.esTreeNodeToTSNodeMap)) return;

      const signature = services.getResolvedSignature(node);
      if (!signature) return;

      const returnType = checker.getReturnTypeOfSignature(signature);

      // Skip thenables — no-floating-promises handles those
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
      // foo()  ← bare call as expression statement
      "ExpressionStatement > CallExpression"(node: Rule.Node) {
        checkCall(node);
      },
      // foo?.()  ← optional call as expression statement
      "ExpressionStatement > ChainExpression > CallExpression"(node: Rule.Node) {
        checkCall(node);
      },
    };
  },
});
