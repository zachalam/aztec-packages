import { L2Logs } from './noir_logs.js';

describe('L2Logs', () => {
  it('can encode L2Logs to buffer and back', () => {
    const l2Logs = L2Logs.random(42);

    const buffer = l2Logs.toBuffer();
    const recovered = L2Logs.fromBuffer(buffer);

    expect(recovered).toEqual(l2Logs);
  });
});
