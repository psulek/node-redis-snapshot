/* global Buffer */
var BufferBuilder = require('buffer-builder');
require("util-is");
var util = require('util');
var bufferXtra = require('./buffer-xtra.js');
var structure = require('./structure.js');

var defaultEncoding = 'utf8';

var HEADER_SIGNATURE = new Buffer('RSNS'); //'RSNS' aka 'Redis Snapshot'
var HEADER_VERSION = 0x01;
var HEADER_FLAGS = 0x00;
var HEADER_RESERVED1 = 0x00;

var BYTES_HEADER_SIGNATURE = HEADER_SIGNATURE.length;
var BYTES_HEADER_VERSION = 2;
var BYTES_HEADER_FLAGS = 4;
var BYTES_HEADER_RESERVED1 = 4;
var BYTES_HEADER = BYTES_HEADER_SIGNATURE + BYTES_HEADER_VERSION + BYTES_HEADER_FLAGS + BYTES_HEADER_RESERVED1;

var BYTES_DATE = 8;
var BYTES_UINT32 = 4;
var BYTES_INT32 = 4;
var BYTES_BYTE = 1;

var readBufferError = {
	None: 				0,
	IncompleteBuffer:   1,
	InvalidSignature:	2,
	UnsupportedVersion:	3,
	InvalidFlags:       4
};

function validateVersion(version){
	return version === HEADER_VERSION;
}

function validateFlags(flags){
	return flags === HEADER_FLAGS;
}

function readBuffer(buffer){
	if (!Buffer.isBuffer(buffer)) throw new Error('buffer is not a Buffer type!');

	var success = false;
	var errorCode = readBufferError.None;

	var bufferLength = buffer.length;
	var pos = 0;
	var snapshot = null;
	
	function availData(cnt) {
		return (pos + cnt) < bufferLength; 
	}

	success = bufferLength >= BYTES_HEADER;
	if (!success) errorCode = readBufferError.IncompleteBuffer;
	else {
		snapshot = {};
		
		// signature
		var header_signature = new Buffer(BYTES_HEADER_SIGNATURE);
		buffer.copy(header_signature, 0, pos, BYTES_HEADER_SIGNATURE)
		pos += BYTES_HEADER_SIGNATURE;

		success = bufferXtra.equals(header_signature, HEADER_SIGNATURE);
		if (!success) errorCode = readBufferError.InvalidSignature;

		// version
		var header_version = buffer.readUInt16LE(pos);
		pos += BYTES_HEADER_VERSION;
		
		if (success) {
			success = validateVersion(header_version);
			if (!success) errorCode = readBufferError.UnsupportedVersion;
		}

		// flags
		var header_flags = buffer.readUInt32LE(pos);
		pos += BYTES_HEADER_FLAGS;
		
		if (success) {
			success = validateFlags(header_flags);
			if (!success) errorCode = readBufferError.InvalidFlags;
		}
		
		// reserved1
		var header_reserved1 = buffer.readUInt32LE(pos);
		pos += BYTES_HEADER_RESERVED1;

		// snapshot date
		var snapshotDate = null;
		if (availData(BYTES_DATE)) {
			snapshotDate = new Date(buffer.readDoubleLE(pos)).getTime();
			pos += BYTES_DATE;
		}

		// snapshot description
		var snapshotDescLength = 0;
		var snapshotDesc = null;

		if (availData(BYTES_UINT32)) {
			snapshotDescLength = buffer.readUInt32LE(pos);
			pos += BYTES_UINT32;
		}
		
		if (snapshotDescLength > 0 && availData(snapshotDescLength)) {
			snapshotDesc = buffer.toString(defaultEncoding, pos, pos + snapshotDescLength);
			pos += snapshotDescLength;
		}

		// snapshot server
		var snapshotServerLength = null;
		var snapshotServer = null;

		if (availData(BYTES_UINT32)) {
			snapshotServerLength = buffer.readUInt32LE(pos);
			pos += BYTES_UINT32;
		}
		
		if (snapshotServerLength > 0 && availData(snapshotServerLength)) {
			snapshotServer = buffer.toString(defaultEncoding, pos, pos + snapshotServerLength);
			pos += snapshotServerLength;
		}
		
		// redis items
		var items = [];
		if (availData(BYTES_UINT32)) {
			var keyCount = buffer.readUInt32LE(pos);
			pos += BYTES_UINT32;
			
			// reqBytes => type + ttlFormat + ttl + keyLength
			var reqBytes = BYTES_BYTE + BYTES_BYTE + BYTES_UINT32 + BYTES_UINT32; 
			
			// read key list
			for (var i = 0; i < keyCount; i++) {
				if (availData(reqBytes)) {
					var keyType = buffer[pos];
					pos += BYTES_BYTE;
					
					var ttlFormat = buffer[pos];
					pos += BYTES_BYTE;
					
					var ttl = buffer.readUInt32LE(pos);
					pos += BYTES_UINT32;
					
					var keyLength = buffer.readUInt32LE(pos);
					pos += BYTES_UINT32;
					
					var key = null;
					if (keyLength > 0 && availData(keyLength)){
						key = new Buffer(keyLength);
						buffer.copy(key, 0, pos, keyLength);
						pos += keyLength;
					}
					
					var crc = null;
					if (availData(BYTES_INT32)){
						var crcLength = buffer.readInt32LE(pos);
						pos += BYTES_INT32;
						
						if (crcLength > 0 && availData(crcLength)){
							crc = new Buffer(crcLength)
							buffer.copy(crc, 0, pos, crcLength);
							pos += crcLength;
						}
					}
					
					var ttlInSeconds = ttlFormat === 2;
					var item = structure.createRedisItem(key, keyType, ttl, ttlInSeconds, 
							null, structure.DataFormats.Custom, crc);
					items.push(item);
				}
			}
			
			// read data list
			// reqBytes => dataFormat + dataLength;
			reqBytes = BYTES_BYTE + BYTES_INT32;
			for (var i = 0; i < keyCount; i++) {
				if (availData(BYTES_BYTE)){
					var dataFormat = buffer[pos];
					pos += BYTES_BYTE;
					
					var dataLength = buffer.readInt32LE(pos);
					pos += BYTES_INT32;
					
					var data = null;
					if (dataLength > 0 && availData(dataLength)){
						data = new Buffer(dataLength);
						buffer.copy(data, 0, pos, dataLength);
						pos += dataLength;
					}
					
					// update on redis items
					var item = items[i];
					item.dataFormat = dataFormat;
					item.data = data;
				}
			}
		}
		
		// fill snapshot field
		snapshot['header'] = {
			signature: header_signature,
			version: header_version,
			flags: header_flags,
			reserved1: header_reserved1
		};
		
		snapshot.date = snapshotDate;
		snapshot.description = snapshotDesc;
		snapshot.server = snapshotServer;
		snapshot.items = items;
	}

	return {
		success: success,
		errorCode: errorCode,
		snapshot: snapshot
	};
}

function createBuffer(snapshot, redisItems){
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
	b.appendDoubleLE(time);				// SNAPSHOT.date

	// SNAPSHOT.description
	var buffDesc = new Buffer(description, defaultEncoding);
	b.appendUInt32LE(buffDesc.length);	// STRING.stringLength
	b.appendBuffer(buffDesc);			// STRING.string

	// SNAPSHOT.server
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
		
		if (item.ttlFormat !== structure.TTLFormats.None)
			b.appendUInt32LE(item.ttl);	        // KEY.ttlValue

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

module.exports = {
	createBuffer: createBuffer,
	readBuffer: readBuffer
}