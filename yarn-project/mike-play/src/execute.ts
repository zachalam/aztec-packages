import { findSourceMap } from 'module';
import {
  CallOp,
  ReadOp,
  NullificationOp,
  WriteOp,
  Opcode,
  Read,
  Nullification,
  Write,
  Contract,
  PublicInputs,
  FunctionData,
  Context,
} from './types.js';

/**
 * Noddy visitor function, to enter/exit a particular opcode type, and push data to the context.
 */
const visitor = {
  read: {
    enter(node: ReadOp, context: Context) {
      let { fns, fn_name, node_index, frame_counter, counter, fns_data, cached_context } = context;

      ++context.counter;

      context.fns_data[fn_name].public_inputs.reads.push({
        counter: context.counter,
        slot: node.slot,
        commitment: node.commitment,
        is_final: node.is_final,
      });

      context.log = context.log.concat(
        '  '.repeat(context.log_indent) +
          'read:   \t' +
          node.commitment +
          ', ' +
          node.slot +
          ', ' +
          context.counter +
          ', ' +
          '\n',
      );
    },
  },

  nullify: {
    enter(node: NullificationOp, context: Context) {
      let { fns, fn_name, node_index, frame_counter, counter, fns_data, cached_context } = context;

      ++context.counter;

      context.fns_data[fn_name].public_inputs.nullifications.push({
        counter: context.counter,
        slot: node.slot,
        commitment: node.commitment,
        nullification_ptr: node.nullification_ptr,
      });

      context.log = context.log.concat(
        '  '.repeat(context.log_indent) +
          'nullify:\t' +
          node.commitment +
          ', ' +
          node.slot +
          ', ' +
          context.counter +
          ', ' +
          '\n',
      );
    },
  },

  write: {
    enter(node: WriteOp, context: Context) {
      let { fns, fn_name, node_index, frame_counter, counter, fns_data, cached_context } = context;

      ++context.counter;

      let commitment = node.commitment!;

      if (context.note_db[node.slot]) {
        context.note_db[node.slot].push(commitment);
      } else {
        context.note_db[node.slot] = [commitment]; // push the commitment to a noddy db.
      }

      context.fns_data[fn_name].public_inputs.writes.push({
        counter: context.counter,
        slot: node.slot,
        commitment,
        is_final: node.is_final,
      });

      context.log = context.log.concat(
        '  '.repeat(context.log_indent) +
          'write:  \t' +
          commitment +
          ', ' +
          node.slot +
          ', ' +
          context.counter +
          ', ' +
          '\n',
      );
    },
  },

  call: {
    enter(node: CallOp, context: Context) {
      if (context.fns_data[node.fn_name])
        throw new Error('already traversed this function (use a different function name to call it again... sorry!)');

      let cached_context = JSON.parse(JSON.stringify(context));
      context.cached_context = cached_context;

      context.fn_name = node.fn_name;
      context.node_index = 0;

      context.fns_data[node.fn_name] = {
        fn_name: node.fn_name,
        public_inputs: {
          fn_name: node.fn_name,
          start_counter: context.counter,
          end_counter: null,
          start_frame_counter: ++context.frame_counter,
          end_frame_counter: null,
          reads: [],
          nullifications: [],
          writes: [],
          call_stack: [],
        },
      };

      context.log = context.log.concat('\n' + '  '.repeat(context.log_indent) + node.fn_name + '{\n');
      ++context.log_indent;
      context.log = context.log.concat('  '.repeat(context.log_indent) + '// frame: ' + context.frame_counter + '\n');
    },

    exit(node: CallOp, context: Context) {
      let { fns, fn_name, node_index, frame_counter, counter, fns_data, cached_context } = context;

      context.fn_name = cached_context!.fn_name;
      context.node_index = cached_context!.node_index;

      // context.node_index = ++cached_context.node_index;

      context.fns_data[node.fn_name].public_inputs.end_counter = counter;
      context.fns_data[node.fn_name].public_inputs.end_frame_counter = ++context.frame_counter;

      context.fns_data[cached_context!.fn_name]?.public_inputs.call_stack.push(
        context.fns_data[node.fn_name].public_inputs,
      );

      context.cached_context = cached_context!.cached_context;

      --context.log_indent;
      context.log = context.log.concat('  '.repeat(context.log_indent) + '}\n\n');
      context.log = context.log.concat('  '.repeat(context.log_indent) + '// frame: ' + context.frame_counter + '\n');
    },
  },
};

/**
 * Noddy traversal function, to traverse opcodes and gobble up information about them.
 * Mutates the context.
 */
function traverse(context: Context, visitor: any) {
  let { fns, fn_name, node_index } = context;

  // console.log('\n\n\nTraversing node:');
  // console.log('fn_name:', fn_name);
  if (!fns[fn_name]) throw new Error('fn_name not found');

  // console.log('fn length:', fns[fn_name].length);
  // console.log('node_index:', node_index);

  if (!fns[fn_name][node_index]) {
    // console.log('end of fn');
    return;
  }

  // console.log('node:', fns[fn_name][node_index]);

  let node = fns[fn_name][node_index];
  const visitor_methods = visitor[node.type];

  // console.log('context before enter:', context);
  visitor_methods.enter(node, context);
  // console.log('context after enter:', context);

  if (node.type != 'call') {
    // Traverse the next opcode, if not a call.
    ++context.node_index;
    // Otherwise, we traverse the call itself.
  }
  traverse(context, visitor);

  if (visitor_methods.exit) {
    // console.log('context before exit:', context);
    visitor_methods.exit(node, context);
    // console.log('context after exit:', context);
  }

  if (node.type == 'call') {
    ++context.node_index;
    traverse(context, visitor);
  }
}

/**
 * Commences traversal through the functions' opcodes.
 */
export function execute(contract: Contract): Context {
  // Initial context:
  let context: Context = {
    fns: contract.fns,

    fn_name: 'init',
    node_index: 0,

    frame_counter: 0,
    counter: 0,

    fns_data: {},

    note_db: {},

    cached_context: null,

    log_indent: 0,
    log: '\n\nLOG:\n\n',
  };

  // Mutates the context.
  traverse(context, visitor);

  console.log(
    '\n\n\n\nYOU CAN PASTE THIS FNS_DATA INTO pasted-fns-data.ts IF YOU WANT TO PLAY WITH TWEAKING INPUTS:\n\n',
  );
  console.log('\n\n========================================================\n\n');
  console.dir(context.fns_data, { depth: 5 });
  console.log('\n\n========================================================\n\n\n\n');

  console.log(context.log);

  return context;
}
