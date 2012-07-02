// PLUGIN: style

(function (Popcorn) {

	"use strict";

	Popcorn.basePlugin('style', function (options, base) {
		if (!base.target) {
			base.target = this.media;
		}

		base.animate(base.target);

		if (options.classes) {
			base.addClass(base.target, options.classes);
		}

		/*
		We don't even need to specify start/frame/end/_teardown methods here,
		since base.animate takes care of all that for us.
		*/
	}, {
		about: {
			name: 'Popcorn Style Plugin',
			version: '0.1',
			author: 'Brian Chirls, @bchirls',
			website: 'http://github.com/brianchirls'
		}
	});
}(Popcorn));
