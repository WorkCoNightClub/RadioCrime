
var Perlin = function () {
    var mask = 0xff;
    var size = mask + 1;
    var values = new Uint8Array(size * 2);
    for (var i = 0; i < size; i++) {
        values[i] = values[size + i] = 0|(Math.random() * 0xff);
    }

    var lerp = function (t, a, b) {
        return a + t * (b - a);
    };
    var fade = function (t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    };

    var grad1d = function (hash, x) {
        return (hash & 1) === 0 ? x : -x;
    };


    var noise1d = function (x) {
        var intX = (0|x) & mask;
        var fracX = x - (0|x);
        var t = fade(fracX);
        var a = grad1d(values[intX], fracX);
        var b = grad1d(values[intX + 1], fracX - 1);
        return lerp(t, a, b);
    };


    return noise1d;
};

function Mixer() {


	//////////////////////////////////
	/// SETTINGS
	//////////////////////////////////

	this.maxDistance = 15;

	//Attention, the white noise can get pretty loud!! keep it low
	this.maxNoiseGain = 0.01;
	this.maxMariaGain = 0.5;

	//////////////////////////////////
	/// INTERNAL VARS
	//////////////////////////////////

	var self = this;
	this.t = 0.0;
	this.perlin = Perlin();
	self.noise = 0;
	this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	this.interference = 0;
	this.sources = {};
	this.gains = {};
	this.gains['master'] = this.audioCtx.createGain();

	//White noise
	var whiteNoise = createWhiteNoise(this.audioCtx);
	this.whiteGain = this.audioCtx.createGain();
	this.whiteGain.gain.value = this.maxNoiseGain = 0.05;
	whiteNoise.connect(this.whiteGain);

	//Radio maria interference
	var maria_src = document.querySelector('#maria');
  console.log(maria_src);
	maria_src.play();
	maria_src.loop = true;
	var maria = self.audioCtx.createMediaElementSource(maria_src);
	this.mariaGain = this.audioCtx.createGain();
	this.mariaGain.gain.value =  this.maxMariaGain;
	maria.connect(this.mariaGain);

	//General noise combines white and maria
	this.noiseGain = this.audioCtx.createGain();
	this.whiteGain.connect(this.noiseGain);
	this.mariaGain.connect(this.noiseGain);
	this.noiseGain.connect(this.gains['master']);

	document.querySelectorAll('audio').forEach(function(a){
		if (a.id == "maria") return;

		self.sources[a.id] = self.audioCtx.createMediaElementSource(a);
		self.gains[a.id] = self.audioCtx.createGain();

		a.play();
		a.loop = true;
		self.sources[a.id].connect(self.gains[a.id]);
		self.gains[a.id].connect(self.gains['master']);

		//Init all gain values to 0;
		self.gains[a.id].gain.value = 0;
	});

	this.gains['master'].connect(this.audioCtx.destination);

	this.setGain = function(g, key = "master"){
		if (!this.gains.hasOwnProperty(key)){
			console.log("WARNING [" + key + "] track doesn't exist");
			return;
		}

		this.gains[key].gain.value = g;
		console.log(key +" SETTTING GAIN VALUE : " + this.gains[key].gain.value)


		var maxgain = 0
		for (var g in this.gains) {
		    if (this.gains.hasOwnProperty(g) && g != "master") {
		    	console.log(g +" VALUE : " + this.gains[g].gain.value)
		        maxgain =  Math.max(this.gains[g].gain.value, maxgain);

		        this.interference = 1 - maxgain;
		    }
		}

		this.noiseGain.gain.value = this.interference ;
		// console.log(maxgain);
	}
  //
	// this.distance = function(x, key){
	// 	if (!this.gains.hasOwnProperty(key)){
	// 		console.log("WARNING [" + key + "] track doesn't exist");
	// 		this.setGain(1, key);
	// 		return 1;
	// 	}
  //
	// 	if (x > this.maxDistance){
	// 		console.log("TOO DISTANT: ", x)
	// 		this.setGain(0, key);
	// 		return 0;
	//   }
  //   // else {
	// 	// 	console.log("MAYOR: ", x)
  //   //
	// 	// 	this.setGain(1);
	// 	// 	return 1;
	// 	// }
  //
	// 	//Si, pippo
	// 	console.log("DISTANCE: ", x)
	// 	var currentGain = (100 - x) / 100;
	// 	this.setGain(currentGain, key);
	// 	return (currentGain);
	// }
	function animation(){
		self.t+= 0.0015;
		self.noise = self.perlin( (self.t+2) );
		self.noise = Math.min(1, Math.max(self.noise, 0));
		self.noise *= 5;
		// console.log( self.noise );
		self.mariaGain.gain.value = self.noise * self.maxMariaGain ;

		window.requestAnimationFrame(animation);

	}

	console.log("ANIMATION");
	window.requestAnimationFrame(animation);

};


function createWhiteNoise(audioContext){
	var bufferSize = 4096;
	var whiteNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);
	whiteNoise.onaudioprocess = function(e) {
	    var output = e.outputBuffer.getChannelData(0);
	    for (var i = 0; i < bufferSize; i++) {
	        output[i] = Math.random() * 2 - 1;
	    }
	}

	return whiteNoise;
}

function onSuccess(heading) {
    var element = document.getElementById('heading');
    var tracks = [];
    var selectedTrack = -1;
    var bestDistance = 1000;
    for (var direction = 1; direction <= 6; direction++) {
      var angle = direction * 60;
      var distance = Math.abs(heading.magneticHeading - angle);
      tracks.push(distance);
      if (distance < m.maxDistance && bestDistance > distance) {
        selectedTrack = direction;
        bestDistance = distance;
      }
      //m.setGain(distance, "conversazione" + direction);
    }

    var tracklist = '<ul>';

    for (var i = 0; i < tracks.length; i++) {
      if (i+1 == selectedTrack) {
        tracklist += '<li>Track '+(i+1)+ ' '+ tracks[i]+'</li>';
        // var normalizedDistance = 1 -
        m.setGain(1, "conversazione" + selectedTrack)
      } else {
        m.setGain(0, "conversazione" + (i+1))
      }
    }
    tracklist += '</ul>';
    element.innerHTML = 'Heading: ' + heading.magneticHeading + tracklist;
};

function onError(compassError) {
    alert('Compass error: ' + compassError.code);
};

var options = {
    frequency: 3000
}; // Update every 3 seconds


var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
        //start radio maria
        //Set master gain

    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');
         m.setGain(1);
        // //Set distance min/max values
         //m.maxDistance = 15;

        var watchID = navigator.compass.watchHeading(onSuccess, onError, options);
        console.log('Received Event: ' + id);
    }
};


var m = new Mixer();
app.initialize();
