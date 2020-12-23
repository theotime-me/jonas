module.exports = (async function(app, io){
	let	spawn = require('child_process').spawn,
		osu = require("node-os-utils"),
		cpu = osu.cpu,
		cpuPercentage = 0,
		drive = osu.drive,

		device_current = {
	    	cpu: 0,
	    	drive: 0,
	    	cpu_temp: 0
		};


	/* GATHERING DATA
	===================== */
	let self = {
		get(cb) {
			cpu.usage().then(cpuPercentage => {
				device_current.cpu = cpuPercentage;
	
				drive.info().then(info => {
					device_current.drive = info;
						temp = spawn('cat', ['/sys/class/thermal/thermal_zone0/temp']);
	
						temp.stdout.on('data', function(data) {
							let temp = parseInt(data.toString()) / 1000;
							device_current.cpu_temp = temp;
	
							if (cb) cb(device_current);
						});
	
				  });
			});
		},

		send() {
			self.get(data => io.emit("device.current", data));
		}
	}


	/* SOCKET MANAGEMENT
	======================== */
	io.on("connection", socket => {
        socket.emit("device.current", device_current);
	});


	/* QUARTZ
	============= */
	let quartz = setInterval(self.send, 1700); // Refreshes at 1.7s interval.
});