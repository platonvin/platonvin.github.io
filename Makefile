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

ARTICLE_MD_FILES = $(wildcard articles/*.md)
ARTICLE_HTML_FILES = $(patsubst articles/%.md,articles/%.html,$(ARTICLE_MD_FILES))

build_articles: $(ARTICLE_HTML_FILES) ## Convert all markdown articles to HTML
	@echo "All articles built."

articles/%.html: articles/%.md templates/article_template.html styles.css
	@echo "Converting $< to $@"
	pandoc $< \
	  --standalone \
	  --template=templates/article_template.html \
	  --css=../styles.css \
	  --output=$@ \
	  --section-divs
	  # If you decided to use the Lua filter:
	  # --lua-filter=filters/section_filter.lua