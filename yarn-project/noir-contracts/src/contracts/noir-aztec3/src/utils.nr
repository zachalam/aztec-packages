use crate::types::vec::BoundedVec;

fn arr_copy_slice<T, N, M>(
    src: [T; N],
    mut dst: [T; M],
    offset: comptime Field,
) -> [T; M] {
    for i in 0..dst.len() {
        dst[i] = src[i + offset];
    }
    dst
}

// TODO(#499): Use hash index
fn hash_vec_in_chunks<N, C>(args: [Field; N]) -> Field {
    if (N == 0) {
        0
    } else if (N < 32) {
        dep::std::hash::pedersen(args)[0]
    } else {
        let mut chunks_hashes: [Field; C] = [0; C];
        for i in 0..C-1 {
            let mut chunk: BoundedVec<Field, 32> = BoundedVec::new(0);
            for j in 0..32 {
                chunk = chunk.push(args[i * 32 + j]);
            }
            chunks_hashes[i] = dep::std::hash::pedersen(chunk.storage)[0];
        }
        
        let mut chunk: BoundedVec<Field, (N - (C - 1) * 32)> = BoundedVec::new(0);
        for j in 0..(N - (C - 1) * 32) {
            chunk = chunk.push(args[(C - 1) * 32 + j]);
        }
        chunks_hashes[i] = dep::std::hash::pedersen(chunk.storage)[0];

        dep::std::hash::pedersen(chunks_hashes)[0]
    }
}