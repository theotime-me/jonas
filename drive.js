const { types } = require("util");

module.exports = (async function(app, io){
	let os =			require("os"),
		fs =			require("fs"),
		spawn = 		require('child_process').spawn,
		Username =		require('username'),
		thumbsupply = 	require("thumbsupply"),
		Path =			require("path"),
		nodeDiskInfo =	require('node-disk-info'),
		vidStreamer =	require("vid-streamer"),
		ffmpeg =		require("fluent-ffmpeg"),
		Transcoder = require('stream-transcoder');

    /* Scheduled checking
    ========================= */
	let devices = {},
		devices_cache = {},
        username = await Username(),
		path = "/media/"+username+"/",
		arr = [],
		old = [];

		added = [],
		removed = [];

		arr.forEach(name => {
			getDriveInfo(name, device => {
				devices[name] = device;
			});
		});

    let	schedule = setInterval(function() {

			arr = fs.readdirSync(path);

			added = arr.filter(x => !old.includes(x));
			removed = old.filter(x => !arr.includes(x));

			if (added.length || removed.length) {
				devices = {};

				arr.forEach((name, index) => {
					getDriveInfo(name, device => {
						devices[name] = device;

						if (Object.keys(devices).length == arr.length) {
							// last element
							io.emit("drive.devices", devices);
						}
					});
				});

				if (!arr.length) {
					io.emit("drive.devices", devices);
				}
			}

			if (!!added.length) { // added elements ?
				added.forEach(name => {
					getDriveInfo(name, device => {
						io.emit("drive.device.plug", device);
					});
				});
			}

			if (!!removed.length) { // removed elements ?
				removed.forEach(name => {
					getDriveInfo(name, device => {
						io.emit("drive.device.unplug", device);
					});
				});
			}

			old = arr;
		}, 1500);

		function getType(ext) {
			let table = {
				video:		["mp4", "avi", "mkv", "flv", "mov", "wmv", "webm"],
				image: 		["tiff", "gif", "png", "eps", "raw", "heic", "svg", "jpeg", "jpg", "bmp"],
				music: 		["mp3", "wav", "flac", "aiff", "ogg", "wma", "aac"],
				document: 	["odt", "doc", "docx"],
				pdf:		["pdf"],
				trash:		["trashinfo"],
				data:		["json", "jsonp", "csv", "db"],
				settings:	["plist"],
				slide:		["pptx", "odp"]
			};
	
			let type = "unknown";
	
			Object.keys(table).forEach(format => {
				let extensions = table[format];
	
				if (extensions.includes(ext)) type = format;
			});
	
			return type;
		}

		function getElement(p, cb) {
			if (p.endsWith("/")) {
				p = p.slice(0, -1);
			}

			let el = p.split("/")[p.split("/").length -1],
				stats = fs.statSync(p);

			if (fs.lstatSync(p).isDirectory()) {
				let size = fs.readdirSync(p).length;

					cb({
						folder: true,
						type: "folder",
						name: el,
						size: size,
						content: fs.readdirSync(p).length,
						modified: stats.mtime,
					});
			} else {
				let ext = "";

				if (el.includes(".")) {
					ext = el.split(".")[el.split(".").length -1];
				}

				cb({
					folder: false,
					type: getType(ext),
					ext: ext,
					name: el,
					size: stats.size,
					modified: stats.mtime,
				});
			}
		}
		
		function recursive_fetch(path, cb, i) {
			i = i || 0;

			if (i > 5) {
				cb([]);
				return false;
			};

			let isDir = fs.lstatSync(path).isDirectory(),
				list = [];

			if (!isDir) {
				return false;
			} else {
				let files = fs.readdirSync(path);

				files.forEach((name, index) => {
					let el = Path.join(path, name);

					if (fs.lstatSync(el).isDirectory()) {
						recursive_fetch(el, files => {
							files.forEach(el => {
								list.push(el);
							});
						}, i+1);
					} else {
						getElement(el, obj => {
							list.push(obj);
						});
					}

					if (index == files.length -1) {
						cb(list);
					}
				});
			}
		}

		
		async function getDriveInfo(_name, cb, i) {
			i = i || 0;

			if (i >= 100) return false; // max retries to get values about device.

			let df = spawn("df"),
				username = await Username(),
				path = "/media/"+username+"/",
				device = false;
		
			df.stdout.on('data', (data) => {
				data = data.toString();

				let lines = data.split("\n");

				lines.forEach((line, index) => {
					if (!index) return false;
					if (!line.includes(path)) return false;
					let name = line.split(path)[1];

					if (name != _name) return false;

					line = line.replace(/ +/g, " ");
					line = line.split(" ");

					let	mount = line[0],
						size = parseInt(line[1])*1000,
						GB = Math.round(size / 1000000000);
						used = parseInt(line[2])*1000,
						available = parseInt(line[3])*1000,
						usage = parseInt(line[4].replace("%", ""))/100;

					device = {
						name: name,
						mount: mount,
						size: size,
						used: used,
						available: available,
						usage: usage,
						type: GB < 256 ? "flash drive" : "hard drive"
					};
				});

				if (!device && devices_cache[_name]) {
					device = devices_cache[_name];
					if (cb) cb(device);
				} else if (!device) {
					setTimeout(() => {
						getDriveInfo(_name, cb, i+1);
					}, 100);
				} else {
					if (cb) cb(device);
				}
			});
		}


		/* Sockets handling
		======================= */

		io.on("connection", socket => {
			socket.emit("drive.devices", devices);

			socket.on("drive.device.content", async (device, path) => {
				device = device || Object.keys(devices)[0];
				path = path || "/";
				path = decodeURIComponent(path);

				let username = await Username(),
					devpath =  "/media/"+username+"/"+device;

				if (!fs.existsSync(devpath)) {
					socket.emit("drive.device.error", 404, "device.notfound", device, path);
					return false;
				};

				let fullpath = Path.join(devpath, path);

				if (!fs.existsSync(fullpath)) {
					socket.emit("drive.device.content.error", 404, "path.notfound", device, path);
					return false;
				};

				let elements = fs.readdirSync(fullpath),
					out = [];

					elements.forEach(el => {
						let p = Path.join(fullpath, el);

						getElement(p, file => {
							out.push(file);
						});
					});

					socket.emit("drive.device.content", device, path, out);
			});
		});

		/* FILE SENDING
		=================== */
		app.get("/file/:device/:path", async (req, res) => {
			let device = req.params.device,
				path = decodeURIComponent(req.params.path),
				username = await Username(),
				devpath = "/media/"+username+"/"+device+"/",
				fullpath = Path.join(devpath, path);

			if (!fs.existsSync(devpath)) {
				socket.emit("drive.device.error", 404, "device.notfound", device, path);
				res.status(404);
				return false;
			} else if (!fs.existsSync(fullpath)) {
				socket.emit("drive.device.content.error", 404, "path.notfound", device, path);
				res.status(404);
				return false;
			} else if (fs.lstatSync(fullpath).isDirectory()) {
				// display directory
				return false;
			}

			res.status(200).sendFile(fullpath);
		});

		app.get("/stream/", vidStreamer);

		app.get("/thumb/:device/:path", async (req, res) => {
			let device = decodeURIComponent(req.params.device),
				path = decodeURIComponent(req.params.path),
				username = await Username(),
				devpath = "/media/"+username+"/"+device+"/",
				fullpath = Path.join(devpath, path);

			if (!fs.existsSync(devpath)) {
				res.json({
					error: 404,
					code: "device.missing",
					message: "Error: Device not found"
				});
				return false;
			} else if (!fs.existsSync(fullpath)) {
				res.json({
					error: 404,
					code: "file.notfound",
					message: "Error: Path specified not found"
				});
				return false;
			} else if (fs.lstatSync(fullpath).isDirectory()) {
				// display directory
				return false;
			}

			let ext = fullpath.split(".")[fullpath.split(".").length -1];

			thumbsupply.generateThumbnail(fullpath, {
				size: thumbsupply.ThumbSize.LARGE, // or ThumbSize.LARGE
				timestamp: "10%", // or `30` for 30 seconds
				cacheDir: Path.join(__dirname, "/cache"),
				mimetype: "video/"+ext
			}).then(thumb => {
				res.status(200).sendFile(thumb);
			});
		});

		app.get("/stream/:device/:path", async function (req, res) {

			let device = decodeURIComponent(req.params.device),
				path = decodeURIComponent(req.params.path),
				username = await Username(),
				devpath = "/media/"+username+"/"+device+"/",
				fullpath = Path.join(devpath, path);

			if (!fs.existsSync(devpath)) {
				res.json({
					error: 404,
					code: "device.missing",
					message: "Error: Device not found"
				});
				return false;
			} else if (!fs.existsSync(fullpath)) {
				res.json({
					error: 404,
					code: "file.notfound",
					message: "Error: Path specified not found"
				});
				return false;
			} else if (fs.lstatSync(fullpath).isDirectory()) {
				// display directory
				return false;
			}

			// Ensure there is a range given for the video
			const range = req.headers.range;
			if (!range) {
			  res.status(400).send("Requires Range header");
			}
		  
			// get video stats (about 61MB)
			const videoPath = "./piano.mp4";
			const videoSize = fs.statSync(videoPath).size;
		  
			// Parse Range
			// Example: "bytes=32324-"
			const CHUNK_SIZE = 10 ** 5; // 1MB
			const start = Number(range.replace(/\D/g, ""));
			const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
		  
			// Create headers
			const contentLength = end - start + 1;
			const headers = {
			  "Content-Range": `bytes ${start}-${end}/${videoSize}`,
			  "Accept-Ranges": "bytes",
			  "Content-Length": contentLength,
			  "Content-Type": "video/mp4",
			};
		  
			// HTTP Status 206 for Partial Content
			res.writeHead(206, headers);
		  
			// create video read stream for this particular chunk
			const videoStream = fs.createReadStream(videoPath, { start, end });
		  
			// Stream the video chunk to the client
			videoStream.pipe(res);
		  });
});

