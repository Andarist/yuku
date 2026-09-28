import { expect, test } from "bun:test";
import { decode } from "../../npm/yuku-parser/decode.js";

const headerBytes = 44;
const nodeBytes = 48;

function programBuffer(extra: number[] = []): ArrayBuffer {
    const buffer = new ArrayBuffer(headerBytes + nodeBytes + extra.length * 4);
    const words = new Int32Array(buffer);
    words[0] = 1;
    words[1] = extra.length;
    words[8] = 0;
    words[12] = 0;
    words[13] = extra.length;
    words.set(extra, (headerBytes + nodeBytes) / 4);
    return buffer;
}

test("rejects impossible section counts before allocating node storage", () => {
    // a minimal transfer header must not turn an untrusted count into a multi-gigabyte allocation
    const buffer = new ArrayBuffer(headerBytes);
    const header = new Int32Array(buffer);
    header[0] = 0x7fff_ffff;
    header[8] = 0;

    expect(() => decode(buffer, "")).toThrow("yuku: invalid AST buffer");
});

test("rejects malformed nodes during lazy AST materialization", () => {
    // exercise every index boundary used by recursive and iterative materialization
    const invalidTag = programBuffer();
    new Uint8Array(invalidTag)[headerBytes] = 255;
    expect(() => decode(invalidTag, "").program).toThrow("yuku: invalid AST buffer");

    const invalidRange = programBuffer();
    new Int32Array(invalidRange)[13] = 1;
    expect(() => decode(invalidRange, "").program).toThrow("yuku: invalid AST buffer");

    expect(() => decode(programBuffer([1]), "").program).toThrow("yuku: invalid AST buffer");
    expect(() => decode(programBuffer([0]), "").program).toThrow("yuku: cyclic AST buffer");
});
