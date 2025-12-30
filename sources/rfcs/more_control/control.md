# Runtime safety checks configuration

This would likely be 2 different RFCs but i believe they are coupled in who would be interested in them, so for purpose of collection commentary they are bundled into one. 

## Summary
[summary]: #summary

Add rustc and Cargo options to disable specific runtime validness/UB checks: precise floating-point operations, integer overflow checks/behavior, zero-division checks, and slice bounds checks.

## Motivation
[motivation]: #motivation

Rust inserts runtime checks for safety: defined integer overflow, zero-division, bounds checking, and precise floating-point math. These can be avoided manually via unchecked operations (e.g., `unchecked_add`, `get_unchecked`, `fmul_fast`), but this degrades readability and makes code more error-prone (e.g. a lot easier to not see copy-paste mistake).

Example:
```rust
let c = a * a + b * 2.0;  // checked
```
vs
```rust
let c = a.fmul_fast(a).fadd_fast(b.fmul_fast(2.0f32));  // unchecked
```

Use cases:
- Performance-critical code.
- Benchmarking checks price to identify when restructure to alternative safe code with less checks would benefit.
 
Combined with proposed linear algebra types, reduces need for manual SIMD intrinsics.

Many developers are not even ware these checks exist in release builds. Providing explicit control gives choice without sacrificing default safety (they should be off even in release mode by default).

## Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

New flags/attributes:

```toml
# Cargo.toml
[profile.distribution]
disable-runtime-checks = ["overflow", "bounds", "divzero", "fp-precise"]
overflow-checks = true/false/unchecked
slice-bounds-checks = true/false
zero-division-checks = true/false
precise-fp-math = true/false
```

Or rustc:
```bash
rustc --cfg disable_runtime_checks="overflow,bounds"
```

Per-function:
```rust
#[disable_runtime_checks(overflow, bounds)]
fn hot_loop(...) { ... }
```

Behavior matches existing unchecked operations but applies automatically to normal arithmetic/indexing.

## Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

Options:
- overflow: use wrapping/unchecked instead of checked.
- bounds: omit slice/index bounds checks.
- divzero: omit integer division-by-zero checks.
- fp-precise: use fast approximate floating-point ops.

This:
- Global via rustc flag/Cargo profile.
- Crate via cfg.
- Scope via attribute.

Implementation: codegen emits unchecked equivalents where checks normally inserted.

No change to debug builds (checks remain).

## Drawbacks
[drawbacks]: #drawbacks

Introduces UB, which is still UB even if explicitly opted-in.
More options for developers to get lost in.

## Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

Flags preserve syntax while allowing opt-out, unlike manual unchecked calls (verbose) or wrappers (limited, no casts, no support from other code, bloat).

Proc-macro rewriting is possible to some degree but still limited.
No action keeps checks mandatory, limiting performance tuning.

## Prior art
[prior-art]: #prior-art

Clang/GCC: -fno-trapv, -fno-delete-null-pointer-checks, etc.  
Zig: explicit unchecked operations or release-fast mode.  
D: similar unchecked options.

## Unresolved questions
[unresolved-questions]: #unresolved-questions

Exact flag names and syntax.  
Per-scope granularity (function/module).  
Interaction with miri/UB detection.  
Default sets (e.g., "all").

## Future possibilities
[future-possibilities]: #future-possibilities

Profile-guided selective disabling.  
Integration with linear algebra types for auto-vectorization.