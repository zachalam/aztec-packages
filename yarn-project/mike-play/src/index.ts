import { PASTED_FNS_DATA } from './pasted-fns-data.js';
import { eg_1 } from './eg-1.js';
import { eg_2 } from './eg-2.js';
import { execute } from './execute.js';
import { kernel } from './kernel.js';
import { Context, Contract, KernelInputs, AccKernelData } from './types.js';

function run(fns: Contract) {
  let context: Context = execute(fns);
  // context.fns_data = PASTED_FNS_DATA; // <----- YOU CAN COMMENT-OUT THIS IF YOU WANT TO EXPLORE SMALL TWEAKS TO SOME CONSOLE-LOGGED FNS_DATA

  let kernel_inputs: KernelInputs = {
    is_first_kernel_iteration: true,
    is_last_kernel_iteration: false,
  };

  let acc_kernel_data: AccKernelData = {
    final_reads: [],
    final_nullifications: [],
    final_writes: [],
    transient_reads: [],
    transient_nullifications: [],
    transient_writes: [],
  };

  let num_fns = 0;
  for (const fn_name in context.fns_data) {
    ++num_fns;
  }
  if (num_fns == 0) throw new Error('You need to execute at least 1 function!');

  // DO KERNEL ITERATIONS:
  let fn_count = 1;
  for (const fn_name in context.fns_data) {
    kernel_inputs.is_first_kernel_iteration = fn_count == 1;
    kernel_inputs.is_last_kernel_iteration = fn_count == num_fns;

    const fn_data = context.fns_data[fn_name];

    kernel(fn_data, kernel_inputs, acc_kernel_data);

    ++fn_count;
  }
}

run(eg_1); // <----- YOU CAN EDIT THIS. Sorry for not setting up tests to do this yet!
