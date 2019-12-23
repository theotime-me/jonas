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
	serve = require("serve-static"),
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

	weather = {},
	feeds = [];
	
app.use(serve("./public"));

app.use(busboy({ // Insert the busboy middle-ware
    highWaterMark: 2 * 1024 * 1024, // Set 2MiB buffer
}));

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

function getWeather() {
	request("https://api.openweathermap.org/data/2.5/weather?q="+config.weather.city+"&appid="+config.weather.token+"&units=metric", function(err, response, body) {
		if (err) throw err;
	
		weather = body;
		io.sockets.emit("weather", weather);

		weatherAnalyticsFile.weather.push({
			time: new Date().toISOString(),
			value: JSON.parse(weather).main.temp
		});

		if (lastVersion == package.version) {
			console.log(chalk[config.interface.color]("Nitro: ")+" Now at "+config.weather.city.split(",")[0]+": "+chalk.underline(JSON.parse(weather).main.temp+"°C")+", "+chalk.dim(JSON.parse(weather).weather[0].description));
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
	get(urls, cb) {		
		for (let i = 0; i<urls.length; i++) {
			let url = urls[i];

			feeds = [];
			this.feed(url, feed => {
				if (feed == false) {
					return false;
				}

				feeds.push(feed);

				if (feeds.length == urls.length) {
					rssLastFetch = new Date().toISOString();
				}

				io.sockets.emit("feeds.update", feeds, rssLastFetch);
			});
		}
	},

	feed(url, cb) {
		request(url, function(err, rep, body) {
			if (err) throw err;

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

				for (let i = 0; i<(20/rss.urls.length); i++) {
					if (i >= channel.item.length) {
						return false;
					}

					let item = channel.item[i];

					elements.push({
						title: item.title[0],
						link: item.link[0],
						content: item.enclosure ? item.enclosure[0].$.url : null,
						contentType: item.enclosure && item.enclosure[0].$.type ? item.enclosure[0].$.type : null,
						contentLength: item.enclosure && item.enclosure[0].$.length ? item.enclosure[0].$.length : null,
						description: item.description[0],
						date: item.pubDate[0]
					});
				}

				let image;

				if (channel.image) {
					image = channel.image[0].url[0];
				} else if (channel["itunes:image"]) {
					image = channel["itunes:image"][0].$.href;
				}

				cb({
					title: channel.title[0],
					link: channel.link[0],
					image: image,
					description: channel.description[0],
					items: elements
				});
			});
		});
	}
};

setInterval(function() {
	getWeather();
	rss.get();
}, 3600000);

getWeather();
//rss.get();

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
				dialogs: []
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

let connectSocketsID = {},
	rssLastFetch;

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

		// Feeds
		socket.emit("feeds.update", feeds, rssLastFetch);

		socket.on("feeds.delete", index => {
			feeds.splice(index, 1);
	
			io.sockets.emit("feeds.update", feeds, rss.lastFetch);
	
			config.feeds.list.splice(index, 1);
			configDB.save();
		});
	
		socket.on("feeds.add", url => {
			if (!url.startsWith("http://") && !url.startsWith("https://")) {
				url = "http://"+url;
			}
	
			if (config.feeds.list.includes("http://"+url.replace(/http(s|):\/\//, "")) || config.feeds.list.includes("https://"+url.replace(/http(s|):\/\//, ""))) {
				socket.emit("feeds.add", 403);
				return false;
			}
	
			rss.feed(url, feed => {
				if (feed != false) {
					feeds.push(feed);
	
					rss.urls.push(url);
	
					io.sockets.emit("feeds.update", feeds, rss.lastFetch);
	
					config.feeds.list.push(url);
					configDB.save();
				} else {
					socket.emit("feeds.add", 404);
				}
			});
		});

	socket.on("drive.files", () => {
		if (!fs.existsSync("./drive/"+socket.user.drive)) {
			fs.mkdirSync("./drive/"+socket.user.drive);
		}

		let files = drive.getFolderRecursively("./drive/"+socket.user.drive, true);

		files.forEach(file => {
			let delimitator = "drive/"+socket.user.drive,
				split = file.path.split(delimitator);
				split.shift();

			file.path = "/"+split.join(delimitator);
		});

		socket.emit("drive.files", files);
	});

	socket.on("messages.dialogs", () => {
		if (!socket.user || (socket.user && socket.user.dialogs.length == 0)) {
			return false;
		}

		let list = [];

		// get all users's ids who are talking the first.
		socket.user.dialogs.forEach(uid => {
			// user talking with the first user
			users.users.forEach(user => {
				if (user.id == uid) {
					let lastMessage = "",
						dialogID,
						contribs = [];
					messages.dialogs.forEach(dialog => {
						if (dialog.users.includes(user.id) && user.id != socket.user.id) {
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
						}
					});
					list.push({
						id: dialogID,
						viewed: viewed,
						contributors: contribs
					});
				}
			});
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
			fileName = randomName+"."+file.name.split(".")[file.name.split(".").length -1],
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

/* NITRO drive
=======================

  v0.0.2 alpha
  11 dec. 2019

=====================*/


const folderSize = require("get-folder-size"),
      drive = {

	get(disk) { // get drive from the user's disk
		return this.getFolderContent("./drive/"+disk);
	},

	getFolderContent(path) { // get folder's content
		let folders = [],
			files = [],
			array = fs.readdirSync(path);

		array.forEach(el => {
			let path_ = Path.resolve(path, el),
				info = fs.statSync(path_);

			if (info.isDirectory()) {
				folders.push({
					name: el,
					mtime: info.mtime,
					size: info.size,
					length: this.getFolderRecursively(path_)
				});
			} else {
				files.push({
					name: el,
					mtime: info.mtime,
					size: info.size
				});
			}
		});

		return {
			folders: folders,
			files: files
		};
	},
	
	getFolderRecursively(path, details) { // count number of files from a path
		let fsed = fs.readdirSync(path),
			files = [];

		fsed.forEach(el => {
			let stats = fs.statSync(Path.resolve(path, el));

			if (!stats.isDirectory()) {
				let ext = "unknown",
					name = el.split(".");
					ext = name[name.length -1];
					name.pop();
					name = name.join(".");

				files.push({
					name: name,
					ext: ext,
					modify: stats.mtimeMs,
					size: stats.size,
					path: path
				});
			} else {
				files = files.concat(this.getFolderRecursively(path+"/"+el, true));
			}
		});

		return (details == true ? files : files.length);
	}
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

/* 01 / Reading File
======================== */
app.get("/drive/file/:uid/:path", (req, res) => {
	let userFound = false,
		thePath = decodeURIComponent(req.params.path),
		deviceID = "";

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

	users.users.forEach(user => {
		if (user.id == req.params.uid) {
			if (!user.devices.includes(deviceID)) {
				res.setHeader("Content-Type", "text/html; charset=utf-8");
				res.end("500, t pas connecté à ce compte");
			}

			if (fs.existsSync(__dirname+"/drive/"+user.drive+thePath)) {
				res.sendFile(__dirname+"/drive/"+user.drive+thePath);
			} else {
				res.setHeader("Content-Type", "text/html; charset=utf-8");
				res.end("404, déso fréro");
			}
		
			userFound = true;
		}
	});

	if (!userFound) {
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.end("Déso, on a pas trouvé l'utilisateur à qui appartient le fichier...");
	}
});

/* 02 / Upload File
======================== */
app.route("/drive/upload/:uid/:path").post((req, res, next) => {
	let deviceID = false;

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

				let path = __dirname+"/drive/"+user.drive+decodeURIComponent(req.params.path+"/").replace(/\/\//g, "/")+filename, // defines the path
					fstream = fs.createWriteStream(path), // Create a write stream of the new file
					ext = filename.split("."), // find the extension
					pathNoExt = path.split("."); // Find the path without the extension

					pathNoExt.pop();
					pathNoExt = pathNoExt.join(".");
					ext = ext[ext.length -1].toLowerCase();

				file.pipe(fstream); // Pipe the file through

				fstream.on('close', () => {
					// Upload finished

					if (["avi", "mkv", "mov", "flv", "dvd", "mpeg"].includes(ext)) {
						hbjs.spawn({
							input: path,
							output: pathNoExt+".mp4"
						}).on('error', err => {
							console.error(err);
						}).on("progress", (progress) => {
							io.of("/connect").in(user.id).emit("drive.converting", {
								state: "progress",
								percent: progress.percentComplete,
								path: (decodeURIComponent(req.params.path)+"/"+filename).replace(/\/\//g, "/")
							});
						}).on("complete", () => {
							fs.unlink(path, err => {
								if (err) console.error(err);

								io.of("/connect").in(user.id).emit("drive.reload");
							});
						});
					}
				});
			}
		});
    });
});

io.of("/drive").on("connection", socket => {

    // send the content to the user's socket
	let sendContent = (path) => {
		path = path || ""; // anti-crash

        // emit the socket
		socket.emit("drive.content", {
			path: "/"+path,
			content: drive.getFolderContent("./drive/"+socket.user.drive+path),
			totalFiles: drive.getFolderRecursively("./drive/"+socket.user.drive+path)
		});
    };
    
    let sendDisk = function() {
        let driveDisks = [],
        totalSize = false;

        users.users.forEach(testUser => {
            folderSize("./drive/"+testUser.drive, (err, size) => {
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
			}
		});
	});

	socket.on("drive.content", path => {
		if (!path) {
			logError("drive.content", "path");
			return false;
		}

		if (path.startsWith("/")) {
			path = path.replace("/", "");
		}

		if (path.endsWith("/")) {
			path = path.substring(0, path.length - 1);
		}

		if (!fs.existsSync("./drive/"+socket.user.drive+path)) {
			logError("drive.content", "path");
			return false;
		}

		sendContent(path); // send his/her drive
		sendDisk();// send disk usage
	});

	socket.on("drive.disk", sendDisk);

	socket.on("drive.delete", path => {
		if (!socket.user) {
			return false;
		}

		path = decodeURIComponent(path);

		while (path.startsWith("/")) {
			path = path.replace("/", "");
		}

		path = "/"+path;

		if (fs.existsSync("./drive/"+socket.user.drive+path)) {
			fs.unlink("./drive/"+socket.user.drive+path, err => {
                if (err) throw err;

                sendDisk();// send disk usage

                socket.emit("drive.delete", true);
            });
		}
	});

	socket.on("drive.rename", (oldPath, name) => {
		if (fs.existsSync("./drive/"+socket.user.drive+oldPath)) {
			name = name.replace("/", "");
			
			let path = oldPath.split("/");
				path.pop();
				path = path.join("/");

			let ext = oldPath.split(".");
				ext = ext[ext.length -1];

			magic.detectFile("./drive/"+socket.user.drive+oldPath, function (err, result) {
				if (err) throw err;

                // Rename the file
				fs.renameSync("./drive/"+socket.user.drive+oldPath, "./drive/"+socket.user.drive+path+"/"+name+"."+ext);

				socket.emit("drive.rename", "/drive/file/"+socket.user.id+"/"+encodeURIComponent(path+"/"+name+"."+ext));
			});
		}
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

fs.readdirSync("./drive").forEach(folder => {
	let exists = false;

	users.users.forEach(user => {
		if (user.drive == folder) {
			exists = true;
		}
	});

	if (!exists) {
		unlinkFolder("./drive/"+folder);
	}
});

function logError(socketName, param) {
	console.log(chalk.bgRed.white(" Nitro: ")+" Error, invalid "+chalk.keyword("orange")(param)+" param"+" at socket "+chalk.underline(socketName));
}

const update = {
	check(ctx, socket) {
		request("https://raw.githubusercontent.com/theotime-me/nitro/master/package.json", (err, response, body) => {
			if (err) console.error(err);

		let json = JSON.parse(body);
			lastVersion = json.version;

			// outdated version
			if (lastVersion != package.version && !this.updateProcessing) {
				if (ctx == "starting") { // is launched in starting
					console.log(
						chalk.dim("===================================================================\n\n")+
						chalk.blue("Nitro update: ")+" The "+chalk.dim(lastVersion+" ")+chalk.black.bgBlue(" update ")+" is available\n               "+
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

console.log("Access "+chalk[config.interface.color]("Nitro")+" at http://"+os.hostname()+".local or http://"+ip+"\n---");
console.log(chalk[config.interface.color]("Nitro: ")+" The wireless interface is "+chalk.black.bgGreen(" "+wlIface+" "));

//process.stdin.resume();//so the program will not close instantly

function exitHandler(options) {
	fs.readdirSync("./").forEach(fileName => {
		if (fileName.startsWith("update")) {
			console.log("\n\n"+chalk.blue("Nitro update: ")+" The "+chalk.dim(lastVersion+" ")+chalk.black.bgBlue(" update ")+" was canceled");

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