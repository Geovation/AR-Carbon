// Console polyfill for non supporting browsers
window.console = window.console || {
    log: function () {},
    error: function () {},
    debug: function () {},
    warn: function () {}
};
