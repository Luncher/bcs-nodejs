var fs = require('fs');
var Url = require('url');
var http = require('http');
var crypto = require('crypto');
var querystring = require('querystring');
var pkg = require('./package.json');

function Utils() {
	
	return;
}

Utils.makeContent = function(method, bucket, object, time, ip, size) {
	
	var flag = 'MBO';
	var content = ("Method=" + method + "\n" + "Bucket=" + bucket + "\n" + "Object=" + object + "\n");
	if(time) {
		flag += 'T';
		content += 'Time=' + time + "\n";
	}
	if(ip) {
		flag += 'I';
		content += 'Ip=' + ip+ "\n";
	}
	if(size) {
		flag += 'S';
		content += 'Size=' + size + "\n";
	}

	return flag + "\n" + content;
};

Utils.makeSign = function(accessKey, secretKey, method, bucket, object, time, ip, size) {

	if(object.indexOf('/') !== 0) {
		object = '/' + object;
	}

	console.log('object: ' + object);
	var content = Utils.makeContent(method, bucket, object, time, ip, size);	

	var hash = crypto.createHmac('sha1', secretKey).update(content).digest();
	var signature = hash.toString('base64');

	var flags = content.split("\n")[0];

	return 'sign=' + flags + ':' + accessKey + ':' + encodeURIComponent(signature);
};

Utils.genReqOpts = function(thisConf, method, remotePath, dateLimit, 
				ipLimit, sizeLimit, length, custom) {

	var headers = custom || {};
	
	if(remotePath.indexOf('/') !== 0) {
		remotePath = '/' + remotePath;
	}
	
	var subPath = remotePath.split('?');
	var params = subPath[0].split('/');
	bucket = params[1] || '';
	params.shift();
	params.shift();
	object = params.join('/');

//	console.log('remotePath: ' + remotePath);
//	console.log('bucket: ' + bucket);
//	console.log('object: ' + object);

	var contentLength = length || 0;
	headers['Content-Length'] = contentLength;
	headers.Date = (new Date()).toGMTString();

	var sign = Utils.makeSign(thisConf.accesskey, thisConf.secretkey, 
				method, bucket, object, dateLimit, ipLimit, sizeLimit);
	if(remotePath.indexOf('?') < 0) {
		remotePath += '?';
	}
	else {
		remotePath += '&';
	}
	path = remotePath + sign;
	headers.Host = thisConf.endpoint;
	headers['User-Agent'] = thisConf.userAgent || Utils.makeUserAgent();
	
	var opts = {
		method: method,
		headers: headers,
		path: path,
		hostname: thisConf.endpoint
	};

	return opts;
};

Utils.makeUserAgent = function() {
	return 'Kid/v' + pkg.version + '(' + process.platform + ';' + process.arch + ')' + 'Node/' + process.version;
};

Utils.request = function(options, fileToUpload, fileDownloadTo, callback) {
		
	var resData = '';
	var req = http.request(options, function(res) {
		if(fileDownloadTo) {
			var ws = fs.createWriteStream(fileDownloadTo);	
			res.pipe(ws);
			ws.on('finish', function() {
				callback(null, {
					statusCode: res.statusCode,
					headers: res.headers,
					data: resData
				});
			});
		}
		else {
			res.setEncoding('utf-8');	
			res.on('data', function (chunk) {
				resData += chunk;
			});
			res.on('end', function () {
				if(res.statusCode > 400) {
					var result = {
						statusCode: res.statusCode,
						error: {
							code: res.statusCode,
							message: resData
						},
						headers: res.headers
					};
					callback(null, result);
				} 
				else {
					callback(null, {
						statusCode: res.statusCode,
						headers: res.headers,
						data: resData
					});	
				}
			});
			res.on('error', function(err) {
				callback(err);			
			});
		}
	});

	if(fileToUpload && fs.existsSync(fileToUpload)) {
		
		var rs = fs.createReadStream(fileToUpload);
		rs.pipe(req, {end: false});
		rs.on('close', function() {
			req.end();	
		});
	}
	else if(fileToUpload) {
		req.write(fileToUpload);
		req.end();
	}
	else {
		req.end();
	}

	req.on('error', function(err) {
		callback(err);
	});
};


module.exports = exports.utils = Utils;
