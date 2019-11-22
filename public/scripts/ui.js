const notif = {
	socket: io(),
	timeout: null,
	show({title, description, image, type, user, callback, icon}) {
		if (typeof user === "string") {
			this.socket.emit("user.get", user);
		} else {
			this.display(title, description, image, type, user, icon);
		}

		document.title = (title || user.name.split(" ")[0])+": "+description;

		this.timeout = setTimeout(() => {
			this.hide();
		}, 5000);

		if (["string", "function"].includes(typeof callback)) {
			if (typeof callback === "string") {
				$("#notif").off();
				$("#notif").attr("onclick", callback);
				$("#notif").on("click", notif.hide);
				$("#notif").on("click", notif.hide);
			} else if (typeof callback === "function") {
				$("#notif").off();

				$("#notif").on("click", () => {
					callback();
					notif.hide();
					clearTimeout(this.timeout);
				});
			}
		} else {
			$("#notif").removeAttr("onclick");
		}

		this.socket.on("user.get", user => this.display(title, description, image, type, user, icon));
	},
	
	display(title, description, image, type, user, icon) {
		if (!type) {
			$("#notif").removeAttr("data-type");
		} else {
			$("#notif").data("type", type);
		}

		if (icon) {
			$("#notif svg path").attr("d", icon);
			$("#notif svg").removeClass("hidden");
		} else {
			$("#notif svg path").removeAttr("d");
			$("#notif svg").addClass("hidden");
		}

		if (image) {
			$("#notif img").attr("src", image);
		} else {
			$("#notif img").removeAttr("src");
		}

		switch (type) {
			case "drive":
				$("#notif p").html(description);
				$("#notif h4").html(user.name.split(" ")[0]+" "+user.name.split(" ")[1].substring(0, 1)+".");
				$("#notif img").attr("src", user.avatar);
			break;
			
			case "message":
				$("#notif p").html(description.length > 40 ? description.substring(0, 37)+"..." : description);
				$("#notif h4").html(user.name.split(" ")[0]+":");
				$("#notif img").attr("src", user.avatar);
            break;
        }

		$("#notif").removeClass("hidden");
		
	},

    hide() {
		$("#notif").addClass("hidden");
		document.title = defaultTitle;
    }
};

/*notif.show({
	type: "drive",
	user: "Théotime FUMEX",
	description: "a partagé un fichier avec vous",

	callback() {
		socket.emit("drive.content", "/Téléchargements/");
		modal.show("drive");
	}
});*/

/*notif.show({
	type: "message",
	user: "Noémie FUMEX",
	description: "Bon alors Théotime j'ai un truc à te dire: c'est incroyable mais un peu long, alors daigne venir jusqu'à ma chambre pour que je t'explique.",

	callback() {
		socket.emit("drive.content", "/Téléchargements/");
		modal.show("messages");
	}
});*/

let sideTooltipTimeout = null;

$("#side a").on("enter", function(ev) {
	let className = this.className.split(" ")[0];

	if ($(this).hasClass("selected") || className == "settings") {
		$("#tooltip").addClass("hidden");

		setTimeout(function() {
			$("#tooltip").css("display", "none");
		}, 1000);
		return false;
	}

	let title = $(this).data("title") || $("p", this).html();
	clearTimeout(sideTooltipTimeout);

	$("#tooltip").css("display", "none");

	setTimeout(() => {
		$("#tooltip").addClass("changing").removeClass("hidden").css("top", this.offsetTop+"px");
	}, 50);
	
	sideTooltipTimeout = setTimeout(function() {
		$("#tooltip h4").html(title);

		let message = "Erreur";

		switch (className) {
			case "home":
				message = "Tout va bien";
			break;

			case "drive":
				message = "Aucun nouveau fichier";
			break;

			case "messages":
				message = "Aucun nouveau message";
			break;

			case "agenda":
				message = "Rien à venir pour la semaine";
			break;

			case "fitness":
				message = "Exercices quotidiens pas encore effectués";
			break;

			case "downloads":
				message = "Aucun téléchargement en cours";
			break;
		}

		$("#tooltip p").css("width", message.length*8+"px").html(message);
		$("#tooltip").removeClass("changing");
	}, 200);
});

$("#side a").on("leave", function(ev) {
	$("#tooltip").addClass("hidden");
});

connect.callbacks.push(user => {
	if (!$("#account").first()) {
		return false;
	}

	$("#account .header img").attr("src", user.avatar);
	$("#account .header h4").html(upCase(user.name.split(" ")[0])+" "+upCase(user.name.split(" ")[1]));
});

const account = {
	show() {
		$("#account").css("display", "block");
		$("#nav .avatar").attr("onclick", 'account.hide()');

		setTimeout(() => {
			$("#account").removeClass("hidden");			
		}, 50);
	},

	hide() {
		$("#account").addClass("hidden");	
		$("#nav .avatar").attr("onclick", 'account.show()');

		setTimeout(() => {
			$("#account").css("display", "none");
			$("#account .header").removeClass("hidden");
			$("#account .avatar").addClass("hidden");
			$("#account .avatar .takeQR").addClass("hidden");
		}, 200);
	}
};

$(window).on("click", function() {
	if (!$("#account, #nav .avatar").is(":hover")) {
		account.hide();
	}
});

$("#account .logout").on("click", () => {
	connect.logout();
});

$("#account .change-avatar").on("click", function() {
	$("#account .header").addClass("hidden");
	$("#account .avatar").removeClass("hidden");
});

$("#account .avatar .back").on("click", function() {
	$("#account .header").removeClass("hidden");
	$("#account .avatar").addClass("hidden");
});

$("#account .avatar .take").on("click", function() {
	$("#account .avatar .takeQR").toggleClass("hidden");
});

// latency

(function() {
	let latency = 0,
		max = 200,
		firstTime = new Date().getTime(),
		word = "load ...";

	setInterval(function() {
		socket.emit("network.ping");
		firstTime = new Date().getTime();
	}, 2000);

	socket.on("network.ping", () => {
		latency = new Date().getTime() - firstTime;

		if (latency > max) {
			latency = max;
		}

		if (latency > 80/100*max) {
			word = "bad";
		} else if (latency > 50/100*max) {
			word = "okay";
		} else if (latency > 25/100*max) {
			word = "good";
		} else if (latency > 10/100*max) {
			word = "very good";
		} else if (latency < 10/100*max) {
			word = "excellent";
		}

		$("#nav .network p").html(word).attr("title", "ping: "+latency+"ms");
		$("#nav .network .progress-bar div").css("width", ((max-latency) / max * 100)+"%");
	});
})();

socket.on("network.config", data => {
	$("#nav .network p").html("connected");
	$("#nav .network .progress-bar div").css("width", "100%");
	
	$("#nav .network svg").removeClass("load");
	$("#nav .network svg path").attr("d", data.wifi ? icons.wifi :  icons.ethernet);
});

let system = {};

socket.on("system.config", data => {
	system = data;

	$(".insert-device").html(data.device);

	if (!system.isSetup) {
		location.href = "/setup";
	}
});

let icons = {
	ethernet: 'M7.77 6.76L6.23 5.48.82 12l5.41 6.52 1.54-1.28L3.42 12l4.35-5.24zM7 13h2v-2H7v2zm10-2h-2v2h2v-2zm-6 2h2v-2h-2v2zm6.77-7.52l-1.54 1.28L20.58 12l-4.35 5.24 1.54 1.28L23.18 12l-5.41-6.52z',
	wifi: 'M12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 2c0-3.31-2.69-6-6-6s-6 2.69-6 6c0 2.22 1.21 4.15 3 5.19l1-1.74c-1.19-.7-2-1.97-2-3.45 0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.48-.81 2.75-2 3.45l1 1.74c1.79-1.04 3-2.97 3-5.19zM12 3C6.48 3 2 7.48 2 13c0 3.7 2.01 6.92 4.99 8.65l1-1.73C5.61 18.53 4 15.96 4 13c0-4.42 3.58-8 8-8s8 3.58 8 8c0 2.96-1.61 5.53-4 6.92l1 1.73c2.99-1.73 5-4.95 5-8.65 0-5.52-4.48-10-10-10z',
	download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
	close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
},

defaultTitle = document.title;

function isValidURL(str) {
	var urlregex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/;

	return urlregex.test(str);
}

const messages = {
	currentDialog: false,

	show() {
		$("#messages, #messages-bg").css("display", "block");
		document.title = "Messages - Nitro assistant";

		setTimeout(() => {
			$("#messages, #messages-bg").removeClass("hidden");
		}, 50);
	},

	dialog(dialogID) {
		if ($("#messages").hasClass("hidden")) {
			this.show();
		}

		connect.socket.emit("messages.dialog", dialogID);
		this.currentDialog = dialogID;

		$("#messages .dialog").removeClass("hidden");
		setTimeout(() => {
			$("#messages .header").addClass("hidden");
		}, 50);
	},

	header() {
		connect.socket.emit("messages.dialogs");
		$("#messages .dialog .messages").html("");

		this.currentDialog = false;
		$("#messages .dialog").addClass("hidden");
		setTimeout(() => {
			$("#messages .header").removeClass("hidden");
		}, 50);
	},

	hide() {
		$("#messages, #messages-bg").addClass("hidden");
		document.title = defaultTitle;

		setTimeout(() => {
			$("#messages, #messages-bg").css("display", "none");
			messages.header();
		}, 200);
	},

	send(content, type) {
		switch (type) {
			case "msg":
				$("#messages .dialog .input input").val("");
			break;
		}

		connect.socket.emit("messages.send", content.trim(), type, this.currentDialog);
	},

	quickFancy(date) {
		date = new Date(date);
	},

	addMessage(msg, temp) {
		if (!temp) $("#messages .dialog .messages .temp").remove();

		let author = msg.author.id == connect.user.id ? "me" : "other",
			lastMessage = $("#messages .dialog .messages > div").last(),
			lastMessageAuthorID = lastMessage && $(lastMessage).data("id"),
			text = msg.content,
			color = false,
			textColor = false,
			iframe = false;

			// Check if "me" or "other"
		if (lastMessage && lastMessageAuthorID == msg.author.id) {
			$(lastMessage).addClass("no-margin");
		}

		let lastDate = lastMessage ? new Date($(lastMessage).data("date")).getTime() : new Date().getTime(),
			newDate = new Date(msg.date).getTime(),
			diff = newDate - lastDate;

		if (diff >= 600000) {
			let sp = document.createElement("div");
				sp.className = "separator";
				sp.innerHTML = fancyDate(newDate, true);

			$("#messages .dialog .messages").first().appendChild(sp);
		}

		if (isValidURL(msg.content) && (msg.content.startsWith("http://") || msg.content.startsWith("https://"))) {
			let url = new URL(msg.content);

			switch (url.host.replace("www.", "")) {
				case "youtube.com":
					if (url.pathname == "/watch") {
						let params = url.href.split("?")[1],
						video = params.split("&")[0].replace("v=", "");

						iframe = '<iframe src="https://www.youtube-nocookie.com/embed/'+video+'" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
					}
				break;
			}

			text = "<a noquickhover target='blank' style='color: "+textColor+"' href='"+url+"'><b>"+(url.host)+"</b><span>"+(url.href.length > 40 ? url.href.substring(0, 37)+"..." : url.href)+"</span></a>";			
		}

		let newElement = document.createElement("div");
			newElement.setAttribute("data-date", msg.date);
			newElement.setAttribute("data-id", msg.author.id);
			newElement.className = author;
			newElement.innerHTML = (iframe ? iframe : "")+`<p${color || textColor ? " style='background-color: "+color+";'": ""}>${text}</p>`;


		$("#messages .dialog .messages").first().appendChild(newElement);
		$("#messages .dialog .messages").prop("scrollTop", $("#messages .dialog .messages").prop("scrollHeight"));
	}
};

$("#messages .dialog .input input").on("keydown", function(ev) {
	setTimeout(() => {
		if (ev.keyCode == 13) {
			if (this.value != "") {
				messages.send(this.value, "msg");
			}
		}
	}, 50);
});

$("#messages-bg").on("click", messages.hide);

$("#side a").on("click", function(ev) {
	if ($(this).hasClass("messages")) {
		messages.show();
		return false;
	}

	$("#side a").removeClass("selected");
	$(this).addClass("selected");

	ev.preventDefault();

	setTimeout(() => {
		location.href = this.href;
	}, 250);
});

const menu = {
	show() {
		$("#menu").css("display", "block");

		setTimeout(function () {
			$("#menu").removeClass("hidden");
		}, 50);
	},

	hide() {
		$("#menu").addClass("hidden");

		setTimeout(function () {
			$("#menu").css("display", "none");
		}, 200);
	}
};

$("#nav .more").on("click", menu.show);
$("#nav .more").on("contextmenu", ev => {
	ev.preventDefault();

	menu.show();
});