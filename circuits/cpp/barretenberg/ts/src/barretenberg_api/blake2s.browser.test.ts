import { expect } from "@esm-bundle/chai";
import { Fr } from '../types/index.js';
import { newBarretenbergApiSync } from '../factory/index.js';
import { BarretenbergApiSync } from './index.js';
// import { is } from 'uvu/assert';
// import loglevel from "loglevel";

// const log = loglevel.getLogger("blake2s");
// log.setDefaultLevel("DEBUG");


describe('blake2s', () => {
  let api: BarretenbergApiSync;

  before(async () => {
    api = await newBarretenbergApiSync();
  });

  after(async () => {
    await api.destroy();
  });

  it('blake2s', () => {
    const encoder = new TextEncoder();
    const input = encoder.encode('abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789');
    const expected = new Uint8Array([
      0x44, 0xdd, 0xdb, 0x39, 0xbd, 0xb2, 0xaf, 0x80, 0xc1, 0x47, 0x89, 0x4c, 0x1d, 0x75, 0x6a, 0xda, 0x3d, 0x1c, 0x2a,
      0xc2, 0xb1, 0x00, 0x54, 0x1e, 0x04, 0xfe, 0x87, 0xb4, 0xa5, 0x9e, 0x12, 0x43,
    ]);
    const result = api.blake2s(input);
    expect(result.buffer).to.deep.equal(expected);
  });

  it('blake2sToField', () => {
    const encoder = new TextEncoder();
    const input = encoder.encode('abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789');
    const expected = Fr.fromBufferReduce(
      new Uint8Array([
        0x44, 0xdd, 0xdb, 0x39, 0xbd, 0xb2, 0xaf, 0x80, 0xc1, 0x47, 0x89, 0x4c, 0x1d, 0x75, 0x6a, 0xda, 0x3d, 0x1c,
        0x2a, 0xc2, 0xb1, 0x00, 0x54, 0x1e, 0x04, 0xfe, 0x87, 0xb4, 0xa5, 0x9e, 0x12, 0x43,
      ]),
    );
    const result = api.blake2sToField(input);
    expect(result).to.deep.equal(expected);
  });
});
