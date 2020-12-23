var http = require('http'),
	app = require('express')(),
	server = http.createServer(app),
	serveStatic = require('serve-static'),

	os =	require("os"),
	fs =	require("fs"),
	Path =	require("path"),

	io = require("socket.io")(server),
	port = process.env.PORT || 80,

	building = require("./data/building.json"),
	owner = require("./data/owner.json"),
	preferences = require("./data/preferences.json"),
	rooms = require("./data/rooms.json").rooms;

app.use(serveStatic(Path.join(__dirname, 'public')));

server.listen(port, () => {
	require('./drive.js')(app, io);
	require('./fancy.js')(app, io);
	require('./self.js')(app, io);
	require('./sense.js')(app, io);
	
	app.get("/*", (req, res, next) => {
		let path = req.path.replace(/\/{2,}/g, "/");
		if (!path.endsWith("/")) path = path+="/";
		if (!path.startsWith("/")) path = path = "/"+path;

		let a = false;
	
		["/file", "/stream", "/thumb"].forEach(el => {
			if (path.startsWith(el)) a = true;
		});

		if (!a) {
			res.sendFile(Path.join(__dirname, "/public/index.html"));
		} else {
			next();
		}
	});

	console.log('listening on :'+port);
});

io.on("connection", socket => {
	socket.emit("global.info", {
		preferences: {
			lang: preferences.lang,
			temp: preferences.temp, // celsius || fahrenheit
		},

		building: {
			type: building.type,
			area: building.area,
		},

		room: {
			device_room: 		building.device_room,
			temp_expected: 		rooms[building.device_room].temp,
			humidity_expected: 	rooms[building.device_room].humidity
		},

		owner: {
			type: 	owner.type,
			name: 	owner.name,
			length: owner.length,
			gender: owner.gender
		}
	});
});
