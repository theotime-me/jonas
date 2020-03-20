(function() {
	let page = "fitness";

const loaders = [
	`<svg viewBox="0 0 128 128">
	<path d="M128 63.5L64.5 0H128V41V63.5Z" fill="white"/>
	<path d="M0 24.5V0H22L128 106V128H103.5L0 24.5Z" fill="white"/>
	<path d="M0 128V55.5L66.5 128H0Z" fill="white"/>
	</svg>`,

	`<svg viewBox="0 0 128 128">
	<rect width="128" height="33" fill="white"/>
	<rect y="48" width="128" height="33" fill="white"/>
	<rect y="95" width="128" height="33" fill="white"/>
	</svg>`,
	
	`<svg viewBox="0 0 128 128">
	<circle cx="32" cy="28" r="28" transform="rotate(-90 32 28)" fill="white"/>
	<circle cx="32" cy="100" r="28" transform="rotate(-90 32 100)" fill="white"/>
	<circle cx="95" cy="64" r="28" transform="rotate(-90 95 64)" fill="white"/>
	</svg>`,
	
	`<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
	<rect y="48" width="28" height="80" fill="#fff"/>
	<rect x="100" y="48" width="28" height="80" fill="#fff"/>
	<rect x="100" width="28" height="33" fill="#fff"/>
	<rect x="50" y="95" width="28" height="33" fill="#fff"/>
	<rect width="28" height="33" fill="#fff"/>
	<rect x="50" y="1" width="28" height="80" fill="#fff"/>
	</svg>`
];

const exercises = {
	plank: {
		name: {
			fr: "planche",
			en: "plank"
		},

		type: "alternated",
		levels: {
			easy: [15, 8, 3],
			normal: [30, 10, 3],
			hard: [37, 10, 4],
			impossible: [45, 5, 5]
		},

		image: "plank.jpg",
		imageCopy: "Photo by Li Sun from Pexels.com",

		imageSleep: "plank-sleep.jpeg",
		imageSleepCopy: 'from www.yogajournal.com.au'
	}
};

const run = {
	x: null,
	alternated(id, data) {
		this.show("alternated");

		let action = data[0],
			sleep = data[1],
			times = data[2],
			total = action * times + sleep * (times-1),
			time = 0, percent = 0,
			actionTimes = [],
			sleepTimes = [];

			$("#run .alternated .bar").html("");

			for (let i = 0; i<times; i++) {
				if (i != 0) {
					$("#run .alternated .bar").append(`<div class="sleep" tooltip="Repos" flow="down" style="width: ${sleep / total * 100}%"></div>`);

					sleepTimes.push(action * i + sleep * (i-1));
				}
			
				actionTimes.push(action * i + sleep * i);
				$("#run .alternated .bar").append(`<div class="action" tooltip="Effort" flow="down" style="width: ${action / total * 100}%"></div>`);
			}

		this.x = setInterval(() => {
			time++;
			percent = time / total * 100;

			let nextAction, nextSleep, actionsDone = 0;

			$("#run .alternated h1 span").html(fancyShortTime(time));
			$("#run .alternated .progress").css("width", percent+"%");

			for (let i = 0; i<actionTimes.length; i++) {
				let nb = actionTimes[i];

				if (nb > time && typeof nextAction !== "number") {
					nextAction = nb;

					break;
				}
			}
			
			for (let i = 0; i<sleepTimes.length; i++) {
				let nb = sleepTimes[i];

				if (nb > time && typeof nextSleep !== "number") {
					nextSleep = nb;

					break;
				}
			}

			sleepTimes.forEach(nb => {
				if (nb <= time) {
					actionsDone++;
				}
			});

			if (times > 1 && ![nextSleep, nextAction].includes(undefined)) {
				$("#run .alternated .countdown").html('<span>'+fancyShortTime(Math.min(nextSleep, nextAction) - time)+'</span> avant le prochain '+(nextSleep < nextAction ? "repos" : "effort"));
				$("#run .alternated .actions").html('<span>'+(actionsDone == 0 ? "Aucun" : actionsDone)+'</span> effort'+(actionsDone > 1 ? "s" : "")+' réalisé'+(actionsDone > 1 ? "s" : ""));

			} else {
				$("#run .alternated .countdown").html("Allez, courage !");
				$("#run .alternated .actions").html("1 effort et c'est fini !");
			}


			if (percent >= 100) {
				this.finished();
			}
		}, 1000);
	},

	show(id) {
		$("#run").css("display", "");

		setTimeout(() => {
			$("#run").removeClass("hidden");
			setTimeout(() => {
				$("#run > ."+id).removeClass("hidden");
			}, 100);
		}, 50);
	},

	cancel() {
		clearInterval(this.x);
		this.hide();
	},

	hide() {
		$("#run > div").addClass("hidden");
		setTimeout(() => {
			$("#run").addClass("hidden");
			setTimeout(() => {
				$("#run").css("display", "none");
			}, 200);
		}, 100);
	},

	finished() {
		clearInterval(this.x);

		setTimeout(() => {
			this.hide();
		}, 150);
	}
};

$("#run").on("click", () => {
	if (!$("#run > div").is(":hover")) {
		run.cancel();
	}
});

const editing = {
	alternated(id) {
		this.show("alternated");
		$("#editing .alternated select option[value='"+id+"']").attr("selected", "selected");
	},

	show(type) {
		$("#editing ."+type+", #editing").css("display", "");

		setTimeout(() => {
			$("#editing ."+type+", #editing").removeClass("hidden");
		}, 50);
	},

	hide() {
		$("#editing > div, #editing").addClass("hidden");

		setTimeout(() => {
			$("#editing > div, #editing").css("display", "none");
		}, 200);
	}
};

const daily = {
	current: ["plank", "impossible"],
	show(id, level) {
		id = id || this.current[0];
	let time = 0,
		ex = exercises[id];
		level = level || this.current[1];

		if (ex.type === "alternated") {
			let data = ex.levels[level];
			time = data[0] * data[2] + data[1] * (data[2]-1);

			$("#editing ."+ex.type+" select").val(id);
			$("#editing ."+ex.type+" .action .input p span").html(data[0]);
			$("#editing ."+ex.type+" .sleep .input p span").html(data[1]);
			$("#editing ."+ex.type+" .loop .input p span").html(data[2]);
		}

		$("#wrapper .daily h4").html(upCase(ex.name[system.lang]));
		$("#wrapper .daily .time span").html(fancyShortTime(time));
		$("#wrapper .daily .btn").attr("onclick", "editing."+ex.type+"('"+id+"');");

		$("#wrapper .daily").css("display", "");

		setTimeout(() => {
			$("#wrapper .daily").removeClass("hidden");
		}, 50);
	},

	hide() {
		$("#wrapper .daily").addClass("hidden");

		setTimeout(() => {
			$("#wrapper .daily").css("display", "none");
		}, 200);
	}
};

$("#editing .alternated .input svg").on("click", function() {
	let firstEl = $("svg", this.parent())[0],
		isFirst = firstEl.isEqualNode(this[0]),
		oldVal = parseInt($("span", this.parent()).html());

		if ((oldVal <= 1 && isFirst) || (oldVal > 120 && !isFirst)) {
			return false;
		}

		$("span", this.parent()).html(oldVal + (isFirst ? -1 : 1));

		displayAlternatedProgressBar();
});

function displayAlternatedProgressBar() {
	let actionTime = parseInt($("#editing .alternated .action .input span").html()),
	sleepTime = parseInt($("#editing .alternated .sleep .input span").html()),
	effortLoop = parseInt($("#editing .alternated .loop .input span").html()),
	totalTime = actionTime * effortLoop + sleepTime * (effortLoop-1),

	actionPercent = actionTime / totalTime * 100,
	sleepPercent = sleepTime / totalTime * 100;

$("#editing .alternated .progress").html("");

for (let i = 0; i<effortLoop; i++) {
	if (i != 0) {
		$("#editing .alternated .progress").append(`<div class="sleep" tooltip="Repos" flow="down" style="width: ${sleepPercent}%"></div>`);
	}

	$("#editing .alternated .progress").append(`<div class="action" tooltip="Effort" flow="down" style="width: ${actionPercent}%"></div>`);
}
}

displayAlternatedProgressBar();

$("#editing").on("click", () => {
	if (!$("#editing > div").is(":hover")) {
		editing.hide();
	}
});

$("#editing .alternated .start").on("click", () => {
	let random = Math.floor(Math.random() * loaders.length),
		loader = loaders[random],
		i = 1,
		nbToChange,
		x;

		$("#wait .icon").html(loader);
		$("#wait").removeClass("hidden");
		nbToChange = $("#wait .icon svg")[0].querySelectorAll("*:not(.selected)").length /3;
		
		x = setInterval(() => {
			let shapes = $("#wait .icon svg")[0].querySelectorAll("*:not(.selected)");

			if (i == 1) {
				editing.hide();
			}

			if (i == 4) {
				$("#wait .count .selected").removeClass("selected");
				$("#wait").addClass("hidden");
				
				let action = parseInt($("#editing .alternated .action .input p span").html()),
					sleep = parseInt($("#editing .alternated .sleep .input p span").html()),
					times = parseInt($("#editing .alternated .loop .input p span").html());

				run.alternated($("#editing .alternated select").val(), [action, sleep, times]);

				clearInterval(x);
				return false;
			}

			if (i != 0) {
				for (let i = 0; i<nbToChange; i++) {
					$(shapes[i]).addClass("selected");
				}
			}

			$("#wait .count .selected").removeClass("selected");
			$("#wait [data-id='"+i+"']").addClass("selected");

			i++;
		}, 800);
});

$("#editing div .input svg").on("mousedown", ev => {
	ev.preventDefault();
});

/* XX / Heartbeats counter
=============================== */
(function() {
	let x,

		/* Here is the time while the user have to
		count her/his heartbeats, you can modify
		this time just below. */

		waitingTime = 18, // in seconds


		waitingTimeMS = waitingTime * 1000; // translation in ms


	$(window).on("keydown", ev => {
		let key = ev.keyCode;
	
		if (key == 32 && $("#heart").css("display") != "none") {
			$("#heart > div > svg").removeClass(["waiting", "finished"]);
			$("#heart > div > h4").html("Comptez vos pulsations");
			$("#heart > div > p").html("Pressez <span>espace</span> pour recommencer");
			$("#heart > div > input").removeClass("visible").val("").removeAttr("disabled");
			clearInterval(x);

			let i = 0;
				x = setInterval(() => { // set x to an interval
				let p = (1 - i / waitingTimeMS) * 1229;
	
				$("#heart div svg circle")[0].style = `stroke-dashoffset: ${p};`;
	
				if (i == waitingTimeMS) {
					clearInterval(x); // clear the "x" interval

					$("#heart > div > svg").addClass("finished"); // add the "finished" class to the svg
					$("#heart > div > h4").html("Jusque à combien");
					$("#heart > div > p").html("avez vous compté ?");

					// clear the input / add the "visible" class / focus the input
					$("#heart > div > input").val("").addClass("visible").focus();
				}
	
				i += 30;
			}, 30);
		}
	});

	$("#heart > div > input").on("change", function() {
		let val = this.value, // get the value from the input
			heartRate = val * (60 / waitingTime); // calculate the heartrate
			heartRate = Math.floor(heartRate); // round up the result

			$("#heart > div > h4").html("Votre rythme cardiaque");
			$("#heart > div > p").html("est actuellement de");
			$("#heart > div > input").val(heartRate).attr("disabled", "disabled").first().blur();
	});

	$("#heart").on("click", () => {
		if (!$("#heart > div").is(":hover")) {
			clearInterval(x); // clear the "x" interval

			$("#heart > div").addClass("hidden");

			setTimeout(() => {
				$("#heart").addClass("hidden");
				setTimeout(() => {
					$("#heart").css("display", "none");
				}, 400);
			}, 100);
		}
	});
})();

$("#wrapper .intro .heart").on("click", heartRate);

function heartRate() {
	$("#heart").css("display", "");

	setTimeout(() => {
		$("#heart, #heart > div").removeClass("hidden");
	}, 50);

	$("#heart > div > svg").removeClass("finished").addClass("waiting");
	$("#heart > div > svg > circle").removeAttr("style");
	$("#heart > div > h4").html("Trouvez votre pouls,");
	$("#heart > div > p").html("puis appuyez sur <span>espace</span>");
	$("#heart > div > input").val("").removeAttr("disabled").removeClass("visible");
}


/* XX / Connecting to server
================================ */
connect.callbacks.push(() => {
	socket.emit("login", connect.user.id, connect.id); 
	daily.show();
});
 
connect.login();

setTimeout(() => {
editing.alternated();

}, 1000);

})();