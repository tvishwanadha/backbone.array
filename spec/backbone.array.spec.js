describe('Array', function(){

  describe('constructor', function(){
    it('should create an instance of Backbone.Array', function() {
      var array = new Backbone.Array;
      expect(array instanceof Backbone.Array).toBe(true);
    });
    it('should extend Backbone.Events', function() {
      _.forEach(Backbone.Events, function(value, key, list) {
        expect(Backbone.Array.prototype[key]).toBeDefined();
        expect(Backbone.Array.prototype[key]).toBe(value);
      });
    });
    it('should have all the array functions except join', function() {
      var array_funcs = [
        'pop',
        'push',
        'reverse',
        'shift',
        'sort',
        'splice',
        'unshift',
        'concat',
        'slice',
        'indexOf',
        'lastIndexOf',
        'filter',
        'forEach',
        'every',
        'map',
        'some',
        'reduce',
        'reduceRight'
      ];
      _.forEach(array_funcs, function(func) {
        expect(Backbone.Array.prototype[func]).toBeDefined();
        expect(_.isFunction(Backbone.Array.prototype[func])).toBe(true);
      });
      expect(Backbone.Array.prototype.join).toBeUndefined();
    });
    it('should have all the Collection functions', function() {
      _.forEach(Backbone.Collection.prototype, function(func, name) {
        if(!_.isFunction(Backbone.Collection.prototype[name])) {
          return;
        }
        expect(Backbone.Array.prototype[name]).toBeDefined();
      });
    });
  });

});