export type CallOp = {
  type: string;
  fn_name: string;
};

export type ReadOp = {
  type: string;
  slot: string;
  commitment: string; // if is_explicit
  is_final: boolean;
};

export type NullificationOp = {
  type: string;
  slot: string;
  nullification_ptr: number;
  commitment: string; // if is_explicit
};

export type WriteOp = {
  type: string;
  slot: string;
  commitment: string; // if is_explicit
  is_final: boolean;
};

export type Opcode = CallOp | ReadOp | WriteOp | NullificationOp;

export type Functions = {
  // explicit: Are the reads/nulls/writes of this contract explicit about the commitment being read/nulled/written?
  // Explicit is useful for testing malicious cases.
  [key: string]: Opcode[];
};

export type Contract = {
  fns: Functions;
};

export type Read = {
  slot: string;
  counter: number;
  commitment: string;
  is_final: boolean;
};

export type Nullification = {
  slot: string;
  counter: number;
  commitment: string;
  nullification_ptr: number; // TODO: I don't think I'm using these anymore. I think I'm comparing commitments directly.
};

export type Write = {
  slot: string;
  counter: number;
  commitment: string;
  is_final: boolean;
};

export type PublicInputs = {
  fn_name: string;
  start_counter: number;
  end_counter: number | null;
  start_frame_counter: number;
  end_frame_counter: number | null;
  reads: Read[];
  nullifications: Nullification[];
  writes: Write[];
  call_stack: PublicInputs[];
};

export type FunctionData = {
  fn_name: string; // TODO: remove
  public_inputs: PublicInputs;
};

export type Context = {
  fns: Functions;

  fn_name: string;
  node_index: number;

  frame_counter: number; // These frame_counters aren't actually being used anywhere, but I've kept them around, for now.
  counter: number;

  fns_data: {
    // key is a fn_name
    [key: string]: FunctionData; // TODO: replace with public inputs?
  };

  note_db: {
    // key is a slot: value is an array of commitments (strings)
    [key: string]: string[];
  };

  cached_context: Context | null;

  // Pretty logging of opcodes:
  log_indent: number;
  log: string;
};

export type FinalWrites = {
  [key: string]: Write;
};

export type KernelInputs = {
  // final_writes_for_this_call: FinalWrites;
  is_first_kernel_iteration: boolean;
  is_last_kernel_iteration: boolean;
};

export type AccKernelData = {
  final_reads: Read[];
  final_nullifications: Nullification[];
  final_writes: Write[];
  transient_reads: Read[];
  transient_nullifications: Nullification[];
  transient_writes: Write[];
};

export type CounterRange = {
  start: number;
  end: number | null;
};
