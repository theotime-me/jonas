var app = require("express")(),
	server = require('http').createServer(app),
	config = require("./config.json"),
	io = require("socket.io").listen(server),
	fs = require("fs"),
	Path = require("path"),
	serve = require("serve-static"),
	request = require("request"),
	progress = require("request-progress"),
	xml2js = require("xml2js"),
	disk = require("diskusage"),
	parser = new xml2js.Parser(),
	mime = require("mime-types"),
	mmm = require("mmmagic"),
	Magic = mmm.Magic,
	magic = new Magic(mmm.MAGIC_MIME_TYPE),

	weather = {},
	feeds = [];
	
app.use(serve("./public"));

app.get("*", (req, res) => {
	let path = req.originalUrl.replace("/", "");

	if (path.startsWith("drive")) {
		path = path.split("/");
		path.shift();

		let thePath = decodeURIComponent(path.join("/"));

		if (fs.existsSync(__dirname+"/drive/"+thePath)) {
			res.sendFile(__dirname+"/drive/"+thePath);
		} else {
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			res.end("404, déso fréro");
		}
	}
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

io.sockets.on("connection", function(socket) {
	socket.emit("weather", weather);

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

	socket.emit("drive.content", {
		path: "/",
		content: drive.get(),
		totalFiles: drive.getFolderRecursively("./drive")
	});

	socket.on("drive.content", path => {
		if (path.startsWith("/")) {
			path = path.replace("/", "");
		}

		socket.emit("drive.content", {
			path: "/"+path,
			content: drive.getFolderContent("./drive/"+path),
			totalFiles: drive.getFolderRecursively("./drive")
		});
	});

	socket.on("drive.delete", path => {
		if (fs.existsSync("./drive"+path)) {
			fs.unlinkSync("./drive"+path);

			path = path.split("/");
			path.pop();
			path = path.join("/");
			
			socket.emit("drive.content", {
				path: "/"+path,
				content: drive.getFolderContent("./drive/"+path),
				totalFiles: drive.getFolderRecursively("./drive")
			});
		}
	});

	socket.on("drive.rename", (oldPath, name) => {
		if (fs.existsSync("./drive"+oldPath)) {
			let path = oldPath.split("/");
			path.pop();
			path = path.join("/");

			magic.detectFile("./drive"+oldPath, function (err, result) {
				if (err) throw err;

				fs.renameSync("./drive"+oldPath, "./drive"+path+"/"+name+(mime.extension(result) != false ? "."+mime.extension(result) : ""));
		
				socket.emit("drive.content", {
					path: "/"+path,
					content: drive.getFolderContent("./drive/"+path),
					totalFiles: drive.getFolderRecursively("./drive")
				});
			});
		}
	});
	
	disk.check("/", function(err, info) {
		if (err) {
			throw err;
		}

		socket.emit("drive.disk", info);
	});

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
});

const configDB = {
	save() {
		fs.writeFileSync("./config.json", JSON.stringify(config, null, 4));
	}
};

const drive = {
	get() {
		return this.getFolderContent("./drive");
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
		
			io.sockets.emit("drive.content", {
				path: "/",
				content: drive.get(),
				totalFiles: drive.getFolderRecursively("./drive")
			});
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

				let channel = result.rss.channel[0],
					elements = [];
				
				for (let i = 0; i<4; i++) {
					let item = channel.item[i];

					elements.push({
						title: item.title[0],
						link: item.link[0],
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
}, 1200000);

getWeather();
rss.get();

server.listen(80);