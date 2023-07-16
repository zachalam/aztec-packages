// COPY_PASTE FNS_DATA FROM THE CONSOLE, to enable small tweaks and experimentation, to break the kernel!
// Note: you'll need to delete all instances of `[Object]` from the call_stack items, after pasting.
// You'll also need to instate line 10 of index.ts (`context.fns_data = PASTED_FNS_DATA;`)

export const PASTED_FNS_DATA = {
  fn_a: {
    fn_name: 'fn_a',
    public_inputs: {
      fn_name: 'fn_a',
      start_counter: 0,
      end_counter: 9,
      start_frame_counter: 1,
      end_frame_counter: 6,
      reads: [
        { counter: 1, slot: 'x', commitment: 'x_0_db', is_final: true },
        { counter: 7, slot: 'x', commitment: 'x_2', is_final: false },
      ],
      nullifications: [
        {
          counter: 2,
          slot: 'x',
          commitment: 'x_0_db',
          nullification_ptr: 0,
        },
        {
          counter: 8,
          slot: 'x',
          commitment: 'x_2',
          nullification_ptr: 1,
        },
      ],
      writes: [
        { counter: 3, slot: 'x', commitment: 'x_1', is_final: false },
        { counter: 9, slot: 'x', commitment: 'x_3', is_final: true },
      ],
      call_stack: [
        {
          fn_name: 'fn_b',
          start_counter: 3,
          end_counter: 6,
          start_frame_counter: 2,
          end_frame_counter: 5,
          reads: [],
          nullifications: [],
          writes: [],
          call_stack: [],
        },
      ],
    },
  },
  fn_b: {
    fn_name: 'fn_b',
    public_inputs: {
      fn_name: 'fn_b',
      start_counter: 3,
      end_counter: 6,
      start_frame_counter: 2,
      end_frame_counter: 5,
      reads: [],
      nullifications: [],
      writes: [],
      call_stack: [
        {
          fn_name: 'fn_c',
          start_counter: 3,
          end_counter: 6,
          start_frame_counter: 3,
          end_frame_counter: 4,
          reads: [],
          nullifications: [],
          writes: [],
          call_stack: [],
        },
      ],
    },
  },
  fn_c: {
    fn_name: 'fn_c',
    public_inputs: {
      fn_name: 'fn_c',
      start_counter: 3,
      end_counter: 6,
      start_frame_counter: 3,
      end_frame_counter: 4,
      reads: [{ counter: 4, slot: 'x', commitment: 'x_1', is_final: false }],
      nullifications: [
        {
          counter: 5,
          slot: 'x',
          commitment: 'x_1',
          nullification_ptr: 0,
        },
      ],
      writes: [{ counter: 6, slot: 'x', commitment: 'x_2', is_final: false }],
      call_stack: [],
    },
  },
};

// export const PASTED_FNS_DATA =
// {
//   fn_a: {
//     fn_name: 'fn_a',
//     public_inputs: {
//       fn_name: 'fn_a',
//       start_counter: 0,
//       end_counter: 18,
//       start_frame_counter: 1,
//       end_frame_counter: 6,
//       reads: [
//         { counter: 1, slot: 'x', commitment: 'x_0_db', is_final: true },
//         { counter: 3, slot: 'x', commitment: 'x_1_db', is_final: true },
//       ],
//       nullifications: [
//         {
//           counter: 2,
//           slot: 'x',
//           commitment: 'x_0_db',
//           nullification_ptr: 0,
//         },
//         {
//           counter: 4,
//           slot: 'x',
//           commitment: 'x_1_db',
//           nullification_ptr: 1,
//         },
//       ],
//       writes: [
//         { counter: 5, slot: 'y', commitment: 'y_0', is_final: true },
//         { counter: 6, slot: 'x', commitment: 'x_2', is_final: false },
//       ],
//       call_stack: [
//         {
//           fn_name: 'fn_b',
//           start_counter: 6,
//           end_counter: 18,
//           start_frame_counter: 2,
//           end_frame_counter: 5,
//           reads: [],
//           nullifications: [],
//           writes: [],
//           call_stack: [],
//         },
//       ],
//     },
//   },
//   fn_b: {
//     fn_name: 'fn_b',
//     public_inputs: {
//       fn_name: 'fn_b',
//       start_counter: 6,
//       end_counter: 18,
//       start_frame_counter: 2,
//       end_frame_counter: 5,
//       reads: [
//         { counter: 7, slot: 'x', commitment: 'x_2', is_final: false },
//         { counter: 9, slot: 'x', commitment: 'x_3_db', is_final: true },
//       ],
//       nullifications: [
//         {
//           counter: 8,
//           slot: 'x',
//           commitment: 'x_2',
//           nullification_ptr: 0,
//         },
//         {
//           counter: 10,
//           slot: 'x',
//           commitment: 'x_3_db',
//           nullification_ptr: 1,
//         },
//       ],
//       writes: [
//         { counter: 11, slot: 'y', commitment: 'y_1', is_final: true },
//         { counter: 12, slot: 'x', commitment: 'x_4', is_final: false },
//       ],
//       call_stack: [
//         {
//           fn_name: 'fn_c',
//           start_counter: 12,
//           end_counter: 18,
//           start_frame_counter: 3,
//           end_frame_counter: 4,
//           reads: [],
//           nullifications: [],
//           writes: [],
//           call_stack: [],
//         },
//       ],
//     },
//   },
//   fn_c: {
//     fn_name: 'fn_c',
//     public_inputs: {
//       fn_name: 'fn_c',
//       start_counter: 12,
//       end_counter: 18,
//       start_frame_counter: 3,
//       end_frame_counter: 4,
//       reads: [
//         { counter: 13, slot: 'x', commitment: 'x_4', is_final: false },
//         {
//           counter: 15,
//           slot: 'x',
//           commitment: 'x_5_db',
//           is_final: true,
//         },
//       ],
//       nullifications: [
//         {
//           counter: 14,
//           slot: 'x',
//           commitment: 'x_4',
//           nullification_ptr: 0,
//         },
//         {
//           counter: 16,
//           slot: 'x',
//           commitment: 'x_5_db',
//           nullification_ptr: 1,
//         },
//       ],
//       writes: [
//         { counter: 17, slot: 'y', commitment: 'y_2', is_final: true },
//         { counter: 18, slot: 'x', commitment: 'x_6', is_final: true },
//       ],
//       call_stack: [],
//     },
//   },
// };
