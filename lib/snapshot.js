/* global Buffer */
var BufferBuilder = require('buffer-builder');
require("util-is");
var util = require('util');

var defaultEncoding = 'utf8';

//var HEADER_SIGN = [82,83,78,83]; //'RSNS' aka 'Redis Snapshot'
var HEADER_SIGNATURE = new Buffer('RSNS'); //'RSNS' aka 'Redis Snapshot'
var HEADER_VERSION = 0x01;
var HEADER_FLAGS = 0x00;
var HEADER_RESERVED1 = 0x00;

var BYTES_HEADER_SIGNATURE = HEADER_SIGNATURE.length;
var BYTES_HEADER_VERSION = 2;
var BYTES_HEADER_FLAGS = 4;
var BYTES_HEADER_RESERVED1 = 4;
var BYTES_HEADER = BYTES_HEADER_SIGNATURE + BYTES_HEADER_VERSION + BYTES_HEADER_FLAGS + BYTES_HEADER_RESERVED1;

function readBuffer(buffer){
	if (!Buffer.isBuffer(buffer)) throw new Error('buffer is not a Buffer type!');

	var len = buffer.length;
	
	if (len < BYTES_HEADER) throw new Error('buffer is not complete!');
	var pos = 0;
	
	var header_signature = new Buffer(BYTES_HEADER_SIGNATURE);
	buffer.copy(header_signature, 0, pos, BYTES_HEADER_SIGNATURE)
	pos += BYTES_HEADER_SIGNATURE;
	
	var header_version = buffer.readUInt16LE(pos);
	pos += BYTES_HEADER_VERSION;

	var header_flags = buffer.readUInt32LE(pos);
	pos += BYTES_HEADER_FLAGS;

	var header_reserved1 = buffer.readUInt32LE(pos);
	pos += BYTES_HEADER_RESERVED1;

	var bufferDate = new Date(buffer.readDoubleLE(pos)).getTime(); 
	assert.equal(bufferDate, date.getTime());
	pos += 8;
	
	var bufferDesc = buffer.readUInt32LE(pos);
}

module.exports.createBuffer = function createBuffer(snapshot, redisItems){
	var time, description, server;
	
	if (!snapshot || !snapshot.date || !util.isDate(snapshot.date))
		time = Date.now();
	else 
		time = snapshot.date.getTime();
		
	if (!snapshot || !snapshot.description)
		description = '';
	else
		description = snapshot.description;

	if (!snapshot || !snapshot.server)
		server = '';
	else
		server = snapshot.server;
		
	if (!redisItems || !util.isArray(redisItems))
		redisItems = [];
	var keyCount = redisItems.length;
		
	// write HEADER structure
	var b = new BufferBuilder();
	b.appendBuffer(HEADER_SIGNATURE);    // HEADER.signature
	b.appendUInt16LE(HEADER_VERSION);	 // HEADER.version
	b.appendUInt32LE(HEADER_FLAGS);		 // HEADER.flags
	b.appendUInt32LE(HEADER_RESERVED1);  // HEADER.reserved1
	
	// write SNAPSHOT structure
	b.appendDoubleLE(time);								// SNAPSHOT.date
	
	// SNAPSHOT.description
	//b.appendStringZero(description, defaultEncoding);
	var buffDesc = new Buffer(description, defaultEncoding);
	b.appendUInt32LE(buffDesc.length);	// STRING.stringLength
	b.appendBuffer(buffDesc);			// STRING.string
	
	// SNAPSHOT.server
	//b.appendStringZero(server, defaultEncoding);
	var buffServer = new Buffer(server, defaultEncoding);
	b.appendUInt32LE(buffServer.length);	// STRING.stringLength
	b.appendBuffer(buffServer);				// STRING.string
	
	// write key count
	b.appendUInt32LE(keyCount);	// FILE.keyCount
	
	// write keyList			// FILE.keyList
	for (var i = 0; i < redisItems.length; i++) {
		var item = redisItems[i];
		
		// write KEY structure
		b.appendFill(item.type, 1);			// KEY.type
		b.appendFill(item.ttlFormat, 1);	// KEY.ttlFormat
		b.appendUInt32LE(item.ttlValue);	// KEY.ttlValue
		b.appendUInt32LE(item.key.length);	// KEY.keyLength
		b.appendBuffer(item.key)			// KEY.key
		
		// write CRC structure
		b.appendInt32LE(item.crc == null ? 0 : item.crc.length) // CRC.crcLength
		if (item.crc != null)
			b.appendBuffer(item.crc);							// CRC.crc
	}
	
	// write dataList			// FILE.dataList
	for (var i = 0; i < redisItems.length; i++) {
		var item = redisItems[i];
		
		b.appendFill(item.dataFormat, 1);							// DATA.dataFormat
		b.appendInt32LE(item.data == null ? 0 : item.data.length);	// DATA.dataLength
		if (item.data != null)
			b.appendBuffer(item.data);								// DATA.data
	}
	
	return b.get();
}