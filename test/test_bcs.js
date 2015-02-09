var fs = require('fs');
var BaiduStorage = require('./baidu_storage');

BaiduStorage.login('SBWpDDhFAGF5WhyIaaYLK9p7', 
	'ayCRZ0XwiLb1WGApQVqA4TzZaQzc4qLR', 'luncher2', function(userInfo) {
		BaiduStorage.setUserInfo(userInfo);
	}
);

BaiduStorage.list('/luncher2/dd', function(result) {
	console.log(result);
	if(!result.code) {

		BaiduStorage.makeDir('/luncher2/newdir1', function(result) {
			console.log(result);

			BaiduStorage.write('luncher2/newdir1/imagexx.png', {path:'./image.png'}, null, function(result) {
				console.log(result);

				BaiduStorage.read('newdir1/imagexx.png', function(contentType, content) {
					var ws = fs.createWriteStream('./down-xxx.png');	
					console.log('content-type: ' + contentType);
					content.stream.pipe(ws);
					BaiduStorage.rename('/luncher2/newdir1/imagexx.png', 'luncher2/newdir1/image2x.png', function(result) {
						console.log(result);			
						BaiduStorage.remove('/newdir1/image2x.png', function(result) {
							console.log(result);
							BaiduStorage.remove('/newdir1/', function(result) {
								console.log(result);
							});
						});
					});
				});
			});
		});	
	}
});
