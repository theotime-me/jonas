let socket = io();

function caps(str) {
	return str.charAt(0).toUpperCase() + str.slice(1); 
}

// latency

(function() {
	let latency = 0,
		max = 50,
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

let icons = {
	ethernet: 'M7.77 6.76L6.23 5.48.82 12l5.41 6.52 1.54-1.28L3.42 12l4.35-5.24zM7 13h2v-2H7v2zm10-2h-2v2h2v-2zm-6 2h2v-2h-2v2zm6.77-7.52l-1.54 1.28L20.58 12l-4.35 5.24 1.54 1.28L23.18 12l-5.41-6.52z',
	wifi: 'M12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 2c0-3.31-2.69-6-6-6s-6 2.69-6 6c0 2.22 1.21 4.15 3 5.19l1-1.74c-1.19-.7-2-1.97-2-3.45 0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.48-.81 2.75-2 3.45l1 1.74c1.79-1.04 3-2.97 3-5.19zM12 3C6.48 3 2 7.48 2 13c0 3.7 2.01 6.92 4.99 8.65l1-1.73C5.61 18.53 4 15.96 4 13c0-4.42 3.58-8 8-8s8 3.58 8 8c0 2.96-1.61 5.53-4 6.92l1 1.73c2.99-1.73 5-4.95 5-8.65 0-5.52-4.48-10-10-10z',
	download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
	close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
};

socket.on("network.config", data => {
	$("#nav .network h4, #side .home span").html(data.wifi ? caps(data.ssid) : "Home");
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

// Weather
socket.on("weather", data => {
	if (typeof data !== "string") {
		return false;
	}

	let json = JSON.parse(data);

	$("#weather img").attr("src", "https://openweathermap.org/img/wn/"+json.weather[0].icon+"@2x.png");
	$("#weather h1").html(Math.floor(json.main.temp)+"°");
	$("#weather .right p a").html(json.name).attr("href", "https://www.google.com/maps/place/"+json.name);
	$("#weather .right h4").html(caps(json.weather[0].description)).attr("href", "https://www.google.com/maps/place/"+json.name);

	$("#weather .humidity span").html(json.main.humidity);
	$("#weather .pressure span").html(json.main.pressure);
	$("#weather .wind-dir span").html(Math.floor(json.wind.deg));
	$("#weather .wind-speed span").html(json.wind.speed);

	$("#weather .wind-dir svg").css("transform", "rotate("+json.wind.deg+"deg)");
});

let currentDownload = {
	name: "",
	state: {}
};

socket.on("download.queue", (queue) => {
	if (queue.length == 0) {
		$("#panel .download").addClass("hidden");
		return false;
	}

	let fileName = queue[0].split("/")[queue[0].split("/").length -1],
		a = fileName.split("."),
		fileExt = a[a.length -1];
		a.pop();
		currentDownload.name = a.join(".")+"<span>."+fileExt+"</span>";
		
		$("#panel .download .name").html(currentDownload.name);

		$("#modal .download h5 span").html(queue.length > 0 ? "après le"+(queue.length > 1 ? "s "+queue.length : "")+" fichier"+(queue.length > 1 ? "s" : "")+" restants" : "immédiatement");
});

socket.on("download.progress", (state) => {
	let base = $("#panel .download");

	currentDownload.state = state;

	if (!$("#panel .download").is(":hover")) {
		$(base).removeClass("hidden");
		$(".size", base).html(fancyTime(state.time.remaining));
		$(".progress-bar > div", base).css("width", state.percent*100+"%");
	}
});

socket.on("download.queue-end", () => {
	$("#panel .download").addClass("hidden");
});

$(".input").on("click", function() {
	$("input", this).first().focus();
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

$("#modal .input.url input").on("keydown", function(ev) {
	setTimeout(() => {
		checkInputUrl(this);
	}, 50);
});

$("#modal .input.url input").each(el => {
	checkInputUrl(el);
});

function checkInputUrl(el) {
	let val = $(el).val(),
	wrapper = $(el.parentNode),
	modal = wrapper.first().parentNode;

	if (val == "") {
		$(wrapper).removeClass("invalid");
		$("a.start", modal).addClass("disabled");
		return false;
	}

	if (validURL(val)) {
		$(wrapper).removeClass("invalid");
		$("a.start", modal).removeClass("disabled");
	} else {
		$(wrapper).addClass("invalid");
		$("a.start", modal).addClass("disabled");
	}
}

$("#modal .download a.start").on("click", function() {
	console.log(!$(this).hasClass("disabled"));
	if (!$(this).hasClass("disabled")) {
		socket.emit("download.add", $("#modal .download input").val());
	}
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

const modal = {
	show(className) {
		if (!$("#modal").hasClass("hidden")) {
			modal.hide();

			setTimeout(function() {
				modal.show(className);
			}, 200);

			return false;
		}

		if ($("#modal ."+className+" input").first()) {
			$("#modal ."+className+" input").val("");
		}

		menu.hide();
		$("#modal, #modal > div."+className).removeAttr("style");

		setTimeout(function() {
			$("#modal").removeClass("hidden");
		}, 50);

		setTimeout(() => {
			$("#modal > div."+className).removeClass("hidden");
		}, 200);
	},

	hide() {
		$("#modal > div").addClass("hidden");

		setTimeout(() => {
			$("#modal").addClass("hidden");
		}, 50);

		setTimeout(function() {
			$("#modal, #modal > div").css("display", "none");
		}, 200);
	}
};

$(window).on("click", function() {
	if (!$("#modal div, #menu, #side, #ctx").is(":hover")) {
		modal.hide();
	}

	if (!$("#menu, #nav .more").is(":hover")) {
		menu.hide();
	}

	if (!$("#ctx").is(":hover")) {
		ctx.hide();
	}
});

$("#panel .download").on("hover", function() {
	$(".size", this).html("Annuler ce téléchargement");
	$(".progress-bar div", $("#panel .download")).css("width", "0%");
	$("svg path", this).attr("d", icons.close);
});

$("#panel .download").on("leave", function() {
	$(".size", this).html(fancyTime(currentDownload.state.time.remaining));
	$(".progress-bar div", $("#panel .download")).css("width", currentDownload.state.percent*100+"%");
	$("svg path", this).attr("d", icons.download);
});

$("#panel .download").on("click", function() {
	socket.emit("download.abort", currentDownload.name.replace(/<span>|<\/span>/g, ""));
});

socket.on("download.add", status => {
	switch (status) {
		case 200: modal.hide(); break;
	}
});

// Drive
let currentDrivePanel = {
	folders: [],
	files: [],
	path: "/"
},
currentDrivesortType = "";

$("#side .drive").on("click", function() {
	modal.show("drive");
});

function displayDrivePath(path) {
	if (path.startsWith("/")) {
		path = path.replace("/", "");
	}

	path = path.split("/");

	
	$("#modal .drive .path div").html("");

	let i = 0;

	path.forEach(el => {
		i++;

		let localPath = path.slice(0, i).join("/");

		if (el != "") {
			$("#modal .drive .path div").append(`<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg><a onclick="socket.emit('drive.content', '${localPath}')">${el}</a>`);
		}
	});
}

socket.on("drive.content", data => {
	currentDrivePanel.folders = data.content.folders;
	currentDrivePanel.files = data.content.files;
	currentDrivePanel.path = data.path;

	ctx.hide();

	displayDrivePath(data.path);
	
	$("#modal .drive .left p").html("<span>"+data.totalFiles+"</span> fichier"+(data.totalFiles > 1 ? "s" : ""));

	if (data.content.folders.length > 0) {
		$("#modal .drive .folders").html("").removeClass("empty");
	} else {
		$("#modal .drive .folders").html("").addClass("empty");
	}

	data.content.folders.forEach(el => {
		$("#modal .drive .folders").append(`<div onmousedown="return false" ondblclick="socket.emit('drive.content', '${currentDrivePanel.path+"/"+el.name}')">
		<svg class="icon" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
		<h4 onclick="socket.emit('drive.content', '${currentDrivePanel.path+"/"+el.name}')">${el.name}</h4>
		<p>${el.length == 0 ? "Aucun " : el.length} fichier${el.length > 1 ? "s" : ""}</p>
		<svg onclick="socket.emit('drive.content', '${currentDrivePanel.path+"/"+el.name}')" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg>
		<h5>${fancyDate(el.mtime)}</h5></div>`);
	});

	displayDriveFiles(data.content.files, "name", false, true);
});

function displayDriveFiles(files, factor, reverse, auto) {
	if (!["name", "mtime", "size"].includes(factor)) {
		return false;
	}

	if (currentDrivesortType == factor && !auto) {
		reverse = !reverse;
	}
	
	$("#modal .drive .title p").removeClass(["selected", "reversed"]);
	$("#modal .drive .title p."+factor).addClass("selected");
	$("#modal .drive .title ."+factor+" svg").attr("onclick", "displayDriveFiles(currentDrivePanel.files, '"+factor+"', "+reverse+")");

	if (reverse) {
		$("#modal .drive .title p."+factor).addClass("reversed");
	} else {
		$("#modal .drive .title p."+factor).removeClass("reversed");
	}

	currentDrivesortType = factor;
	$("#modal .drive .files").html("");

	sortDrive(files, factor, reverse).forEach(el => {
		let fileName, extension = "";

		if (el.name.includes(".")) {
			fileName = el.name.split(".");
			extension = "."+fileName[fileName.length -1];
			fileName.pop();
			fileName = fileName.join(".");
		} else {
			fileName = el.name;
		}
		
		$("#modal .drive .files").append(`<a target="blank" href="drive${(currentDrivePanel.path+"/"+fileName+extension).replace(/\/{2,}/g, "/")}">
		<h4 class="name">${(fileName+extension).length >= 40 ? (fileName).substring(0, 32)+"... <span>"+(extension.length > 10 ? extension.substring(0, 7)+"..." : extension)+"</span>" : fileName+"<span>"+extension+"</span>"}</h4><p class="mtime">${fancyDate(el.mtime)}</p><p class="size">${fancySize(el.size)}</p></a>`);
	});

	$("#modal .drive .files a").on("contextmenu", function(ev) {
		ev.preventDefault();

		console.log(this);

		let extension = $("h4.name span", this).first() ? $("h4.name span", this).html().replace(".", "") : "",
			fileName = $("h4.name", this).html().replace(/<span>|<\/span>/g, "");
			
		if (extension == "xml") {
			$("#ctx .feed").removeClass("hidden");

			let url = this.href;

			$.ajax({
				url: url,
				async: true,
				success(text) {
					let parser = new DOMParser(),
						xml = parser.parseFromString(text, "text/xml"),
						title = xml.querySelector("channel").querySelector("title").innerHTML,
						link = xml.querySelector("channel").querySelector("link").innerHTML;

					$("#ctx .feed").attr("href", link);
					$("#ctx .feed span").html(title);
				}
			});
		} else {
			$("#ctx .feed").addClass("hidden");
		}

		$("#ctx .open, #ctx .download").attr("href", this.href);
		$("#ctx .delete").attr("onclick", `socket.emit("drive.delete", "${$(this).attr("href").replace("drive", "")}")`);
		ctx.currentFilePath = $(this).attr("href");

		$("#ctx .rename").off();

		$("#ctx .rename").on("click", function() {
			$('#modal .rename p').html(fileName);
			ctx.hide();
			modal.show('rename');
		});

		ctx.show({
			x: ev.clientX,
			y: ev.clientY
		}, fileName);
	});

	if (files.length == 0) {
		$("#modal .drive .files").html("<h2>Aucun fichier dans <span>"+(ltrim(currentDrivePanel.path.replace(/\/{2,}/g, "")).replace(/\//g, '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>') || " /")+"</span></h2>");
	}
}

$("#modal .rename input").on("keydown", function(e) {
	setTimeout(() => {
		let val = this.value;

		if (/^[-\w^&'@{}[\],$=!#().éîôèêâàù\:ç%+~ ]+$/.test(val)) {
			$(this.parentNode).removeClass("invalid");
		} else {
			$(this.parentNode).addClass("invalid");
		}

		if (e.keyCode == 13) {
			if (/^[-\w^&'@{}[\],$=!#().éîôèêâàù\:ç%+~ ]+$/.test(val)) {
				if (ctx.currentFilePath) {
					let oldPath = ctx.currentFilePath.replace("drive", "");
	
					socket.emit("drive.rename", oldPath, val);
					modal.show("drive");
				} else {
					alert("no file selected");
				}
			} else {
				alert("not valid filename");
			}
		}
	});
});

function ltrim(str) {
	return str.replace(/^\/+/,"");
}

let ctx = {
	currentFilePath: "",
	
	show(pos, subTitle) {
		let ctxHeight = $("#ctx").first().clientHeight,
			winHeight = window.innerHeight;

		if (ctxHeight+pos.y > winHeight) {
			pos.y = pos.y-ctxHeight;
		}

		if (subTitle) {
			$("#ctx > h4 span").html(subTitle.length >= 15 ? subTitle.substring(0, 12)+"..." : subTitle);
		}

		$("#ctx").css({
			display: "block",
			top: pos.y+"px",
			left: pos.x+"px"
		});

		setTimeout(function() {
			$("#ctx").removeClass("hidden");
		}, 100);
	},

	hide() {
		$("#ctx").addClass("hidden");

		setTimeout(function() {
			$("#ctx").css("display", "none");
		}, 300);
	}
};

window.onresize = ctx.hide;

socket.on("drive.disk", info => {
	info.used = info.total - info.available;

	$("#modal .drive .disk p").html(fancySize(info.used)+" utilisés sur "+fancySize(info.total));
	$("#modal .drive .disk .progress-bar div").css("width", info.used/info.total*100+"%");
});

function sortDrive(files, factor, reverse) {
	let out = [],
		pushedIDS = [];

	files.forEach(el => {
		el.id = Math.floor(Math.random()*99999999999);
	});

	switch (factor) {
		case "name":
			files.sort((a,b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0)); 

			if (reverse) {
				files.reverse();
			}
		break;

		case "mtime":
			files.sort(function(a, b) {
				return new Date(a.mtime)-new Date(b.mtime);
			});

			if (!reverse) {
				files.reverse();
			}
		break;

		case "size":
			files.sort(function(a, b) {
				return a.size-b.size;
			});

			if (!reverse) {
				files.reverse();
			}
	}

	return files;
}

$("#modal .feeds .input input").on("keydown", function(ev) {
	if (ev.keyCode == 13) {
		let val = this.value,
			parent = this.parentNode;
		if (!$(parent).hasClass("invalid")) {
			$(this).val("").attr("placeholder", "Attendez quelques secondes...");

			socket.emit("feeds.add", val);
		}
	}
});

socket.on("feeds.add", code => {
	switch (code) {
		case 404:
			$("#modal .feeds input").attr("placeholder", "Désolé, ce fichier n'est pas en xml");
		break;

		case 403:
			$("#modal .feeds input").attr("placeholder", "Vous avez déjà ajouté cette url");
		break;
	}

	setTimeout(function() {
		$("#modal .feeds input").attr("placeholder", "Essayer une autre url");
	}, 2000);
});

// Feeds
socket.on("feeds.update", (feeds, lastUpdateDate) => {
	$("#modal .feeds input").attr("placeholder", "flux actualisé !");
	$("#feeds > p > .date").html((fancyDate(lastUpdateDate) || "").toLowerCase());
	$("#menu .rss span b, #modal .feeds > p > span").html(feeds.length < 1 ? "Aucun" : feeds.length);
	$("#modal > .feeds > .list").html("");

	setTimeout(function() {
		$("#modal .feeds input").attr("placeholder", "Entrez un lien RSS pour l'ajouter");		
	}, 3000);

	let iter = 0;

	feeds.forEach(feed => {
		$("#modal > .feeds > .list").append(`<div>
		<img src="${feed.image || "blank.png"}" alt="">
		<a target="blank" href="${feed.link}">${feed.title.length > 35 ? feed.title.substring(0, 32)+"..." : feed.title}</a>	
		<p>${feed.description.length > 50 ? feed.description.substring(0, 47)+"..." : feed.description}</p>

		<svg onclick="socket.emit('feeds.delete', ${iter})" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
		</div>`);

		iter++;
	});

	if (feeds.length > 4) {
		$("#modal > .feeds > .list").addClass("scroll");
	} else {
		$("#modal > .feeds > .list").removeClass("scroll");
	}

	let items = [],
		onlyFeeds = [];

	for (let i = 1; i<=feeds.length; i++) {
		let feed = feeds[i-1];

		if (onlyFeeds.length < i) {
			onlyFeeds.push(feed);
		}

		feed.items.forEach(item => {
			item.feed = i-1;
			items.push(item);
		});
	}

	$("#feeds > p > .items").html(items.length < 1 ? "Aucun élément" : items.length == 1 ? items.length+" élément" : items.length+" éléments");

	let sorted = sortFeedsItems(items);

	$("#feeds > div").html("");

	sorted.forEach(item => {
		let feed = onlyFeeds[item.feed];

		$("#feeds > div").append(`<div>
			<img src="${feed.image || "blank.png"}">
			<a target="blank" href="${item.link}" class="title">${item.title.length > 65 ? item.title.substring(0, 62)+"..." : item.title}</a>
			<p>${fancyDate(item.date)} · <a target="blank" class="feed" href="${feed.link}">${feed.title.length > 40 ? feed.title.substring(0, 37)+"..." : feed.title}</a></p>
		</div>`);
	});
});

function sortFeedsItems(items) {
	items.sort(function(a, b) {
		return new Date(b.date) - new Date(a.date);
	});

	return items;
}

const quickhover = {
	fetchedUrls: {},

	show(data) {
		$("#quickhover").css({
			left: data.x+15+"px",
			top: data.y-5+"px"
		});

		let url = new URL(data.url),
			text = url.host,
			className = "";
			icon = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z";

		if (url.host == location.host) {
			if (url.pathname.startsWith("/drive/")) {
				text = url.pathname.replace("/drive/", "");
				text = "drive > "+text.split("/")[0];
				className = "drive";
				icon = "M18 2h-8L4.02 8 4 20c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 6h-2V4h2v4zm3 0h-2V4h2v4zm3 0h-2V4h2v4z";
			}
		}

		$("#quickhover span").html(decodeURIComponent(text));
		$("#quickhover svg path").attr("d", icon);
		
		if (className) {
			$("#quickhover").addClass(className);
		} else {
			$("#quickhover").removeAttr("class");
		}

		$("#quickhover").removeClass("hidden");
	},

	hide() {
		$("#quickhover").addClass("hidden");

		setTimeout(function() {
			$("#quickhover").css("border", "");
		}, 200);
	}
};

$(window).on("mousemove", function(ev) {
	if ($("a[href]").is(":hover")) {
		quickhover.show({
			x: ev.clientX,
			y: ev.clientY,
			url: $($("a[href]").filter(":hover")).prop("href")
		});
	} else {
		quickhover.hide();
	}
});