var alphabet = "ᐁ	ᐍ	ᐃ	ᐏ	ᐯ	ᐻ	ᐱ	ᐽ	ᑌ	ᑘ	ᑎ	ᑚ	ᑭ	ᑲ	ᕵ	ᕹ	ᒉ	ᒍ	ᖴ	ᖶ	ᕂ	ᕆ	ᖋ	ᖍ	ᒥ	ᒪ	ᕮ	ᕭ	ᕳ	ᕲ	ᗭ	ᗪ	　".split("\t");
var letterkey= "a	A	s	S	d	D	f	F	j	J	k	K	g	h	q	w	e	r	u	i	o	p	t	y	z	x	c	v	b	n	m	l	 ".split("\t");
var IPAletter= "i	ɪ	u	ʊ	ɘ	eɪ	o	ʌ	ɛ	æ	a	ɑ	s	z	f	v	t	d	θ	ð	k	g	p	b	j	ŋ	ɹ	l	m	n	ʃ	ʒ	 ".split("\t");
var level = 0;
var limit = 0;
var forcePrefix = "";
var InputLocked = 0;
var matchHash = "";
var checkHash = "";
var trapMatchHashes = [];
var trapCheckHashes = [];

cheat = n=>DoSubmit({cheat:n});

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if(this.length == 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
back = a=>a[a.length-1];
function otherwise(primary, secondary) {
	if(primary) return primary;
	else return secondary;
}

Color = (r,g,b)=>"rgb("+r*255+","+g*255+","+b*255+")";
Place = (x,y)=>({x:x,y:y});

keyPressed = function(event) {
	var input = document.getElementById("maininput");
	console.log(event);
	if(event.key === "Backspace" && input.selectionStart <= forcePrefix.length) {
		event.preventDefault();
		return false;
	} else if(InputLocked === 1) {
		event.preventDefault();
		return false;
	} else if(event.charCode > 0 && !event.ctrlKey) {
		input.selectionStart = Math.max(input.selectionStart, forcePrefix.length);
		var pre = input.value.substr(0, input.selectionStart);
		var post = input.value.substr(input.selectionEnd);
		pre = pre.concat(translateLetter(event.key))
		input.value = pre.concat(post);
		input.selectionStart = pre.length;
		input.selectionEnd = pre.length;
		enforcePrefix();
		submit(input.value);
		event.preventDefault();
		return false;
	} else {
		return true;
	}
}
keyUp = function(event) {
	var input = document.getElementById("maininput");
	input.value = translateString(input.value);
	if(event.key.length !== 1 && InputLocked == 0) {
		enforcePrefix();
		submit(input.value);
	}
}

window.onload = function() {
	submit('');
}

translateString = function(str) {
	return str.replace(/./g, translateLetter);
}
translateLetter = function(c) {
	var ind = letterkey.indexOf(c);
	if(alphabet.indexOf(c) !== -1) {
		return c;
	} else if(ind === -1) {
		return "";
	} else {
		return alphabet[ind];
	}
}
enforcePrefix = function() {
	var input = document.getElementById("maininput");
	if(!input.value.startsWith(forcePrefix)) {
		var startpos = input.selectionStart;
		var endpos = input.selectionEnd;
		input.value = forcePrefix.concat(input.value);
		input.selectionStart = startpos + forcePrefix.length;
		input.selectionEnd = endpos + forcePrefix.length;
	}
	if(input.value.length > limit && limit != 0) {
		input.value = input.value.substr(0, limit)
	}
	while(input.value.startsWith("　")) {
		input.value = input.value.substring(1);
	}
}

submit = function(string) {
	var hash = string.hashCode();
	if(hash === matchHash || trapMatchHashes.includes(hash) || level === 0) {
		DoSubmit({
			guess: string,
			level: level,
			checkHash: checkHash,
			trapCheckHashes: trapCheckHashes
		});
	}
}

function DoSubmit(obj) {
	console.log("Doing submit");
	xhr = new XMLHttpRequest();
	xhr.open('PUT', '');
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.onload = function() {
		if (xhr.status === 200) {
			gotResponse(JSON.parse(xhr.responseText));
		} else if (xhr.status !== 200) {
			setTimeout(()=>DoSubmit(obj), 50);
		}
	};
	xhr.send(JSON.stringify(obj));
}

gotResponse = function(response) {
	if(response.prompt) {
		var input = document.getElementById("maininput");
		var startNextLevel = function() {
			level = response.level;
			limit = response.limit;
			input.value = "";
			if(response.prefix) {
				forcePrefix = response.prefix;
				input.value = forcePrefix;
			} else {forcePrefix = "";}
			if(response.emphasis) {
				var color = "color:rgb(" + parseInt(130 * response.emphasis) + "," + parseInt(54 * response.emphasis) + "," + parseInt(155 * response.emphasis) + ");";
				response.prompt = response.prompt.replace(/\[/g, "<font style=\"" + color + "\">").replace(/\]/g, "</font>");
			}
			var prompt = document.getElementById("prompt");
			prompt.innerHTML = response.prompt;
			prompt.title = "";
			for(var i = 0; i < response.prompt.length; i += 1) {
				var ind = alphabet.indexOf(response.prompt.charAt(i));
				if(ind != -1) {
					prompt.title += IPAletter[ind];
				}
			}
			matchHash = response.matchHash;
			checkHash = response.checkHash;
			trapMatchHashes = response.trapMatchHashes;
			trapCheckHashes = response.trapCheckHashes;
			clearDraw();
			if(response.draw) {DrawSpec(response.draw);}
		}
		if(level > response.level) FlashInputColor("red", 750, startNextLevel);
		else if(level <= response.level) FlashInputColor("green", 250, startNextLevel);
	}
}

FlashInputColor = function(color, time, callback) {
	var input = document.getElementById("maininput");
	var old = input.style.backgroundColor;
	input.style.backgroundColor = color;
	InputLocked = 1;
	setTimeout(function() {
		if(input.style.backgroundColor === color)
			input.style.backgroundColor = old;
		InputLocked = 0;
		callback();
	}, time);
}

function DrawSpec(spec) {
	var ctx = document.getElementById("draw").getContext("2d");
	var pen = new Pen();
	var cmds = {
		rect: 	p=>pen.Rect(p.loc, p.w, p.h),
		circle: p=>pen.Circle(p.loc, p.r),
		polygon:p=>pen.Polygon(p.points),
		move:	p=>pen.Move(p.loc),
		reset:	p=>pen.Reset(),
		color:	p=>pen.color = p.color
	};
	for(var i = 0; i < spec.length; ++i) {
		if(spec[i]) {
			cmds[spec[i].op](spec[i]);
		}
	}
}

function Pen() {
	this.color = Color(0,0,0);
	this.offset = Place(0, 0);
};
Pen.prototype.Reset = function() {this.offset = Place(0, 0);};
Pen.prototype.Draw = function(f) {draw(f, this.color)};
Pen.prototype.Move = function(p) {this.offset.x += p.x; this.offset.y += p.y};
Pen.prototype.Rect = function(loc,w,h) {this.Draw((ct) => ct.rect(loc.x-w/2+this.offset.x, loc.y-h/2+this.offset.y, w, h));};
Pen.prototype.Circle = function(loc,r) {this.Draw((ct) => ct.arc(loc.x+this.offset.x, loc.y+this.offset.y, r, 0, 2*Math.PI));};
Pen.prototype.Polygon = function(a) {this.Draw((ct) => {ct.moveTo(back(a).x+this.offset.x,back(a).y+this.offset.y);a.forEach((p)=>ct.lineTo(p.x+this.offset.x,p.y+this.offset.y))});};

function draw(pathcb, color) {
	var ctx = document.getElementById("draw").getContext("2d");
	ctx.beginPath();
	pathcb(ctx);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
}
function clearDraw() {
	var canvas = document.getElementById("draw")
	var ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}