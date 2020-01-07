var socket = io();
const connect = {
    id: $.getCookie("deviceID"),
	socket: io("/connect"),
	user: {},
	callbacks: [],
	
	init() {
		if (!this.id) {
    	    this.id = superID(10);
    	}

		$.setCookie("deviceID", this.id, 999);
		this.socket.emit("device.id", this.id);
	},

    login() {
		this.init();

    	this.socket.on("device.ok", (isLogin, user) => {
			this.user = user;

			let path = location.pathname.replace(/\//g, "") || "home";

    	    if (isLogin != 200 && !["login", "signup"].includes(path)) {
    	        location.href = "/login";
    	    } else if (isLogin == 200 && ["login", "signup"].includes(path)) {
    	        location.href = "/";
    	    }

			if (!["login", "signup"].includes(path)) {
				$("#nav .avatar").attr("src", user.avatar);

				$("#nav, #wrapper").css("display", "");
				setTimeout(() => {
					$("#nav, #wrapper").removeClass("loading");
					$("#search").css("width", $("#nav .search").prop("offsetWidth")+"px").css("left", $("#nav .search").prop("offsetLeft")+"px");
				}, 50);

				$.ajax({
					url: "/scripts/base.html",
					async: true,
					success(data) {
						let e = document.createElement("div");
							e.innerHTML = data;
							e.id = "base";
							document.body.appendChild(e);

						connect.socket.emit("messages.dialogs");

						if ($("#side > a."+path).first()) {
							$("#side > a."+path).addClass("selected");
						}

						connect.callbacks.forEach(fn => {
							fn(user);
						});

						connect.socket.emit("users");
					}
				});
			}
    	});
	},
	
	logout() {
		this.socket.emit("logout", this.id);

		if (!["login"].includes(location.pathname.replace(/\//g, ""))) {
    		location.href = "/login";
    	}
	}
};

socket.on("avatar.change", (url, uid) => {
	if (uid != connect.user.id) {
		return false;
	}

	$("#account .header > img").attr("src", url);
	$("#nav .avatar").attr("src", url);

	$("#account .header").removeClass("hidden");
	$("#account .avatar").addClass("hidden");
	$("#account .avatar .takeQR").addClass("hidden");
});

connect.socket.on("messages.dialogs", dialogs => {
	$("#messages .header .list").html("");

	dialogs.forEach(dialog => {
		if (dialog.contributors.length <= 1) {
			let user = dialog.contributors[0];

			user.lastMessage = user.lastMessage || {
				content: "Aucun message",
				date: "Never"
			};

			$("#messages .header .list").append(`<a${!dialog.viewed ? " class='new'" : ""} onclick="messages.dialog('${dialog.id}');" data-uid="${user.id}">
			<img src="${user.avatar}">
			<span class="badge" status="${user.status}"></span>
			<h4>${user.name}</h4>
			<p>${user.lastMessage.content.length > 30 ? user.lastMessage.content.substring(0, 27)+"..." : user.lastMessage.content}</p>
			<span>${user.lastMessage.date != "Never" ? fancyDate(user.lastMessage.date) : user.lastMessage.date}</span>
			<svg viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
		</a>`);
		}
	});
});

connect.socket.on("users", allUsers => {
	if (!["login", "signup"].includes(location.pathname.replace(/\//g, ""))) {
		$("#users > div .list").html("");

		allUsers.forEach(user => {
			if (user.id == connect.user.id) return false;

			$("#users > div .list").append(`<div data-name="${user.name.toLowerCase()}" data-id="${user.id}">
				<div class="img" style="background-image: url('${user.avatar}');"></div>
				<h4>${user.name.split(" ")[0]}<span>${user.name.split(" ")[1]}</span></h4>
			</div>`);
		});

		$("#users .list > div").on("click", function() {
			$(this).toggleClass("checked");

			let checked = 0;

			$("#users .list > div").each(el => {
				if ($(el).hasClass("checked")) {
					checked++;
				}
			});

			$("#users .buttons .next span").html("("+checked+")");

			if (checked <= 0) {
				$("#users .buttons .next").addClass("invalid");
			} else {
				$("#users .buttons .next").removeClass("invalid");
			}
		});
	}
});

connect.socket.on("messages.dialog", (msgs, contributors) => {
	if (contributors.length <= 1) {
		let user = contributors[0];

		$("#messages .dialog .user").data("uid", user.id);
		$("#messages .dialog .user").attr("status", user.status);
		$("#messages .dialog .user h4").html(user.name);
		$("#messages .dialog .user p span").html(user.status);
		$("#messages .dialog .user img").attr("src", user.avatar);
		$("#messages .dialog .send input").attr("placeholder", "Envoyer à "+user.name.split(" ")[0]);
	} else {
		$("#messages .dialog .user").attr("status", "offline");
		$("#messages .dialog .user h4").html("Groupe");
		$("#messages .dialog .user p span").html("état inconnu");
		$("#messages .dialog .user img").attr("src", "");
	}

	msgs.forEach(message => {
		messages.addMessage(message);
	});

	setTimeout(() => {
		$("#messages .dialog .messages").prop("scrollTop", $("#messages .dialog .messages").prop("scrollHeight"));
	}, 50);

	$("#messages .dialog .messages").prop("scrollTop", $("#messages .dialog .messages").prop("scrollHeight"));
});

connect.socket.on("messages.new", (message, dialogID) => {
	if (messages.currentDialog == dialogID) {
		messages.addMessage(message);
	} else {
		notif.show({
			type: "message",
			user: message.author,
			description: message.content,
		
			callback() {
				messages.dialog(dialogID);
			}
		});
	}
});

connect.socket.on("user.status", (uid, status) => {
	if (messages.currentDialog && $("#messages .dialog .user").data("uid") == uid) {
		$("#messages .dialog .user").attr("status", status);
		$("#messages .dialog .user p span").html(status);
	}

	$("#messages .header .list a").each(el => {
		if ($(el).data("uid") == uid) {
			$(".badge", el).attr("status", status);
		}
	});
});

connect.socket.on("weather", data => {
	if (typeof data !== "string") {
		return false;
	}

	let json = JSON.parse(data);

	connect.weather = {
		temp: Math.floor(json.main.temp*10)/10+"°",
		img: "https://openweathermap.org/img/wn/"+json.weather[0].icon+"@2x.png",
		desc: json.weather[0].description,
		city: json.name
	};
});

connect.socket.on("drive.reload", () => {
	if (location.pathname.startsWith("/drive")) {
		socket.emit("drive.content", currentDrivePanel.path);
	}
});

connect.socket.on("drive.converting", data => {
	if (location.pathname.startsWith("/drive")) {
		if (data.state == "progress") {
			let noExt = data.path.split("."),
				ext = noExt[noExt.length -1].toLowerCase(),
				filename;
				noExt.pop();
				noExt = noExt.join(".");
				filename = noExt+"."+ext;

			let etaSplit = data.eta.split(/h|m|s/),
				etaH = parseInt(etaSplit[0]),
				etaM = parseInt(etaSplit[1]),
				etaS = parseInt(etaSplit[2]),
				etaTime = etaS + etaM*60 + etaH*60*60;

			$("#wrapper .files .list a.converting").each(el => {
				if ($(el).data("path") == filename) {
					let circle = $(".ring circle", el).first(),
						radius = circle.r.baseVal.value,
						circumference = radius * 2 * Math.PI,
						offset = circumference - Math.floor(data.percent/10)*10 / 100 * circumference;
  						circle.style.strokeDashoffset = offset;

					$(".size", el).html(Math.floor(data.percent)+" %");
					$(".mtime", el).html("il reste "+fancyTime(etaTime));
				}
			});
		}
	}
});

function superID(length) {
	let out = [],
		chars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "-", "_"];

	for (let i = 0; i<length; i++) {
		out.push(chars[Math.floor(Math.random() * chars.length)]);
	}

	return out.join("");
}