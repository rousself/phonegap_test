// Called when capture operation is finished
function captureSuccess(mediaFiles) {
	var i, len;
	for (i = 0, len = mediaFiles.length; i < len; i += 1) {
		uploadToServer(mediaFiles[i].fullPath,mediaFiles[i].name);
	}       
}

// Called if something bad happens.
function captureError(error) {
	var msg = 'An error occurred during capture: ' + error.code;
	navigator.notification.alert(msg, null, 'Uh oh!');
}

function uploadToServer(mediaFilePath,name) {
		var options = new FileUploadOptions();
		options.fileName=name; options.fileKey='Filedata';
		options.params=EmscConfig.video.params;
		var ft = new FileTransfer();
		ft.upload(mediaFilePath, EmscConfig.video.url, winTrans, failTrans, options);
}
function winTrans(r) {
	console.log("Code = " + r.responseCode);
	console.log("Response = " + r.response);
	console.log("Sent = " + r.bytesSent);
}
function failTrans(error) {
	console.log("An error has occurred: Code = " + error.code);
	console.log("upload error source " + error.source);
	console.log("upload error target " + error.target);
}



// A button will call this function
function captureVideo() {
	// Launch device video recording application,  allowing user to capture up to 2 video clips
	navigator.device.capture.captureVideo(captureSuccess, captureError, {limit: 1});
}
function Picture(SourceType) {
	navigator.camera.getPicture(
            function(imageData) {  console.log('ok picture');
				var npath = imageData.replace("file://localhost",'');
				//See more at: http://blog.workinday.com/application_smartphone/308-phonegap-prendre-et-uploader-une-photo-sur-ios-et-android.html#sthash.aazXljrv.dpuf
				uploadToServer(npath,npath.substr(npath.lastIndexOf('/')+1));
               // $('#image').attr('src', "data:image/jpeg;base64," + imageData);
            },
            function() { 
				console.log('Error taking picture');   
			},
            { quality: 50, targetWidth:600, encodingType: 0 /* 0=JPG 1=PNG*/, mediaType:2 /*all media allow*/,destinationType:1,saveToPhotoAlbum:true, sourceType: SourceType }	
     
	 );
			   // destinationType: Camera.DestinationType.DATA_URL, //0=DATA_URL (base64), 1=FILE_URI, 2=NATIVE_URI
				//sourceType: 1,      // 0:Photo Library, 1=Camera, 2=Saved Photo Album
				//encodingType: 0 ,    // 0=JPG 1=PNG
				//saveToPhotoAlbum: true,
}