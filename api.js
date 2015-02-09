var fs    = require('fs');
var path  = require('path');
var mime  = require('mime');
var utils = require('./utils');
var querystring = require('querystring');

function BCS(bucket, accesskey, secretkey) {
	this.conf = {
		bucket: bucket,
		accesskey: accesskey,
		secretkey: secretkey,
		endpoint: 'bcs.duapp.com'
	}

	return;
}

BCS.prototype.getConf = function(key) {
	if(this.conf[key]) {
		return this.conf[key];
	}
	return null;
};

BCS.prototype.setConf = function(key, value) {
	this.conf[key] = value;
};

BCS.prototype.putBucket = function(bucketName, callback) {

	if(bucketName.indexOf('/') !== 0) {
		bucketName = '/' + bucketName;
	}

	var opts = utils.genReqOpts(this.conf, 'PUT', bucketName);
	utils.request(opts, null, null, function(err, result) {
		if(err)	{
			return callback(err);	
		}
		else {
			return callback(null, result);
		}
	});
};

BCS.prototype.listBucket = function(callback) {
	var opts = utils.genReqOpts(this.conf, 'GET', '/');	
	utils.request(opts, null, null, function(err, result) {
		if(err) {
			return callback(err);
		}

		return callback(null, result);
	});
};

BCS.prototype.deleteBucket = function(bucketName, callback) {
	var opts = utils.genReqOpts(this.conf, 'DELETE', bucketName);
	utils.request(opts, null, null, function(err, result) {
		if(err) {
			return callback(err);
		}

		return callback(null, result);
	});
};

BCS.fixPath = function(srcPath, bucket) {
		
	var remotePath = srcPath;

	if(srcPath.indexOf(bucket) < 0) {
		remotePath = (bucket + '/' + srcPath);
	}
	remotePath = path.normalize('/' + remotePath);

	return remotePath;
};

BCS.prototype.putObject = function(dstPath, fileToUpload, type, opts, callback) {

	var contentLength = 0;
	var opts = opts || {};

	if(type) {
		opts['Content-Type'] = type;
	}
	else {
		if(fileToUpload) {
			opts['Content-Type'] = mime.lookup(fileToUpload);
		}
	}

	var remotePath = BCS.fixPath(dstPath, this.conf.bucket);

	var isFile = fs.existsSync(fileToUpload);
	if(isFile) {
		contentLength = fs.statSync(fileToUpload).size;	
	}
	else if (fileToUpload) {
		contentLength = fileToUpload.length;	
	}
	
	var me = this;
	function _upload() {
		var options = utils.genReqOpts(me.conf, 'PUT', remotePath, 
				null, null, null, contentLength, opts);	
		utils.request(options, fileToUpload, null, function(err, result) {
			if(err) {
				return callback(err);
			}
			return callback(null, result);
		});
	}

	_upload();

	return;
};

BCS.prototype.copyObject = function(srcPath, dstPath, callback) {
	
	var src = BCS.fixPath(srcPath, this.conf.bucket);
	var dst = BCS.fixPath(dstPath, this.conf.bucket);

	src = 'http://' + this.conf.endpoint + src;
	var options = utils.genReqOpts(this.conf, 'PUT', 
		dst, null, null, null, 0, {'x-bs-copy-source': src});	
	
	utils.request(options, null, null, function(err, result) {
		if(err) {
			return callback(err);
		}	
		return callback(null, result);
	});
};

BCS.prototype.putSuperFile = function(localPath, callback) {
	//TODO
};

BCS.prototype.getObject = function(remotePath, localPath, callback) {

	remotePath = BCS.fixPath(remotePath, this.conf.bucket);

	var options = utils.genReqOpts(this.conf, 'GET', remotePath);		
	utils.request(options, null, localPath, function(err, result) {
		if(err) {
			return callback(err);
		}	
		else {
			return callback(null, result);
		}
	});
};

BCS.prototype.headObject = function(remotePath, callback) {
	remotePath = BCS.fixPath(remotePath, this.conf.bucket);
	var options = utils.genReqOpts(this.conf, 'HEAD', remotePath);	
	utils.request(options, null, null, function(err, result) {
		if(err) {
			return callback(err);
		}
		else {
			return callback(null, result);
		}
	});
};

BCS.prototype.listObject = function(remotePath, callback) {

	remotePath = remotePath || this.conf.bucket;
	remotePath = BCS.fixPath(remotePath, this.conf.bucket);
	var options = utils.genReqOpts(this.conf, 'GET', remotePath);	
	utils.request(options, null, null, function(err, result) {
		if(err) {
			return callback(err);
		}
		else {
			return callback(null, result);
		}
	});

};

BCS.fixPrefix = function(srcPath, bucket) {
	
	if(srcPath.charAt(0) !== '/') {
		srcPath = '/' + srcPath;
	}
	if(srcPath.charAt(srcPath.length - 1) !== '/') {
		srcPath = srcPath + '/';
	}

	if(srcPath.indexOf('/' + bucket) >= 0) {
		return srcPath.split('/' + bucket)[1];		
	}

	return srcPath;
};

BCS.prototype.listObjectByDir = function(prefix, listModel, callback) {
	
	listModel = listModel || 2;
	prefix = prefix || '/';
	prefix = BCS.fixPrefix(prefix, this.conf.bucket);

	//console.log('prefix: ' + prefix);
	var query = querystring.stringify({
		dir: listModel,
		prefix:prefix 
	});
	remotePath = '/' + this.conf.bucket + '?' + query;
	//console.log('remotePath: ' + remotePath);
	var options = utils.genReqOpts(this.conf, 'GET', remotePath);
	utils.request(options, null, null, function(err, result) {
		if(err) {
			return callback(err);
		}
		else {
			return callback(null, result);
		}
	});
};

BCS.prototype.deleteObject = function(remotePath, callback) {

	remotePath = BCS.fixPath(remotePath, this.conf.bucket);
	var options = utils.genReqOpts(this.conf, 'DELETE', remotePath);
	utils.request(options, null, null, function(err, result) {
		if(err) {
			return callback(err);
		}
		else {
			return callback(null, result);
		}
	});
};

module.exports = exports.BCS = BCS;
