exports = module.exports = BaiduStorage;

var fs   = require('fs');
var path = require('path');
var mime = require('mime');
var baidu= require('./api');
var common = require('./common');

function BaiduStorage() {
	
	return;
}

BaiduStorage.login = function(accesskey, secretkey, bucket, onDone) {
	
	var userInfo = {accesskey: accesskey, secretkey: secretkey, bucket: bucket, authProvider: 'baidu'};

	onDone(userInfo);
};

BaiduStorage.setUserInfo = function(userInfo) {
	if(userInfo) {
		this.bucket = userInfo.bucket;
		this.accesskey = userInfo.accesskey;
		this.secretkey = userInfo.secretkey;
		this.handle = new baidu(this.bucket, this.accesskey, this.secretkey);
	}

	return;
};

BaiduStorage.getBucketUsage = function(onDone) {
	
	//TODO
}

BaiduStorage.getFolderUsage = function(onDone) {
	//TODO
};

BaiduStorage.getFileInfo = function(subPath, onDone) {
	this.handle.headObject(subPath, function (err, result) {
		
		if(err) {
			return onDone({code: -1, message: err.message});
		}
		else {
			return onDone({code: 0, message: 'success', data: result.headers});					
		}
	});
};

BaiduStorage.normalizeItems = function (items, srcPath, bucket) {
	var total = items.length;

	for(var i = 0; i < total; i++) {
		var iter = items[i];
		iter.name = path.basename(iter.object);
		iter.time = iter.mdatetime;
		iter.type = (parseInt(iter.is_dir) ? 'folder' : 'file');
		iter.publicURL = 'http://bcs.duapp.com/' + bucket + iter.object;

		delete(iter.content_md5);
		delete(iter.object);
		delete(iter.mdatetime);
		delete(iter.ref_key);
		delete(iter.version_key);
		delete(iter.superfile);
		delete(iter.parent_dir);

		items[i] = iter;
	}

	return items;
};

BaiduStorage.list = function(subPath, onDone) {
	
	var ret = {code: 0, message: 'success', data: {}};

	var me = this;
	this.handle.listObjectByDir(subPath, 2, function (err, result) {
		if(err) {
			return onDone({code: -1, message: err.message});				
		}	
		else {
			if(result.statusCode != 200) {
				return onDone({code: -1, message: result});				
			}
			else {
				var items = [];			
				var data = JSON.parse(result.data);
				if(data.object_total > 0) {
					items = BaiduStorage.normalizeItems(data.object_list,
						subPath, me.bucket);
				}
				onDone({code: 0, message:'success', data: items});
			}
		}
	});
};

BaiduStorage.makeDir = function(subPath, onDone) {
	
	remotePath = subPath + '/empty';
	remotePath = path.normalize(remotePath);

	var me = this;
	this.handle.putObject(remotePath, null, null, null, function(err, result) {
		if(err) {
			return onDone({code: -1, message: err.message});
		}
		else {
			if(result.error) {
				return onDone({code: -1, message: result.error});		
			}
			else {
					me.handle.deleteObject(remotePath, function(err, result) {
					
					if(err) {
						return onDone({code: -1, message: err.message});
					}
					else {
						if(result.error) {
							return onDone({code: -1, message: result.error});		
						}
						else {
							return onDone({code: 0, message: 'success'});
						}
					}
				});	
			}
		}
	});
};

BaiduStorage.remove = function(subPath, onDone) {
	
	this.handle.deleteObject(subPath, function(err, result) {
		if(err) {
			return onDone({code: -1, message: err.message});
		}
		else {
			if(result.error) {
				return onDone({code: -1, message: result.error});		
			}
			else {
				return onDone({code: 0, message: 'success'});	
			}
		}
	});
};

BaiduStorage.read = function(subPath, onDone) {
	var tmpPath = '/tmp/' + common.guid();
	this.handle.getObject(subPath, tmpPath, function(err, result) {
		
		if(err) {
			return onDone("text/plain", null, err.message);
		}
		else {
			if(result.error) {
				onDone("text/plain", null, result.error);	
			}
			else {
				onDone(result.headers['content-type'], {stream: fs.createReadStream(tmpPath)});	
				fs.unlink(tmpPath);
			}
		}
	});	
};

BaiduStorage.write = function(subPath, content, opts, onDone) {
	subPath = path.normalize(subPath);	
	this.handle.putObject(subPath, content.data || content.path ||content.file.path, 
		'text/plain', opts, function(err, result) {
			if(err) {
				return onDone({code: -1, message: err.message});
			}
			else {
				if(result.error) {
					onDone({code: -1, message: result.error});
				}
				else {
					onDone({code: 0, message: 'success'});	
				}
			}
		});
};

BaiduStorage.copy = function(srcPath, dstPath, onDone) {
	
	this.handle.copyObject(srcPath, dstPath, function(err, result) {
		if(err) {
			return onDone({code: -1, message: err.message});
		}
		else {
			if(result.error) {
				return onDone({code: -1, message: result.error});
			}
			else {
				return onDone({code: 0, message: 'success'});	
			}
		}
	});
};

BaiduStorage.rename = function(srcName, dstName, onDone) {
	
	var me = this;
	this.copy(srcName, dstName, function(result) {
		if(result.code) {
			return onDone(result);		
		}
		else {
			return me.remove(srcName, onDone);	
		}
	});
};
