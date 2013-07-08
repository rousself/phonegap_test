
var app = {
	_firstPassage: true,
	_lastLastQuake: {id:0},
	_saveSettingsLabel: 'EMSC_App_Settings',
	_settings: EmscConfig.settings,
	_JsonUrl: EmscConfig.api.url,
	_apikey: EmscConfig.api.key,
	_addon_key: EmscConfig.api.addon_key,
	_appdevice: {},//device,
	
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
	
	
	refresh_callback:function (req) {
		this._quakes=req.result; console.log('success '+req);
		this.createList();
		this._storage.setItem('saveAllJson',JSON.stringify(this._quakes));  
		this._lastLastQuake=this._lastQuake;
		this._lastQuake=this._quakes[0]; //alert('normal '+JSON.stringify(quakes[0]));
		//if(this.isNewQuake()) this.setBadgeNew(); 
		if(! this._firstPassage) this.alertAllMethods();
		else if(this._settings.screenAlert){ this.alertScreen(); }
		this._firstPassage=false; 
		//this.refresh_realtime_connect();
	},
	refresh: function() {	
		var self=this;
		this.post_request(this._JsonUrl,this.getParams(),function (req) { self.refresh_callback(req); });
		/*
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
		*/

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
	
	getStorage: function() {
		if(window.localStorage) this._storage=window.localStorage;
		else console.log('no storage');
	},	
	loadStoredSettings: function() {
		var obj=this._storage.getItem(this._saveSettingsLabel);//this._storage.getItem(this._saveSettingsLabel);
		if((typeof(obj)=='string') && (obj!='')) { this._settings=JSON.parse(obj); this.alert('loading new settings from storage string: '+JSON.stringify(this._settings));}
		else if((typeof(obj)=='object') && (obj!=null)) { this._settings=obj; this.alert('loading new settings from storage obj: '+JSON.stringify(this._settings));}
		else { this._storage.setItem(this._saveSettingsLabel,JSON.stringify(this._settings)); /*this.alert('pb load settings  type:'+typeof(obj)+' value:'+obj);*/ }
	},
	setExtensionKey: function(key) {
		this._settings.app_key=key; this._storage.setItem(this._saveSettingsLabel,JSON.stringify(this._settings));
	},
	registerExtensionKey: function() { 
		if(typeof(this._settings.app_key)=='string') return;
		else {
			console.log('send register app'); var self=this;
			this.post_request(EmscConfig.register.app.url,this._appdevice,function(req) { self.setExtensionKey(req.addon_key); }); 
		}	
	},
	registerMyAppPush: function(key) {  
		if(typeof(this._settings.appPush_key)=='string') return;
		else {
			console.log('send push key to register');
			this._settings.appPush_key=key; this._storage.setItem(this._saveSettingsLabel,JSON.stringify(this._settings));
			this.post_request(EmscConfig.register.push.url,{ 'platform': device.platform.toLowerCase() , 'push_key': key });
		}	
	},
	
	post_request:function() {
		$.support.cors = true;
		var url= ((arguments[0]) ? arguments[0] : '');
		if(url=='') return;
		var data= ((arguments[1]) ? arguments[1] : '');
		var callback= ((arguments[2]) ? arguments[2] : console.log);
		$.ajax({
				  url: url,
				  type: 'POST',
				  data: data,
				  cache: false,
				  crossDomain: true,
				  dataType: 'json',
				  success: function(req) { 
						//console.log('RESP '+req); 
						callback(req); 
				},
				  error: function( xhr, textStatus, error) {
							console.log(xhr.responseText+'  '+xhr.status+'  '+textStatus);
							console.log('error http '+url+' ** '+error.message);
				}
			});	
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
						'<strong>' + quake[i].flynn_region + '</strong><span class="resDetail">'+quake[i].time_str+'</span>'+
						'<span>Depth: '+quake[i].depth.depth+' Km</span>'+'</a></li>');
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
	
	alert: function(txt) {
		console.log('Alert '+txt);
	},
	initapp: function() {
		this.getStorage();
		this.loadStoredSettings();
		this.registerExtensionKey();
		this._quakes=JSON.parse(this._storage.getItem('saveAllJson'));
		//this.initDb();
		//this.getAll();
		if(! this._quakes ) { console.log('nothing in db'); this.refresh();}
		else this.createList();
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

function registerMyAppPush(key) {
	console.log('send push key to register');
	$.support.cors = true;
	$.ajax({
			  url: EmscConfig.register.push.url,
			  type: 'POST',
			  data: { 'platform': device.platform.toLowerCase() , 'push_key': key  },
			  cache: false,
			  crossDomain: true,
			  dataType: 'json',
			  success: function(req) { },
			  error: function( xhr, textStatus, error) {
						console.log(xhr.responseText+'  '+xhr.status+'  '+textStatus);
						console.log('error http1 '+error.message);
			}
		});	
}



 var  isAndroid = (/android/gi).test(navigator.appVersion);
 
 document.addEventListener("deviceready", onDeviceReady2, true);
 function onDeviceReady() { console.log('listener begin'); app.initapp();}
 if(!isAndroid) window.onload=onDeviceReady2;
 function onDeviceReady2() { 
	console.log('window begin'); 
	app.initapp(); 
	if(typeof(app._settings.appPush_key)!='string') Push();
	
 }

 document.addEventListener("backbutton", function(e) {
	if($('.visible').attr('id')=='home') {	
		// call this to get a new token each time. don't call it to reuse existing token.
		//pushNotification.unregister(successPushH, errorPushH);
		e.preventDefault();
		navigator.app.exitApp();
	}	
	else navigator.app.backHistory();
 },false);
 
 
 
 
 
 var pushNotification;
 function Push() {
	$("#app-status-ul").append('<li> Platform : '+device.platform+'</li>');
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
	//console.log('GCM '+print_r(e));  console.log('GCM '+print_r(e.payload));
	switch( e.event ) {
		case 'registered':
		if ( e.regid.length > 0 ) {
			$("#app-status-ul").append('<li>REGISTERED -> REGID:' + e.regid + "</li>");
			// Your GCM push server needs to know the regID before it can push to this device
			// here is where you might want to send it the regID for later use.
			console.log("regID = " + e.regid);
			//registerMyAppPush(e.regid);
			app.registerMyAppPush(e.regid);
		}
		break;
		
		case 'message':
			// if this flag is set, this notification happened while we were in the foreground.
			// you might want to play a sound to get the user's attention, throw up a dialog, etc.
			if (e.foreground) {
				$("#app-status-ul").append('<li>--INLINE NOTIFICATION--' + '</li>');

				// if the notification contains a soundname, play it.
				//var my_media = new Media(e.payload.soundToPlay/*"/android_asset/www/"+e.soundname*/);
				//my_media.play();
			
			}
			else {	// otherwise we were launched because the user touched a notification in the notification tray.
				if (e.coldstart)
					$("#app-status-ul").append('<li>--COLDSTART NOTIFICATION--' + '</li>');
				else
				$("#app-status-ul").append('<li>--BACKGROUND NOTIFICATION--' + '</li>');
			}

			$("#app-status-ul").append('<li>MESSAGE -> MSG: ' + e.payload.message + '</li>');
			$("#app-status-ul").append('<li>MESSAGE -> MSGCNT: ' + e.payload.msgcnt + '</li>');
			if(e.payload.soundToPlay) {
				var music=new AudioAlert(e.payload.soundToPlay); 
				music.play();
			}	
		break;
		
		case 'error':
			$("#app-status-ul").append('<li>ERROR -> MSG:' + e.msg + '</li>');
		break;
		
		default:
			$("#app-status-ul").append('<li>EVENT -> Unknown, an event was received and we do not know what it is</li>');
		break;
	}
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





function print_r(theObj){
	var str='';
	if(theObj.constructor == Array ||	theObj.constructor == Object) {
		str+="\n";
		for(var p in theObj){
			if((theObj[p].constructor == Array || theObj[p].constructor == Object)) { //&&("function"!=typeof(theObj))
				str+="\t["+p+"] => "+typeof(theObj)+"\n";
				str+="\n";
				str+=print_r(theObj[p]);
				str+="\n";
			} else {
				str+="\t["+p+"] => "+theObj[p]+"\n";
			}
		}
		str+="\n";
	}
	return str;
}