// for use with browserify
var Buffer = require('buffer').Buffer;
var util = require('util');

function equals(bufferA, posA, countA, bufferB, posB, countB) {
	if (!Buffer.isBuffer(bufferA))
		throw new Error('bufferA is not Buffer!');

	if (!Buffer.isBuffer(bufferB))
		throw new Error('bufferB is not Buffer!');

	if (!util.isNumber(posA))
		posA = 0;

	if (!util.isNumber(countA))
		countA = bufferA.length;

	if (!util.isNumber(posB))
		posB = 0;

	if (!util.isNumber(countB))
		countB = bufferB.length;

	if (typeof bufferA.equals === 'function' &&
		posA == posB && posA == 0 && countA == countB && countA == bufferA.length)
		return bufferA.equals(bufferB);

	if (bufferA.length !== bufferB.length)
		return false;

	for (var i = 0; i < bufferA.length; i++) {
		if (bufferA[i] !== bufferB[i])
			return false;
	}

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