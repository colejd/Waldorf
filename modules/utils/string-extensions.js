
/**
 * Escapes the string so it can embed directly in an HTML document.
 */
// http://stackoverflow.com/a/12034334
Object.defineProperty(String.prototype, 'escapeHTML', {
    value() {
        var entityMap = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
            "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
        };
        return String(this).replace(/[&<>"'`=\/]/g, function (s) {
            return entityMap[s];
        });
    }
});