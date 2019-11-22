var app = require("express")(),
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
	devices = require("./devices.json"),
	messages = require("./messages.json"),
	upload = require("multer")(),

	weather = {},
	feeds = [];
	
app.use(serve("./public"));

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

app.post("/drive/upload/:uid", upload.single('file'), (req, res) => {
	let file = req.file,
		deviceID = false;

		if (!req.params.uid) {
			console.log("no uid");

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

		if (!deviceID) {
			console.log("no deviceID");

			return false;
		}
		
		users.users.forEach(user => {
			if (user.id == req.params.uid) {
				if (!user.devices.includes(deviceID)) {
					console.log("not logged");

					return false;
				}

				fs.writeFile(__dirname+"/drive/"+user.drive+"/"+file.originalname, file.buffer, err => {
					if (err) console.error(err);
				});
			}
		});
});

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

	require('child_process').exec('iwgetid', (err, ssidName) => {
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
		isSetup: config.system.isSetup
	});

	socket.on("system.restart", () => {
		socket.emit("system.restart");
		require("child_process").exec("sudo npm start", (err, out) => {
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

	// Feeds
	socket.emit("feeds.update", feeds, rss.lastFetch);

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

const drive = {
	get(disk) {
		return this.getFolderContent("./drive/"+disk);
	},

	getFolderContent(path) {
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
	
	getFolderRecursively(path) {
		let fsed = fs.readdirSync(path),
			number = 0;

		fsed.forEach(el => {
			let stats = fs.statSync(Path.resolve(path, el));

			if (!stats.isDirectory()) {
				number++;
			} else {
				number += this.getFolderRecursively(Path.resolve(path, el));
			}
		});

		return number;
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

		console.log(chalk[config.interface.color]("Nitro: ")+" Now at "+config.weather.city.split(",")[0]+": "+chalk.underline(JSON.parse(weather).main.temp+"°C")+", "+chalk.dim(JSON.parse(weather).weather[0].description));

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
	urls: config.feeds.list,
	lastFetch: "",

	get() {		
		for (let i = 0; i<this.urls.length; i++) {
			let url = this.urls[i];

			feeds = [];
			this.feed(url, feed => {
				if (feed == false) {
					return false;
				}

				feeds.push(feed);

				if (feeds.length == this.urls.length) {
					this.lastFetch = new Date().toISOString();
				}

				io.sockets.emit("feeds.update", feeds, this.lastFetch);
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
rss.get();

let piWifi = require('pi-wifi'),
	WiFiControl = require('wifi-control'),
	wlIface = "wlan0",
	os = require("os"),
	wifi = require("node-wifi"),
	scanner = require("zafrani-rpi-wifiscanner");

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

piWifi.setCurrentInterface(wlIface, function(err) {
	if (err) throw err;

	console.log(chalk[config.interface.color]("Nitro: ")+" The wireless interface is "+chalk.black.bgGreen(" "+wlIface+" "));
});

function superID(length) {
	let arrayOfRandom = [],
		out = [],
		hexa = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];

	for (let i = 0; i<length; i++) {
		arrayOfRandom.push(Math.floor(Math.random() * 15));
	}

	arrayOfRandom.forEach(nb => {
		out.push(hexa[nb]);
	});

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
		if (devices.devices.includes(id)) {
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
					found = true;
					socket.user = user;

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
		} else {
			socket.emit("device.ok", 404, false);
		}
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

	socket.on("device.new", id => {
		if (id.length == 10 && id != "") {
			if (!devices.devices.includes(id)) {
				devices.devices.push(id);
				fs.writeFileSync("./devices.json", JSON.stringify(devices, null, 4));
				socket.emit("device.ok", 404, false);
			}
		}
	});

	socket.on("logout", id => {
		if (!socket.user) {
			return false;
		}

		if (devices.devices.includes(id)) {
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
		}
	});

	socket.on('disconnect', () => {
		for (let i = 0; i<users.users.length; i++) {
			if (socket.user && users.users[i].id == socket.user.id) {
				connectSocketsID[socket.user.id].splice(socket.id, 1);

				users.users[i].status = "offline";
				emitNewStatus(socket.user.id, socket);
				fs.writeFileSync("./users.json", JSON.stringify(users, null, 4));
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

				emitNewStatus(socket.user.id, socket);

				fs.writeFileSync("./users.json", JSON.stringify(users, null, 4));
				break;
			}
		}
	});
});

function emitNewStatus(uid, socket) {
	let newStatus = "unknown";

	users.users.forEach(user => {
		if (user.id == uid) {
			newStatus = user.status;
		}
	});

	Object.values(connectSocketsID).forEach(sid => {
		socket.broadcast.to(sid).emit("user.status", uid, newStatus);
	});
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

io.of("/drive").on("connection", socket => {
	let sendContent = (path) => {
		path = path || "";

		socket.emit("drive.content", {
			path: "/"+path,
			content: drive.getFolderContent("./drive/"+socket.user.drive+path),
			totalFiles: drive.getFolderRecursively("./drive/"+socket.user.drive+path)
		});
	};

	socket.on("login", (uid, deviceID) => {
		users.users.forEach(user => {
			if (deviceID && uid && user.id == uid && user.devices.includes(deviceID)) {
				socket.user = user;

				sendContent();

				let driveDisks = [],
					totalSize = false;

				users.users.forEach(testUser => {
					driveDisks.push({
						uid: testUser.id,
						size: fs.statSync("./drive/"+testUser.drive).size
					});
				});

				disk.check("/", (err, info) => {
					if (err) throw err;

					totalSize = info.total;
					let used = info.total - info.available;

					socket.emit("drive.disk", driveDisks, totalSize, used);
				});
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

		sendContent(path);
	});

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
			fs.unlinkSync("./drive/"+socket.user.drive+path);

			path = path.split("/");
			path.pop();
			path = path.join("/");

			socket.emit("drive.delete", true);
		}
	});

	socket.on("drive.rename", (oldPath, name) => {
		if (fs.existsSync("./drive"+oldPath)) {
			let path = oldPath.split("/");
			path.pop();
			path = path.join("/");

			magic.detectFile("./drive"+oldPath, function (err, result) {
				if (err) throw err;

				fs.renameSync("./drive/"+socket.user.drive+oldPath, "./drive/"+socket.user.drive+path+"/"+name+(mime.extension(result) != false ? "."+mime.extension(result) : ""));

				sendContent(path);
			});
		}
	});
});

function logError(socketName, param) {
	console.log(chalk.bgRed.white(" Nitro: ")+" Error, invalid "+chalk.keyword("orange")(param)+" param"+" at socket "+chalk.underline(socketName));
}

console.log("Access "+chalk[config.interface.color]("Nitro")+" at http://"+os.hostname()+".local or http://"+ip+"\n---");