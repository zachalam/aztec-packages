import { Contract, Opcode } from './types.js';

export const eg_2: Contract = {
  fns: {
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
        type: 'read',
        slot: 'x',
        commitment: 'x_1_db',
        is_final: true,
      },
      {
        type: 'nullify',
        slot: 'x',
        nullification_ptr: 1, // the 2nd read of this call
        commitment: 'x_1_db',
      },
      {
        type: 'write',
        slot: 'y',
        commitment: 'y_0',
        is_final: true,
      },
      {
        type: 'write',
        slot: 'x',
        commitment: 'x_2',
        is_final: false,
      },
      {
        type: 'call',
        fn_name: `fn_b`,
      },
    ],

    fn_b: [
      {
        type: 'read',
        slot: 'x',
        commitment: 'x_2',
        is_final: false,
      },
      {
        type: 'nullify',
        slot: 'x',
        nullification_ptr: 0, // the 1st read of this call
        commitment: 'x_2',
      },
      {
        type: 'read',
        slot: 'x',
        commitment: 'x_3_db',
        is_final: true,
      },
      {
        type: 'nullify',
        slot: 'x',
        nullification_ptr: 1, // the 2nd read of this call
        commitment: 'x_3_db',
      },
      {
        type: 'write',
        slot: 'y',
        commitment: 'y_1',
        is_final: true,
      },
      {
        type: 'write',
        slot: 'x',
        commitment: 'x_4',
        is_final: false,
      },
      {
        type: 'call',
        fn_name: `fn_c`,
      },
    ],

    fn_c: [
      {
        type: 'read',
        slot: 'x',
        commitment: 'x_4',
        is_final: false,
      },
      {
        type: 'nullify',
        slot: 'x',
        nullification_ptr: 0, // the 1st read of this call
        commitment: 'x_4',
      },
      {
        type: 'read',
        slot: 'x',
        commitment: 'x_5_db',
        is_final: true,
      },
      {
        type: 'nullify',
        slot: 'x',
        nullification_ptr: 1, // the 2nd read of this call
        commitment: 'x_5_db',
      },
      {
        type: 'write',
        slot: 'y',
        commitment: 'y_2',
        is_final: true,
      },
      {
        type: 'write',
        slot: 'x',
        commitment: 'x_6',
        is_final: true,
      },
    ],
  },
};
