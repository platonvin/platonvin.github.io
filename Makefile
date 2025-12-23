# you need so much settings to just pandoc to not fuck up your data, love this
ARTICLE_PANDOC_ARGS = -f markdown+raw_html+raw_attribute+backtick_code_blocks -t html --wrap=none --standalone --template=sources/articles/template.html --css=../styles.css --section-divs --highlight-style=kate --shift-heading-level-by 0
ARTICLE_MD_FILES = $(wildcard sources/articles/*.md)
ARTICLE_HTML_FILES = $(patsubst sources/articles/%.md,articles/%.html,$(ARTICLE_MD_FILES))

# PROJECTS_PANDOC_ARGS = -f markdown+raw_html+raw_attribute -t html --standalone --template=sources/projects/template.html --css=../styles.css --shift-heading-level-by 0
# PROJECT_MD_FILES = $(wildcard sources/projects/*.md)
# PROJECT_HTML_FILES = $(patsubst sources/projects/%.md,projects/%.html,$(PROJECT_MD_FILES))

default: run

setup:
	git submodule update --init --recursive

build_lum: setup
	cd lum-rs && cargo +nightly build -Z"build-std=std,panic_abort" -p demo --lib --target "wasm32-unknown-unknown" --features wgpu_backend --profile distribution
	cd ..
	wasm-bindgen lum-rs/target/wasm32-unknown-unknown/distribution/demo_lib.wasm --out-dir pkg --target web
	wasm-opt pkg/demo_lib_bg.wasm -O4 -o pkg/demo_lib_bg.wasm

run:
	microserver.exe . -i index.html -p 8080

build_html: build_articles projects/lum.html # build_projects

build_articles: articles $(ARTICLE_HTML_FILES)

articles/%.html: sources/articles/%.md
	pandoc $< $(ARTICLE_PANDOC_ARGS) -o $@

projects/lum.html: lum-rs/README.md 
	pandoc lum-rs/README.md -f markdown -t html --wrap=none --template=sources/projects/lum_template.html --section-divs  -o projects/lum.html

# build_projects: projects $(PROJECT_HTML_FILES)

# projects/%.html: sources/projects/%.md
# 	pandoc $< $(PROJECTS_PANDOC_ARGS) --output=$@

build_cv: cv.pdf cv_ru.pdf

cv.pdf: sources/cv.html sources/cv.css
	pandoc \
	  --variable geometry="margin=0.2in" \
	  --pdf-engine=xelatex \
	  --variable fontsize=11pt \
	  --css=sources/cv.css \
	  -V colorlinks=true \
	  -V linkcolor=blue \
	  sources/cv.html -o cv.pdf

cv_ru.pdf: sources/cv_ru.html sources/cv_ru.css
	pandoc \
	  --variable geometry="margin=0.2in" \
	  --pdf-engine=xelatex \
	  --variable fontsize=11pt \
	  --css=sources/cv_ru.css \
	  -V colorlinks=true \
	  -V linkcolor=blue \
	  -V mainfont="Segoe UI" \
	  sources/cv_ru.html -o cv_ru.pdf

purge_css: purgecss

purgecss:
	purgecss --css styles.css --content index.html articles/*.html projects/*.html -o styles.css