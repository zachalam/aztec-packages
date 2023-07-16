import {
  Context,
  Contract,
  Read,
  Write,
  Nullification,
  FunctionData,
  FinalWrites,
  KernelInputs,
  AccKernelData,
  CounterRange,
} from './types.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/*
 * Noddy kernel circuit, focussing on the topic of squashing with each iteration.
 * Mutates the kernel_data.
 */
export function kernel(fn_data: FunctionData, kernel_inputs: KernelInputs, acc_kernel_data: AccKernelData) {
  console.log('\n\n\n\nIn kernel...');
  console.log('\nfn_data :');
  console.dir(fn_data, { depth: 5 });
  console.log('\nkernel_inputs :', kernel_inputs);
  console.log('\nacc_kernel_data BEFORE kernel:', acc_kernel_data, '\n\n');

  const {
    public_inputs: {
      start_counter,
      end_counter,
      start_frame_counter,
      end_frame_counter,
      reads,
      nullifications,
      writes,
      call_stack,
    },
  } = fn_data;

  /********
   * Make assertions that the counters are correct:
   */

  assert(start_counter <= end_counter!, 'invalid start/end counters');
  assert(start_frame_counter < end_frame_counter!, 'invalid start/end frame counters'); // I've given up checking frames.

  // TODO: in a circuit, we can pass hints to greatly reduce the range checking and looping.

  let counter_ranges: CounterRange[] = [];
  if (kernel_inputs.is_first_kernel_iteration) {
    assert(start_counter == 0, 'start_counter for the first fn must be 0.');
  }

  counter_ranges[0] = { start: start_counter, end: null };
  let counter_ranges_index = 0;
  let counter_counter = start_counter;
  for (let call of call_stack) {
    assert(
      call.start_counter >= counter_counter,
      `Kernel tracks counter to be ${counter_counter}, but when fn ${fn_data.fn_name} called fn ${call.fn_name}, the latter claims a start_counter of ${call.start_counter}. Naughty.`,
    );
    counter_ranges[counter_ranges_index].end = call.start_counter;
    ++counter_ranges_index;
    counter_ranges[counter_ranges_index] = { start: call.end_counter!, end: null };
    counter_counter = call.end_counter!;
  }
  assert(
    end_counter! >= counter_counter,
    `Kernel tracks counter to be ${counter_counter}, but fn ${fn_data.fn_name} claims an end_counter to be ${end_counter}. Naughty.`,
  );
  counter_ranges[counter_ranges_index].end = end_counter;

  // TODO: in a circuit, we can pass hints to greatly reduce the range checking and looping.

  const check_counter = (counter: number) => {
    let found = false;
    for (let range of counter_ranges) {
      found ||= counter > range.start && counter <= range.end!;
    }
    assert(found, `Counter ${counter} out of range, for counter_ranges ${JSON.stringify(counter_ranges)}. Naughty.`);
  };
  reads.forEach(r => check_counter(r.counter));
  nullifications.forEach(n => check_counter(n.counter));
  writes.forEach(w => check_counter(w.counter));

  /*******
   * Push final & transient r/n/w:
   */

  for (const read of reads) {
    if (read.is_final) {
      // TODO: check for duplicates, somehow...
      acc_kernel_data.final_reads.push(read);
    } else {
      acc_kernel_data.transient_reads.push(read);
    }
  }

  for (const nullification of nullifications) {
    let pushed_as_final = false;
    for (const read of acc_kernel_data.final_reads) {
      if (read.commitment == nullification.commitment) {
        assert(
          read.counter < nullification.counter,
          `Cannot nullify before a read! Read: ${JSON.stringify(read)}; Nullification: ${JSON.stringify(
            nullification,
          )}. Naughty.}`,
        );
        // TODO: check for duplicates, somehow...
        acc_kernel_data.final_nullifications.push(nullification);
        pushed_as_final = true;
      }
    }

    if (!pushed_as_final) {
      acc_kernel_data.transient_nullifications.push(nullification);
    }
  }

  for (const write of writes) {
    if (write.is_final) {
      // TODO: check for duplicates, somehow...

      // If a slot is a `Set` type, there could be many 'final' writes, and the largest counters won't necessarily be the final counters (as later functions might have chosen to read (and squash) writes with smaller counters).

      acc_kernel_data.final_writes.push(write);
    } else {
      acc_kernel_data.transient_writes.push(write);
    }
  }

  for (const final_write of acc_kernel_data.final_writes) {
    for (const final_read of acc_kernel_data.final_reads) {
      assert(
        final_write.commitment !== final_read.commitment,
        `A read is not "final" if it reads a 'write' from the same tx: both the read and the write should be 'is_final: false'!`,
      );
    }
  }

  /******
   * Squash transient r/n/w:
   */

  // Track which reads/nullifications/writes we can squash, but don't squash them until the loops are done (because squashing as we loop sounds fiddly).
  let squashable_transient_read_indices: number[] = [];
  let squashable_transient_nullification_indices: number[] = [];
  let squashable_transient_write_indices: number[] = [];
  for (const [read_index, read] of acc_kernel_data.transient_reads.entries()) {
    for (const [write_index, write] of acc_kernel_data.transient_writes.entries()) {
      if (read.commitment === write.commitment) {
        console.log('\n🍅 Attempting to squash read and write:');
        console.log('\tread: ', read);
        console.log('\twrite:', write);
        assert(read.counter > write.counter, 'Cannot read before a write!!!');
        squashable_transient_read_indices.push(read_index);
        squashable_transient_write_indices.push(write_index);
      }
    }

    // TODO: maybe we don't need _transient_ nullifications at all, given we know they should be cancelled. Maybe all the info is contained in the transient reads and writes...
    for (const [null_index, nullification] of acc_kernel_data.transient_nullifications.entries()) {
      if (read.commitment === nullification.commitment) {
        console.log('\n🍅 Attempting to squash read and nullification:');
        console.log('\tread:         ', read);
        console.log('\tnullification:', nullification);
        assert(read.counter < nullification.counter, 'Cannot nullify before a read!!!');
        squashable_transient_nullification_indices.push(null_index);
      }
    }
  }

  acc_kernel_data.transient_reads = acc_kernel_data.transient_reads.filter(
    (_, i) => !squashable_transient_read_indices.includes(i),
  ); // delete squashable entries
  acc_kernel_data.transient_nullifications = acc_kernel_data.transient_nullifications.filter(
    (_, i) => !squashable_transient_nullification_indices.includes(i),
  ); // delete squashable entries
  acc_kernel_data.transient_writes = acc_kernel_data.transient_writes.filter(
    (_, i) => !squashable_transient_write_indices.includes(i),
  ); // delete squashable entries

  // TODO: ensure there were no counter gaps?

  console.log('\n\nacc_kernel_data AFTER kernel:', acc_kernel_data);

  if (kernel_inputs.is_last_kernel_iteration) {
    assert(acc_kernel_data.transient_reads.length === 0, 'Transient reads must be empty at end of last iteration.');
    assert(
      acc_kernel_data.transient_nullifications.length === 0,
      'Transient nullifications must be empty at end of last iteration.',
    );
    assert(acc_kernel_data.transient_reads.length === 0, 'Transient writes must be empty at end of last iteration.');
  }
}
