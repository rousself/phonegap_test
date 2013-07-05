

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
		this._db.transaction(this.createDb, this.transactionDb_error, this.populateDB_success);
	},
	transactionDb_error: function(error) {
		console.log('transaction Db error '+error);
	},
	populateDB_success: function () {
	
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
						if(! self._firstPassage) self.alertAllMethods();
						else if(self._settings.screenAlert){ self.alertScreen(); }
						self._firstPassage=false; 
						self.refresh_realtime_connect();
					  },
					  error: function( xhr, textStatus, error) {
						console.log(xhr.responseText+'  '+xhr.status+'  '+textStatus);
						console.log('error http1 '+error.message);
					  }
					 
                    }).fail(function(jqXHR, textStatus, error) { showAlert( 'fail error http1 ' +error, textStaus); });
		} 
		catch(e) { console.log('catch error http1 ' +e.message);}	
		

	},
	refresh_realtime_connect: function() {
		
		this.socket = io.connect(EmscConfig.socket_io.url);
		var self=this;
		this.socket.on('connect', function () {
			//alert('Etat : Connected'); /* ne pas mettre d'alert pour safari dans les functions */
			//socket.on('disconnect', function() { /*self.log('Etat : Disconnected (Fermer)'); */});	
			self.socket.on('message', function (msg) { 
				//self.alert(JSON.stringify(msg)); 
				var data=JSON.parse(msg);  	var quake=data.data; console.log(msg);
				
				//var quakes=JSON.parse(self._storage.getItem('saveAllJson'));  
				
				if(data.data_status=='NEW') { 
					for(var i in quakes) {
						if(quake.time >= quakes[i].time) {
							if(i==0) { self._lastQuake=quake; self.setBadgeNew(); self.alertAllMethods(); }
							else { self.setBadgeNew(); } // new but not the most recent //
							break;
						}
					} 
					quakes.splice(i, 0, quake); //add to array
				}		
				else if(data.data_status=='UPDATE') { //alert('UPDATE');
					for(var i in quakes) {
						if(quakes[i].id == quake.id) { quakes.splice(i, 1, quake); break; }
					}	
					if(quake.id == self._lastQuake.id) { self._lastQuake=quake;  self.alertScreen();}
				}
				else if(data.data_status=='DELETE') { //alert('DEL');
					for(var i in quakes) {
						if(quakes[i].id == quake.id) { quakes.splice(i, 1); break; }
					} 	
					if(quake.id == self._lastQuake.id) { self._lastQuake=quakes[0]; self.alertScreen();  } // if it was the most recent //	
				}
				//self._storage.setItem('saveAllJson',JSON.stringify(quakes));  
	
			});
			
		});	
		
	},
	isNewQuake: function() {
		if(this._lastQuake.id != this._lastLastQuake.id) return true;
		else return false;
	},
	setBadgeNew: function() { 
		
	},
	unsetBadgeNew: function() { 
		
	},
	alertAllMethods: function() {
		if(this._settings.screenAlert){ this.alertScreen(); }
		if(this.isNewQuake()) {
			if(this._settings.audioAlert && (this._lastQuake.magnitude.mag.toFixed(1)>= this._settings.audioAlertMag)) { this.alertAudio();}
			if(this._settings.shakeAlert && (this._lastQuake.magnitude.mag.toFixed(1)>= this._settings.shakeAlertMag)) { this.alertShake(); }
		}
	},
	alertShake: function() {
		navigator.notification.vibrate(2500); navigator.notification.beep(3);
	},
	alertAudio: function() {
		var music=new AudioAlert({mag:this._lastQuake.magnitude.mag.toFixed(1),region:this._lastQuake.flynn_region,getago:this._lastQuake.time}); 
		music.play(); //gaTrack('AudioAlert');
	},
	alertScreen: function() {
	},
	
	
	_storage: function() {
	
	},
	
	
	createDb: function(tx) {
		//tx.executeSql('DROP TABLE IF EXISTS emsc');
		var sql = 
			"CREATE TABLE IF NOT EXISTS emsc ( "+
			//"id INTEGER PRIMARY KEY AUTOINCREMENT, " +
			"evid INTEGER PRIMARY KEY, " +
			"time FLOAT," +
			"mag FLOAT, " +
			"depth FLOAT, " +
			"lat FLOAT, " + 
			"lon FLOAT, " +
			"allJson VARCHAR(500)) ";
		tx.executeSql(sql, null,
                function() {
                    console.log('Create table success');
                },
                function(tx, error) {
                    console.log('Create table error: ' + error.message);
                });
	},
	insertDbAll: function() {
		 var sql = "INSERT OR REPLACE INTO emsc " +
            "(evid, time, mag, depth, lat,lon, allJson) " +
            "VALUES (?, ?,  ?, ?, ?, ?, ?)";
		var quake=this._quakes;
		
		 this._db.transaction(
            function(tx) {
			   for (var i = 0; i<quake.length; i++) { 
					tx.executeSql(sql, [quake[i].evid, quake[i].time, quake[i].magnitude.mag, quake[i].depth.depth, quake[i].location.lat, quake[i].location.lon, JSON.stringify(quake[i])],
							function() {
								console.log('INSERT success');
							},
							function(tx, error) {
								console.log('INSERT error: ' + error.message);
							});
				}
			},
			function(error) {
                console.log("Transaction Error: " + error.message);
            }
        );
			
	},
	
	createList: function() {
		var quake=this._quakes;
		for (var i = 0; i<quake.length; i++) { 
			$('#quakesList').append('<li class="resRow"><a href="'+quake[i].url + '" class="handle">' +
				 '<span class="mag">'+quake[i].magnitude.mag.toFixed(1)+'</span>' + 
						'<strong>' + quake[i].flynn_region + '</strong><span class="resDetail">'+quake[i].time_str+'</span></a></li>');
		}
	},
	
	getAll: function() {
		var self=this; var quakes;
		this._db.transaction(
            function(tx) {
                var sql = "SELECT * from emsc ORDER BY time desc";

                tx.executeSql(sql, [], function(tx, results) {
                    var len = results.rows.length, quake = [],
                        i = 0;
                    for (; i < len; i = i + 1) {
                        quake[i] = results.rows.item(i);
						quakes[i]=JSON.parse(quake[i].allJson);
                    }
					self._quakes=quakes;
                });
            },
            function(error) {
               console.log("Transaction Error: " + error.message);
            }
        );
	},
	
	
	initapp: function() {
		this.initDb();
		this.getAll();
		if(! this._quakes ) { console.log('nothing in db'); this.refresh();}
	}
	
};	


function AudioAlert() { 
	this.music,	this.codec,	this.url;
	this.uri= EmscConfig.audio.url;
	this.params= ((arguments[0]) ? arguments[0] : EmscConfig.audio.test);
	this.init= function() { 
		this.setCodec(); 
		this.getUri();
	};
	this.getUri= function() {
		this.url=this.uri+'get.'+this.codec+'?';
		for (var lab in this.params) {  this.url+=lab+"="+escape(this.params[lab])+"&"; } this.url=this.url.substring(0,this.url.length-1);
	};
	this.setCodec= function() { 
		this.codec='mp3';
	};
	this.play= function() { 
		var my_media = new Media(this.url,
			function () {
				console.log("playAudio():Audio Success");
			},
			// error callback
			function (err) {
				console.log("playAudio():Audio Error: " + err);
			}
		);
		// Play audio
		my_media.play();
	};
	
	this.init();
	return this;
}


 var  isAndroid = (/android/gi).test(navigator.appVersion);
 
 document.addEventListener("deviceready", onDeviceReady, true);
 function onDeviceReady() { console.log('listener begin'); app.initapp();}
 if(!isAndroid) window.onload=onDeviceReady2;
 function onDeviceReady2() { 
	console.log('window begin'); 
	app.initapp(); 
	Push();
	loc();
 }

 var pushNotification;
 function Push() {
	$("#app-status-ul").append('<li>'+device.platform+'</li>');
	try {
		pushNotification = window.plugins.pushNotification;
		if (device.platform == 'android' || device.platform == 'Android') {
			$("#app-status-ul").append('<li>registering android</li>');
			pushNotification.register(successPushH , errorPushH , {"senderID":EmscConfig.android.senderID,"ecb":"onNotificationGCM"});		// required!
		} else {
			$("#app-status-ul").append('<li>registering iOS</li>');
			pushNotification.register(tokenHandler, errorPushH, {"badge":"true","sound":"true","alert":"true","ecb":"onNotificationAPN"});	// required!
		}	
    }catch(error) { console.log('error push register '+error.message);}            	
 }
function successPushH (result) {
    $("#app-status-ul").append('<li>success:'+ result +'</li>');
}         
function errorPushH (error) {
	$("#app-status-ul").append('<li>error:'+ error +'</li>');
}
function tokenHandler (result) {
	$("#app-status-ul").append('<li>token: '+ result +'</li>');
	// Your iOS push server needs to know the token before it can push to this device
	// here is where you might want to send it the token for later use.
}
  // handle APNS notifications for iOS
function onNotificationAPN(e) {
	if (e.alert) {
		 $("#app-status-ul").append('<li>push-notification: ' + e.alert + '</li>');
		 navigator.notification.alert(e.alert);
	}
		
	if (e.sound) {
		var snd = new Media(e.sound);
		snd.play();
	}
	
	if (e.badge) {
		pushNotification.setApplicationIconBadgeNumber(successHandler, e.badge);
	}
}

// handle GCM notifications for Android
function onNotificationGCM(e) {
	$("#app-status-ul").append('<li>EVENT -> RECEIVED:' + e.event + '</li>');
	
	switch( e.event ) {
		case 'registered':
		if ( e.regid.length > 0 ) {
			$("#app-status-ul").append('<li>REGISTERED -> REGID:' + e.regid + "</li>");
			// Your GCM push server needs to know the regID before it can push to this device
			// here is where you might want to send it the regID for later use.
			console.log("regID = " + e.regID);
		}
		break;
		
		case 'message':
			// if this flag is set, this notification happened while we were in the foreground.
			// you might want to play a sound to get the user's attention, throw up a dialog, etc.
			if (e.foreground) {
				$("#app-status-ul").append('<li>--INLINE NOTIFICATION--' + '</li>');

				// if the notification contains a soundname, play it.
				var my_media = new Media("/android_asset/www/"+e.soundname);
				my_media.play();
			}
			else {	// otherwise we were launched because the user touched a notification in the notification tray.
				if (e.coldstart)
					$("#app-status-ul").append('<li>--COLDSTART NOTIFICATION--' + '</li>');
				else
				$("#app-status-ul").append('<li>--BACKGROUND NOTIFICATION--' + '</li>');
			}

			$("#app-status-ul").append('<li>MESSAGE -> MSG: ' + e.payload.message + '</li>');
			$("#app-status-ul").append('<li>MESSAGE -> MSGCNT: ' + e.payload.msgcnt + '</li>');
		break;
		
		case 'error':
			$("#app-status-ul").append('<li>ERROR -> MSG:' + e.msg + '</li>');
		break;
		
		default:
			$("#app-status-ul").append('<li>EVENT -> Unknown, an event was received and we do not know what it is</li>');
		break;
	}
}

 
 var position;
function onSuccessPos(position2) {
	position=position2;
	console.log('ok position ');
	console.log(JSON.stringify(position));
}
function onErrorPos(error) {
       console.log('error position code: '+error.code+ '\n' +'message: ' + error.message + '\n');
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
	else {
		console.log('launch pos');
		navigator.geolocation.getCurrentPosition(onSuccessPos, onErrorPos);
	
	}
}
