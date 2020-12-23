let graph = {
    create() {
        this.frame();
	},

	width: 0,
	height: 0,
	
	column_width: 50,
	line_height: 0,

	cols: 0,

    frame() {
        let canvas = $("#content .room canvas")[0],
        ctx = canvas.getContext("2d"),
        height = canvas.height,
        WIDTH = window.innerWidth;

		canvas.width = WIDTH - 855;
		this.line_height = height /5;

        let width = canvas.width-60;

		this.width = width;

		ctx.strokeStyle = "#d3d3d3";
		ctx.lineWidth = 0.5;

		ctx.beginPath();

		ctx.moveTo(30, 0);
		ctx.lineTo(width+30, 0);
		ctx.lineTo(30, 0);

		ctx.lineWidth = 0.5;

		for (let i = 1; i<=4; i++) {
			let y = i*this.line_height;
			ctx.moveTo(30, y);
			ctx.lineTo(width+30, y);
		}

		ctx.stroke();

		let cols = Math.floor(width / this.column_width),
			rest = width % this.column_width,
			newWidth = this.column_width + (rest / cols);

		this.cols = cols;
		this.newWidth = newWidth;

		ctx.beginPath();

		ctx.setLineDash([3]);

		for (let j = 0; j<=cols+2; j++) {
			let x = j*newWidth+30;
			ctx.moveTo(x, 0);
			ctx.lineTo(x, height);
		}

		ctx.stroke();

		ctx.setLineDash([]);

		this.date();
	},

	date() {
		let canvas = $("#content .room canvas")[0],
        	ctx = canvas.getContext("2d"),
        	height = canvas.height,
			width = this.width,

			now = $.date().time();
		
		for (let i = this.cols-1; i>=0; i--) {
			let time = now - (this.cols-1-i) * 60*60*1000, // now - (i hours)
				hours = $.date(time).hours()+"h";

			let x = i * this.newWidth + 35,
				y = height-15;

			ctx.font = "500 13px Roboto";
			ctx.fillStyle = "#a5a5a5";
			ctx.fillText(hours, x, y);
		}
	},

	scales_val: {
		tmin: 0,
		tmax: 0,
		hmin: 0,
		hmax: 0
	},

	arr: [],

	scales(tmin, tmax, hmin, hmax) {
		tmin = tmin || this.scales_val.tmin;
		tmax = tmax || this.scales_val.tmax;
		hmin = hmin || this.scales_val.hmin;
		hmax = hmax || this.scales_val.hmax;

		this.scales_val.tmin = tmin;
		this.scales_val.tmax = tmax;
		this.scales_val.hmin = hmin;
		this.scales_val.hmax = hmax;
		
		let canvas = $("#content .room canvas")[0],
		ctx = canvas.getContext("2d"),
		height = canvas.height,
		width = canvas.width;

		let x = width-25,
			y1 = 10;
			y2 = height-30;

		ctx.font = "500 10px Roboto";
		ctx.fillStyle = "#d4d4d4";

		ctx.fillText(hmax+"%", x, y1);
		ctx.fillText(hmin+"%", x, y2);

		ctx.fillText(tmax+"°C", 0, y1);
		ctx.fillText(tmin+"°C", 0, y2);
	},

    reload() {
		this.frame();
		this.scales();
		this.curves(this.arr, this.scales_val.tmin, this.scales_val.tmax, this.scales_val.hmin, this.scales_val.hmax);
	},
	
	fetch() {
		let now = $.date().time(),
			date1 = now - (40 * 60*60*1000), // 40h before NOW
			date2 = now;

		socket.emit("room.graph", date1, date2);
	},

	process(arr) {
		this.arr = arr;

		let tmin = 99999,
			tmax = 0,
			hmin = 0,
			hmax = 100;

		arr.forEach(el => {
			if (el.temp < tmin) {
				tmin = el.temp;
			} else if (el.temp > tmax) {
				tmax = el.temp;
			}
		});

		tmin = Math.floor(tmin/10) * 10;
		tmax = (Math.floor(tmax/10)+1) * 10;

		this.scales(tmin, tmax, hmin, hmax);

		this.curves(arr, tmin, tmax, hmin, hmax);
	},

	curves(arr, tmin, tmax, hmin, hmax) {
		let canvas = $("#content .room canvas")[0],
			ctx = canvas.getContext("2d"),
			height = canvas.height,
			width = canvas.width;
      
        function bzCurve(points, color) {
			if (points.length < 2) return false;

			ctx.strokeStyle = color;

			ctx.beginPath();

			ctx.moveTo(points[0].x, points[0].y);

			for (i = 1; i < points.length - 2; i ++)
			{
			   var xc = (points[i].x + points[i + 1].x) / 2;
			   var yc = (points[i].y + points[i + 1].y) / 2;
			   ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
			}

		  	// curve through the last two points
		  	ctx.quadraticCurveTo(points[i].x, points[i].y, points[i+1].x,points[i+1].y);
		 
            ctx.stroke();
		}
		
		let now = $.date().time(); // 60h before NOW

		let lastHourTime = now - (this.cols * 60*60*1000);

		/* TEMPERATURE
		================== */
		let tempLines = [],
			humidityLines = [];

		arr.forEach(el => {
			let date = $.date(el.date).time();
 
			if (date >= lastHourTime) {
				let	tempX =(date-lastHourTime)/(now-lastHourTime)*(width-60)+30, // diff
					tempY = (1-(el.temp-tmin)/(tmax-tmin))*(height - this.line_height);

				tempLines.push({
					x: tempX,
					y: tempY
				});

				let	humidityX =(date-lastHourTime)/(now-lastHourTime)*(width-60)+30, // diff
					humidityY = (1-(el.humidity-hmin)/(hmax-hmin))*(height - this.line_height);

				humidityLines.push({
					x: humidityX,
					y: humidityY
				});
			}
		});

        // Draw smooth line  
		ctx.setLineDash([0]); 
		ctx.lineCap = "round";
		ctx.lineWidth = 3;

		bzCurve(humidityLines, "#3083ff");
		bzCurve(tempLines, "#ffdd00");
	}
};

socket.on("room.graph", (date1, date2, arr) => { // 240 items array
	graph.process(arr);
});

window.addEventListener('resize', function(event){
    graph.reload();
});

graph.create();
graph.fetch();