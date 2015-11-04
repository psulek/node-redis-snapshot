/* global Buffer */
require("util-is");
var util = require('util');
var crc32 = require('buffer-crc32');

/*var keyTypes = [
	0,  // String
	1,  // List
	2,  // Set
	3,  // SortedSet
	4,  // Hash
	255 // Unknown
];*/

var keyTypes = {
	String:    0,
	List:      1,
	Set:       2,
	SortedSet: 3,
	Hash:      4,
	Unknown:   255
};

var dataFormats = {
	RedisDump: 0,
	Custom:    1
};

var ttlFormats = {
	None: 0,
	Millis: 1,
	Seconds: 2,
}

function createRedisItem(keyBuffer, keyType, ttl, ttlFormat, dataBuffer, dataFormat, computeCrc){
	if (!util.isBuffer(keyBuffer))
		throw Error(util.format('keyBuffer is of type "%s" but Buffer type is required.', typeof(keyBuffer)));

	if (!util.isNumber(keyType))
		throw Error(util.format('keyType is of type "%s" but number is required.', typeof(keyType)));

	//if (keyTypes.indexOf(keyType) == -1)
	if (keyType < keyTypes.String || (keyType > keyTypes.Hash && keyType != keyTypes.Unknown))
		throw Error(util.format('keyType "%s" is invalid', keyType));

	if (ttl != null && !util.isNumber(ttl))
		throw Error(util.format('ttl is of type "%s" but number is required.', typeof(ttl)));

	if (dataBuffer != null && !util.isBuffer(dataBuffer))
		throw Error(util.format('dataBuffer is of type "%s" but Buffer type is required.', typeof(dataBuffer)));

	if (dataFormat < dataFormats.RedisDump || dataFormat > dataFormats.Custom)
		throw Error(util.format('dataFormat "%s" is invalid', dataFormat));

	if (ttlFormat < ttlFormats.None || ttlFormat > ttlFormats.Seconds)
		throw Error(util.format('ttlFormat "%s" is invalid', ttlFormat));

	var result = {
		key: keyBuffer,
		type: keyType,
		ttl: ttl == null ? 0 : ttl,
		ttlFormat: ttlFormat,
		data: dataBuffer,
		dataFormat: dataFormat,
		crc: null
	};
	if (ttl == null)
		result.ttlFormat = ttlFormats.None;

	if (util.isBuffer(computeCrc))
		result.crc = computeCrc;
	else {
		computeCrc = util.isUndefined(computeCrc) ? true : computeCrc;
		if (computeCrc && dataBuffer != null)
			result.crc = crc32(dataBuffer);
	}
	
	return result;
}

module.exports = {
	KeyTypes: keyTypes,
	DataFormats: dataFormats,
	TTLFormats: ttlFormats,
	createRedisItem: createRedisItem
};