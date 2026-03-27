const fs = require("node:fs");
const markdownIt = require("markdown-it");

const md = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true,
});

module.exports = class {
    data() {
        return {
            layout: "lum.njk",
            permalink: "projects/lum.html",
        };
    }

    render() {
        const readme = fs.readFileSync("lum-rs/README.md", "utf8");
        return md.render(readme);
    }
};
