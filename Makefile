default: run

setup:
	git submodule update --init --recursive

build: setup
	cd lum-rs && cargo +nightly build -Z"build-std=std,panic_abort" -p demo --lib --target "wasm32-unknown-unknown" --features wgpu_backend --profile distribution
	cd ..
	wasm-bindgen .\lum-rs\target\wasm32-unknown-unknown\distribution\demo_lib.wasm --out-dir pkg --target web
	wasm-opt .\pkg\demo_lib_bg.wasm -O4 -o .\pkg\demo_lib_bg.wasm

run:
	microserver.exe . -i index.html -p 8080