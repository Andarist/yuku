import { expect, test } from "bun:test";
import { Analyzer } from "yuku-analyzer";

const fixture = "test/parser/misc/deep-concat-chain.js";
const calls = 148;

test("materializes a deeply nested AST with stable node identity", async () => {
    // force lazy AST decoding, then compare its root identifier with the semantic view
    const source = await Bun.file(fixture).text();
    const module = new Analyzer().addFile(fixture, source);
    const statement = module.ast.body[0];
    if (statement?.type !== "ExpressionStatement") {
        throw new Error("expected an expression statement");
    }

    let expression = statement.expression;
    for (let call = 0; call < calls; call++) {
        if (expression.type !== "CallExpression") {
            throw new Error(`expected call ${call + 1}`);
        }
        if (expression.callee.type !== "MemberExpression") {
            throw new Error(`expected member callee ${call + 1}`);
        }
        expression = expression.callee.object;
    }

    if (expression.type !== "Identifier") {
        throw new Error("expected root identifier");
    }
    expect(expression.name).toBe("chain");
    expect(module.referenceOf(expression)?.node).toBe(expression);
});

test("finds parents in an AST deeper than the JavaScript stack", () => {
    // materialize 5,000 nested calls, then build every structural parent iteratively
    const deepCalls = 5_000;
    const source = `chain${".concat(chain)".repeat(deepCalls)};`;
    const module = new Analyzer().addFile("deep.js", source);
    const statement = module.ast.body[0];
    if (statement?.type !== "ExpressionStatement") {
        throw new Error("expected an expression statement");
    }

    let expression = statement.expression;
    for (let call = 0; call < deepCalls; call++) {
        if (expression.type !== "CallExpression") {
            throw new Error(`expected call ${call + 1}`);
        }
        if (expression.callee.type !== "MemberExpression") {
            throw new Error(`expected member callee ${call + 1}`);
        }
        expression = expression.callee.object;
    }
    if (expression.type !== "Identifier") {
        throw new Error("expected root identifier");
    }

    expect(module.parentOf(expression)?.type).toBe("MemberExpression");
});
