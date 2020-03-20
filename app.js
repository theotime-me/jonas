#!/usr/local/bin/node

var app = require("express")(),
	cliProgress = require('cli-progress'),
	exec = require('child_process').exec,
	unpack = require('tar-pack').unpack,
	ncp = require('ncp').ncp,
	package = require('./package.json'),
	lastVersion,
	busboy = require("connect-busboy"),
	server = require('http').createServer(app),
	config = require("./config.json"),
	users = require("./users.json"),
	io = require("socket.io").listen(server),
	md5 = require("md5"),
	fs = require("fs"),
	Path = require("path"),
	serve = require("serve-static")("./public"),
	request = require("request"),
	progress = require("request-progress"),
	xml2js = require("xml2js"),
	disk = require("diskusage"),
	chalk = require("chalk"),
	parser = new xml2js.Parser(),
	mime = require("mime-types"),
	mmm = require("mmmagic"),
	dl  = require('delivery'),
	sharp = require('sharp'),
	Magic = mmm.Magic,
	magic = new Magic(mmm.MAGIC_MIME_TYPE),
	weatherAnalyticsFile = require("./weather.json"),
	messages = require("./messages.json"),
	translations = require("./translations.json"),
	hbjs = require("handbrake-js"),
	mm = require('musicmetadata'),
	files = require("./files.json"),
	folders = require("./folders.json"),
	crypto = require('crypto'),

	weather = {},
	feeds = [];
	
app.use(serve);

app.use(busboy({ // Insert the busboy middle-ware
    highWaterMark: 2 * 1024 * 1024, // Set 2MiB buffer
}));

function getTranslation(key) {
	return translations[config.system.lang][key];
}

function validURL(str) {
	let validsChars = "-A-z0-9\\d%_.~+éàèïëöôî;ê\!$#=ù:";

  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
	'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
	'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
	'(\\:\\d+)?(\\/['+validsChars+']*)*'+ // port and path
	'(\\?['+validsChars+']*)?'+ // query string
	'(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(str);
}

const weatherAnalytics = {
	lastWeek() {
		let arr = weatherAnalyticsFile.weather;

		arr.sort(function(a, b) {
			return new Date(a.time).getTime() - new Date(b.time).getTime();
		});
		return arr.slice(Math.max(arr.length - 7, 1));
	}
};

io.sockets.on("connection", function(socket) {
	socket.emit("weather", weather);
	socket.emit("weather.analytics", weatherAnalytics.lastWeek());

	socket.on("network.ping", () => socket.emit("network.ping"));

	exec('iwgetid', (err, ssidName) => {
		let wifi = !!ssidName,
			eth = !!err;

		socket.emit("network.config", {
			ssid: ssidName ? ssidName.split("ESSID:")[1].replace(/\n|"/g, "") : null,
			wifi: wifi,
			ethernet: eth
		});
	});

	socket.emit("system.config", {
		updated: !lastVersion ? true : lastVersion == package.version,
		device: config.system.device,
		lang: config.system.lang,
		isSetup: config.system.isSetup
	});

	socket.emit("system.translation", translations[config.system.lang]);

	socket.on("system.restart", () => {
		socket.emit("system.restart");
		exec("sudo npm start", (err, out) => {
			if (err) throw err;

			setTimeout(function() {
				process.exit();
			}, 500);
		});
	});

	socket.on("download.add", link => {
		if (validURL(link)) {
			addToDownloadQueue(link);
			socket.emit("download.add", 200);
			socket.emit("download.queue", downloadQueue);
		} else {
			socket.emit("download.add", 403);
		}
	});

	socket.on("download.abort", fileName => {
		currentDownloadRequest.abort();
		downloadQueue.shift();
		fs.unlinkSync("./drive/"+config.downloads.folder+"/"+fileName.replace(".", ""));

		if (downloadQueue.length > 0) {
			download(downloadQueue[0]);
		}

		io.sockets.emit("download.queue", downloadQueue);
	});

	socket.emit("download.queue", downloadQueue);

	socket.on("user.get", name => {
		let found = false;
		users.users.forEach(user => {
			if (user.name == name) {
				socket.emit("user.get", {
					name: user.name,
					avatar: user.avatar != "adorable" ? "/medias/avatars/"+user.avatar : "https://api.adorable.io/avatars/100/"+md5(user.name)+"@adorable.io.png",
					lastConnection: user.lastConnection
				});

				found = true;
			}
		});

		if (!found) {
			socket.emit("user.get", null);
		}
	});
});

const configDB = {
	save() {
		fs.writeFileSync("./config.json", JSON.stringify(config, null, 4));
	}
};

function getWeather(ctx) {
	request("https://api.openweathermap.org/data/2.5/weather?q="+config.weather.city+"&appid="+config.weather.token+"&units=metric", function(err, response, body) {
		if (err) {
			getWeather(ctx);
			return false;
		}
	
		weather = body;
		io.sockets.emit("weather", weather);

		weatherAnalyticsFile.weather.push({
			time: new Date().toISOString(),
			value: JSON.parse(weather).main.temp
		});

		if (ctx != "loop") {
			console.log(chalk[config.interface.color]("Jonas: ")+" Now at "+config.weather.city.split(",")[0]+": "+chalk.underline(JSON.parse(weather).main.temp+"°C")+", "+chalk.dim(JSON.parse(weather).weather[0].description));
		}

		fs.writeFileSync("./weather.json", JSON.stringify(weatherAnalyticsFile, null, 4));
	});
}

// download

let downloadQueue = [],
	currentDownloadRequest = {};

function download(url) {
	url = decodeURIComponent(url);

	if (!fs.readdirSync("./drive").includes(config.downloads.folder)) {
		fs.mkdirSync("./drive/"+config.downloads.folder);
	}

	let fileName = url.split("/")[url.split("/").length -1].split("?")[0];
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		url = "http://"+url;
	}

	if (fileName == "") {
		fileName = url.split("/")[url.split("/").length -2].split("?")[0];
	}

	if (fileName.length > 60) {
		fileName = fileName.substring(0, 60);
	}

	currentDownloadRequest = request(url);

	progress(currentDownloadRequest).on('progress', function (state) {
		io.sockets.emit("download.progress", state, fileName);
	}).on('error', function (err) {
		console.log(err);
	}).on('end', function () {
		downloadQueue.shift(); // remove first element of the queue

		magic.detectFile("./drive/"+config.downloads.folder+"/"+fileName, function (err, result) {
			if (err) throw err;

			let ext = mime.extension(result) ? "."+mime.extension(result) : "";

			fs.renameSync("./drive/"+config.downloads.folder+"/"+fileName, "./drive/"+config.downloads.folder+"/"+fileName+ext);

			if (downloadQueue.length > 0) {
				download(downloadQueue[0]);
			} else {
				io.sockets.emit("download.queue", downloadQueue);
			}
		});
	}).pipe(fs.createWriteStream("./drive/"+config.downloads.folder+"/"+fileName));
}

function addToDownloadQueue(link) {
	if (downloadQueue.includes(link)) {
		return false;
	}

	downloadQueue.push(link);

	if (downloadQueue.length == 1) {
		download(downloadQueue[0]);
	}
}

if (downloadQueue.length > 0) {
	download(downloadQueue[0]);
}

const rss = {
	fetchDate: false,
	cache: require("./feeds.json"),
	getAll(ctx) {
		this.fetchDate = new Date().toISOString();
		let nb = 0;

		users.users.forEach((user, i) => {
			this.get(user.feeds, (feeds, j) => {
				// finished all feeds of the user
			});
		});

		// io.sockets.emit("feeds.update", feeds, rss.fetchDate);
	},

	log(nb, ctx) {
		if(ctx == "starting") {
			console.log(chalk[config.interface.color]("Jonas:  ")+nb+" feed"+(nb > 1 ? "s were" : " was")+" updated "+chalk.dim("in the Jonas' cache."));
		}
	},

	add(url, socket) {
		if (!url.startsWith("http://") && !url.startsWith("https://")) {
			url = "http://"+url;
		}
		
		if (url.endsWith("/")) {
			url = url.substring(0, url.length - 1);
		}

		if (socket.user.feeds.includes(url)) {
			socket.emit("feeds.add", 403);
			return false;
		}

		rss.feed(url, 15, feed => {
			if (feed != false) {
				users.users.forEach(user => {
					if (user.id == socket.user.id) {
						user.feeds.push(url);

						socket.emit("feed", feed);
						socket.emit("feeds.display");

						fs.writeFileSync("./users.json", JSON.stringify(users, null, 4));
					}
				});
			} else {
				console.log("fetch error");
				socket.emit("feeds.add", 404);
			}
		});
	},

	get(urls, cb) {		
		if (urls.length <= 0) {
			cb([]);
			return false;
		}

		for (let i = 0; i<urls.length; i++) {
			let url = urls[i];

			feeds = [];
			this.feed(url, 15, (feed, err) => {
				if (!feed || err) {
					console.error(err);
					return false;
				}

				feeds.push(feed);

				if (feeds.length == urls.length) {
					cb(feeds);
				}
			});
		}
	},

	isCacheOld(url) {
		if (!this.cache[url]) {
			return true;
		} else {
			let fetchDate = new Date(this.cache[url].fetchDate).getTime(),
				now =new Date().getTime(),
				diff = now - fetchDate;

			return diff >= 300000;
		}
	},

	getFromCache(url) {
		return this.cache[url] || false;
	},

	feed(url, length, cb) {
		if (!this.isCacheOld(url)) {
			cb(this.getFromCache(url));
			return false;
		}

		request(url, function(err, rep, body) {
			if (err) {
				console.error(err);
				return false;
			}

			try {
				parser.parseString(body);
			} catch (e) {
				cb(false, e);
				return false;
			}

			parser.parseString(body, function(err, result) {
				if (err) throw err;

				if (!result) {
					return false;
				}

				let channel = result.rss.channel[0],
					elements = [];

				for (let i = 0; i<length; i++) {
					if (i >= channel.item.length) {
						return false;
					}

					let item = channel.item[i];

					elements.push({
						title: item.title[0],
						link: item.link && item.link[0],
						url: url,
						content: item.enclosure ? item.enclosure[0].$.url : null,
						contentType: item.enclosure && item.enclosure[0].$.type ? item.enclosure[0].$.type : null,
						contentLength: item.enclosure && item.enclosure[0].$.length ? item.enclosure[0].$.length : null,
						description: (item.description && item.description[0]) || (item["itunes:summary"] && item["itunes:summary"][0]),
						date: item.pubDate[0]
					});
				}

				let image;

				if (channel.image) {
					image = channel.image[0].url[0];
				} else if (channel["itunes:image"]) {
					image = channel["itunes:image"][0].$.href;
				}

				let feed = {
					title: channel.title[0],
					url: url,
					fetchDate: new Date().toISOString(),
					link: channel.link[0],
					image: image,
					description: channel.description[0],
					items: elements
				};

				cb(feed);
				rss.cache[feed.url] = feed;

				fs.writeFileSync("./feeds.json", JSON.stringify(rss.cache, null, 4));
			});
		});
	}
};

setInterval(function() {
	getWeather("loop");
	rss.getAll("loop");
}, 300000);

getWeather("starting");
rss.getAll("starting");

io.of("/feeds").on("connection", socket => {
	let sendFeeds = function() {
		if (!socket.user) return false;

		socket.user.feeds.forEach((url) => {
			socket.emit("feed", rss.getFromCache(url));
		});

		socket.emit("feeds.display");
	};

	socket.on("login", (uid, deviceID) => {
		users.users.forEach(user => {
			if (deviceID && uid && user.id == uid && user.devices.includes(deviceID)) {
				socket.user = user;

				sendFeeds();
			}
		});
	});
});

let piWifi = require('pi-wifi'),
	WiFiControl = require('wifi-control'),
	wlIface = "wlan0",
	os = require("os"),
	wifi = require("node-wifi");

Object.keys(os.networkInterfaces()).forEach(el => {
	if (el.startsWith("wl")) {
		wlIface = el;
	}
});

wifi.init({
	iface: wlIface // network interface, choose a random wifi interface if set to null
});

WiFiControl.configure({
	debug: false,
	iface: wlIface,
	connectionTimeout: 15000 // in ms
});

function superID(length) {
	let out = [],
		chars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "-", "_"];

	for (let i = 0; i<length; i++) {
		out.push(chars[Math.floor(Math.random() * chars.length)]);
	}

	return out.join("");
}

io.of("/setup").on("connection", function(socket) {
	socket.on("language", language => {
		config.system.lang = language;
		configDB.save();

		socket.emit("language", language);
	});

	socket.emit("language", config.system.lang);

	socket.emit("isSetup", config.system.isSetup);

	socket.on("network.connect", (ssid, key) => {
		wifi.connect({ ssid: ssid, password: key}, function(err) {
			if (err) {
				console.log(err);
			}

			setTimeout(function() {
				piWifi.check(ssid, function (err, status) {
					if (!err && status.connected) {
						socket.emit("network.connect", {
							success: true,
							ssid: ssid
						});

						config.system.isSetup = true;
						configDB.save();
					} else {
						socket.emit("network.connect", {
							success: false,
							ssid: ssid
						});
					}
				  });
			}, 5000);
		});
	});

	socket.on("network.ignore", function() {
		socket.emit("network.ignore", true);

		config.system.isSetup = true;
		configDB.save();
	});

	scan(networks => socket.emit("network.list", networks));
});

function scan(cb) {
	require("child_process").exec("sudo iwlist "+wlIface+" scan", function (err, out, stderr) {
		if (err) throw err;
	
		let lines = out.split("\n"),
			current = {},
			output = [];
	
		lines.forEach(line => {
			if (line.trim().startsWith("Cell ")) {
				if (current.channel) {
					output.push(current);
				}
	
				current = {};
			} else {
				let delimiter = ":";
				if (line.includes("=")) {
					delimiter = "=";
				}
	
				let key = line.split(delimiter)[0].trim().toLowerCase(),
					value = line.split(delimiter)[1];
	
				if (!["quality", "essid", "frequency", "channel"].includes(key)) {
					return false;
				}
	
				if (key == "quality") {
					value = Math.floor(parseInt(value.split("/")[0])/70*100);
				}
	
				if (key == "essid") {
					key = "ssid";
					value = value.replace(/"/g, "");
				}
	
				current[key] = value;
			}
		});
	
		output.sort(function(a, b) {
			return b.quality - a.quality;
		});

		cb(output);
	});
}

server.listen(80);

let ip = "";

Object.keys(os.networkInterfaces()).forEach(function (ifname) {
	var alias = 0;
  
	os.networkInterfaces()[ifname].forEach(function (iface) {
	  if ('IPv4' !== iface.family || iface.internal !== false) {
		// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
		return;
	  }
  
	  ip = iface.address;
	  ++alias;
	});
  });

function cleanString(str) {
	return str.trim().toLowerCase().replace(/ |"|'/g, "").replace(/é|è|ê|ë/g, "e").replace(/à|â|ä/g, "a");
}

let wp = require("whirlpool-js");

function upCase(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

io.of("/signup").on("connection", socket => {
	socket.on("signup", (account, deviceID) => {
		let exists = false;

		users.users.forEach(user => {
			if (user.name == account.name) {
				exists = true;
			}
		});

		if (exists) {
			socket.emit("login", 403);

			return false;
		}

		let first = upCase(account.name.split(" ")[0]).trim(),
			last = account.name.toLowerCase().replace(first.toLowerCase(), "").trim().toUpperCase(),
			newUser = {
				name: first+" "+last,
				avatar: "adorable",
				password: wp.encSync(account.password),
				devices: [deviceID],
				drive: superID(48),
				id: superID(24),
				status: "online",
				lastConnection: new Date().toISOString(),
				feeds: []
			};

		users.users.push(newUser);

		fs.mkdirSync("./drive/"+newUser.drive);
		fs.writeFileSync("./users.json", JSON.stringify(users, null, 4));

		socket.emit("login", 200);
	});
});

io.of("/login").on("connection", socket => {
	socket.on("username.check", test => { // test username
		let all = users.users,
			startsWith = [],
			includes = [];
			test = cleanString(test);

		if (test == "") {
			socket.emit("username.check", []);
			return false;
		}
	
		all.forEach(user => {
			let cleanUser = cleanString(user.name),
				readytoSendUser = {
					name: user.name,
					avatar: user.avatar != "adorable" ? "/medias/avatars/"+user.avatar : "https://api.adorable.io/avatars/100/"+md5(user.name)+"@adorable.io.png",
					id: user.id,
					lastConnection: user.lastConnection
				};

			if (cleanUser.startsWith(test)) {
				startsWith.push(readytoSendUser);
			} else if (cleanUser.includes(test)) {
				includes.push(readytoSendUser);
			}
		});
	
		socket.emit("username.check", startsWith.concat(includes));
	});

	socket.on("login", (username, password, deviceID) => {
		let found = false;
		
		for (let i = 0; i<users.users.length; i++) {
			let user = users.users[i];

			if (user.name == username) {
				if (wp.encSync(password) == user.password) {
					socket.emit("login", 200);
					users.users[i].devices.push(deviceID);
					users.users[i].lastConnection = new Date().toISOString();
					fs.writeFileSync("./users.json", JSON.stringify(users, null, 4));
				} else {
					socket.emit("login", 403);
				}

				found = true;
			}
		}

		if (found == false) {
			socket.emit("login", 404);
		}
	});
});

function getUserFromId(userID) {
	for (let i = 0; i<users.users.length; i++) {
		let user = users.users[i];
		if (user.id == userID) {
			return {
				name: user.name,
				avatar: user.avatar != "adorable" ? "/medias/avatars/"+user.avatar : "https://api.adorable.io/avatars/100/"+md5(user.name)+"@adorable.io.png",
				status: user.status,
				id: user.id
			};
		}
	}
}

let connectSocketsID = {};

io.of("/connect").on("connection", socket => {
	socket.on("device.id", id => {
		let found = false;

		for (let i = 0; i<users.users.length; i++) {
			let user = users.users[i];
			if (user.devices.includes(id)) {
				let theUser = {
					name: user.name,
					avatar: user.avatar != "adorable" ? "/medias/avatars/"+user.avatar : "https://api.adorable.io/avatars/100/"+md5(user.name)+"@adorable.io.png",
					id: user.id,
					dialogs: user.dialogs,
					lastConnection: user.lastConnection,
				};
				socket.emit("device.ok", 200, theUser);
				socket.emit("weather", weather);

				found = true;
				socket.user = user;
				socket.join(user.id);

				if (!Object.keys(connectSocketsID).includes(user.id)) {
					connectSocketsID[user.id] = [socket.id];
				} else {
					connectSocketsID[user.id].push(socket.id);
				}

				users.users[i].lastConnection = new Date().toISOString();
				users.users[i].status = "online";
				emitNewStatus(socket.user.id, socket);
				fs.writeFileSync("./users.json", JSON.stringify(users, null, 4));
				break;
			}
		}

		if (!found) {
			socket.emit("device.ok", 403, false);
		}
	});

		socket.on("users", () => {
			let usersToSend = [];

			users.users.forEach(el => {
				usersToSend.push(getUserFromId(el.id));
			});

			socket.emit("users", usersToSend);
		});

		// Feeds
		socket.emit("feeds.update", feeds, rss.fetchDate);

		socket.on("feeds.delete", index => {
			feeds.splice(index, 1);
	
			io.sockets.emit("feeds.update", feeds, rss.lastFetch);
	
			config.feeds.list.splice(index, 1);
			configDB.save();
		});
	
		socket.on("feeds.add", url => {
			rss.add(url, socket);
		});

	socket.on("drive.files", () => {
		let list = [];
		drive.getRecursively(socket.user, file => {
			list.push(file);
		});

		socket.emit("drive.files", list);
	});

	socket.on("messages.dialogs", () => {
		if (!socket.user) {
			return false;
		}

		let list = [];

		// get all users's ids who are talking the first.
		messages.dialogs.forEach(dialog => {
			let found = false;
			dialog.users.forEach(uid => {
				if (uid == socket.user.id) found = true;
			});

			if (!found) return false;
			
			if (dialog.users.length <= 2) { 
				// user talking with the first user
				users.users.forEach(user => {
					if (user.id != socket.user.id) {
						let lastMessage = "",
							dialogID,
							contribs = [];

							lastMessage = dialog.messages.length > 0 ? dialog.messages[dialog.messages.length -1] : false;
							dialogID = dialog.id;
							viewed = dialog.viewedBy.includes(socket.user.id);

						contribs.push({
							name: user.name,
							avatar: user.avatar != "adorable" ? "/medias/avatars/"+user.avatar : "https://api.adorable.io/avatars/100/"+md5(user.name)+"@adorable.io.png",
							status: user.status,
							lastMessage: lastMessage,
							id: user.id
						});

						list.push({
							id: dialogID,
							viewed: viewed,
							contributors: contribs
						});
					}
				});
			}
		});
		
		socket.emit("messages.dialogs", list);
	});

	socket.on("messages.dialog", dialogID => {
		messages.dialogs.forEach(dialog => {
			if (dialog.id == dialogID) {
				if (!dialog.viewedBy.includes(socket.user.id)) {
					dialog.viewedBy.push(socket.user.id);
				}

				fs.writeFileSync("./messages.json", JSON.stringify(messages, null, 4));

				let contributors = dialog.users,
					contribsOut = [],
					msgs = [];

				users.users.forEach(user => {
					if (contributors.includes(user.id) && socket.user && user.id != socket.user.id) {
						contribsOut.push({
							name: user.name,
							avatar: user.avatar != "adorable" ? "/medias/avatars/"+user.avatar : "https://api.adorable.io/avatars/100/"+md5(user.name)+"@adorable.io.png",
							status: user.status,
							id: user.id
						});
					}
				});

				dialog.messages.slice(-45).forEach(msg => {
					msgs.push({
						date: msg.date,
						type: msg.type,
						content: msg.content,
						author: getUserFromId(msg.author)
					});
				});

				socket.emit("messages.dialog", msgs, contribsOut);
			}
		});
	});

	socket.on("messages.send", (content, type, dialogID) => {
		for (let i = 0; i<messages.dialogs.length; i++) {
			if (messages.dialogs[i].id == dialogID) {

				messages.dialogs[i].messages.push({
					date: new Date().toISOString(),
					type: type,
					content: content,
					author: socket.user.id
				});

				let newMessage = {
					date: new Date().toISOString(),
					type: type,
					content: content,
					author: getUserFromId(socket.user.id)
				};

				messages.dialogs.forEach(dialog => {
					if (dialog.id == dialogID) {
						dialog.viewedBy = [socket.user.id];
						Object.keys(connectSocketsID).forEach(SocketUserID => {
							if (dialog.users.includes(SocketUserID) || SocketUserID == socket.user.id) {
								connectSocketsID[SocketUserID].forEach(s => {
									socket.broadcast.to(s).emit("messages.new", newMessage, dialogID);
								});
							}
						});
					}
				});

				fs.writeFile("./messages.json", JSON.stringify(messages, null, 4), () => {
					socket.emit("messages.new", newMessage, dialogID);
				});

				break;
			}
		}
	});

	socket.on("messages.newDialog", contributors => {
		if (!Array.isArray(contributors)) return false;

		contributors = contributors.concat([socket.user.id]);
				
		// check if all IDs exists
		let error = false;

		contributors.forEach(_userID => {
			let found = false;
			users.users.forEach(user => {
				if (user.id == _userID) found = true;
			});

			if (!found) error = true;
		});


		if (error) return false;

		contributors.sort();

		// check if dialog already exists
		let alreadyExists = false;

		messages.dialogs.forEach(dialog => {
			if (dialog.users.join("/") == contributors.join("/")) {
				socket.emit("messages.dialogReady", dialog.id);
				alreadyExists = true;
			}
		});

		if (alreadyExists) return false;

		// if all is okay, let's create the dialog !
		let dialogID = superID(48);
		
		messages.dialogs.push({
			id: dialogID,
			users: contributors,
			viewedBy: [socket.user.id],
			messages: []
		});

		socket.emit("messages.dialogReady", dialogID);

		fs.writeFileSync("./messages.json", JSON.stringify(messages, null, 4));
	});

	socket.on("logout", id => {
		if (!socket.user) {
			return false;
		}

		for (let i = 0; i<users.users.length; i++) {
			if (users.users[i].id == socket.user.id) {
				let index = users.users[i].devices.indexOf(id);
				if (index > -1) {
					users.users[i].devices.splice(index, 1);
				}
				users.users[i].status = "offline";
				connectSocketsID[socket.user.id].splice(socket.id, 1);
				emitNewStatus(socket.user.id, socket);
				fs.writeFileSync("./users.json", JSON.stringify(users, null, 4));
			}
		}
	});

	/* XX / Music / @music
	========================== */
	socket.on("music", () => {
		drive.get(socket.user, file => {
			if (["mp3", "webm", "wav", "ogg"].includes(file.ext)) {

				// create a new parser from a node ReadStream
				mm(fs.createReadStream(drive.path(file)), {duration: true}, function (err, metadata) {
					if (err) throw err;
	
					file.path = "/drive/file/"+file.id;
					file.metadata = metadata;
					socket.emit("music", file);
				});
			}
		}, true);
	});

	/* User leaving
	=================== */

	socket.on('disconnect', () => {
		for (let i = 0; i<users.users.length; i++) {
			if (socket.user && users.users[i].id == socket.user.id) {
				connectSocketsID[socket.user.id].splice(socket.id, 1);

				if (connectSocketsID[socket.user.id].length == 0) {
					users.users[i].status = "offline";
					emitNewStatus(socket.user.id);
					fs.writeFileSync("./users.json", JSON.stringify(users, null, 4));
				}

				break;
			}
		}
	});

	socket.on('reconnect', () => {
		for (let i = 0; i<users.users.length; i++) {
			if (users.users[i].id == socket.user.id) {
				users.users[i].status = "online";

				if (!Object.keys(connectSocketsID).includes(user.id)) {
					connectSocketsID[user.id] = [socket.id];
				} else {
					connectSocketsID[user.id].push(socket.id);
				}

				emitNewStatus(socket.user.id);

				fs.writeFileSync("./users.json", JSON.stringify(users, null, 4));
				break;
			}
		}
	});
});

function emitNewStatus(uid) {
	let newStatus = "unknown";

	users.users.forEach(user => {
		if (user.id == uid) {
			newStatus = user.status;
		}
	});

	io.of("/connect").emit("user.status", uid, newStatus);
}

io.of("/take-avatar").on("connection", socket => {
	var delivery = dl.listen(socket);

	delivery.on('receive.success',function(file){
		let randomName = superID(45),
			fileName = randomName+"."+file.ext,
			path = "./public/medias/avatars/"+fileName,
			user = {};

			for (let i = 0; i<users.users.length; i++) {
				if (users.users[i].id == file.params.id) {
					users.users[i].avatar = fileName;
					user = users.users[i];
					fs.writeFileSync("./users.json", JSON.stringify(users, null, 4));
					break;
				}
			}

			sharp(file.buffer).resize(120, 120).toFile(path, (err, info) => {
				if (err) throw err;

				io.sockets.emit("avatar.change", "/medias/avatars/"+fileName, user.id);
			});
	});
});

/* JONAS drive
=======================

  v0.0.2 alpha
  11 dec. 2019

=====================*/


const folderSize = require("get-folder-size"),
      drive = {

	get(user, cb, recursively) { // get drive from the user's disk
		if (recursively) {
			return this.getRecursively(user, cb);
		} else {
			return this.getFolderContent(user, "root", true, cb);
		}
	},

	checkName(str) {
		if (["root", "", ".", "..", "../"].includes(str)) {
			return false;
		} else if (/[A-z0-9_]/g.test(str)) {
			return true;
		} else {
			return false;
		}
	},

	cleanName(name) {
		name = name.replace(/^\s+|\s+$/g, "");
		name = name.replace(/\//g, "_");
		name = name.replace(/"/g, "'");
		name = name.replace(/@/g, "[at]");
		name = name.replace(/&/g, " "+getTranslation("and")+" ");
		name = name.replace(/	| {2,}/g, " ");

		return name;
	},

	deleteFolderContent(user, folderID) {
		folders[user.id].forEach((folder, index) => {
			if (folder.id == folderID) {
				folders[user.id].splice(index, 1);
				fs.writeFileSync("./folders.json", JSON.stringify(folders, null, 4));
			}
		});

		this.get(user, false, true).forEach(file => {
			if (file.parent == folderID) {
				if (file.type == "folder") {
					this.deleteFolderContent(user, file.id);
				} else {
					delete files[file.id];

					fs.writeFileSync("./files.json", JSON.stringify(files, null, 4));
					fs.unlinkSync("./files/"+file.id+"."+file.ext);
				}
			}
		});
	},

	findParent(user, folderID) {
		let parent = "root";
		if (folders[user.id]) {
			folders[user.id].forEach(folder => {
				if (folder.id == folderID) {
					parent = folder.parent;
				}
			});
		}

		return parent;
	},

	findPath(user, folderID) {
		let path = [];

		let getParentName = folderID => {
			folders[user.id].forEach(folder => {
				if (folder.id == folderID) {
					path.unshift(folder);
					if (folder.parent != "") {
						getParentName(folder.parent);
					}
				}
			});
		};

		if (folders[user.id]) {
			getParentName(folderID);
		}

		return path;
	},

	getShared(user, cb) {
		if(!user) return false;

		let list = [];

		Object.keys(files).forEach(id => {
			let file = {};

				Object.assign(file, files[id]);

				file.id = id;

			let stat = fs.statSync(this.path(file));

				file.modify = stat.mtime;
				file.size = stat.size;

				users.users.forEach(ownerUser => {
					if (ownerUser.id == file.owner) {
						file.owner = {
							name: ownerUser.name,
							avatar: ownerUser.avatar != "adorable" ? "/medias/avatars/"+ownerUser.avatar : "https://api.adorable.io/avatars/100/"+md5(ownerUser.name)+"@adorable.io.png",
							id: ownerUser.id,
							status: ownerUser.status,
						};
					}
				});

			if (file.sharedWith.includes(user.id)) {
				list.push(file);
				if (cb) cb(file);
			}
		});

		return list;
	},

	getRecursively(user, cb) {
		if(!user) return false;

		let list = [];

		if (folders[user.id]) {
			folders[user.id].forEach(_folder => {
				let	folder = {};

					Object.assign(folder, _folder);

					folder.type = "folder";
					folder.length = this.getFolderContent(user, folder.id, false).length;
	
					list.push(folder);
			});
		}

		Object.keys(files).forEach(id => {
			let file = {};

				Object.assign(file, files[id]);

				file.id = id;

			if (!fs.existsSync(this.path(file))) return false;

			let stat = fs.statSync(this.path(file));

				file.modify = stat.mtime;
				file.size = stat.size;

			if (file.owner == user.id) {
				list.push(file);
				if (cb) cb(file);
			}
		});

		return list;
	},

	path(file, ext) {
		if (typeof file === "object") {
			return "./files/"+file.id+"."+file.ext;
		} else if (typeof file === "string") {
			return "./files/"+file+(ext ? "."+ext : "");
		}
	},

	getFolderContent(user, folderID, countFolders, cb) { // get folder's content
		if(!user) return false;

		let list = [];
			countFolders = countFolders == undefined ? true : countFolders;

		if (folders[user.id] && countFolders) {
			folders[user.id].forEach(_folder => {
				let	folder = {};

				Object.assign(folder, _folder);

				if (folder.parent == folderID) {

					folder.type = "folder";
					folder.length = this.getFolderContent(user, folder.id, false).length;
	
					list.push(folder);
				}
			});
		}

		Object.keys(files).forEach(id => {
			let file = {};

			Object.assign(file, files[id]);

			file.id = id;

			if (file.owner == user.id && file.parent == folderID) {
				if (!fs.existsSync(this.path(file))) return false;
				let stat = fs.statSync(this.path(file));

				file.modify = stat.mtime;
				file.size = stat.size;
				list.push(file);

				if (cb) cb(file);
			}
		});

		return list;
	},
	
	getFolderRecursively(user, folderID, details, cb) { // count number of files from a path
		let files = [];

		Object.keys(files).forEach(id => {
			let file = {};

			Object.assign(file, files[id]);

			let stat = fs.statSync(this.path(file));

			file.id = id;
			file.modify = stat.mtimeMS;
			file.size = stat.size;

			if (file.owner == user.id && file.parent == folderID) {
				files.push(file);
			}
		});

		return (details == true ? files : files.length);
	},
};

app.get("/check", (req, res) => {
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.end(JSON.stringify({
		device: config.system.device,
		version: package.version,
		lang: config.system.lang
	}));
});

app.get("/update", (req, res) => {
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.end(JSON.stringify({
		device: config.system.device,
		version: package.version,
		lang: config.system.lang
	}));
});

/* 01 / Reading File / @read
================================ */
app.get("/file/:fileID", (req, res) => {
	let fileID = req.params.fileID,
		deviceID = "",
		found = false,
		sent = false;
		
		if (!req.headers.cookie) {
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			res.end("500, t pas connecté à ce compte");
			return false;
		}

		req.headers.cookie.split(";").forEach(line => {
			let clean = line.trim(),
				key = clean.split("=")[0],
				value = clean.split("=")[1];

			if (key == "deviceID") {
				deviceID = value;
			}
		});

	Object.keys(files).forEach(id => {
		let file = files[id];

		if (id == fileID) {
			users.users.forEach(user => {
				if (file.owner == user.id && user.devices.includes(deviceID)) {
					res.sendFile(__dirname+"/files/"+id+"."+file.ext);
					sent = true;
				} else if (file.sharedWith.includes(user.id)) {
					res.sendFile(__dirname+"/files/"+id+"."+file.ext);
					sent = true;
				}
			});

			found = true;
		}
	});

	if (!found && !sent) {
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.end("404, déso fréro");
	} else if (found && !sent) {
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.end("500, t pas connecté à ce compte");
	}
});

app.get("/file/usb/:device/:path", (req, res) => {
	let path = req.params.path,
		usbDevice = req.params.device,
		pathOut = usb.mediaPath + usbDevice + decodeURIComponent(path);

		if (!fs.existsSync(pathOut)) return false;

		res.sendFile(pathOut);
});

/* XX / Upload File / @upload
================================= */
app.route("/drive/upload/:uid/:folderID/:usbDevice").post((req, res, next) => {
	let deviceID = false,
		folderID = req.params.folderID,
		usbDevice = req.params.usbDevice,
		isUSB = !!usbDevice;

	req.headers.cookie.split(";").forEach(line => {
		let clean = line.trim(),
			key = clean.split("=")[0],
			value = clean.split("=")[1];

		if (key == "deviceID") {
			deviceID = value;
		}
	});

	if (!req.params.uid) {
		console.log("no uid");

		return false;
	}

	if (!deviceID) {
		console.log("no deviceID");

		return false;
	}

    req.pipe(req.busboy); // Pipe it through busboy

    req.busboy.on('file', (fieldname, file, filename) => {		
		users.users.forEach(user => {
			if (user.id == req.params.uid) {
				if (!user.devices.includes(deviceID)) {
					console.log("not logged");

					return false;
				}

				let ext = filename.split("."); // find the extension
					ext = ext[ext.length -1].toLowerCase();
				let nameNoExt = filename.split(".");
					nameNoExt.pop();
					nameNoExt = nameNoExt.join(".");

				let renamingIndex = 1,
					renamingTag = "";

				while (isUSB && fs.existsSync(usb.mediaPath + usbDevice + folderID + "/" + nameNoExt+renamingTag + "." + ext)) {
					renamingIndex++;

					renamingTag = " #"+renamingIndex;
				}

				nameNoExt += renamingTag;

				let	fileOut = {
						name: nameNoExt,
						type: mime.contentType(ext),
						ext: ext,
						modify: new Date().toISOString(),
						parent: folderID,
						owner: user.id,
						sharedWith: []
					},
					fileID = superID(64),
					hash = crypto.createHash('sha256'),
					path = isUSB ? usb.mediaPath + usbDevice + folderID + "/" + nameNoExt + "." + ext : drive.path(fileID, ext), // defines the path
					fstream = fs.createWriteStream(path), // Create a write stream of the new file
					pathNoExt = drive.path(fileID, false); // Find the path without the extension

				// Avoid files without any extension
				if (!fileOut.type || ext == filename.toLowerCase()) {
					return false;
				}

				if (!isUSB) file.pipe(hash); // Pipe to the stream verification

				file.pipe(fstream); // Pipe the file through the storage

				hash.on("readable", () => {
					let data = hash.read(),
						exists = false;

						if (data) {
							data = data.toString('hex');
							fileOut.hash = data;

						// Check if any file is the same that the file which will be uploaded
						drive.get(user, testFile => {
							if (data == testFile.hash) {
								exists = true; // File found !
							}
						}, true);

						if (exists) { // if the file has already been uploaded,
							io.of("/connect").in(user.id).emit("drive.existing", fileOut);
						}

						files[fileID] = fileOut;
						fs.writeFileSync("./files.json", JSON.stringify(files, null, 4));
					}
				});

				fstream.on('close', () => {
					// Upload finished

					if (!isUSB && ["avi", "mkv", "mov", "flv", "dvd", "mpeg"].includes(ext) && fs.existsSync(path) && !fs.existsSync(pathNoExt+".mp4")) {
						hbjs.spawn({
							input: path,
							output: pathNoExt+".mp4"
						}).on('error', err => {
							console.error(err);
						}).on("progress", (progress) => {
							io.of("/connect").in(user.id).emit("drive.converting", {
								state: "progress",
								percent: progress.percentComplete,
								eta: progress.eta,
								id: fileID
							});
						}).on("complete", () => {
							if (!fs.existsSync(path)) return false;

							fs.unlink(path, err => {
								if (err) console.error(err);
								files[fileID].type = "video/mp4";
								files[fileID].ext = "mp4";

								fs.writeFile("./files.json", JSON.stringify(files, null, 4), err => {
									if (err) throw err;

									setTimeout(() => {
										io.of("/connect").in(user.id).emit("drive.reload");
									}, 100);
								});
							});
						});
					}
				});
			}
		});
    });
});

function logDate() {
	let d = new Date(),
		day = d.getDate() < 10 ? "0"+d.getDate() : d.getDate(),
		month = d.getMonth()+1 < 10 ? "0"+(d.getMonth()+1) : d.getMonth()+1,
		year = d.getFullYear(),
		hours = d.getHours() < 10 ? "0"+d.getHours() : d.getHours(),
		minutes = d.getMinutes() < 10 ? "0"+d.getMinutes() : d.getMinutes();

	return "At "+hours+":"+minutes+" the "+day+"/"+month+"/"+year+", ";
}

/* XX / Drive / @drive
========================== */
io.of("/drive").on("connection", socket => {

    // send the content to the user's socket
	let sendContent = (folderID) => {
		folderID = folderID || "root"; // anti-crash

		let list = drive.getFolderContent(socket.user, folderID);

        // emit the socket
		socket.emit("drive.content", {
			content: list,
			parent: drive.findParent(socket.user, folderID),
			folderID: folderID,
			path: drive.findPath(socket.user, folderID),
			totalFiles: list.length
		});
    };

    let sendDisk = function() {
        let driveDisks = [],
        totalSize = false;

        users.users.forEach(testUser => {
            folderSize("./files/", (err, size) => {
                if (err) throw err;

                driveDisks.push({
                    uid: testUser.id,
                    size: size
                });

                if (users.users[users.users.length -1].id == testUser.id) {
                    disk.check("/", (err, info) => {
                        if (err) throw err;

                        totalSize = info.total;
                        let used = info.total - info.available;

                        setTimeout(() => {
                            socket.emit("drive.disk", driveDisks, totalSize, used);
                        }, 50);
                    });
                }
            });
        });
    };

    // Login to the drive (to have the user id and his/her drive disk)
	socket.on("login", (uid, deviceID) => {
		users.users.forEach(user => {
			if (deviceID && uid && user.id == uid && user.devices.includes(deviceID)) {
				socket.user = user;

				sendContent(); // send his/her drive
				sendDisk(); // send disk usage
				
				socket.emit("drive.usb.devices", usb.list);
			}
		});
	});

	socket.on("drive.usb.device.content", (name, relativePath) => {
		let path = usb.mediaPath + name + relativePath + "/";
			relativePath = (relativePath + "/").replace(/\/{2,}/g, "/");

		if (!fs.existsSync(path)) return false;

		let	list = fs.readdirSync(path),
			listOut = [];

		list.forEach(fileName => {
			let stats = fs.statSync(path + fileName);

			if (stats.isDirectory()) {
				listOut.push({
					name: fileName,
					type: "folder",
					path: relativePath + fileName,
					length: fs.readdirSync(path + fileName).length
				});
			} else {
				let name = fileName.split("."),
					ext = fileName.split(".");

				name.pop();
				name = name.join(".");
				ext = ext[ext.length -1];

				listOut.push({
					name: fileName,
					type: mime.contentType(ext),
					path: relativePath + fileName,
					ext: ext,
					modify: stats.mtime,
					size: stats.size
				});
			}
		});

		let pathArr = relativePath.split("/"),
			pathDone = "/",
			pathOut = [];

		pathArr.shift();
		pathArr.pop();

		pathArr.forEach(el => {
			pathOut.push({
				name: el,
				id: "usb",
				path: pathDone + el,
				parent: "usb"
			});

			pathDone += el+"/";
		});

		socket.emit("drive.usb.device.content", {
			usbDevice: name,
			path: pathOut,
			content: listOut,
			folderID: "usb",
			parent: "usb"
		});
	});

	socket.on("drive.usb.delete", (usbDevice, path) => {
		let fullPath = usb.mediaPath + usbDevice + path;

		if (!fs.existsSync(fullPath)) return false;

		let isDirectory = fs.statSync(fullPath).isDirectory();

		if (isDirectory) {
			unlinkFolder(fullPath);
		} else {
			fs.unlinkSync(fullPath);
		}

		if (config.system.logs) {
			console.log(chalk[config.interface.color]("Jonas DRIVE: ")+logDate()+chalk.italic(socket.user.name)+' deleted '+chalk.underline(path)+' in '+chalk.black.bgWhite(" "+usbDevice+" ")+".");
		}

		socket.emit("drive.usb.delete", true, usbDevice, path);
	});

	socket.on("drive.usb.rename", (usbDevice, path, name, goIntoFolder) => {
		// Name control
		name = drive.cleanName(name);

		// Renaming
		let oldPathRelative = path.replace(/\/{2,}/g, "/"),
			newPathRelative = oldPathRelative.split("/"),
			oldPath = usb.mediaPath + usbDevice + oldPathRelative;

			newPathRelative.pop();
			newPathRelative.push(name);
			newPathRelative = newPathRelative.join("/").replace(/\/{2,}/g, "/");

		let newPath = usb.mediaPath + usbDevice + newPathRelative;

		if (config.system.logs) {
			console.log(chalk[config.interface.color]("Jonas DRIVE: ")+logDate()+chalk.italic(socket.user.name)+' renamed '+chalk.underline(oldPathRelative)+' in '+chalk.black.bgWhite(" "+usbDevice+" ")+" to "+chalk.underline(newPathRelative)+".");
		}

		if (!fs.existsSync(oldPath)) return false;

		if (fs.existsSync(newPath)) {
			socket.emit("drive.usb.rename", false, usbDevice, oldPathRelative, newPathRelative, name, goIntoFolder);
			return false;
		}

		fs.renameSync(oldPath, newPath);

		socket.emit("drive.usb.rename", true, usbDevice, oldPathRelative, newPathRelative, name, goIntoFolder);
	});

	socket.on("drive.usb.newFolder", (usbDevice, name, path) => {
		name = drive.cleanName(name);

		let fullPath = usb.mediaPath + usbDevice + path + "/",
			relFolderPath = path + "/" + name;
			fullPath = fullPath.replace(/\/{2,}/g, "/");

		if (!drive.checkName(name)) {
			socket.emit("drive.folderError");
			return false;
		}

		if (!fs.existsSync(fullPath)) return false;

		if (fs.existsSync(fullPath + "/" + name)) {
			socket.emit("drive.usb.rename", false, usbDevice, false, path, name, false);
			return false;
		}

		fs.mkdirSync(fullPath + "/" + name);

		if (config.system.logs) {
			console.log(chalk[config.interface.color]("Jonas DRIVE: ")+logDate()+chalk.italic(socket.user.name)+' created the folder '+chalk.underline(name)+' in '+chalk.black.bgWhite(" "+usbDevice+" ")+".");
		}

		socket.emit("drive.usb.newFolder", true, usbDevice, {
			name: name,
			length: 0,
			path: relFolderPath
		});
	});

	socket.on("drive.shared", () => {
		socket.emit("drive.shared", drive.getShared(socket.user));
	});

	socket.on("drive.content", folderID => {
		if (!socket.user) return false;
		
		if (folderID == undefined) {
			logError("drive.content", "path");
			return false;
		}

		sendContent(folderID); // send his/her drive
		sendDisk();// send disk usage
	});

	socket.on("drive.disk", sendDisk);

	socket.on("drive.delete", id => {
		if (!socket.user) return false;

		drive.get(socket.user, false, true).forEach(file => {
			if (file.id == id && file.owner == socket.user.id) {
				delete files[id];

				fs.writeFileSync("./files.json", JSON.stringify(files, null, 4));

				fs.unlink("./files/"+file.id+"."+file.ext, err => {
					if (err) throw err;

					sendDisk(); // send disk usage

					socket.emit("drive.delete", true, file.id);
				});
			}
		});
	});

	socket.on("drive.rename", (id, name) => {
		if (!socket.user) return false;

		drive.get(socket.user, file => {
			if (file.id == id && file.owner == socket.user.id) {
				files[file.id].name = name;
			}
		}, true);

		fs.writeFileSync("./files.json", JSON.stringify(files, null, 4));
		socket.emit("drive.rename", true);
	});

	socket.on("drive.share", (id, uid) => {
		if (!socket.user) return false;

		drive.get(socket.user, file => { // get all files of an user
			if (file.id == id && file.owner == socket.user.id) {
				if (!files[file.id].sharedWith.includes(uid)) { // if the file isn't already shared
					files[file.id].sharedWith.push(uid); // share it with the other user
					socket.emit("drive.share", true, files[file.id]); // say to the owner that the file was shared
				}
			}
		}, true); // recursive search

		fs.writeFileSync("./files.json", JSON.stringify(files, null, 4));
	});

	socket.on("drive.clearSharings", id => {
		if (!socket.user) return false;

		drive.get(socket.user, file => {
			if (file.id == id && file.owner == socket.user.id) {
				files[file.id].sharedWith = [];
			}
		}, true);

		fs.writeFileSync("./files.json", JSON.stringify(files, null, 4));
		socket.emit("drive.share", true);
	});

	socket.on("drive.newFolder", (name, parent) => {
		if (!drive.checkName(name)) {
			socket.emit("drive.folderError");
			return false;
		} 

		let id = superID(32);

		if (!Array.isArray(folders[socket.user.id])) {
			folders[socket.user.id] = [];
		}

		folders[socket.user.id].push({
			id: id,
			name: name,
			parent: parent
		});

		fs.writeFileSync("./folders.json", JSON.stringify(folders, null, 4));
		sendContent(parent);
	});

	socket.on("drive.renameFolder", (id, name, goIntoFolder) => {
		if (!drive.checkName(name)) {
			socket.emit("drive.folderError");
			return false;
		}

		folders[socket.user.id].forEach(folder => {
			if (folder.id == id) {
				folder.name = name;

				fs.writeFileSync("./folders.json", JSON.stringify(folders, null, 4));
				sendContent(goIntoFolder ? folder.id : folder.parent);
			}
		});
	});

	socket.on("drive.deleteFolder", folderID => {
		folders[socket.user.id].forEach((folder, index) => {
			if (folder.id == folderID) {
				folders[socket.user.id].splice(index, 1);

				fs.writeFileSync("./folders.json", JSON.stringify(folders, null, 4));

				socket.emit("drive.delete", true, folderID);

				// delete all content
				drive.deleteFolderContent(socket.user, folderID);
			}
		});
	});
});

function unlinkFolder(path) {
	if (fs.existsSync(path)) {
	  	fs.readdirSync(path).forEach((file, index) => {
			const curPath = Path.join(path, file);

			if (fs.lstatSync(curPath).isDirectory()) { // recurse
				unlinkFolder(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});

	  	fs.rmdirSync(path);
	}
}

function logError(socketName, param) {
	console.log(chalk.bgRed.white(" Jonas: ")+" Error, invalid "+chalk.keyword("orange")(param)+" param"+" at socket "+chalk.underline(socketName));
}

const update = {
	check(ctx, socket) {
		request("https://raw.githubusercontent.com/theotime-me/jonas/master/package.json", (err, response, body) => {
			if (err) {
				console.error(err);

				setTimeout(() => {
					update.check("retry", socket);
				}, 1000);

				return false;
			};

		let json = JSON.parse(body);
			lastVersion = json.version;

			// outdated version
			if (lastVersion != package.version && !this.updateProcessing) {
				if (ctx == "starting") { // is launched in starting
					console.log(
						chalk.dim("===================================================================\n\n")+
						chalk.blue("Jonas update: ")+" The "+chalk.dim(lastVersion+" ")+chalk.black.bgBlue(" update ")+" is available\n               "+
						"visit "+chalk.underline.blue("http://"+os.hostname()+".local/update")+" to follow progressing"+
						chalk.dim("\n\n===================================================================\n")
					);
				}
			}

			io.of("/update").emit("checking", {
				updated: lastVersion == package.version,
				updateProcessing: this.updateProcessing,
				version: {
					current: package.version,
					last: lastVersion
				}
			});
		});
	},

	percent: 0,
	size: 0,
	updateProcessing: false,
	download() {
		if (package.version == lastVersion || this.updateProcessing) return false;

		console.log("\n");
		this.updateProcessing = true;

		// create new progress bar
		const b1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
 
		b1.start(100, 0);
 
		progress(request(package.repository.url+"/archive/master.tar.gz"))
		.on("progress", state => {
			this.percent = Math.floor(state.percent*100);

			io.of("/update").emit("progress", {
				download: this.percent,
				dpkg: false,
				installed: false
			});
			console.log(this.percent);
			b1.update(this.percent);
		}).on("end", () => {
			this.percent = 100;

			b1.update(this.percent);
			io.of("/update").emit("progress", {
				download: this.percent,
				dpkg: false,
				installed: false
			});

			b1.stop();
			this.dpkg();
		}).pipe(fs.createWriteStream("./update-v"+lastVersion+".tar.gz"));
	},

	dpkg() {
		if (!fs.existsSync("./update-v"+lastVersion+".tar.gz")) return false;

		fs.createReadStream("./update-v"+lastVersion+".tar.gz").pipe(unpack("./temp-update", err => {
			if (err) console.error(err.stack);

			io.of("/update").emit("progress", {
				download: this.percent,
				dpkg: true,
				installed: false
			});

			this.clean();
		}));
	},

	clean() {
		let toDelete = [
			"drive",
			"README.md",
			"users.json",
			"weather.json",
			"messages.json",
			"devices.json",
			"feeds.json",
			"config.json"
		];

		fs.readdirSync("./temp-update").forEach(name => {
			toDelete.forEach(test => {
				if (name == test) {
					if (name.includes(".")) {
						fs.unlinkSync("./temp-update/"+name);
					} else {
						unlinkFolder("./temp-update/"+name);
					}
				}
			});
		});

		this.install();
	},

	install() {
		io.of("/update").emit("progress", {
			download: this.percent,
			dpkg: true,
			installed: true
		});

		fs.unlink("./update-v"+lastVersion+".tar.gz", err => {
			if (err) throw err;

			ncp("./temp-update", "./", function (err) {
				if (err) return console.error(err);
	
				console.log('done, running `npm install`');
	
				exec("sudo npm install", err => {
					if (err) throw err;
					
					exec("sudo chmod 777 -R ./", err => {
						if (err) throw err;

						process.on("exit", function () {
							require("child_process").spawn(process.argv.shift(), process.argv, {
								cwd: process.cwd(),
								detached : true,
								stdio: "inherit"
							});
						});
						process.exit();

					});
				});
			});
		});
	}
};

update.check("starting");

io.of("/update").on("connection", socket => {
	if (lastVersion) {
		socket.emit("checking", {
			updated: lastVersion == package.version,
			updateProcessing: this.updateProcessing,
			version: {
				current: package.version,
				last: lastVersion
			}
		});
	}

	socket.on("install", () => {
		update.download();

		socket.emit("progress", {
			download: this.percent,
			dpkg: true,
			installed: true
		});
	});
});

app.get("/placeholder/:type", (req, res) => {
	let type = req.params.type;

	out = `<svg xmlns="http://www.w3.org/2000/svg" width="500px" height="500px" viewBox="0 0 502.64 500"><defs><style>
	.a,.e,.f{fill:#f5b515}
	.b{fill:#ff4d4d}
	.c{fill:#ff3e0f}
	.d{fill:#ff8c12; opacity:${Math.floor(Math.random()*10)/10}}
	.e{opacity:${Math.floor(Math.random()*10)/10}}
	.f{opacity:${Math.floor(Math.random()*10)/10}}
	.g,.k{fill:#fff}
	.h,.i,.j{fill:none;stroke:#fff;stroke-miterlimit:10}
	.h{stroke-width:20px}
	.h{opacity:0.8}
	.i{stroke-width:15px;opacity:0.6}
	.j{stroke-width:10px;opacity:0.4}
	.k{opacity:0.5}
	.l{opacity:0.2}
	.m{opacity:0.1}
	.n{opacity:0.05}</style></defs>`,

		types = {
			podcast: `<circle class="g" cx="250.5" cy="243" r="24"/>
			<rect class="g" x="240.5" y="243" width="20" height="189" rx="10"/>
			<circle class="h" cx="251.5" cy="243" r="56"/>
			<circle class="i" cx="251.5" cy="243" r="93.5"/>
			<circle class="j" cx="250.5" cy="243" r="131"/>`,

			music: `<ellipse class="g" cx="132.33" cy="334.29" rx="42.29" ry="35.47" transform="translate(-190.52 177.12) rotate(-42.48)"/>
			<polygon class="g" points="204.02 147.59 175.15 147.59 142.34 333.67 171.21 333.67 204.02 147.59"/>
			<ellipse class="g" cx="293.08" cy="334.07" rx="42.29" ry="35.47" transform="translate(-148.18 285.62) rotate(-42.48)"/>
			<polygon class="g" points="364.76 147.38 335.89 147.38 303.08 333.45 331.95 333.45 364.76 147.38"/>
			<polygon class="g" points="364.43 147.59 175.15 147.59 164.96 205.34 354.25 205.34 364.43 147.59"/>`,

			news: `<rect class="g" x="137.5" y="126" width="217" height="260"/>
			<path class="k" d="M108,152h29V389.29a9.71,9.71,0,0,1-11.67,9.53c-6.91-1.45-14.33-6-14.33-18.82C111,356,108,152,108,152Z" transform="translate(0.5 0)"/>
			<path class="g" d="M137,386s-1,13-13,13H341s13-1,13-13Z" transform="translate(0.5 0)"/>
			<rect class="l" x="158.5" y="147" width="136" height="28"/>
			<rect class="m" x="158.5" y="186" width="103" height="103"/>
			<rect class="m" x="271.5" y="186" width="103" height="103"/>
			<rect class="m" x="385.5" y="186" width="103" height="103"/>
			<rect class="l" x="158.5" y="383" width="71" height="5"/>
			<rect class="l" x="307.5" y="147" width="41" height="5"/>
			<rect class="n" x="83.5" y="312" width="178" height="17"/>
			<rect class="m" x="158.5" y="337" width="79" height="5"/>`
		},

		curves = [
			'',
			'M-.5,289.5s66,194,146,210H-.5Z',
			'M499.5,126.5s-126,8-142,91-71,68-123,50-78,7-67,85,115,147,115,147h217Z',
			'M237.5.5c-189,35-206,88-238,147V.5Z',
			'M365.5,29.5s-139,34-100,118S72.5,500,72.5,500l259.75-.5s95.25-124,33.25-152-49-64,55-127,79-57.15,79-57.15V.5Z',
			'M55,.5S393,433,499.5,313V96.89S331,148,195,1Z',
			'M-.5,334s379.5,167.07,500,54L499,500l-98.29-.5S88,381.84,0,409.42Z'
		];

	if (Object.keys(types).includes(type)) {
		out += '<rect class="a" x="0.5" width="500" height="500"/>';

		// curves
		let curvesIndexes = [];

		for (let i = 0; i<curves.length-1; i++) {
			let index, className = ["a", "b", "c", "d", "e", "f"][i];

			while (curvesIndexes.includes(index) || !index) {
				index = Math.floor(Math.random() * curves.length);
			}

			curvesIndexes.push(index);

			// add one curve
			out += '<path class="'+className+'" d="'+curves[index]+'" transform="translate(0.5 0)"/>';
		}

		out += types[type]; // add icon

		out += '</svg>'; // tag's end
		
		// Send
		res.setHeader('Content-Type', 'image/svg+xml');
		
		// anti-cache
		res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
		res.setHeader('Expires', '-1');
		res.setHeader('Pragma', 'no-cache');

		res.status(200).end(out);
	} else {
		res.status(404).end("error 404");
	}
});

/* 08 / USB Storages / @usb
===============================*/
let usb = {
	list: [],
	sizes: {},
	mediaPath: process.env.HOME.replace("home", "media")+"/",
	devices() {
		return fs.readdirSync(this.mediaPath);
	},

	getSize(name, cb) {
		let path = this.mediaPath+name;

		exec("lsblk", (err, stdout, stderr) => {
			if (err) console.error(err);
			if (stderr) console.error(stderr);

			let lines = stdout.split("\n"),
				found = false;

			lines.forEach(line => {
				let columns = line.replace(/ {1,}/g, " ").split(" "),
					size = columns[3],
					testPath = columns[6];

				if (testPath == path) {
					let sizeLetter = size.replace(/\d|\./g, ""),
						sizeValue = parseFloat(size.replace(/[A-z]/g, ""));

					switch (sizeLetter) {
						case "G": size = sizeValue*1000000000; break;
						case "M": size = sizeValue*1000000; break;
						case "K": size = sizeValue*1000; break;
					}

					this.sizes[name] = size;

					if (cb) cb(size);
				}
			});
		});
	},

	check() {
		let	added = this.devices().filter(x => !this.list.includes(x)),
			removed = this.list.filter(x => !this.devices().includes(x));

			this.list = this.devices();

		added.forEach(device => {
			this.getSize(device);
			io.of("/drive").emit("drive.usb.device.change", device, true);
			io.of("/connect").emit("drive.usb", device, true, this.sizes[device]);
		});

		removed.forEach(device => {
			io.of("/drive").emit("drive.usb.device.change", device, false);
			io.of("/connect").emit("drive.usb", device, false, this.sizes[device]);
			delete this.sizes[device];
		});
	},

	loop() {
		setInterval(() => {
			this.check();
		}, 1000);
	},

	init() {
		this.loop();
	}
};

usb.init();

console.log("Access "+chalk[config.interface.color]("Jonas")+" at http://"+os.hostname()+".local or http://"+ip+"\n---");
console.log(chalk[config.interface.color]("Jonas: ")+" The wireless interface is "+chalk.black.bgGreen(" "+wlIface+" "));

//TODO: DELETE .mov, avi, etc. files
//-------------------------------------
//-------------------------------------
//-------------------------------------
//-------------------------------------
//-------------------------------------

function exitHandler(options) {
	fs.readdirSync("./").forEach(fileName => {
		if (fileName.startsWith("update")) {
			console.log("\n\n"+chalk.blue("Jonas update: ")+" The "+chalk.dim(lastVersion+" ")+chalk.black.bgBlue(" update ")+" was canceled");

			fs.unlinkSync("./"+fileName);
		}
	});

	if (fs.existsSync("./temp-update")) {
		unlinkFolder("./temp-update");
	}

    if (options.exit) process.exit();
}

if (!config.system.devMode) {
process.on('exit', exitHandler.bind(null,{cleanup:true})); //do something when app is closing
process.on('SIGINT', exitHandler.bind(null, {exit:true})); //catches ctrl+c event
process.on('SIGUSR1', exitHandler.bind(null, {exit:true})); // catches "kill pid"
process.on('SIGUSR2', exitHandler.bind(null, {exit:true})); // catches "kill pid"
process.on('uncaughtException', exitHandler.bind(null, {exit:true})); //catches uncaught exceptions
}