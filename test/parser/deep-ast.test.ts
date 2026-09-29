import { expect, test } from "bun:test";
import type { Node } from "yuku-parser";
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

test("materializes nested type annotations deeper than the JavaScript stack", () => {
    // the parser records a typed identifier before its annotation, so every level here
    // is decoded through the subtree walk rather than the index sweep
    const depth = 5_000;
    const source = `let value: ${"(next: ".repeat(depth)}number${") => void".repeat(depth)};`;
    const program = parse(source, { lang: "ts" }).program;
    const declaration = program.body[0];
    if (declaration?.type !== "VariableDeclaration") {
        throw new Error("expected a variable declaration");
    }

    let identifier: Node | undefined = declaration.declarations[0]?.id;
    for (let level = 0; level < depth; level++) {
        if (identifier?.type !== "Identifier") {
            throw new Error(`expected a typed identifier at level ${level + 1}`);
        }
        const annotation: Node | null | undefined = identifier.typeAnnotation?.typeAnnotation;
        if (annotation?.type !== "TSFunctionType") {
            throw new Error(`expected a function type at level ${level + 1}`);
        }
        identifier = annotation.params[0];
    }
    if (identifier?.type !== "Identifier") {
        throw new Error("expected the innermost parameter");
    }
    expect(identifier.typeAnnotation?.typeAnnotation).toMatchObject({ type: "TSNumberKeyword" });
});
