/* global it */
/* global describe */
var assert = require('assert');
var expect = require("chai").expect;
var snapshot = require('./lib/snapshot.js');

describe('buffer', function() {
	describe('creates simple buffer', function(){
		it("simple buffer without explicit date", function() {
			var buffer = snapshot.createBuffer({description: 'This is description', server: ''}, []);
			//except(buffer).
		});
	});
});