import { Contract } from './types.js';

export const eg_1: Contract = {
  fns: {
    // ALWAYS start with an `init` as a way of making the initial call to a fn.
    init: [
      {
        type: 'call',
        fn_name: 'fn_a',
      },
    ],

    fn_a: [
      {
        type: 'read',
        slot: 'x',
        commitment: 'x_0_db',
        is_final: true,
      },
      {
        type: 'nullify',
        slot: 'x',
        nullification_ptr: 0, // the 1st read of this call
        commitment: 'x_0_db',
      },
      {
        type: 'write',
        slot: 'x',
        commitment: 'x_1',
        is_final: false,
      },
      {
        type: 'call',
        fn_name: 'fn_b',
      },
      {
        type: 'read',
        slot: 'x',
        commitment: 'x_2',
        is_final: false,
      },
      {
        type: 'nullify',
        slot: 'x',
        nullification_ptr: 1, // the 2nd read of this call.
        commitment: 'x_2',
      },
      {
        type: 'write',
        slot: 'x',
        commitment: 'x_3',
        is_final: true,
      },
    ],

    fn_c: [
      {
        type: 'read',
        slot: 'x',
        commitment: 'x_1',
        is_final: false,
      },
      {
        type: 'nullify',
        slot: 'x',
        nullification_ptr: 0, // the 1st read of this call
        commitment: 'x_1',
      },
      {
        type: 'write',
        slot: 'x',
        commitment: 'x_2',
        is_final: false,
      },
    ],

    fn_b: [
      {
        type: 'call',
        fn_name: 'fn_c',
      },
    ],
  },
};
