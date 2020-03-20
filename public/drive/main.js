window.currentDrivePanel = {
	folders: [],
	files: [],
	parent: "none",
	folderID: "root",
	path: "/"
},

(function() {

let currentDrivesortType = "",
	usbDevices = [];
	page = "drive";
	socket = io("/drive");
let	keys = {
		shift: false,
		ctrl: false
	};

$(window).on("keydown", ev => {
	keys.shift = ev.shiftKey;
	keys.ctrl = ev.ctrlKey;

	if (keys.ctrl && ev.keyCode == 65 && ajax.isLoaded(page)) {
		$("#wrapper .files .list a").each(el => {
			$(el).addClass("selected");
		});

		ev.preventDefault();
	}
});

$(window).on("keyup", ev => {
	keys.shift = ev.shiftKey;
	keys.ctrl = ev.ctrlKey;
});

socket.on("drive.usb.devices", list => {
	usbDevices = list;
});

socket.on("drive.usb.device.change", (name, added) => {
	if (added) {
		usbDevices.unshift(name);

		setTimeout(() => {
		socket.emit("drive.usb.device.content", usbDevices[0], "");
		}, 100);
	} else if (added == false) {
		let index = usbDevices.indexOf(name);

		if (index > -1) {
			usbDevices.splice(index, 1);
		}

		if (usbDevices[0]) {
			socket.emit("drive.usb.device.content", usbDevices[0], "");
		} else {
			$("#wrapper .path .root svg path").attr("d", "M18 7h-2c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1v2h-3V5h1c.41 0 .65-.47.4-.8l-2-2.67c-.2-.27-.6-.27-.8 0l-2 2.67c-.25.33-.01.8.4.8h1v8H8v-2.07c.83-.44 1.38-1.36 1.14-2.43-.17-.77-.77-1.4-1.52-1.61C6.15 6.48 4.8 7.59 4.8 9c0 .85.5 1.56 1.2 1.93V13c0 1.1.9 2 2 2h3v3.05c-.86.45-1.39 1.42-1.13 2.49.18.75.79 1.38 1.54 1.58 1.46.39 2.8-.7 2.8-2.12 0-.85-.49-1.58-1.2-1.95V15h3c1.1 0 2-.9 2-2v-2c.55 0 1-.45 1-1V8C19 7.45 18.55 7 18 7z");

			$("#wrapper .files").addClass("bottom");
			$("#wrapper .noUsbDevices").css("display", "");

			setTimeout(() => {
				$("#wrapper .files").css("display", "none");
			}, 150);

			setTimeout(() => {
				$("#wrapper .noUsbDevices").removeClass("hidden");
			}, 100);
		}
	}
});

socket.on("drive.usb.device.content", data => {
	displayDriveContent(data, true);
	folder.hide();
});

$("#wrapper .buttons .new").on("click", function() {
	if (!$(this).hasClass("disabled")) {
		$(this).toggleClass("visible");
	}
});

$(window).on("click", () => {
	if (ajax.isLoaded(page) && !$("#wrapper .buttons .new .title").is(":hover")) {
		$("#wrapper .buttons .new").removeClass("visible");
	}
});

let setListLine = el => {
	if (!ajax.isLoaded(page)) return false;

	let hasLine = $("#wrapper .buttons .list > .hasLine").first();

	if ($(el).is("#wrapper .buttons .list > .hasLine")) return false;

	$("#wrapper .buttons .list > div:not(.line)").removeClass("hasLine");
	$(el).addClass("hasLine");

	$("#wrapper .buttons .list .line").css({
		width: $(el).prop("offsetWidth")-45+"px",
		left: $(el).prop("offsetLeft")+35+"px"
	});

	if ($(el).hasClass("selected")) {
		$("#wrapper .buttons .list .line").addClass("selected");
	} else {
		$("#wrapper .buttons .list .line").removeClass("selected");
	}
};

connect.callbacks.push(() => {
	setListLine("#wrapper .buttons .list .drive");
});

$("#wrapper .buttons .list > div:not(.line)").on("enter", function() {
	setListLine(this);
});

$("#wrapper .buttons .list > div:not(.line)").on("leave", function() {
	setListLine("#wrapper .buttons .list > .selected");
});

function displayDrivePath(path, deviceName) {
	$("#wrapper .path div").html("");
	$("#wrapper .path .insert-device").html(deviceName || system.device);

	path.forEach(el => {
		$("#wrapper .path div").append(`<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg><a data-id="${el.id}" data-name="${el.name}" data-path="${el.path}" onclick="socket.emit('${!deviceName ? 'drive.content' : 'drive.usb.device.content'}', '${deviceName ? deviceName+"', $(this).data('path')" : el.id+"'"})">${el.name}</a>`);
	});
}

socket.on("drive.content", data => {
	displayDriveContent(data, false);
	folder.hide();
});

function displayDriveContent(data, isUSB) {
	console.log(data);

	$("html, body").prop("scrollTop", "0");

	currentDrivePanel.window = isUSB ? "usb" : "drive";
	currentDrivePanel.files = data.content;
	currentDrivePanel.path = data.path;
	currentDrivePanel.usbDevice = data.usbDevice;
	currentDrivePanel.folderID = data.folderID;
	currentDrivePanel.parent = data.parent;
	
	$("#wrapper .files").addClass("bottom");

	ctx.hide();

	if (isUSB) {
		displayDrivePath(data.path, data.usbDevice);
	} else {
		displayDrivePath(data.path);
	}

	connect.socket.emit("drive.files");

	let nbFolders = 0;

	data.content.forEach(file => {
		if (file.type == "folder") {
			nbFolders++;
		}
	});

	setTimeout(() => {
		if (nbFolders > 0) {
			$("#wrapper .files .folders").html("").removeClass("empty");
		} else {
			$("#wrapper .files .folders").html("").addClass("empty");
		}

		displayDriveFiles(data.content, "name", false, true, isUSB, data.usbDevice);
	}, 200);

}

let currentRenamedFile;

function displayDriveFiles(files, factor, reverse, auto, isUSB, usbDevice) {
	setTimeout(() => {
		$("#wrapper .files").removeClass("bottom");
	}, 250);

	if (!["name", "mtime", "size", "ext"].includes(factor)) {
		return false;
	}

	if (currentDrivesortType == factor && !auto) {
		reverse = !reverse;
	}
	
	$("#wrapper .files .title p").removeClass(["selected", "reversed"]);
	$("#wrapper .files .title p."+factor).addClass("selected");
	$("#wrapper .files .title ."+factor+" svg").off();
	$("#wrapper .files .title ."+factor+" svg").on("click", function() {
		displayDriveFiles(currentDrivePanel.files, factor, reverse);
	});

	if (reverse) {
		$("#wrapper .files .title p."+factor).addClass("reversed");
	} else {
		$("#wrapper .files .title p."+factor).removeClass("reversed");
	}

	currentDrivesortType = factor;

	let names = [];

	currentDrivePanel.path.forEach(folder => {
		names.push(folder.name);
	});

	let	pathToDisplay = names.join('<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>') || "Mon Drive";
	$("#wrapper .files .list").html("<h2>Aucun fichier dans <span>"+(pathToDisplay)+"</span></h2>");

	let convertingFileNames = [];

	sortDrive(files, factor, reverse).forEach(el => {
		if (el.type == "folder") {
			$("#wrapper .files .folders").append(`<div data-parent="${el.parent}" ${isUSB ? 'data-path="'+el.path+'"' : 'data-id="'+el.id+'"'} data-name="${el.name}" onmousedown="return false" onclick="socket.emit('${isUSB ? 'drive.usb.device.content' : 'drive.content'}', '${isUSB ? usbDevice+"', $(this).data('path')" :  el.id+"'"})">
			<svg class="icon" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
			<h4>${fancyStringLength(el.name, 14)}</h4>
			<p>${el.length == 0 ? "Aucun " : el.length} élément${el.length > 1 ? "s" : ""}</p>
			<svg onclick="socket.emit('drive.content', '${el.id}')" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg></div>`);

			return false;
		}

		let fileName, extension = "", extName = "";

			fileName = el.name;
			extension = el.ext;
			extName = getExtName(extension);

		if (convertingFileNames.includes(fileName)) {
			return false;
		}

		let path = isUSB ? el.path : (el.id),
			icon = `<svg viewbox="0 0 24 24" fill="${getColorFromExt(extension)}"><path d="${getIconFromExt(extension)}"></svg>`,
			fileNameToDisplay = fileName.length >= 35 ? fileName.substring(0, 32)+"..." : fileName,
			extensionToDisplay = extName.length > 10 ? extName.substring(0, 7)+"..." : extName,
			converting = ["mov", "avi", "mkv", "flv", "dvd", "mpeg"].includes(extension.replace(".", "")) ? "converting" : "";

		if (["jpg", "jpeg", "png"].includes(extension.replace(".", '').trim().toLowerCase())) {
			icon = `<div class="img" style="background-image: url('${isUSB ? '/file/usb/'+usbDevice+"/"+encodeURIComponent(el.path) : '/file/'+el.id}');"></div>`;
		}

		if ($("#wrapper .files .list h2")[0]) {
			$("#wrapper .files .list h2").remove();
		}

		let blockID = superID(5);

		$("#wrapper .files .list").append(`
		<a class="${isUSB ? "" : converting}" data-block="${blockID}" data-sharedWith="${isUSB ? "" : el.sharedWith.join("|")}" data-ext="${el.ext}" data-id="${isUSB ? "" : el.id}" data-href="/file/${isUSB ? "usb/"+usbDevice+"/"+encodeURIComponent(el.path) :el.id}" data-path="${path}">
		${icon}
		${!isUSB && converting ? '<svg class="ring" style="stroke: '+getColorFromExt(el.ext)+'" viewbox="0 0 24 24"><circle r="10" cx="12" cy="12"/></svg>' : ""}
		<input onmousedown="return false;" class="name" value="${fileNameToDisplay}">
		${!isUSB && el.sharedWith.length > 0 && currentDrivePanel.window == "drive" ? '<svg class="shared" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>' : ""}
		<p class="size" data-size="${currentDrivePanel.window != "shared" ? el.size : el.owner.id}">${currentDrivePanel.window != "shared" ? fancySize(el.size) : el.owner.name}</p>
		<p class="mtime">${fancyDate(el.modify)}</p>
		<p class="ext">${!isUSB && converting ? "<span>"+el.ext+" > mp4</span>"+translation.converting : (getNameFromExt(extension)+" "+extensionToDisplay.toLowerCase().trim().replace(".", ""))}</p></a>`);

		if (converting && !isUSB) {
			convertingFileNames.push(fileName);

			let circle = $("#wrapper .files .list a[data-block='"+blockID+"'] .ring circle")[0],
				radius = circle.r.baseVal.value,
				circumference = radius * 2 * Math.PI;

			circle.style.strokeDasharray = circumference+" "+circumference;
			circle.style.strokeDashoffset = circumference.toString();
		}
	});

	setFileEvents(isUSB, usbDevice);
}

function setFileEvents(isUSB, usbDevice) {
	isUSB = isUSB || currentDrivePanel.window == "usb";
	usbDevice = usbDevice || currentDrivePanel.usbDevice;

	$("#ctx a:not(.feed)").removeClass(["hidden", "disabled"]);

	switch (currentDrivePanel.window) {
		case "shared": $("#ctx a.share, #ctx a.rename, #ctx a.delete").addClass("disabled"); break;
		case "usb": $("#ctx a.share").addClass("disabled"); break;
	}

	$("#wrapper .files .list a").on("click", function() {
		if ($(".shared", this).is(":hover") || $(this).hasClass("shadow") || $(this).hasClass("converting")) {
			return false;
		}

		let hasClass = $(this).hasClass("selected"),
			nbSelected = 0;

		$("#wrapper .files .list a").each(el => {
			if ($(el).hasClass("selected")) nbSelected++;
		});

		if (!keys.shift && !keys.ctrl) {
			$("#wrapper .files .list a").removeClass("selected");
		}

		if (hasClass && nbSelected <= 1) {
			$(this).removeClass("selected");
		} else {
			$(this).addClass("selected");
		}
	});

	$("#wrapper .files .list a").on("dblclick", function(ev) {
		if ($(this).hasClass("converting")) {
			return false;
		}

		if ($(this).hasClass("shadow") && ev.target.nodeName == "INPUT") {
			return false;
		}

		viewer.view($(this).data("href"), {
			name: $("input", this).val(),
			ext: $(this).data("ext"),
		});
	});

	$("#wrapper .folders div, #wrapper .path div > a").on("contextmenu", function(ev) {
		ev.preventDefault();

		$("#ctx :not(.rename):not(.delete)").addClass("disabled");
		$("#ctx .open").addClass("hidden");

		$("#wrapper .files .list a").removeClass("selected");
		$(this).addClass("selected");

		let parent = $(this).data("parent"),
			id = $(this).data("id"),
			path = $(this).data("path"),
			name = $(this).data("name");

		ctx.currentFilePath = parent;

		$("#ctx .delete").off();
		$("#ctx .delete").on("click", () => {
			folder.show("delete", isUSB ? path : id, name, false, isUSB, usbDevice);
		});

		$("#ctx .rename").off();
		$("#ctx .rename").on("click", () => {
			let isPathElement = this[0].nodeName == "A";

			folder.show("rename", isUSB ? path : id, name, isPathElement, isUSB, usbDevice);
		});

		ctx.show({
			x: ev.clientX,
			y: ev.clientY
		}, $(this).data(name));
	});

	$("#wrapper .files .list a").on("contextmenu", function(ev) {
		ev.preventDefault();

		if ($(this).hasClass("converting")) {
			return false;
		}

		$("#wrapper .files .list a").removeClass("selected");
		$(this).addClass("selected");

		let extension = $(this).data("ext").replace(".", ""),
			fileName = $("input.name", this).html().replace(/<span>|<\/span>/g, "");

		$("#ctx .feed").addClass("hidden");

		let path = decodeURIComponent($(this).data("href"));
			path = path.split(connect.user.id);
			path.shift();
			path = path.join(connect.user.id);

			while (path.startsWith("/")) {
				path = path.replace("/", "");
			}
	
			path = "/"+path;

		ctx.currentFilePath = path;

		$("#ctx .open, #ctx .download").attr("href", $(this).data("href"));

		$("#ctx .delete").off();
		$("#ctx .delete").on("click", () => {
			ctx.hide();
			fileToDelete = isUSB ? $(this).data("path") : $(this).data("id");

			if (isUSB) {
				socket.emit("drive.usb.delete", usbDevice, fileToDelete);
			} else {
				socket.emit("drive.delete", fileToDelete);
			}
		});

		$("#ctx .rename").off();
		$("#ctx .rename").on("click", () => {
			let input = $("input", this)[0],
				val = input.value,
				ext = val.split(".");
				ext = ext[ext.length -1];
			let end = val.length - ext.length -1;

			if (!val.includes(".")) end = val.length;

			ctx.hide();
			input.focus();

			console.log(val);

			createSelection(input, 0, end);

			$("#wrapper .files .list a").addClass("hidden");
			$(this).addClass("shadow").removeClass("hidden");
			$("#wrapper .files a.shadow input").removeAttr("onmousedown").attr("ondblclick", "return false;");

			setTimeout(() => {
				currentRenamedFile = $(this).data("id") || $(this).data("path");
			}, 50);
		});

		$("#ctx .share").off();
		$("#ctx .share").on("click", () => {
			shareFileFromEl(this);
		});

		ctx.show({
			x: ev.clientX,
			y: ev.clientY
		}, fileName);
	});

	$("#wrapper .files .list a .shared").handle("click", function() {
		shareFileFromEl(this.parent());
	});

	let shareFileFromEl = function(_this) {
		ctx.hide();
	
		let id = $(_this).data("id"),
			sharedWith = $(_this).data("sharedWith").split("|");
	
		if (sharedWith[0] == "") {
			sharedWith.pop();
		}

		let done = false;
	
		users.show(list => {
			if (done) return false;
			users.hide();
			socket.emit("drive.clearSharings", id);
	
			list.forEach(uid => {
				socket.emit("drive.share", id, uid);
			});

			done = true;
		});
	
		$("#users .list div").removeClass("checked");
		$("#users .buttons .next span").html("("+sharedWith.length+")");
	
		$("#users .list div").each(el => {
			let elID = $(el).data("id");
	
			if (sharedWith.includes(elID)) {
				$(el).addClass("checked");
			}
		});
	};
}

$("#wrapper .files .title .name svg").on("click", function() {
	displayDriveFiles(currentDrivePanel.files, 'name', false);
});

$("#wrapper .files .title .size svg").on("click", function() {
	displayDriveFiles(currentDrivePanel.files, 'size', false);
});

$("#wrapper .files .title .mtime svg").on("click", function() {
	displayDriveFiles(currentDrivePanel.files, 'mtime', false);
});

$("#wrapper .files .title .ext svg").on("click", function() {
	displayDriveFiles(currentDrivePanel.files, 'ext', false);
});

socket.on("drive.share", (success, file) => {
	if (success) {
		socket.emit("drive.content", currentDrivePanel.folderID);
	}
});

$("#wrapper .buttons .list div:not(.line)").on("click", function() {
	$("#wrapper .intro h1").html($("a", this).html());
	$("#wrapper .buttons .list div").removeClass("selected");
	$("#wrapper .buttons .list .line").addClass("selected");
	$(this).addClass("selected");
	setListLine(this);
	displayDrivePath([]);

	let type = $(this).prop("className").replace(/selected|hasLine| /g, "");
	$("#wrapper .buttons .new").addClass("disabled");
	$("#wrapper .files").css("display", "");
	$("#wrapper .path .root svg path").attr("d", "M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z");
	$("#wrapper .path").css("display", "");

	setTimeout(() => {
		$("#wrapper .path").removeClass("hidden");
	}, 50);

	if (!$("#wrapper .noUsbDevices").hasClass("hidden") && type != "usb") {
		$("#wrapper .noUsbDevices").addClass("hidden");

		setTimeout(() => {
			$("#wrapper .noUsbDevices").css("display", "none");
		}, 200);
	}

	if (type == "shared") {
		$("#wrapper .files .title .size span").html(translation.owner);
		$("#wrapper .path").addClass("hidden");

		$("#ctx a.share, #ctx a.delete, #ctx a.rename").addClass("disabled");
		$("#wrapper .intro svg path").attr("d", "M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4 8h-8v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1z");

		socket.emit("drive.shared");

		$("#wrapper .path").addClass("hidden");

		setTimeout(() => {
			$("#wrapper .path").css("display", "none");
		}, 200);
	} else if (type == "usb") {
		$("#wrapper .buttons .new").removeClass("disabled");
		$("#wrapper .path .root svg path, #wrapper .intro svg path").attr("d", "M18 7h-2c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1v2h-3V5h1c.41 0 .65-.47.4-.8l-2-2.67c-.2-.27-.6-.27-.8 0l-2 2.67c-.25.33-.01.8.4.8h1v8H8v-2.07c.83-.44 1.38-1.36 1.14-2.43-.17-.77-.77-1.4-1.52-1.61C6.15 6.48 4.8 7.59 4.8 9c0 .85.5 1.56 1.2 1.93V13c0 1.1.9 2 2 2h3v3.05c-.86.45-1.39 1.42-1.13 2.49.18.75.79 1.38 1.54 1.58 1.46.39 2.8-.7 2.8-2.12 0-.85-.49-1.58-1.2-1.95V15h3c1.1 0 2-.9 2-2v-2c.55 0 1-.45 1-1V8C19 7.45 18.55 7 18 7z");

		if (usbDevices.length > 0) {
			socket.emit("drive.usb.device.content", usbDevices[0], "");
		} else {
			$("#wrapper .files").addClass("bottom");
			$("#wrapper .noUsbDevices").css("display", "");

			setTimeout(() => {
				$("#wrapper .files").css("display", "none");
			}, 150);

			setTimeout(() => {
				$("#wrapper .noUsbDevices").removeClass("hidden");
			}, 100);
		}
	} else {
		$("#wrapper .intro svg path").attr("d", "M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z");
		$("#wrapper .buttons .new").removeClass("disabled");
		$("#wrapper .files .title .size span").html(translation.size);
		socket.emit("drive.content", currentDrivePanel.folderID == "usb" ? "root" : currentDrivePanel.folderID);
		$("#ctx a.share, #ctx a.delete, #ctx a.rename").removeClass("disabled");
	}
});

$("#wrapper .path .root").on("click", () => {
	switch (currentDrivePanel.window) {
		case "drive": socket.emit("drive.content", ""); break;
		case "usb": socket.emit("drive.usb.device.content", currentDrivePanel.usbDevice, ""); break;
		case "shared": socket.emit("drive.shared"); break;
	}
});

socket.on("drive.shared", (files) => {
	$("#wrapper .files").addClass("bottom");
	$("#wrapper .files .list").html(files.length == 0 ? '<h2>Aucun fichier <span>Partagé avec moi</span></h2>' : "");
	currentDrivePanel.files = files;
	currentDrivePanel.window = "shared";
	let types = {};

setTimeout(() => {
	$("#wrapper .files .folders").html("").addClass("empty");

	files.forEach(file => {
		let extName = getExtName(file.ext),
			icon = `<svg viewbox="0 0 24 24" fill="${getColorFromExt(file.ext)}"><path d="${getIconFromExt(file.ext)}"></svg>`,
			fileNameToDisplay = file.name.length >= 35 ? file.name.substring(0, 32)+"..." : file.name,
			extensionToDisplay = extName.length > 10 ? extName.substring(0, 7)+"..." : extName;
		
			if (types[extToKey[file.ext]]) {
				types[extToKey[file.ext]]++;
			} else {
				types[extToKey[file.ext]] = 1;
			}

			if (["jpg", "jpeg", "png"].includes(file.ext.replace(".", '').trim().toLowerCase())) {
				icon = `<div class="img" style="background-image: url(/file/${file.id});"></div>`;
			}

		$("#wrapper .files .list").append(`
		<a data-ext="${file.ext}" data-id="${file.id}" data-href="/file/${file.id}" data-path="${file.path}">
		${icon}
		<input onmousedown="return false;" class="name" value="${fileNameToDisplay}">
		<p class="size" data-size="${file.owner.id}">${file.owner.name}</p>
		<p class="mtime">${fancyDate(file.modify)}</p>
		<p class="ext">${getNameFromExt(file.ext)+" "+extensionToDisplay.toLowerCase().trim().replace(".", "")}</p></a>`);
	});

	$("#wrapper .intro p").html((files.length || "Aucun")+" fichier"+(files.length > 1 ? "s" : "")+" <span>partagé"+(files.length > 1 ? "s" : "")+" avec moi</span>");

	let typesTotal = 0;

	Object.keys(types).forEach(key => {
		typesTotal += types[key];
	});

	$("#wrapper .intro .progress").html("");

	Object.keys(types).forEach(key => {
		let percent = types[key] / typesTotal * 100;

		$("#wrapper .intro .progress").append('<div flow="down" tooltip="'+keyToName[key]+(types[key] > 1 ? "s" : "")+'" style="width: '+percent+'%; background-color: '+filesColors[keyToColour[key]]+'"</div>');
	});

	setFileEvents();	
	
	$("#wrapper .files").removeClass("bottom");
}, 150);

});

let fileToDelete = false;

socket.on("drive.delete", (success, id) => {
	folder.hide();

	if (success) {
		$("#wrapper .files .list > a").each(el => {
			if ($(el).data("id") == id) {
				$(el).addClass("hide");
				fileToDelete = false;

				setTimeout(() => {
					$(el).remove();
					socket.emit("drive.content", currentDrivePanel.folderID);
				}, 200);
			}
		});

		$("#wrapper .files .folders > div").each(el => {
			if (el.data("id") == id) {
				el.addClass("hidden");

				setTimeout(() => {
					el.remove();
				}, 200);
			}
		});

		currentDrivePanel.path.forEach((el, index) => {
			if (el.id == id) {
				socket.emit("drive.content", index > 0 ? currentDrivePanel.path[index -1].id : "root");
			}
		});
	}
});

function ltrim(str) {
	return str.replace(/^\/+/,"");
}

let ctx = {
	currentFilePath: "",

	show(pos, subTitle, recursive) {
		let ctxHeight = $("#ctx")[0].clientHeight,
			winHeight = window.innerHeight;

		if (ctxHeight+pos.y > winHeight) {
			pos.y = pos.y-ctxHeight;
		} else if (ctxHeight == 0) {
			pos.y = pos.y-200;
		}

		if (subTitle) {
			$("#ctx > h4 span").html(subTitle.length >= 15 ? subTitle.substring(0, 12)+"..." : subTitle);
		}

		$("#ctx").css({
			display: "block",
			top: pos.y+5+"px",
			left: pos.x-5+"px"
		});

		setTimeout(function() {
			$("#ctx").removeClass("hidden");
		}, 100);
	},

	hide() {
		if (!ajax.isLoaded(page)) return false;
		$("#ctx").addClass("hidden");

		setTimeout(function() {
			$("#ctx").css("display", "none");
		}, 300);
	}
};

$(window).on("scroll", ctx.hide);
$(window).on("resize", ctx.hide);

let leaveTimeout = null;

$("#ctx").on("leave", () => {
	leaveTimeout = setTimeout(ctx.hide, 150);
});

$("#ctx").on("enter", () => {
	clearTimeout(leaveTimeout);
});

$(window).on("click", () => {
	if (ajax.isLoaded(page) && !$("#ctx").is(":hover")) {
		ctx.hide();
	}

	if (ajax.isLoaded(page) && !$("#wrapper .files").is(":hover")) {
		$("#wrapper .files a").removeClass("selected");
	}

	if (ajax.isLoaded(page) && currentRenamedFile && !$("#wrapper .files .list a.shadow").is(":hover")) {
		if (currentDrivePanel.window == "usb") {
			socket.emit("drive.usb.rename", currentDrivePanel.usbDevice, currentRenamedFile, $("#wrapper .files .list a.shadow input").val(), false);
		} else {
			socket.emit("drive.rename", currentRenamedFile, $("#wrapper .files .list a.shadow input").val());
		}
	}
});

$(window).on("keydown", ev => {
	if (ajax.isLoaded(page) && [13, 27].includes(ev.keyCode) && currentRenamedFile) {
		if (currentDrivePanel.window == "usb") {
			socket.emit("drive.usb.rename", currentDrivePanel.usbDevice, currentRenamedFile, $("#wrapper .files .list a.shadow input").val(), false);
		} else {
			socket.emit("drive.rename", currentRenamedFile, $("#wrapper .files .list a.shadow input").val());
		}
	}
});

socket.on("drive.rename", success => {
	if (success) {
		currentRenamedFile = null;

		$("#wrapper .files a.shadow input").removeAttr("ondblclick").attr("onmousedown", "return false;").blur();
	
		$("#wrapper .files a").removeClass(["hidden", "shadow"]);
		setTimeout(() => {
			socket.emit("drive.content", currentDrivePanel.folderID);
		}, 300);
	}
});

socket.on("drive.usb.newFolder", (success, usbDevice, el) => {
	folder.hide();

	if (success && currentDrivePanel.usbDevice == usbDevice && currentDrivePanel.window == "usb") {
		let blockID = superID(15);

		$("#wrapper .files .folders").append(`<div data-block="${blockID}" class="hidden" data-parent="" data-path="${el.path}" data-name="${el.name}" onmousedown="return false" onclick="socket.emit('drive.usb.device.content', '${usbDevice}', $(this).data('path'))">
		<svg class="icon" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
		<h4>${fancyStringLength(el.name, 14)}</h4>
		<p>${el.length == 0 ? "Aucun " : el.length} élément${el.length > 1 ? "s" : ""}</p>
		<svg onclick="socket.emit('drive.content', '${el.id}')" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg></div>`);

		setTimeout(() => {
			$("div[data-block='"+blockID+"']").removeClass("hidden");
			
			setFileEvents();
		}, 50);
	}
});

socket.on("drive.disk", (disks, totalSize, used) => {
    $("#wrapper .intro .progress").html('');

    let allDriveSize = 0;

    disks.forEach(disk => {
        let percent = disk.size / totalSize * 100;

        if (percent < 2 && disks.length <= 10) {
            percent = 2;
		}

        if (disk.uid == connect.user.id) {
			$("#wrapper .intro .progress").append('<div class="'+(disk.uid == connect.user.id ? "me" : "other")+'" flow="down" tooltip="'+(disk.uid == connect.user.id ? "Moi" : "Autre utilisateur")+'" style="width: '+percent+'%;"></div>');
            $("#wrapper .intro p").html(fancySize(disk.size)+" utilisés par moi <span>sur "+fancySize(totalSize)+"</span>");
        }
        
        allDriveSize += disk.size;
	});

    $("#wrapper .intro .progress").prepend('<div class="blocked" tooltip="Nitro system" flow="down" style="width: '+((used-allDriveSize)/totalSize*100)+'%;"></div>');
});

function sortDrive(files, factor, reverse) {
	switch (factor) {
		case "name":
			files.sort((a,b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0)); 

			if (reverse) {
				files.reverse();
			}
		break;

		case "ext":
			files.sort((a,b) => {
				let nmA = a.name.split("."),
					extA = nmA[nmA.length -1],
					nmB = b.name.split("."),
					extB = nmB[nmB.length -1];
				
				if (extA.toLowerCase() > extB.toLowerCase()) {
					return 1;
				} else {
					return -1;
				}
			}); 

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

/* XX / Folders / @folders
================================= */
$("#wrapper .buttons .new .menu .folder").on("click", () => folder.show("create"));
$("#folder").on("click", () => {
	if (!$("#folder > div, #wrapper .folder").is(":hover")) {
		folder.hide();
	}
});

function createSelection(field, start, end) {
    if( field.createTextRange ) {
    	var	selRange = field.createTextRange();
    		selRange.collapse(true);
    		selRange.moveStart('character', start);
    		selRange.moveEnd('character', end);
			selRange.select();

    	field.focus();
    } else if( field.setSelectionRange ) {
    	field.focus();
    	field.setSelectionRange(start, end);
    } else if( typeof field.selectionStart != 'undefined' ) {
    	field.selectionStart = start;
    	field.selectionEnd = end;
    	field.focus();
    }
}

let folder = {
	show(type, id, name, goIntoFolder, isUSB, usbDevice) {
		id = id || "--";
		name = name || "--";

		$("#folder, #folder > ."+type).css("display", "");
		$("#folder > ."+type).data("isusb", isUSB+"");
		$("#folder > ."+type).data("usbdevice", (usbDevice || currentDrivePanel.usbDevice)+"");

		if (type == "rename") {
			$("#folder > ."+type+" input").val(name).trigger("focus")[0].select();
			$("#folder > ."+type).data("goIntoFolder", goIntoFolder+"");
		} else if (type == "create") {
			$("#folder > ."+type+" input").val("").trigger("focus")[0].select();
		} else if (type == "delete") { // the modal needed will delete a folder if validated
			$("#folder > .delete h4").html(fancyStringLength(name, 18));
		}

		$("#folder > ."+type).data("id", id);

		setTimeout(() => {
			$("#folder > ."+type+", #folder").removeClass("hidden");
		}, 50);
	},

	hide() {
		$("#folder > div").addClass("hidden");

		setTimeout(() => {
			$("#folder").addClass("hidden");

			setTimeout(() => {
				$("#folder, #folder > div").css("display", "none");
			}, 300);
		}, 100);
	}
};

$("#folder .input input").on("keydown", function(ev) {
	if (ev.keyCode == 13) {
		setTimeout(() => processFolderResponse(this), 100);
	}
});

function processFolderResponse(el) {
	let folderWrapper = el.parent().parent(),
		id = folderWrapper.data("id"),
		input = $("input", folderWrapper)[0],
		val = input ? $(input).val() : "",
		isUSB = currentDrivePanel.window == "usb",
		usbDevice = folderWrapper.data("usbdevice"),
		goIntoFolder = folderWrapper.data("goIntoFolder") == "true" ? true : false;

	if (folderWrapper.hasClass("rename")) {
		if (isUSB) {
			socket.emit("drive.usb.rename", usbDevice, id, val, goIntoFolder);
		} else {
			socket.emit("drive.renameFolder", id, val, goIntoFolder);
		}
	} else if (folderWrapper.hasClass("delete")) {
		if (isUSB) {
			socket.emit("drive.usb.delete", usbDevice, id);
		} else {
			socket.emit("drive.deleteFolder", id);
		}
	} else if (folderWrapper.hasClass("create")) {
		if (currentDrivePanel.window == "usb") {
			let path = "";

			currentDrivePanel.path.forEach(el => {
				path += "/"+el.name;
			});

			if (path == "") path = "/";

			console.log(path);

			socket.emit("drive.usb.newFolder", usbDevice, val, path);
		} else {
			socket.emit("drive.newFolder", val, currentDrivePanel.folderID);
		}
	} else {
		folder.hide();
	}
}

$("#folder .buttons .continue").on("click", function() { processFolderResponse(this); });

socket.on("drive.usb.delete", (success, usbDevice, path) => {
	if (success && currentDrivePanel.usbDevice == usbDevice) {
		folder.hide();

		$("#wrapper .files .folders div, #wrapper .files .list a").each(el => {
			if ($(el).data("path") == path) {
				$(el).addClass(["hidden", "hide"]);

				setTimeout(() => {
					$(el).remove();
				}, 200);
			}
		});
	}
});

socket.on("drive.usb.rename", (success, usbDevice, oldPath, newPath, name, goIntoFolder) => {
	folder.hide();

	if (success && currentDrivePanel.usbDevice == usbDevice && currentDrivePanel.window == "usb") {
		$("#wrapper .files a input:focus").val(name).removeAttr("ondblclick").attr("onmousedown", "return false;").blur();
		$("#wrapper .files a").removeClass(["hidden", "shadow"]);

		$("#wrapper .files .folders div").each(el => {
			if ($(el).data("path") == oldPath) {
				$(el).data("path", newPath);
				$(el).data("name", name);
				$("h4", el).html(name);
			}
		});

		console.log("ok", oldPath);

		$("#wrapper .files .list a").each(el => {
			if ($(el).data("path") == oldPath) {
				$(el).data("path", newPath);
				$(el).data("name", name);
				$(el).data("href", "/file/usb/"+usbDevice+"/"+encodeURIComponent(newPath));
			}
		});

		$("#wrapper .path a").each(el => {
			if ($(el).data("path") == oldPath) {
				$(el).data("path", newPath);
				$(el).data("name", name);
				$(el).html(name);

				$("#wrapper .files .folders div, #wrapper .files .list a").each(el => {
					if ($(el).data("path").startsWith(oldPath)) {
						$(el).data("path", $(el).data("path").replace(oldPath, newPath));
						console.log(el[0].nodeName);
						if (el[0].nodeName == "A") {
							$(el).data("href", "/file/usb/"+usbDevice+"/"+encodeURIComponent(el.data("path")));
						}
					}
				});

				if ($("#wrapper .files .list h2")[0]) {
					let names = newPath.split("/");
						names.shift();

					console.log(names);
				
					let	pathToDisplay = names.join('<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>') || "Mon Drive";
					$("#wrapper .files .list").html("<h2>Aucun fichier dans <span>"+(pathToDisplay)+"</span></h2>");
				}
			}
		});

		currentRenamedFile = null;
	} else if (!success && currentDrivePanel.usbDevice == usbDevice && currentDrivePanel.window == "usb") {
		setTimeout(() => {
			folder.show("error-rename");
		}, 450);
	}
});

$("#folder .input input").on("focus", function() {
	$(this).parent().addClass("focused");
});

$("#folder .input input").on("blur", function() {
	$(this).parent().removeClass("focused");
});

$("#folder .buttons .cancel").on("click", function() {
	folder.hide();
});

socket.on("drive.folderError", () => {
	$("#folder .input").addClass("invalid");

	setTimeout(() => {
		$("#folder .input").removeClass("invalid");
	}, 250);
});

/* XX / File Upload / @upload
================================= */

let filesDone = 0,
	filesToDo = 0,
	progressBar = $("#wrapper .dropzone .progress").first(),
	dropArea = $('#wrapper .dropzone')[0];

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
	dropArea.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
	dropArea.addEventListener(eventName, highlight, false);
});
  
['dragleave', 'drop'].forEach(eventName => {
	dropArea.addEventListener(eventName, unhighlight, false);
});

$("#wrapper .dropzone input").on("change", function() {
	handleFiles(this[0].files);
});

dropArea.addEventListener('drop', handleDrop, false);
  
function highlight() {
	dropArea.classList.add('highlight');
}
  
function unhighlight() {
	dropArea.classList.remove('highlight');
}

function handleDrop(e) {
	let dt = e.dataTransfer;
	let files = dt.files;
  
	handleFiles(files);
}
	  
function preventDefaults(e) {
	e.preventDefault();
	e.stopPropagation();
}

function handleFiles(files) {
	if ($("#wrapper .buttons .new").hasClass("disabled") || files.length == 0) {
		return false;
	} else if (files.length == 1) {
		let name = files[0].name;
		$("#wrapper .dropzone h4").html(name.length >= 20 ? name.substring(0, 17)+"..." : name);
	} else {
		$("#wrapper .dropzone h4").html(files.length+" fichiers ...");
	}

	let ext = files[0].name.split(".");
		ext = ext[ext.length -1];

	initializeProgress(files.length);

	if (files.length == 1) {
		$("#wrapper .dropzone > svg > path").attr("d", getIconFromExt(ext));
	}

	for (let i = 0; i<files.length; i++) {
		uploadFile(files[i], i);
	}
}

function initializeProgress(numFiles) {
	filesDone = 0;
	filesToDo = 0;
	$(progressBar).html("").removeClass("hidden");
	$("#wrapper .dropzone p").addClass("hidden");
	$("#wrapper .dropzone label").css("display", "none");

	uploadProgress = [];

	if (numFiles == 1) {
		$("#wrapper .dropzone > svg > path").attr("d", "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z");
	}

	for(let i = numFiles; i > 0; i--) {
		uploadProgress.push(0);
		$(progressBar).append('<div style="width: 0%" class="hidden" data-number="'+i+'"></div>');
	}
}

function progressDone(fileNumber) {
	filesDone++;
	$("div[data-number='"+(fileNumber+1)+"']", progressBar).addClass("done");

	let path = "";

	currentDrivePanel.path.forEach(folder => {
		path += "/"+folder.name;
	});

	if (path == "") path = "/";

	if (currentDrivePanel.window == "usb") {
		socket.emit("drive.usb.device.content", currentDrivePanel.usbDevice, path);
	} else if (currentDrivePanel.window == "drive") {
		socket.emit("drive.content", currentDrivePanel.folderID);
	}
	
	if (filesDone == uploadProgress.length) {
		let message = "Vo"+(uploadProgress.length == 1 ? "tre " : "s "+uploadProgress.length)+" fichier"+(uploadProgress.length == 1 ? "" : "s")+" "+(uploadProgress.length == 1 ? "a" : "ont")+" été importé"+(uploadProgress.length == 1 ? "" : "s")+".";
		
		$("#wrapper .dropzone h4").html("Terminé !");
		$(progressBar).html("").addClass("hidden");
		$("#wrapper .dropzone p").html(message).removeClass("hidden");
		$("#wrapper .dropzone h5").addClass("hidden");

		setTimeout(() => {
			$("#wrapper .dropzone h4").html("Importer un fichier");
			$("#wrapper .dropzone p").addClass("hidden");
			$("#wrapper .dropzone > svg > path").attr("d", "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z");

			setTimeout(function() {
				$("#wrapper .dropzone p").html("a la vitesse de la lumière").removeClass("hidden");
			}, 200);
		}, 1500);

		$("#wrapper .dropzone label").css("display", "block");
	
		filesDone = 0;
		filesToDo = 0;
		uploadProgress = [];
	}
}

function updateProgress(fileNumber, percent, loadedSize, totalSize) {
	let allPercents = 0;

	uploadProgress.forEach(percent => allPercents += percent);
	allPercents = Math.floor(allPercents / uploadProgress.length);

	uploadProgress[fileNumber] = percent;
	let total = percent / uploadProgress.length;
	$("div[data-number='"+(fileNumber+1)+"']", progressBar).removeClass("hidden").css("width", total+"%");
	$("#wrapper .dropzone h5").removeClass("hidden");
	$("#wrapper .dropzone h5 .percent").html(allPercents+"%");
	$("#wrapper .dropzone h5 .loaded").html("- "+fancySize(loadedSize)+" envoyés");

	if (percent == 100) {
		progressDone(fileNumber);
	}
}

function uploadFile(file, i) {
	let xhr = new XMLHttpRequest(), // new XHR object
		formData = new FormData(), // new virtual form
		isUSB = currentDrivePanel.window == "usb", // is the current drive panel the USB storage ?
		path = "";

	if (isUSB) {
		currentDrivePanel.path.forEach(folder => {
			path += "/"+folder.name;
		});

		if (path == "") path = "/";

		xhr.open('POST', '/drive/upload/'+connect.user.id+"/"+encodeURIComponent(path)+"/"+encodeURIComponent(currentDrivePanel.usbDevice), true); // open new request
	} else {
		xhr.open('POST', '/drive/upload/'+connect.user.id+"/"+(currentDrivePanel.folderID || "root"), true); // open new request
	}

	// on progress
	xhr.upload.addEventListener("progress", function(e) {
		updateProgress(i, (e.loaded * 100 / e.total) || 100, e.loaded, e.total); // display the progress
	});

	// on finished
	xhr.onloadend = function(e) {
		if (xhr.readyState == 4 && xhr.status == 200) {
			progressDone(i);
		} else if (xhr.readyState == 4 && xhr.status != 200) {
		  // Error. Inform the user
		}
	};

	formData.append('file', file); // add input to the form
	xhr.send(formData); // send the form
}


connect.callbacks.push(() => {
   socket.emit("login", connect.user.id, connect.id); 
});

connect.login();

})();