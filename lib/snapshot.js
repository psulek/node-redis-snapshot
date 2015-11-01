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

module.exports.createBuffer = function createBuffer(snapshot, redisItems){
	var date, description, server;
	
	if (!snapshot || !snapshot.date || !util.isDate(snapshot.date))
		date = new Date().getTime();
	else 
		date = snapshot.date.getTime();
		
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
	b.appendInt32LE(date);								// SNAPSHOT.date
	b.appendStringZero(description, defaultEncoding);	// SNAPSHOT.description
	b.appendStringZero(server, defaultEncoding);		// SNAPSHOT.server
	
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