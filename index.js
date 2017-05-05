var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var path = require('path');

function otherwise(primary, secondary) {
	if(primary) return primary;
	else return secondary;
}

var server = express();
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

server.use(bodyParser.urlencoded({extended: false}));
server.use(bodyParser.json());

server.use(express.static(path.join(__dirname, '/static')))

server.get('/', function(req, res) {
	console.log(req.url);
	res.sendFile('views/index.html', {root: __dirname});
});

Consonants = "ᑭ ᑲ ᕵ ᕹ ᒉ ᒍ ᖴ ᖶ ᕂ ᕆ ᖋ ᖍ ᒥ ᒪ ᕮ ᕭ ᕳ ᕲ ᗭ ᗪ".split(" ");
Vowels = "ᐁ ᐍ ᐃ ᐏ ᐯ ᐻ ᐱ ᐽ ᑌ ᑘ ᑎ ᑚ".split(" ");
SimpleVoicedConsonants = "ᑲ ᕹ ᒍ ᖶ ᕆ ᖍ ᒪ ᕭ ᕲ ᗪ".split(" ");
SimpleUnvoicedConsonants = "ᑭ ᕵ ᒉ ᖴ ᕂ ᖋ ᒥ ᕮ ᕳ ᗭ".split(" ");
TranslateSpaces = t => t.replace(/ /g, "　");
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
Color = (r,g,b)=>"rgb("+r*255+","+g*255+","+b*255+")";

SecretKey = (new Date()).toUTCString().hashCode();

function LevelParse(str) {
	var grouplist = JSON.parse(str);
	var levels = [];
	for(var g = 0; g < grouplist.length; g += 1) {
		var group = grouplist[g];
		var gstartl = levels.length;
		for(var l = 0; l < group.length; l += 1) {
			var level = group[l];
			for(var i = 0; i < otherwise(level.count, 1); i += 1) {
				level.trappos = gstartl;
				// Swap in the wider spaces
				if(level.trap) 		level.trap 		= level.trap.map(TranslateSpaces);
				if(level.answer) 	level.answer 	= TranslateSpaces(level.answer);
				if(level.alt) 		level.alt 		= TranslateSpaces(level.alt);
				if(level.prompt)	level.prompt 	= TranslateSpaces(level.prompt);
				levels.push(level);
			}
		}
	}
	return levels;
}
var Levels = LevelParse(fs.readFileSync(path.join(__dirname, 'data/levels.json'), {encoding: 'utf8'}));

function getRndInt(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}
function randElt(arr) {
	return arr[getRndInt(0, arr.length)];
}

function TemplateGenerator() {
	var s = randElt(SimpleUnvoicedConsonants);
	var m = Consonants[1 + Consonants.indexOf(s)];
	var z = m;
	while(z === m) {z = randElt(SimpleVoicedConsonants);}
	var Z_ = randElt(SimpleVoicedConsonants);
	var M_ = randElt(SimpleVoicedConsonants);
	var cmds = {
		C: () => randElt(Consonants),
		S: () => {
			var res = randElt(SimpleUnvoicedConsonants);
			M_ = Consonants[1 + Consonants.indexOf(res)];
			while(Z_ === M_) {Z_ = randElt(SimpleVoicedConsonants);}
			return res;
		},
		Z: () => Z_,
		M: () => M_,
		V: () => randElt(Vowels),
		s: () => s,
		z: () => z,
		m: () => m
	};
	return {
		get: c => otherwise(cmds[c], () => c)()
	};
}

function DoGen(genobj) {
	if(String(genobj) === genobj) {
		var tgen = TemplateGenerator();
		var res = "";
		for(var i = 0; i < genobj.length; i += 1) {
			res = res + tgen.get(genobj.charAt(i));
		}
		return res;
	} else if(Array.isArray(genobj)) {
		return DoGen(randElt(genobj));
	} else if(genobj.type === "or") {
		var right = DoGen(genobj.right);
		var wrong = DoGen(genobj.wrong);
		var res = {
			prompt: TranslateSpaces("ᕵᑌ " + randElt([right + " " + wrong, wrong + " " + right])),
			answer: right.replace(/[\[\]]/g, ""),
			trap: [wrong.replace(/[\[\]]/g, "")]
		};
		return res;
	} else {
		console.log("Unrecognized gen type ", genobj.type);
	}
}

makeLevelRes = function(nextlevel) {
	var levelres = Levels[nextlevel];
	if(levelres.draw) {
		var canvasw = 750;
		var canvash = 400;
		for(var i = 0; i < levelres.draw.length; i++) {
			var step = levelres.draw[i];
			if(step.loc === "center") {
				step.loc = {x:canvasw/2,y:canvash/2};
			} else if(step.loc === "random") {
				var margin = 50;
				step.loc = {x:getRndInt(margin,canvasw-margin),y:getRndInt(margin,canvash-margin)};
			}
			if(step.color === "random") {
				step.color = Color(Math.random()*.5,Math.random()*.5,Math.random()*.5);
			}
		}
	}
	if(levelres.promptShuffle) {
		levelres.prompt = levelres.promptShuffle.split(" ").sort((a, b)=>randElt([-1, 1])).join("　"); // joins on wide space
	}
	if(levelres.gen) {
		var genRes = DoGen(levelres.gen)
		levelres.prompt = genRes.prompt;
		levelres.answer = genRes.answer;
		levelres.trap = genRes.trap;
		console.log("Generating from ", levelres.gen, " got ", genRes);
	}
	return {
		prompt: otherwise(levelres.prompt, " "),
		level: nextlevel,
		prefix: levelres.prefix,
		emphasis: levelres.emphasis,
		limit: levelres.limit,
		matchHash: levelres.answer.hashCode(), // For the client to know if they're right
		checkHash: (levelres.answer + SecretKey).hashCode(), // For us to know they didn't cheat
		trapMatchHashes: otherwise(levelres.trap, []).map(t => t.hashCode()),
		trapCheckHashes: otherwise(levelres.trap, []).map(t => (t + SecretKey).hashCode()),
		draw: levelres.draw
	};
}

server.put('/', function(req, res) {
	console.log(req.body);
	if(req.body.cheat) {
		res.json(makeLevelRes(req.body.cheat));
	}
	if(!(req.body.hasOwnProperty('guess') && req.body.hasOwnProperty('level'))) {
		console.log('Badly formatted put request');
		console.log(req.body);
	} else {
		var level = Levels[req.body.level];
		if(level) {
			if((req.body.guess + SecretKey).hashCode() === req.body.checkHash || level.autoPass === 1) {
				res.json(makeLevelRes(req.body.level + 1));
			} else {
				var nextlevel;
				if(req.body.trapCheckHashes.includes((req.body.guess + SecretKey).hashCode())) {
					nextlevel = level.trappos;
				}
				if(nextlevel) {
					res.json(makeLevelRes(nextlevel));
				} else {
					res.json({});
				}
			}
		}
	}
});

server.listen(server_port, server_ip_address, function() {
	console.log("Listening on " + server_ip_address + ", server_port " + server_port);
});