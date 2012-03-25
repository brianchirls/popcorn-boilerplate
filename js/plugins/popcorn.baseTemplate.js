(function (Popcorn) {

"use strict";

	Popcorn.basePlugin( 'baseTemplate' , function(options, base) {
		var popcorn = this,
			media = popcorn.media;

		return {
			start: function( event, options ) {
			},
			end: function( event, options ) {
			},
			_teardown: function( options ) {
			}
		};
	});
})( Popcorn );
