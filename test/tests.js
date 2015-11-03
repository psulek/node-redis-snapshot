/* global Buffer */
/* global it */
/* global describe */
var assert = require('assert');
var expect = require("chai").expect;
var snapshot = require('../lib/snapshot.js');
var bufferXtra = require('../lib/buffer-xtra.js');

describe('buffer-extra', function() {
	it('compare two buffers with zero bytes', function() {
		var bufferA = new Buffer([]);
		var bufferB = new Buffer([]);
		assert.equal(bufferXtra.equals(bufferA, bufferB), true);
	});
	
	it('compare two buffers with different length', function() {
		var bufferA = new Buffer([1]);
		var bufferB = new Buffer([1,2]);
		assert.equal(bufferXtra.equals(bufferA, bufferB), false);
	});

	it('compare two buffers with same length but different values', function() {
		var bufferA = new Buffer([1,3]);
		var bufferB = new Buffer([1,2]);
		assert.equal(bufferXtra.equals(bufferA, bufferB), false);
	});

	it('compare two buffers with same length and same values', function() {
		var bufferA = new Buffer([1,2]);
		var bufferB = new Buffer([1,2]);
		assert.equal(bufferXtra.equals(bufferA, bufferB), true);
	});

	it('compare two buffers starting at same position and same count', function() {
		var bufferA = new Buffer([1,2,3,4]);
		var bufferB = new Buffer([1,2,3,4]);
		assert.equal(bufferXtra.equals(bufferA, bufferB, 2, 2, 2), true);
	});

	it('compare two buffers starting at different position and same count', function() {
		var bufferA = new Buffer([1,2,3,4]);
		var bufferB = new Buffer([1,2,3,4]);
		assert.equal(bufferXtra.equals(bufferA, bufferB, 2, 1, 2), false);
	});

	it('compare two buffers starting at different position and count exceed length of both buffers', function() {
		var bufferA = new Buffer([1,2,3,4]);
		var bufferB = new Buffer([1,2,3,4]);
		assert.equal(bufferXtra.equals(bufferA, bufferB, 2, 2, 5), true);
	});

	it('compare two buffers starting at specific position for first buffer and full test for second buffer', function() {
		var bufferA = new Buffer([1,2,3,4]);
		var bufferB = new Buffer([3,4]);
		assert.equal(bufferXtra.equals(bufferA, bufferB, 2, 0, 2), true);
	});

	it('compare two buffers with negative count value', function() {
		var bufferA = new Buffer([1,2,3,4]);
		var bufferB = new Buffer([3]);
		assert.equal(bufferXtra.equals(bufferA, bufferB, 2, 0, -1), true);
	});
});


describe('buffer', function() {
	var HEADER_SIGNATURE = new Buffer('RSNS'); //'RSNS' aka 'Redis Snapshot'
	var HEADER_VERSION = 0x01;
	var HEADER_FLAGS = 0x00;
	var HEADER_RESERVED1 = 0x00;

	
	it("creates snapshot buffer with header and basic snaphot info", function() {
		var date = new Date();
		var buffer = snapshot.createBuffer({description: 'This is description', server: '', date: date}, []);
		
		var pos = 0;
		assert.equal(bufferXtra.equals(buffer, HEADER_SIGNATURE, 0, 0, 4), true);
		pos += 4;
		
		assert.equal(buffer.readUInt16LE(pos), HEADER_VERSION);
		pos += 2;

		assert.equal(buffer.readUInt32LE(pos), HEADER_FLAGS);
		pos += 4;

		assert.equal(buffer.readUInt32LE(pos), HEADER_RESERVED1);
		pos += 4;

		var bufferDate = new Date(buffer.readDoubleLE(pos)).getTime(); 
		assert.equal(bufferDate, date.getTime());
		pos += 8;
		
		var bufferDesc = buffer.readUInt32LE(pos);
	});
});