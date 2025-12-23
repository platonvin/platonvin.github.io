module.exports = {
    plugins: [
        require('postcss-discard-duplicates'),   // kill exact dupes
        require('postcss-discard-overridden'), // kill overridden props
        require('postcss-merge-rules'),         // merge identical selectors
        require('cssnano')({ preset: 'default' }) // minify
    ]
}