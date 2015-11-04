// for use with browserify
var Buffer = require('buffer').Buffer;
require("util-is");
var util = require('util');

function equals(bufferA, bufferB, posA, posB, count) {
	if (!Buffer.isBuffer(bufferA)) throw new Error('bufferA is not Buffer!');
	if (!Buffer.isBuffer(bufferB)) throw new Error('bufferB is not Buffer!');

	if (bufferA.length === 0 && bufferB.length === 0) return true;

	if (!util.isNumber(posA) || posA < 0) posA = 0;
	if (!util.isNumber(posB) || posB < 0) posB = 0;
	if (!util.isNumber(count)) count = bufferA.length;

	count = Math.abs(count);

	if (posA >= bufferA.length || posB >= bufferB.length) return false;

	if (typeof bufferA.equals === 'function' &&
		posA == 0 && posB == 0 && count == bufferA.length)
			return bufferA.equals(bufferB);

	var countA = (posA + count) <= bufferA.length ? count : bufferA.length - posA;
	var countB = (posB + count) <= bufferB.length ? count : bufferB.length - posB;

	if (countA !== countB) return false;

	for (var i = 0; i < count; i++)
		if (bufferA[posA + i] !== bufferB[posB + i])
			return false;

	return true;
}

module.exports = {
	equals: equals
};


function formatStopwatch(num) {
    if (num < 1e3) {
        return num + 'ns';
    } else if (num >= 1e3 && num < 1e6) {
        return num / 1e3 + 'us';
    } else if (num >= 1e6 && num < 1e9) {
        return num / 1e6 + 'ms';
    } else if (num >= 1e9) {
        return num / 1e9 + 's';
    }
}

function stopWatch(lastTime) {
	if (lastTime) {
		var diff = process.hrtime(lastTime);
		return diff[0] * 1e9 + diff[1];
	}

	return process.hrtime();
}
/*
var size = 20971520 + 1; // 20MB
var buf1 = new Buffer(size);
var buf2 = new Buffer(size);

var idx = 0;
for (var i = 0; i < size; i++) {
	buf1[i] = idx++;
	buf2[i] = buf1[i];

	if (idx == 255)
		idx = 0;
}
buf1[size-1] = idx++;
buf2[size-1] = idx++;

console.log('buf1 count: ' + buf1.length); // util.inspect(buf1));
console.log('buf2 count: ' + buf2.length); //util.inspect(buf2));

console.log('Equls started...');
var startTime = stopWatch();
var eq = equals(buf1, buf2);
var endTime = stopWatch(startTime);

console.log('Equal ends, result: %s, it takes: %s', (eq ? 'equals' : 'diffs'), formatStopwatch(endTime));
*/