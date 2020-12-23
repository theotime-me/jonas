module.exports = (async function(app, io){
	let	preferences = require("./data/preferences.json"),
		building = require("./data/building.json"),
		rooms = require("./data/rooms.json").rooms,
		readline = require("linebyline"),
		Path = require("path"),
		fastcsv = require('fast-csv'),
		fs = require("fs"),
		room_current = {
		    temp: 16,
		    humidity: 40,
		    pressure: 1000,
		    gathering_time: null
        }, quartz = null;


	/* GATHERING DATA
	===================== */
	let sense = {
		get(cb) {
			room_current.temp = this.FAKE("temp");
			room_current.humidity = this.FAKE("humidity");
			room_current.pressure = this.FAKE("pressure");
			room_current.atmosphere = score();
		
			room_current.gathering_time = new Date().getTime();

			store.push({
				date: new Date().toISOString(),
				temp: room_current.temp,
				humidity: room_current.humidity,
				pressure: room_current.pressure
			});
		
			if (cb) cb(room_current);
		},

		send() {
			sense.get(data => io.emit("room.current", data));
		},

		FAKE(type) {
			switch (type) {
				case "temp": return Math.floor(Math.random() * 30)+10;
				case "humidity": return Math.floor(Math.random() * 60) + 30;
				case "pressure": return Math.floor(Math.random() * 1000);
			}
		}
	};

	/* ROOM ATMOSPHERE SCORE
	============================ */
	function score() {
		let temp = Math.floor(room_current.temp),
			humidity = Math.floor(room_current.humidity),
			pressure = Math.floor(room_current.pressure);

		let temp_score = 100,
			humidity_score = 100,
			pressure_score = 100;

		let device_room = building.device_room,
			temp_interval = rooms[device_room].temp,
			humidity_interval = rooms[device_room].humidity,
			best_temp = temp_interval[1];

		// Temperature
		if (temp == best_temp) { // PERFECT temperature
			temp_score = 100;
		} else if (temp >= temp_interval[0] && temp <= temp_interval[2]) { // Temp. is INCLUDED the interval provided by "rooms.json"
			temp_score = 92;
		} else { // The temp is NOT INCLUDED in the interval provided by "rooms.json"
			if (temp < temp_interval[0]) {
				let diff = temp_interval[0] - temp,
					factor = 16; // 1°C removes 28% to the TEMP SCORE.

				temp_score -= diff * factor;
			} else {
				let diff = temp - temp_interval[2],
					factor = 8; // 1°C removes 18% to the TEMP SCORE.

				temp_score -= diff * factor;
			}
		}

		// Humidity
		if (humidity >= humidity_interval[0] && humidity <= humidity_interval[1]) { // Temp. is INCLUDED the interval provided by "rooms.json"
			humidity_score = 100;
		} else {
			if (humidity < humidity_interval[0]) {
				let diff = Math.abs(humidity_interval[0] - humidity),
					factor = 5;

				humidity_score -= diff * factor;
			} else {
				let diff = Math.abs(humidity - humidity_interval[1]),
					factor = 8;

				humidity_score -= diff * factor;
			}
		}

		// Packaging
		if (temp_score < 0) temp_score = 0;
		if (humidity_score < 0) humidity_score = 0;

		// Advices
		let advices = {
			temp: "good_temp",
			humidity: "good_humidity"
		}, advice = "perfect";

		if (temp < temp_interval[0]) {
			if (temp_score > 60) {
				advices.temp = "too_cold";
			} else {
				advices.temp = "very_cold";
			}
		} else if (temp > temp_interval[2]) {
			if (temp_score > 60) {
				advices.temp = "too_hot";
			} else {
				advices.temp = "very_hot";
			}
		}

		if (humidity < humidity_interval[0]) {
			if (humidity_score > 60) {
				advices.humidity = "too_dry";
			} else {
				advices.humidity = "very_dry";
			}
		} else if (humidity > humidity_interval[1]) {
			if (humidity_score > 60) {
				advices.humidity = "too_wet";
			} else {
				advices.humidity = "very_wet";
			}
		}

		if (temp_score < humidity_score) {
			advice = advices.temp;
		} else {
			advice = advices.humidity;
		}

		let temp_score_final = temp_score * 65 /100; // 72% of score is about temp
		let humidity_score_final = humidity_score * 35 /100; // 28% of humidity is about humidity
		
		let score = temp_score_final + humidity_score_final;

		score = Math.floor(score);

		return {
			score: {
				total: score,
				temp: temp_score,
				humidity: humidity_score
			},
			advice: advice,
			advices: advices
		};
	}


	/* SOCKET MANAGEMENT
	======================== */
	io.on("connection", socket => {
		socket.emit("room.current", room_current);
		store.send();

		socket.on("room.graph", (date1, date2) => {
			store.send(date1, date2, socket);
		});
	});


	/* STORE DATA
	================= */
	const createCsvWriter = require('csv-writer').createObjectCsvWriter;
	const csvWriter = createCsvWriter({
		path: Path.join(__dirname, '/storage/sense.csv'),
		fieldDelimiter: ";",
		append: true,
	    header: ["date", "temp", "humidity", "pressure"]
	});
 
	let store = {
		file: Path.join(__dirname, '/storage/sense.csv'),

        reset() {
			fs.writeFileSync(this.file, '',{encoding:'utf8',flag:'w'});
		},
		
		push(data) {
			data = [data];

			csvWriter.writeRecords(data);
		},

		send(date1, date2, socket) {
			date1 = date1 || new Date().getTime() - (40 * 60*60*1000), // 40h before NOW
			date2 = date2 || new Date();

			store.get(date1, date2, arr => {
				if (socket) {
					socket.emit("room.graph", date1, date2, arr);
				} else {
					io.emit("room.graph", date1, date2, arr);
				}
			});	
		},

		get(date, date2, cb) {
			date = new Date(date).getTime();
			date2 = date2 ? new Date(date2).getTime() : false;

			var i, total = 0;
			fs.createReadStream(this.file)
			  .on('data', function(chunk) {
			    for (i=0; i < chunk.length; ++i)
			      if (chunk[i] == 10) total++;
			  })
			.on('end', () => {
				let rl = readline(this.file),
					out = [];

				rl.on("line", (line, lineCount) => {
					let cols = line.split(";"),
						_date = new Date(cols[0]).getTime(),
						temp = cols[1],
						humidity = cols[2],
						pressure = cols[3];
	
					if (date2) {
						if (date <= _date && _date <= date2) {
							out.push({
								date: _date,
								temp: temp,
								humidity: humidity,
								pressure: pressure
							});
						}
					} else {
						if (_date == date) {
							out.push({
								date: _date,
								temp: temp,
								humidity: humidity,
								pressure: pressure
							});
						}
					}

					if (total == lineCount) {
						if (cb) cb(out);
					}
				});
			});
		}
	};


	/* QUARTZ
	============= */
    let gathering_frequency = preferences.gathering_frequency; // value in seconds

	// Not below 10s, neither above 1h
	if (gathering_frequency < 10) gathering_frequency = 10; // too low (< 10s)
    if (gathering_frequency > 3600) gathering_frequency = 3600; // too high (> 1h)
		
	gathering_frequency *= 1000; // Turn the valu into miliseconds

	// Starts the loop
	quartz = setInterval(sense.send, gathering_frequency);
	sense.send(); // launch it for the first time
});