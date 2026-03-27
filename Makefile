.PHONY: default setup build_lum build_html build_articles watch serve run purgecss purge_css

default: build_html run

setup:
	git submodule update --init --recursive

build_lum: setup
	cd lum-rs && cargo +nightly build -Z"build-std=std,panic_abort" -p demo --lib --target "wasm32-unknown-unknown" --features wgpu_backend --profile distribution
	cd ..
	wasm-bindgen lum-rs/target/wasm32-unknown-unknown/distribution/demo_lib.wasm --out-dir pkg --target web
	wasm-opt pkg/demo_lib_bg.wasm -O4 -o pkg/demo_lib_bg.wasm

run:
	microserver.exe . -i index.html -p 8080

build_html: build_articles

build_articles:
	pnpm exec eleventy --quiet

watch: serve

serve:
	pnpm exec eleventy --serve

purge_css: purgecss

purgecss:
	purgecss --css styles.css --content index.html articles/*.html projects/*.html -o styles.css