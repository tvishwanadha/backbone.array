// Backbone.Array.js 0.0.1

//     Backbone.Array
//     (c) 2012 Tejasvi Vishwanadha
//     highly influenced by Backbone.Collection

//     Backbone is
//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

// Backbone.Array
// -----------

// `Backbone.Collection` is defined as "a standard collection class
// for our sets of models".

// `Backbone.Array` is meant to be an alternative to `Backbone.Collection`,
// providing a similar interface but supporting duplicates. It provides a
// dynamic list interface instead of the more restrictive set interface.
// Instead of acting like a hash map, it is just a dynamic array.

// ## Key Differences
// ### From `Array`
// * `Array.join` is not implemented because it doesn't really make sense in the context
// * `Array.push` and `Array.unshift` both return the new length of the array.
//    The equivalent functions in `Backbone.Array` return the added models, which is
//    consistent with `Backbone.Collection`
// ### From `Backbone.Collection`
// * `Backbone.Array` allows for duplicate models. It is not a set.
// * `Backbone.Array` does not support a comparator. Sorting must be done manually with
//    the `sort` function.
// * `get` and `getByCid` return arrays of models, since an id or cid may not be unique.
// * `get`, `getByCid`, and `remove` are not constant time functions, but linear.
//    Use `at` for constant time retrieval and `pop`, `shift`, or `slice` for faster removal. 

// Constructor is very similar to the ones in Backbone

(function(Backbone, _){

  var BackboneArray = Backbone.Array = function(models, options){
    options || (options = {});
    if (options.model) this.model = options.model;
    this.length = 0;
    this.models = [];
    // `_reset` is dummy function, unlike `Backbone.Collection`.
    // Potentially useful for extension, but `reset` uses `slice`,
    // which does book-keeping itself.
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, {silent: true, parse: options.parse});
  }

  // Extend `Backbone.Events` to get event emitting goodness
  _.extend(BackboneArray.prototype, Backbone.Events, {

    // used as constructor when creating models
    model : Backbone.Model,

    initialize : function() {},

    // ###Accessors

    // returns undefined for invalid indices
    at : function(index) {
      return this.models[index];
    },

    slice : function(begin, end) {
      return this.models.slice(begin, end);
    },

    // uses a shallow copy like `Array.concat`
    concat : function() {
      var copy = this.clone();
      copy.push(arguments);
      return copy;
    },

    // ###Mutators

    // returns array of removed models
    splice : function(index, howMany, models, options) {
      var i, length, model, removed = [];
      // index: position to delete/insert at, defaults to 0
      index = _.isNumber(index) && !_.isNaN(index) ? index : 0;
      // howMany: how many elements to remove, defaults to 0
      howMany = _.isNumber(howMany) && !_.isNaN(howMany) ? howMany : 0;
      options || (options = {});
      // model: a single model or array of models to insert
      models = _.isArray(models) ? models.slice() : [models];

      for (i = 0, length = models.length; i < length; i++) {
        // Turn bare objects into models and filter any invalid objects
        if (!(model = models[i] = this._prepareModel(models[i], options))) {
          throw new Error("Can't add an invalid model to a collection");
        }

        // Listen to added models' events
        model.on('all', this._onModelEvent, this);
      }

      // Slice models into array
      removed = Array.prototype.splice.apply(this.models, [index, howMany].concat(models));
      this.length = this.models.length;

      // triggering `remove` and `add` events unless silenced

      // need to clean up references so this loop is unavoidable
      for (i = 0, length = removed.length; i < length; i++) {
        model = removed[i];
        options.index = index + i;
        if (!options.silent) {
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }

      // can skip this loop if silenced
      for (i = 0, length = models.length; i < length && !options.silent; i++) {
        model = models[i];
        options.index = i + index;
        model.trigger('add', model, this, options);
      }

      return removed;
    },

    // returns model
    push : function(model, options) {
      this.splice(this.length, 0, model, options);
      return model;
    },

    // returns popped model
    pop : function(options) {
      var removed = this.splice(this.length - 1, 1, [], options);
      return removed[0];
    },

    // returns shifted model
    shift : function(options) {
      var removed = this.splice(0, 1, [], options);
      return removed[0];
    },

    // returns model
    unshift: function(model, options) {
      this.splice(0, 0, model, options);
      return model;
    },

    // triggers reset
    reverse : function(options) {
      var reversed = this.models.reverse();
      this.reset(reversed, options);
    },

    // Unlike `Backbone.Collection`, this has to be called manually.
    // to maintain compatability with the `Collection` interface,
    // comparator is passed via options
    sort: function(options) {
      options || (options = {});
      if (!options.comparator) throw new Error('Cannot sort a set without a comparator');
      var boundComparator = _.bind(options.comparator, this);
      if (this.comparator.length == 1) {
        this.models = this.sortBy(boundComparator);
      } else {
        this.models.sort(boundComparator);
      }
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // ### Collection compatability

    // these functions (in combination with the copied functions) maintain an interface
    // that is almost identical to `Backbone.Collection`

    reset : function(models, options) {
      models  || (models = []);
      options || (options = {});
      this._reset();
      this.splice(0, this.models.length, models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // effectively a dummied down `splice`
    add : function(models, options) {
      options || (options = {});
      var index = options.at != null ? options.at : this.models.length;
      this.splice(index, 0, models, options);
      return this;
    },

    // `O(length) + O(models.length)`, not `O(1)`
    remove : function(models, options) {
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];
      var i, model, id = [], cid = [], length = models.length;

      for (i = 0; i < length; i++) {
        model = models[i];
        cid[model.cid] = true;
        id[model.id] = true;
      }

      for (i = 0; i < this.length; i++) {
        model = this.models[i];
        if (cid[model.cid] === true || id[model.id] === true) {
          this.splice(i, 1, [], options);
        }
      }

      return this;
    },

    // unlike `Backbone.Collection`, returns array. `O(length)`, not `O(1)`
    get : function(id) {
      return this.filter(function(model) {
        return model.id === id || (id && model.id === id.id);
      });
    },

    // same caveats as `get`
    getByCid : function(cid) {
      return this.filter(function(model) {
        return model.cid === cid || (cid && model.cid === cid.cid);
      });
    },

    // ### Internal `Backbone` things

    // most of these functions were copied from `Backbone.Collection`
    // and tweaked only slightly for `Backbone.Array`

    // empty, can be overloaded I guess?
    _reset : function() {},

    // Internal method called every time a model in the array fires an event.
    // "add" and "remove" events that originate in other collections are ignored.
    _onModelEvent : function(event, model, collection, options) {
      if ((event == 'add' || event == 'remove') && collection != this) return;
      if (event == 'destroy') {
        this.remove(model, options);
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Array.
  // This list is from `Backbone.Collection`
  var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find',
    'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any',
    'include', 'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex',
    'toArray', 'size', 'first', 'initial', 'rest', 'last', 'without', 'indexOf',
    'shuffle', 'lastIndexOf', 'isEmpty', 'groupBy'];

  // Mix in each Underscore method as a proxy to `BackboneArray#models`.
  _.each(methods, function(method) {
    BackboneArray.prototype[method] = function() {
      return _[method].apply(_, [this.models].concat(_.toArray(arguments)));
    };
  });

  // Methods copied directly from `Backbone.Collection`.
  // `_prepareModel` and `_removeReference` both use `model.collection`,
  // which are kept intact to maintain compatability

  var collection_methods = ['toJSON','sync','fetch','create','parse','clone',
    'pluck','where','chain', '_prepareModel', '_removeReference'];

  _.each(collection_methods, function(method){
    Backbone.Array.prototype[method] = Backbone.Collection.prototype[method];
  });

  // tap into the magic that is `Backbone.*.extend`
  BackboneArray.extend = Backbone.Model.extend;

})(Backbone, _);