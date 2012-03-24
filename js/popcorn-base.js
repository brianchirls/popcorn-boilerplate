/*
 * Popcorn.js Base Plugin
 * https://github.com/brianchirls/popcorn-base
 *
 * Copyright 2012, Brian Chirls
 * Licensed under the MIT license
 */
 
 (function (window, Popcorn) {
	"use strict";

	var document = window.document,
		console = window.console,
		popcornInstances = {},
		BasePopcorn,
		PopcornBasePlugin,
		PopcornBaseEvent;
	
	function logError(err) {
		if (err) {
			console.log(err.stack || err.stacktrace || err.message || err);
		}
	}
	
	BasePopcorn = function(popcorn) {
		var base;
		if (window === this || !(this instanceof BasePopcorn) ) {
			base = BasePopcorn.find(popcorn);
			if (!base) {
				base = new BasePopcorn(popcorn);
			}
			return base;
		}

		this.popcorn = popcorn;
		this.id = Popcorn.guid();
		popcornInstances[this.id] = this;
	};
	
	BasePopcorn.find = function(instance) {
		var id, bp;
		
		for (id in popcornInstances) {
			bp = popcornInstances[id];
			if (bp && bp.popcorn === instance) {
				return bp;
			}
		}
	};
	
	BasePopcorn.plugins = {};
	BasePopcorn.register = function(pluginName, basePlugin) {
		BasePopcorn.plugins[pluginName] = basePlugin;
	};
	
	PopcornBasePlugin = function(pluginName, plugin) {
		var definition,
			me = this;

		this.name = pluginName;
		this.pluginFn = plugin;
		this.events = {};

		definition = function(options) {
			var popcorn = this,
				event = new PopcornBaseEvent(popcorn, me, options),
				all, evt, i,
				id;

			return event.definition();
		};
		
		Popcorn.plugin(pluginName, definition);

		//register plugin with our own list
		BasePopcorn.register(pluginName, this);
	};
	
	PopcornBaseEvent = function(popcorn, basePlugin, options) {
		
		var current = false, // currentTime is between start and end
			started = false, // start has been run, but end has not
			setupFn, startFn, frameFn, endFn, teardownFn,
			me = this, instanceId, allEvents,
			basePopcorn = BasePopcorn(popcorn),
			definition;
		
		function getCallbackFunction(fn) {
			if (fn && typeof fn === 'string') {
				fn = window[fn];
			}
			
			if (fn && typeof fn === 'function') {
				return fn;
			}
		}
		
		//just being helpful...
		this.options = options;
		this.popcorn = popcorn;
		this.pluginName = basePlugin.name;

		//get target
		if (typeof options.target === 'string') {
			this.target = document.getElementById(options.target);
			if (!this.target) {
				delete this.target;
			}
		} else if (options.target instanceof window.HTMLElement) {
			this.target = options.target;
		}

		//add to Plugin's queue of events
		instanceId = basePopcorn.id;
		if (!basePlugin.events[instanceId]) {
			basePlugin.events[instanceId] = [];
		}

		//keep allEvents in order
		(function() {
			var evt, i;
			allEvents = basePlugin.events[instanceId];
			for (i = allEvents.length - 1; i >= 0; i--) {
				evt = allEvents[i].options;
				if (evt.start <= options.start ||
					(evt.start === options.start && evt.end <= options.end)) {
					
					break;
				}
			}
			allEvents.splice(i + 1, 0, me);
		}());

		//events
		this.onSetup = getCallbackFunction(options.onSetup);
		this.onStart = getCallbackFunction(options.onStart);
		this.onFrame = getCallbackFunction(options.onFrame);
		this.onEnd = getCallbackFunction(options.onEnd);
		this.onTeardown = getCallbackFunction(options.onTeardown);
		
		this.definition = function() {
			return definition;
		};

		this.makeContainer = function(tag, insert) {
			var all, i, evt, nextElement = null;

			if (insert === undefined) {
				insert = true;
			}

			if (!tag) {
				tag = 'div';
			}

			this.container = document.createElement(tag);
			this.addClass(this.container, 'popcorn-' + this.pluginName);

			if (insert && this.target) {
				//insert in order

				if (allEvents) {
					for (i = allEvents.length - 1; i >= 0; i--) {
						evt = allEvents[i].options;
						if (evt.start < this.options.start ||
							(evt.start === this.options.start && evt.end < this.options.end)) {
							
							break;
						}
					}

					i++;
					if (allEvents[i] === this) {
						i++;
					}
					if (i < allEvents.length) {
						nextElement = allEvents[i].container || null;
					}
				}
				
				this.target.insertBefore(this.container, nextElement);
			}
			
			return this.container;
		};

		//run plugin function to get setup, etc.
		//todo: validate that 'plugin' is a function
		//todo: try/catch all event functions
		definition = basePlugin.pluginFn.call(popcorn, options, this);
		if (!definition) {
			definition = {};
		}
/*
		if (!definition.start) {
			definition.start = this.nop;
		}
*/		
		setupFn = definition._setup;
		if (typeof setupFn === 'function') {
			definition._setup = function(options) {
				setupFn.call(me, options);
				if (typeof me.onSetup === 'function') {
					try {
						me.onSetup.call(me, options);
					} catch (e) {
						logError(e);
					}
				}
			};
		} else {
			definition._setup = function(options) {
				if (typeof me.onSetup === 'function') {
					try {
						me.onSetup(options);
					} catch (e) {
						logError(e);
					}
				}
			};
		}

		startFn = definition.start;
		if (typeof startFn === 'function') {
			definition.start = function(event, options) {
				current = true;
				started = true;
				startFn.call(me, event, options);
				if (typeof me.onStart === 'function') {
					try {
						me.onStart.call(me, options);
					} catch (e) {
						logError(e);
					}
				}
			};
		} else {
			definition.start = function(event, options) {
				current = true;
				started = true;
				if (typeof me.onStart === 'function') {
					try {
						me.onStart(options);
					} catch (e) {
						logError(e);
					}
				}
			};
		}
		
		frameFn = definition.frame;
		if (typeof frameFn === 'function') {
			definition.frame = function(event, options, time) {
				if (started) {
					frameFn.call(me, event, options, time);
					if (typeof me.onFrame === 'function') {
						try {
							me.onFrame.call(me, options, time);
						} catch (e) {
							logError(e);
						}
					}
				}
			};
		} else {
			definition.frame = function(event, options, time) {
				if (started && typeof me.onFrame === 'function') {
					try {
						me.onFrame(options);
					} catch (e) {
						logError(e);
					}
				}
			};
		}
		
		endFn = definition.end;
		if (typeof endFn === 'function') {
			definition.end = function(event, options) {
				if (started) {
					if (typeof me.onEnd === 'function') {
						try {
							me.onEnd.call(me, options);
						} catch (e) {
							logError(e);
						}
					}
					endFn.call(me, event, options);
					started = false;
				}
				current = false;
			};
		} else {
			definition.end = function(event, options) {
				if (started && typeof me.onEnd === 'function') {
					try {
						me.onEnd(options);
					} catch (e) {
						logError(e);
					}
				}
				started = false;
				current = false;
			};
		}

		teardownFn = definition._teardown;
		if (typeof teardownFn === 'function') {
			definition._teardown = function(options) {
				var parent;
				if (typeof me.onTeardown === 'function') {
					try {
						me.onTeardown.call(me, options);
					} catch (e) {
						logError(e);
					}
				}
				teardownFn.call(me, options);
				if (me.container && me.container.parentNode) {
					parent = me.container.parentNode;
					parent.removeChild(me.container);
					delete me.container;
				}
			};
		} else {
			definition._teardown = function(options) {
				var parent;
				if (typeof me.onTeardown === 'function') {
					try {
						me.onTeardown(options);
					} catch (e) {
						logError(e);
					}
				}
				if (me.container && me.container.parentNode) {
					parent = me.container.parentNode;
					parent.removeChild(me.container);
					delete me.container;
				}
			};
		}	
	};


	//'static' utility functions
	PopcornBaseEvent.prototype.toArray = function(data, delimiters) {
		var out;
		
		if (data === undefined) {
			return [];
		}

		if (Object.prototype.toString.call(data) === '[object Array]') {
			return data;
		}
		
		try {
			out = JSON.parse(data);
			if (Object.prototype.toString.call(out) !== '[object Array]') {
				out = [out];
			}
		} catch (e) {
			out = data;
		}
		
		if (delimiters && typeof out === 'string') {
			try {
				out = out.split(delimiters);
			} catch (er) {
			}
		}

		if (out !== undefined && out !== null &&
			Object.prototype.toString.call(out) !== '[object Array]') {
			return [out];
		}
		
		return out;
	};

	PopcornBaseEvent.prototype.toObject = function(data) {
		if (typeof data === 'object') {
			return data;
		}
		
		try {
			return JSON.parse(data);
		} catch (e) {
			return data;
		}
	};

	if (typeof document !== 'undefined' &&
		!(document.createElement('a')).classList ) {
			
		PopcornBaseEvent.prototype.addClass = function(element, classes) {
			var curClasses, i;
			if (!classes || !element || !element.getAttribute) {
				return;
			}

			classes = this.toArray(classes, /[\s\t\r\n ]+/);
			curClasses = element.getAttribute('class') || '';
			curClasses = curClasses.split(/[\s\t\r\n ]+/);
			
			for (i = 0; i < classes.length; i++) {
				if (curClasses.indexOf(classes[i]) < 0) {
					curClasses.push(classes[i]);
				}
			}

			element.setAttribute('class', curClasses.join(' '));
		};

		PopcornBaseEvent.prototype.removeClass = function(element, classes) {
			var curClasses, i, index;

			if (!classes || !element || !element.getAttribute) {
				return;
			}

			classes = this.toArray(classes, /[\s\t\r\n ]+/);
			curClasses = element.getAttribute('class') || '';
			curClasses = curClasses.split(/[\s\t\r\n ]+/);

			for (i = 0; i < classes.length; i++) {
				index = curClasses.indexOf(classes[i]);
				if (index >= 0) {
					curClasses.splice(index, 1);
				}
			}
			
			element.setAttribute('class', curClasses.join(' '));
		};
	} else {
		PopcornBaseEvent.prototype.addClass = function(element, classes) {
			var c, i;

			if (!element || !element.classList) {
				return;
			}

			c = this.toArray(classes, /[\s\t\r\n ]+/);

			for (i = 0; i < c.length; i++) {
				try {
					element.classList.add(c[i]);
				} catch (e) {}
			}
		};

		PopcornBaseEvent.prototype.removeClass = function(element, classes) {
			var c, i;

			if (!element || !element.classList) {
				return;
			}

			c = this.toArray(classes, /[\s\t\r\n ]+/);

			for (i = 0; i < c.length; i++) {
				try {
					element.classList.remove(c[i]);
				} catch (e) {}
			}
		};
	}

	PopcornBaseEvent.prototype.nop = function() {
	};

	// non-static methods

	//export to global Popcorn object
	Popcorn.basePlugin = function(name, plugin) {
		var bp = new PopcornBasePlugin(name, plugin);
		//return bp;
	};
	
}( window, Popcorn ));
