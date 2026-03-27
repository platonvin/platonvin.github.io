const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
    const md = markdownIt({
        html: true,
        breaks: true,
        linkify: true,
        typographer: true,
    });

    // 1. Headers: h1 to h5
    md.renderer.rules.heading_open = (tokens, idx) => {
        const tag = tokens[idx].tag;
        const level = parseInt(tag.slice(1));
        const hashes = "#".repeat(level);
        return `<${tag}><span class="md-syntax">${hashes} </span>`;
    };

    // 2. Bold (Strong)
    md.renderer.rules.strong_open = () => `<strong><span class="md-syntax">**</span>`;
    md.renderer.rules.strong_close = () => `<span class="md-syntax">**</span></strong>`;

    // 3. Italics (Emphasis)
    md.renderer.rules.em_open = () => `<em><span class="md-syntax">*</span>`;
    md.renderer.rules.em_close = () => `<span class="md-syntax">*</span></em>`;

    // 4. Inline Code (wraps in your existing <code> styling)
    md.renderer.rules.code_inline = (tokens, idx) => {
        const content = tokens[idx].content;
        return `<code><span class="md-syntax">\`</span>${content}<span class="md-syntax">\`</span></code>`;
    };

    // 5. Blockquotes (matches your section/dl style)
    md.renderer.rules.blockquote_open = () => `<blockquote><span class="md-syntax">> </span>`;
    eleventyConfig.setLibrary("md", md);

    eleventyConfig.ignores.add("articles/template.html");
    eleventyConfig.ignores.add("projects/lum_template.html");

    return {
        dir: {
            input: "sources",
            includes: "_includes",
            layouts: "_includes/layouts",
            data: "_data",
            output: ".",
        },
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
        templateFormats: ["md", "njk", "html", "11ty.js"],
    };
};
