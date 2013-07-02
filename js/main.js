var EmscConfig = {
api: {url: 'http://test-fred.emsc-csem.org:8080/service/api/1.0/get.json', key: 'apikey=addon', addon_key: '5A'},
socket_io: {url: 'http://test-fred.emsc-csem.org:8082/test'},
settings: {timers:2, min_mag:1,notPos:'RC',screenAlert:true,shakeAlert:true,shakeAlertMag:1,audioAlert:true,audioAlertMag:2},
audio: {url: 'http://test-fred.emsc-csem.org:8080/Tools/Audio/',test:{mag:4.5,region:'CENTRAL ITALY',ago:4}},
video: {url: 'http://test-fred.emsc-csem.org:8080/Earthquake/Contribute/Pictures/upload_multi.php'},
debug:true
};
var console={log:function(txt) { $('#wrapper').prepend('<p>'+txt+'</p>'); }};
var app={
	_firstPassage: true,
	_lastLastQuake: {id:0},
	_settings: EmscConfig.settings,
	_JsonUrl: EmscConfig.api.url,
	_apikey: EmscConfig.api.key,
	_addon_key: EmscConfig.api.addon_key,
	getParams: function() {
		return 'addon_key='+this._addon_key+'&'+this._apikey+'&min_mag='+this._settings.min_mag; 
		//return {addon_key: this._addon_key, };
	},

	initDb: function() {
		this._db= window.openDatabase("EmscDB", "1.0", "Emsc quakes", 200000);
		this._db.transaction(this.createDb, this.transaction_error, populateDB_success);
	},
	
	refresh: function() {	
		var self=this;
		 //document.fireEvent("deviceready");
		// FireEvent("deviceready",window);
		 //FireEvent("deviceready",document);
		$.support.cors = true;
		try {
		console.log('send http request');
		$.ajax({
                      url: self._JsonUrl,
					  type: 'POST',
                      data: self.getParams(),
                      cache: false,
					  crossDomain: true,
                      dataType: 'json',
                      success: function(req) { //alert(req);
						var quakes=req.result; 
						self._quakes=req.result; console.log('success '+req);
						self.createList();
						//self._storage.setItem('saveAllJson',JSON.stringify(quakes));  
						self._lastLastQuake=self._lastQuake;
						self._lastQuake=quakes[0]; //alert('normal '+JSON.stringify(quakes[0]));
						//if(self.isNewQuake()) self.setBadgeNew(); 
						//if(! self._firstPassage) self.alertAllMethods();
						//else if(self._settings.screenAlert){ self.alertScreen(); }
						self._firstPassage=false; 
					  },
					  error: function( xhr, textStatus, error) {
						console.log(xhr.responseText+'  '+xhr.status+'  '+textStatus);
						console.log('error http1 '+error.message);
					  }
					 
                    }).fail(function(jqXHR, textStatus, error) { showAlert( 'fail error http1 ' +error, textStaus); });
		} 
		catch(e) { console.log('catch error http1 ' +e.message);}	
		
		/*console.log('send http request 2');
		try {
		var xhr = new XMLHttpRequest();
	
		xhr.open("POST", self._JsonUrl, true);		
		xhr.onreadystatechange =  function () {  //req.onload =
			if(xhr.readyState==4 && xhr.status==200) { //alert(self._storage.constructor +'  '+print_r(self._storage));
				console.log('success2 '+xhr.responseText);
				var quakes=JSON.parse(xhr.responseText); quakes=quakes.result;    //this.alert('resp xhr '+JSON.stringify(quakes));
				self._quakes=quakes;
				self.createList();
			}
			else console.log(xhr.readyState+' ** '+xhr.status);
		};
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");   
		xhr.send(self.getParams());
		} 
		catch(e) { console.log(e.message);}	*/

	},
	refresh_realtime_connect: function() {
		
		this.socket = io.connect(EmscConfig.socket_io.url);
		var self=this;
		this.socket.on('connect', function () {
			//alert('Etat : Connected'); /* ne pas mettre d'alert pour safari dans les functions */
			//socket.on('disconnect', function() { /*self.log('Etat : Disconnected (Fermer)'); */});	
			self.socket.on('message', function (msg) { 
				//self.alert(JSON.stringify(msg)); 
				var data=JSON.parse(msg);  	var quake=data.data;
				var quakes=JSON.parse(self._storage.getItem('saveAllJson'));  
				
				if(data.data_status=='NEW') { //alert('NEW');
					//quakes.push(quake);	
					for(var i in quakes) {
						if(quake.time >= quakes[i].time) {
							if(i==0) { self._lastQuake=quake; self.setBadgeNew(); self.alertAllMethods(); }
							else { self.setBadgeNew(); } // new but not the most recent //
							break;
						}
					} //self.alert('add to array '+i+'  '+quake.time);
					quakes.splice(i, 0, quake); //add to array
				}		
				else if(data.data_status=='UPDATE') { //alert('UPDATE');
					for(var i in quakes) {
						if(quakes[i].id == quake.id) { quakes.splice(i, 1, quake); break; }
					}	//self.alert(i+'  '+quake.id +'  '+self._lastQuake.id);
					if(quake.id == self._lastQuake.id) { self._lastQuake=quake;  self.alertScreen();}
				}
				else if(data.data_status=='DELETE') { //alert('DEL');
					for(var i in quakes) {
						if(quakes[i].id == quake.id) { quakes.splice(i, 1); break; }
					} 	//self.alert(i+'  '+quake.id +'  '+self._lastQuake.id);
					if(quake.id == self._lastQuake.id) { self._lastQuake=quakes[0]; self.alertScreen();  } // if it was the most recent //	
				}
				self._storage.setItem('saveAllJson',JSON.stringify(quakes));  
			
			});
			
		});	
		
	},
	
	_storage: function() {
	
	},
	
	
	createDb: function(tx) {
		tx.executeSql('DROP TABLE IF EXISTS emsc');
		/*var sql = 
			"CREATE TABLE IF NOT EXISTS emsc ( "+
			"id INTEGER PRIMARY KEY AUTOINCREMENT, " +
			"firstName VARCHAR(50), " +
			"lastName VARCHAR(50), " +
			"title VARCHAR(50), " +
			"department VARCHAR(50), " + 
			"managerId INTEGER, " +
			"city VARCHAR(50), " +
			"officePhone VARCHAR(30), " + 
			"cellPhone VARCHAR(30), " +
			"email VARCHAR(30), " +
			"picture VARCHAR(200))";
		tx.executeSql(sql);*/
	},
	
	createList: function() {
		var quake=this._quakes;
		for (var i = 0; i<quake.length; i++) { 
			$('#quakesList').append('<li class="resRow"><a href="'+quake[i].url + '" class="handle">' +
				 '<span class="mag">'+quake[i].magnitude.mag.toFixed(1)+'</span>' + 
						'<strong>' + quake[i].flynn_region + '</strong><span class="resDetail">'+quake[i].time_str+'</span></a></li>');
		}
	}
	
};	

var app2={
	registerEvents: function() {
        $(window).on('hashchange', $.proxy(this.route, this));
        $('body').on('mousedown', 'a', function(event) {
            $(event.target).addClass('tappable-active');
        });
        $('body').on('mouseup', 'a', function(event) {
            $(event.target).removeClass('tappable-active');
        });
    },

    route: function() {
        var self = this;
        var hash = window.location.hash;
        if (!hash) {
            if (this.homePage) {
                this.slidePage(this.homePage);
            } else {
                this.homePage = new HomeView(this.store).render();
                this.slidePage(this.homePage);
            }
            return;
        }
        var match = hash.match(this.detailsURL);
        if (match) {
            this.store.findById(Number(match[1]), function(employee) {
                self.slidePage(new EmployeeView(employee).render());
            });
        }
    },
	slidePage: function(page) {

        var currentPageDest,
            self = this;

        // If there is no current page (app just started) -> No transition: Position new page in the view port
        if (!this.currentPage) {
            $(page.el).attr('class', 'page stage-center');
            $('body').append(page.el);
            this.currentPage = page;
            return;
        }

        // Cleaning up: remove old pages that were moved out of the viewport
        $('.stage-right, .stage-left').not('.homePage').remove();

        if (page === app.homePage) {
            // Always apply a Back transition (slide from left) when we go back to the search page
            $(page.el).attr('class', 'page stage-left');
            currentPageDest = "stage-right";
        } else {
            // Forward transition (slide from right)
            $(page.el).attr('class', 'page stage-right');
            currentPageDest = "stage-left";
        }

        $('body').append(page.el);

        // Wait until the new page has been added to the DOM...
        setTimeout(function() {
            // Slide out the current page: If new page slides from the right -> slide current page to the left, and vice versa
            $(self.currentPage.el).attr('class', 'page transition ' + currentPageDest);
            // Slide in the new page
            $(page.el).attr('class', 'page stage-center transition');
            self.currentPage = page;
        });
    },
	
	init: function() {
		this.registerEvents();
	}
};
 //$(function() { app.refresh(); /*app2.init();*/ });
 
 document.addEventListener("deviceready", onDeviceReady, true);
 function onDeviceReady() { console.log('listener begin'); app.refresh();}
 //window.onload=onDeviceReady2;
 function onDeviceReady2() { console.log('window begin'); app.refresh();} 
 $(function() {
    document.addEventListener("deviceready", function() { console.log('doc2 begin');  }, true);
});
 
 var position;
function onSuccessPos(position2) {
	position=position2;
	console.log(JSON.stringify(position));
}
function onErrorPos(error) {
       console.log('code: '+error.code+ '\n' +'message: ' + error.message + '\n');
} 
 
 function FireEvent(name,element) {
	var event;
	  if (document.createEvent) {
		event = document.createEvent("HTMLEvents");
		event.initEvent(name, true, true);
	  } else {
		event = document.createEventObject();
		event.eventType = name; event.type=name; event.name=name;
	  }

  event.eventName = name;
  //event.memo = memo || { };

  if (document.createEvent) element.dispatchEvent(event);
  else  element.fireEvent("on" + event.eventType, event);
  
 }
 
 
function showAlert (message, title) {
	$('#wrapper').prepend('<p>'+title+'<br/>'+message+'</p>');
  return;
      if (navigator.notification) {
            navigator.notification.alert(message, null, title, 'OK');
      } else {
            alert(title ? (title + ": " + message) : message);
       }
}
function loc() {
	if (!navigator.geolocation) { showAlert("geolocation API not supported", "Error"); }
	else	navigator.geolocation.getCurrentPosition(onSuccessPos, onErrorPos);
}
function Picture() {
        //event.preventDefault();
       // console.log('changePicture');
	    
        if (!navigator.camera) {
            showAlert("Camera API not supported", "Error");
            return;
        }
        var options =   {   //quality: 50,
                           // destinationType: Camera.DestinationType.DATA_URL,
							//sourceType: 1,      // 0:Photo Library, 1=Camera, 2=Saved Photo Album
                            //encodingType: 0 ,    // 0=JPG 1=PNG
							//saveToPhotoAlbum: true,
							//destinationType: Camera.DestinationType.FILE_URI,
                            //sourceType: Camera.PictureSourceType.PHOTOLIBRARY
							quality: 50, targetWidth:600
                        };
try {
	console.log('go picture');
        navigator.camera.getPicture(
            function(imageData) {  console.log('ok picture');
				var imageURI=imageData;
				var npath = imageData.replace("file://localhost",'');
				var path = imageData.replace("file://localhost",'');
				//See more at: http://blog.workinday.com/application_smartphone/308-phonegap-prendre-et-uploader-une-photo-sur-ios-et-android.html#sthash.aazXljrv.dpuf
				uploadPhoto(npath);
               // $('#image').attr('src', "data:image/jpeg;base64," + imageData);
            },
            function() {
                console.log('Error taking picture');
            },
            options);
	} catch(e) {
		console.log(e.message);
	}			

        return false;
}

function uploadPhoto(imageURI) {
try {
            var options = new FileUploadOptions();
            options.fileKey='Filedata';//"file"; //
            options.fileName=imageURI.substr(imageURI.lastIndexOf('/')+1);
            options.mimeType="image/jpeg";

            var params = new Object();
            params.evid = 0;
            params.position = position;

            options.params = params;

            var ft = new FileTransfer();
            ft.upload(imageURI, EmscConfig.video.url/*+'?evid=0'*/, winPics, failPics, options);
			
			
	} catch(e) {
		console.log(e.message);
	}	
	loc();
}
function winPics(r) {
	console.log("Code = " + r.responseCode);
	console.log("Response = " + r.response);
	console.log("Sent = " + r.bytesSent);
}

function failPics(error) {
	console.log("An error has occurred: Code = " + error.code);
	console.log("upload error source " + error.source);
	console.log("upload error target " + error.target);
}

 