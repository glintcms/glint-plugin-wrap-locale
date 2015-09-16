/**
 * Module dependencies.
 */
var debug = require('debug')('glint-plugin-wrap-locale');

/**
 *  Wrap locale Plugin
 *
 * - adds `locale`, (alias: `setLocale`), and `getLocale` function to the wrap
 * - attaches `pre-load` and `pre-save` handlers to the containers, to prefix the id with the locale.
 * - attaches `pre-save` event to the containers adapters, to add the fields: `locale`, `path`.
 *
 */
module.exports = function(o) {
  o = o || {};
  o.locale = o.locale || 'locale';
  o.path = o.path || 'path';
  o.pattern = o.pattern || '([a-zA-Z]{1,3}(?:-(?:[a-zA-Z0-9]{2})){0,1})';

  var attribute = o.attribute || 'locale';

  plugin.api = 'wrap-plugin';
  function plugin(wrap) {

    /**
     *
     * adds Locale Setter function.
     * chainable function.
     *
     * @param value Locale like `de-CH`.
     * @returns {Object} self
     */
    wrap.locale = wrap.setLocale = function(value) {
      debug('wrap setLocale', value, wrap.flow);
      if (typeof value !== 'undefined') {
        wrap['_' + attribute] = value;
        wrap.flow.forEach(function(key, ctrl) {
          if (typeof ctrl[attribute] === 'function') {
            debug('wrap flow', key, ctrl);
            ctrl[attribute](value);
          }
        });
      }
      return wrap;
    };

    /**
     * adds Locale Getter function.
     *
     * @returns {String} Locale like `en` or `en-GB`.
     */
    wrap.getLocale = function() {
      debug('wrap getLocale', wrap['_' + attribute]);
      return wrap['_' + attribute];
    };

    var handlers = false;
    wrap.on('pre-load', function() {

      // attach container save handler once
      // the handlers are attached on the wrap's pre-load event,
      // because the containers might not be available during this plugins instatiation.
      if (!handlers) attachHandlers(wrap.containers);
      handlers = true;

    });


    function attachHandlers(containers) {

      debug('attachHandlers containers.length', containers.length);

      containers.forEach(function(container) {

        // container load handler
        container.on('pre-load', function() {
          var locale = wrap.getLocale();
          debug('pre-load container.id():', container.id(), ', locale:', locale);
          if (!locale) return;
          var id = container.id();
          if (id.indexOf(locale) == 0) return; // id starts with locale
          container.id(locale + '-' + id);
        });

        // container save handler
        container.on('pre-save', function() {
          var locale = wrap.getLocale();
          debug('pre-save container.id():', container.id(), ', locale:', locale);
          if (!locale) return;
          var id = container.id();
          if (id.indexOf(locale) == 0) return; // id starts with locale
          container.id(locale + '-' + id);
        });

        // adapter save handler
        var adapter = container.adapter();
        if (!adapter) return;

        adapter.on('pre-save', function() {
          var args = [].slice.apply(arguments);
          var len = args.length, pos = 3;
          if (len <= pos) return debug('missing argument');
          var obj = args[pos]; // object: 4th argument
          var id = args[pos - 1]; // id: 3rd argument

          //extract locale from id e.g. de-ch-home-alone -> de-ch
          var locale;
          var pattern = new RegExp('^' + o.pattern + '', 'i');
          if (pattern.test(id)) {
            locale = RegExp.$1;
          }
          if (locale) {
            obj[o.locale] = locale;
            obj[o.path] = id.replace(locale + '-', '');

          }
          debug('adatper pre-save, locale:', obj[o.locale], ', path:', obj[o.path]);
        });

      });

    }

  }

  return plugin;

};
