/* global Buffer */
/* global it */
/* global describe */
//var assert = require('assert');
var chai = require("chai");
var expect = chai.expect;
var assert = chai.assert;

var snapshot = require('../lib/snapshot.js');
var bufferXtra = require('../lib/buffer-xtra.js');
var structure = require('../lib/structure.js');

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

	function validateBasics(readBufferResult, date, desc, server) {
		assert.equal(readBufferResult.success, true);
		assert.equal(readBufferResult.errorCode, 0);
		assert.isNotNull(readBufferResult.snapshot);
		assert.isNotNull(readBufferResult.snapshot.header);
		assert.isTrue(bufferXtra.equals(readBufferResult.snapshot.header.signature, HEADER_SIGNATURE));
		assert.equal(readBufferResult.snapshot.header.version, HEADER_VERSION);
		assert.equal(readBufferResult.snapshot.header.flags, HEADER_FLAGS);
		assert.equal(readBufferResult.snapshot.header.reserved1, HEADER_RESERVED1);
		assert.equal(readBufferResult.snapshot.date, date.getTime());
		assert.equal(readBufferResult.snapshot.description, desc);
		assert.equal(readBufferResult.snapshot.server, server);
	}

	it("creates snapshot buffer with header and basic snaphot info", function() {
		var date = new Date();
		var desc = 'This is description';
		var server = 'localhost:6379';
		var buffer = snapshot.createBuffer({description: desc, server: server, date: date}, []);
		
		var result = snapshot.readBuffer(buffer);
		validateBasics(result, date, desc, server);
	});

	it("creates snapshot buffer with one redis item", function() {
		var date = new Date();
		var desc = 'This is description';
		var server = 'localhost:6379';
		
		var keyBuffer = new Buffer([1, 2, 3]);
		var keyType = structure.KeyTypes.String;
		var ttl = 30;
		var ttlInSeconds = true;
		var dataBuffer = new Buffer('simple data');
		var dataFormat = structure.DataFormats.Custom;
		var computeCrc = true;
		var redisItem = structure.createRedisItem(keyBuffer, keyType, ttl, ttlInSeconds, dataBuffer, dataFormat, computeCrc);
		
		var buffer = snapshot.createBuffer({description: desc, server: server, date: date}, [redisItem]);
		
		var result = snapshot.readBuffer(buffer);
		validateBasics(result, date, desc, server);
		
		assert.isNotNull(result.snapshot.items);
		assert.equal(result.snapshot.items.length, 1);
		
		var item = result.snapshot.items[0];
		assert.isNotNull(item);
		assert.equal(bufferXtra.equals(item.key, keyBuffer));
		assert.equal(item.type, keyType);
		assert.equal(item.ttl, ttl);
		assert.equal(item.ttlFormat);
		assert.equal();
	});
});