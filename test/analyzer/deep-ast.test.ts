import { expect, test } from "bun:test";
import { Analyzer } from "yuku-analyzer";

const fixture = "test/parser/misc/deep-concat-chain.js";

test("materializes a deeply nested AST with stable node identity", async () => {
    // force lazy AST decoding, then compare its root identifier with the semantic view
    const source = await Bun.file(fixture).text();
    const module = new Analyzer().addFile(fixture, source);
    const statement = module.ast.body[0];
    if (statement?.type !== "ExpressionStatement") {
        throw new Error("expected an expression statement");
    }

    let expression = statement.expression;
    let calls = 0;
    while (expression.type === "CallExpression") {
        if (expression.callee.type !== "MemberExpression") {
            throw new Error(`expected member callee ${calls + 1}`);
        }
        expression = expression.callee.object;
        calls++;
    }

    expect(calls).toBe(148);
    if (expression.type !== "Identifier") {
        throw new Error("expected root identifier");
    }
    expect(expression.name).toBe("chain");
    expect(module.referenceOf(expression)?.node).toBe(expression);
});
