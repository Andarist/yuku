import { expect, test } from "bun:test";
import { parse } from "yuku-parser";

const fixture = "test/parser/misc/deep-concat-chain.js";
const calls = 148;

test("materializes a deeply nested call chain", async () => {
    // verify the complete left-associated shape without recursing in the test
    const source = await Bun.file(fixture).text();
    const program = parse(source).program;
    const statement = program.body[0];
    if (statement?.type !== "ExpressionStatement") {
        throw new Error("expected an expression statement");
    }

    let expression = statement.expression;
    for (let call = 0; call < calls; call++) {
        if (expression.type !== "CallExpression") {
            throw new Error(`expected call ${call + 1}`);
        }
        expect(expression.arguments).toHaveLength(1);
        expect(expression.arguments[0]).toMatchObject({ type: "Identifier", name: "chain" });
        if (expression.callee.type !== "MemberExpression") {
            throw new Error(`expected member callee ${call + 1}`);
        }
        expect(expression.callee.property).toMatchObject({
            type: "Identifier",
            name: "concat",
        });
        expression = expression.callee.object;
    }
    expect(expression).toMatchObject({ type: "Identifier", name: "chain" });
});
