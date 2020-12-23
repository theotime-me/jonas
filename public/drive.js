socket.on("drive.devices", devices => {
    let totalBytes = 0,
        usedBytes = 0,
        names = "";

    drive.devices = devices;

    $("#side .drive .line > p span").html("").data("text", "");

    Object.values(devices).forEach((device, index) => {
        usedBytes += device.used;
        totalBytes += device.size;

    let old = $("#side .drive .line > p span").html();
        names += device.name + " / ";

        $("#side .drive .line > p span").html(names);
        $("#side .drive .line > p span").data("text", names);
    });

    let percent = Math.floor(usedBytes/totalBytes*100),
        availableBytes = totalBytes - usedBytes,
        fancyAvailable = fancy_size(availableBytes, true),
        devices_length = Object.values(devices).length;

    if (!devices_length) {
        $("#side .drive-progress, #side .drive").addClass("hidden");
        $("#side .drive-progress").css("width", "0px");
        $("#side .drive > h4").html("Drive vide");
        $("#side .drive > p").html("Aucun périphérique");
		adjust_number_value("#side .drive .line h1.percentage", 0, "%");
		
		$("#drive .hero, #drive .finder").css("display", "none");
		$("#drive .nothing").css("display", "");

		if (location.pathname.startsWith("/drive")) {
			window.history.pushState({html: "",pageTitle: ""},"", "/drive/");
		}

		$("#drive-side").addClass("hidden");
    } else {
		$("#drive .nothing").css("display", "none");
		$("#drive .hero, #drive .finder").css("display", "");

        $("#side .drive-progress, #side .drive").removeClass("hidden");
        $("#side .drive > h4").html("Drive");
        $("#side .drive-progress").css("width", percent/100*300+"px");
        $("#side .drive > p").html('<b>'+fancyAvailable+'</b> disponibles');
		adjust_number_value("#side .drive .line h1.percentage", percent, "%");
		
		if (location.pathname.startsWith("/drive/")) {
			$("#drive-side").removeClass("hidden");
		}
    }

    if (devices_length >= 2 && devices_length <= 10) {
        $("#side .drive > h4").html(fancy_uppercase(fancy_multiplicatives(devices_length))+" drive")
    }

    if (names.length >= 35) {
        $("#side .drive .line > p").addClass("marquee");
    } else {
        $("#side .drive .line > p").removeClass("marquee");
	}

	$("#drive .hero .path .device-select").html("");

	Object.values(devices).forEach(dev => {
		let checked = "";

		if (drive.current.device == dev.name || Object.values(devices).length == 1) checked = "checked";

		$("#drive .hero .path .device-select").append(`<div class="${checked}" onmousedown="socket.emit('drive.device.content', '${dev.name}')" data-device="${dev.name}"><svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg><h4>${dev.name}</h4><p>${fancy_size(dev.available)} disponible</p></div>`);
	});

	if (Object.values(devices).length == 1) {
		$("#drive .hero .device svg").addClass("hidden");

		let path = location.pathname;

		path = path.replace(/\/{2,}/g, "/");
		if (!path.endsWith("/")) path = path+="/";
		if (!path.startsWith("/")) path = path = "/"+path;
		path = path.split("/");
		path.shift();
		path.pop();
		
		path = path[1];

		if (!path) {
			socket.emit("drive.device.content");
		}

		$("#drive .hero .path .device svg").addClass("hidden");
	} else if (Object.values(devices).length > 1) {
		console.log(drive.current.path);

		if (drive.current.path == "") {
			$("#drive .hero .path .device svg").removeClass("hidden");
		}
	}
});

socket.on("device.current", current => {
    let drive = current.drive,
        freeBytes = parseFloat(drive.freeGb) * 1000000000,
        totalBytes = parseFloat(drive.totalGb) * 1000000000;

    side_progress_bar("#side .device .storage .progress", parseInt(drive.usedPercentage), "#FF851B");

    $("#side .device .storage p").removeClass("load").html(fancy_size(freeBytes, true)+' restants');
});

let ctrl = false,
	shift = false;

let drive = {
	devices: {},
	
	current: {
		device: "",
		path: ""
	},

    device(name) {
        if (!this.devices[name]) return false;

		this.storage(name);
		let dev = this.devices[name];
		
		drive.current.device = name;

        $("#drive .hero .path .device h4").html(dev.name);
		$("#drive .hero .path .device p .size").html(fancy_size(dev.size - dev.used, true));

		$("#drive .hero .path .device-select div").removeClass("checked");
		$("#drive .hero .path .device-select div[data-device='"+name+"']").addClass("checked");

		if (dev.type == "flash drive") {
			$("#drive .hero .path .device img").attr("src", "/assets/drive/usb-key.png");
		} else if (dev.type == "hard drive") {
			$("#drive .hero .path .device img").attr("src", "/assets/drive/usb-cable.png");
		}
	},

	color(type) {
		let colors = {
			video: 		'#ff7675',
			image: 		'#FF4136',
			music: 		'#d63031',
			pdf: 		'#FF4136',
			trash:		'#111111',
			document:	'#0074D9',
			slide:		'#fdcb6e',
			sheet:		'#55efc4',
			data:		'#a29bfe',
			settings:	'#FF851B'
		}, out;
		
		Object.keys(colors).forEach(key => {
			if (type == key) {
				out = colors[key];
			}
		});

		return out;
	},
	
	storage(name) {
        if (!this.devices[name]) return false;

		let dev = this.devices[name];

		$("#drive-side .storage h4").html(name);
		$("#drive-side .storage p .used").html(fancy_size(dev.used));
		$("#drive-side .storage p .size").html(fancy_size(dev.size, false, true));

		$("#drive-side .storage .bar").html("<div class='_unknown' style='width: "+(dev.usage*100)+"%'</div>");
	},

    path(path) {
		if (!location.pathname.startsWith("/drive")) return false;

		$("#drive-side").removeClass("hidden");
		$("#drive .hero .path .folders").html("");

		if (path.startsWith("/")) path = path.substring(1);
		path = path.replace(/\/{2,}/g, "/");

        let split = path.split("/"),
			fullpath = "/";

		if (split[0] == "") split = [];

		drive.current.path = path;

		if (split.length) {
			$("#drive .hero .path .device svg").addClass("hidden");
		} else if (Object.values(drive.devices).length > 1) {
			$("#drive .hero .path .device svg").removeClass("hidden");
		}

        split.forEach(el => {
            if (!el) return false;

            fullpath += el+"/";

            $("#drive .hero .path .folders").append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>');
            $("#drive .hero .path .folders").append('<span data-path="'+fullpath+'">'+el+'</span>');
		});
		
		window.history.pushState({html: "",pageTitle: ""},"", "/drive/"+this.current.device+"/"+(this.current.path == "/" ? "" : encodeURIComponent(this.current.path)));
	},
	
	icon(type) {
		let icon = '<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>';

		type = type || "unknown";

		let icons = {
			video: 		'<svg fill="#FF4136" viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>',
			image: 		'<svg fill="#FF4136" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
			music: 		'<svg fill="#FF4136" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>',
			pdf: 		'<svg fill="#FF4136" viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>',
			trash:		'<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
			document:	'<svg fill="#0074D9" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
			slide:		'<svg fill="#FFDC00" viewBox="0 0 24 24"><path d="M10 8v8l5-4-5-4zm9-5H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>',
			data:		'<svg fill="#B10DC9" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-5h2v5zm4 0h-2v-3h2v3zm0-5h-2v-2h2v2zm4 5h-2V7h2v10z"/></svg>',
			settings:	'<svg fill="#FF851B" viewBox="0 0 24 24"><path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm7-7H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-1.75 9c0 .23-.02.46-.05.68l1.48 1.16c.13.11.17.3.08.45l-1.4 2.42c-.09.15-.27.21-.43.15l-1.74-.7c-.36.28-.76.51-1.18.69l-.26 1.85c-.03.17-.18.3-.35.3h-2.8c-.17 0-.32-.13-.35-.29l-.26-1.85c-.43-.18-.82-.41-1.18-.69l-1.74.7c-.16.06-.34 0-.43-.15l-1.4-2.42c-.09-.15-.05-.34.08-.45l1.48-1.16c-.03-.23-.05-.46-.05-.69 0-.23.02-.46.05-.68l-1.48-1.16c-.13-.11-.17-.3-.08-.45l1.4-2.42c.09-.15.27-.21.43-.15l1.74.7c.36-.28.76-.51 1.18-.69l.26-1.85c.03-.17.18-.3.35-.3h2.8c.17 0 .32.13.35.29l.26 1.85c.43.18.82.41 1.18.69l1.74-.7c.16-.06.34 0 .43.15l1.4 2.42c.09.15.05.34-.08.45l-1.48 1.16c.03.23.05.46.05.69z"/></svg>',
			unknown:	'<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>'
		};

		Object.keys(icons).forEach(format => {
			if (format = type) {
				icon = icons[format];
			}
		});

		return icon;
	},

	get(path) {
		socket.emit("drive.device.content", this.current.device, path);
	},

	bundle(list) {
		$("#drive-side .preview .icons").html("");
		$("#drive-side .preview").addClass("small");

		list.forEach((el, index) => {
			if (index > 10) return false;

			this.bundle_unit(el);
		});
	},

	bundle_unit(el) {
		let type = el.type,
			icon = el.folder ? '<svg viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>' : drive.icon(el.type),
			translate = Math.floor(Math.random() * 10) - 5,
			rotate = Math.floor(Math.random() * 25) - 12.5;

		$("#drive-side .preview .icons").append(icon)

		$("#drive-side .preview .icons svg:last-child").css({
			transform: 'translateY('+translate+'px) rotate('+rotate+'deg)'
		});
	},

	display(path) {
		let type = false;

		// WIP.
		console.log(path);
	},

	fancyType(type) {
		let types = {
			video: 		'Vidéo',
			image: 		'Image',
			music: 		'Musique',
			pdf: 		'Document',
			trash:		'Fichier de corbeille',
			document:	'Document',
			slide:		'Présentation',
			data:		'Données',
			settings:	'Fichier de configuration',
			unknown:	'Inconnu'
		};

		Object.keys(types).forEach(_type => {
			if (_type == type) {
				type = types[type];
			}
		});

		return type;
	},

	old_selection: [],

	selected_info() {
		let selected = $("#drive .finder .elements .selected"),
			list = [];

		selected.each(el => {
			let block = el.attr("block");

			drive.current.content.forEach(element => {
				if (element.block == block) {
					list.push(element);
				}
			});
		});

		list.sort((a, b) => {
			if (a.folder) return -1;
			else return +1
		});

		if (JSON.stringify(this.old_selection) != JSON.stringify(list)) {

		if (list.length == 0) {
			$("#drive-side .info").css("display", "none");
		} else {
			$("#drive-side .info").css("display", "");
		}

		let first_el = list[0];

		$("#drive-side .info .preview .icons").css("display", "");
		$("#drive-side .info .preview .img").css("display", "none");

		if (list.length == 1) {
			if (first_el.folder) {
				$("#drive-side .info .icon").html('<svg viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>');
				$("#drive-side .info .preview").addClass("small");
				$("#drive-side .preview .icons").html("");
				$("#drive-side .info .stats .content").removeClass("hidden");
				$("#drive-side .info .stats .content span").html(first_el.size ? first_el.size+" Élément"+(first_el.size > 1 ? "s" : "") : "Vide");
				$("#drive-side .info .stats .size").addClass("hidden");
				$("#drive-side .info .stats .type span").html("Dossier");
				$("#drive-side .info .stats .ext").addClass("hidden");
			} else {
				$("#drive-side .info .stats .content").addClass("hidden");
				$("#drive-side .info .stats .size").removeClass("hidden");
				$("#drive-side .info .stats .type span").html(drive.fancyType(first_el.type));
				$("#drive-side .info .stats .ext").removeClass("hidden");
				$("#drive-side .info .icon").html(drive.icon(first_el.type));

				if (["video", "image"].includes(first_el.type)) {
					$("#drive-side .info .preview .icons").css("display", "none");
					$("#drive-side .info .preview .img").css("display", "");
					$("#drive-side .info .preview").removeClass("small");
		
					switch (first_el.type) {
						case "video": $("#drive-side .info .preview .img img").attr("src", '/thumb/'+this.current.device+"/"+encodeURIComponent(this.current.path+"/"+first_el.name)); break;
						case "image": $("#drive-side .info .preview .img img").attr("src", '/file/'+this.current.device+"/"+encodeURIComponent(this.current.path+"/"+first_el.name)); break;
					}
				}
			}

			$("#drive-side .info .stats .size span").html(fancy_size(first_el.size));
			$("#drive-side .info .stats .ext span").html(first_el.ext);
			$("#drive-side .info > h4.name").html(first_el.name);

			$("#drive-side .info .stats .format").removeClass("hidden");
			$("#drive-side .info .stats .type").removeClass("hidden");
		} else if (list.length > 1) {
			drive.bundle(list);
			$("#drive-side .info > h4.name").html(list.length+" Éléments");
			$("#drive-side .info > .icon").html('<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>');

			let size = 0;

			list.forEach(el => {
				if (!el.folder) {
					size += el.size;
				}
			});

			$("#drive-side .info .stats .format").addClass("hidden");
			$("#drive-side .info .stats .length").addClass("hidden");
			$("#drive-side .info .stats .type").addClass("hidden");
			$("#drive-side .info .stats .ext").addClass("hidden");
			$("#drive-side .info .stats .size").removeClass("hidden");
			$("#drive-side .info .stats .size span").html(fancy_size(size));
		}

		if (list.length > 0) {
			$("#drive-side .info .stats .device span").html(drive.current.device);
			$("#drive-side .info .stats .device").removeClass("hidden");
		}

		}

		this.old_selection = list;
	},

	elements_positions: [],

    content(content) {
		$("#drive .finder .elements").html("");
		this.elements_positions = [];

		if (!content.length) {
			$("#drive .finder .elements").html('<div class="skeleton one"> <svg viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg><h4 class="title"><span>Les moutons</span></h4><p class="modify"><span>12:34</span></p><p class="size"><span>42Go</span></p></div><div class="skeleton two"> <svg viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg><h4 class="title"><span>Arte, c\'est la vie</span></h4><p class="modify"><span>Hier</span></p><p class="size"><span>27Mo</span></p></div><div class="skeleton three"> <svg viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg><h4 class="title"><span>Super élément intéressant</span></h4><p class="modify"><span>Avant-hier</span></p><p class="size"><span>69Ko</span></p></div>');
			$("#drive .finder .titles .file").html("Aucun élément "+(this.current.path.replace(/\//g, "").length ? "ici" : "<span>"+fancy_uppercase(this.current.device)+"</span>"));
		} else {
			$("#drive .finder .titles .file").html("Élément");

			content.sort((a, b) => {
				if (a.folder) return -1;
				else return +1
			});
	
			content.forEach(el => {
				let block_id = "BLOCK"+Math.floor(Math.random() * 99999999);

				el.block = block_id;

				if (el.folder) {
					$("#drive .finder .elements").append(`<div data-path="${this.current.path+"/"+el.name}" class="folder" block="${block_id}">
						<svg viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
						<h4 class="title">${el.name}</h4>
						<p class="modify strike"></p>
						<p class="size strike"></p>
					</div>`);
				} else {
					$("#drive .finder .elements").append(`<div data-path="${this.current.path+"/"+el.name}" class="file" block="${block_id}">
						${this.icon(el.type)}
						<h4 class="title">${el.name}</h4>
						<p class="modify">${el.modified}</p>
						<p class="size">${fancy_size(el.size, true)}</p>
					</div>`);
				}

				this.elements_positions.push(block_id);
			});

			drive.current.content = content;
		}

		$("#drive .finder .elements .folder").on("dblclick", function() {
			let path = this.data("path");

			drive.get(path);
		});

		$("#drive .finder .elements .file").on("dblclick", function() {
			let path = drive.current.path+"/"+this.find("h4").html();

			drive.display(path);
		});

		$("#drive .hero .folders span").on("click", function() {
			let path = this.data("path");

			drive.get(path);
		});

		$("#drive .finder .elements > div:not(.skeleton)").on("click", function() {
			if (ctrl) {
				this.toggleClass("selected");
				drive.selected_info();
			} else {
				$("#drive .finder .elements > div").removeClass("selected");
				this.addClass("selected");
				drive.selected_info();
			}
		});
    }
};

$("#drive .hero .device").on("click", function(){
	if ($("svg", this).hasClass("hidden")) {
		drive.get("/");
	}
});

socket.on("drive.device.content", (device, path, content) => {
	if (device == drive.current.device && path == drive.current.path) return false;
	
    drive.device(device);
    drive.path(path);
    drive.content(content);
});

$(document).on("keydown", ev => {
	let key = ev.keyCode;

	if (key == 65 && ctrl) {
		$("#drive .finder .elements > div:not(.skeleton)").addClass("selected");
		ev.preventDefault();
		drive.selected_info();
	} else if (key == 27) {
		$("#drive .finder .elements > div:not(.skeleton)").removeClass("selected");
		ev.preventDefault();
		drive.selected_info();
	}
});

$(document).on("mouseup", () => {
	if (!$("#drive .finder .elements").is(":hover") && !isDriveDragging && !$("#drive-side").is(":hover")) {
		$("#drive .finder .elements > div").removeClass("selected");
		drive.selected_info();
	}
});

$(window).on("keydown", ev => {
	setTimeout(() => {	
		if (ev.ctrlKey) ctrl = true;
		if (ev.shiftKey) shift = true;
	}, 50);
});

$(window).on("keyup", ev => {
	if (!ev.ctrlKey) ctrl = false;
	if (!ev.shiftKey) shift = false;
});

let mousedown = false,
	isDriveDragging = false,
	drive_start_drag = [0, 0];

$(window).on("mousedown", ev => {
	if (!$("#drive-side, .device-select, #drive .hero .device").is(":hover")) {
		mousedown = true;
		drive_start_drag = [ev.clientX, ev.clientY];

		$("#drive .hero .path .device-select").addClass("hidden");

		setTimeout(() => {
			$("#drive .hero .path .device-select").css("display", "none");
		}, 150);
	}
});

$(window).on("mouseup", ev => {
	mousedown = false;
	$("#drive-selector").css({
		display: "none"
	});

	isDriveDragging = false;
});

$(window).on("mousemove", event => {
	let x = event.pageX,
		y = event.pageY;

	if (mousedown) {
		isDriveDragging = true;

		let orgX =		drive_start_drag[0],
			orgY =		drive_start_drag[1],
			gapX =		x - orgX,
			gapY =		y - orgY,
			width =		gapX,
			height =	gapY,
			left =		x,
			top =		y,
			finder_rect=$("#drive .finder")[0].getBoundingClientRect(),
			finder_top= finder_rect.y,
			finder_right= finder_rect.right,
			finder_bottom= finder_rect.bottom,
			finder_left=finder_rect.x;

		if (gapX >= 0) {
			left = orgX;
		}

		if (gapY >= 0) {
			top = orgY;
		}

		if (gapX < 0) {
			width = Math.abs(gapX);
		}

		if (gapY < 0) {
			height = Math.abs(gapY);
		}


		if (orgY < finder_top) {
			top = finder_top

			if (y < finder_top) {
				height = 0;
			} else {
				height = y - finder_top;
			}
		}

		if (orgX < finder_left) {
			left = finder_left

			if (x < finder_left) {
				width = 0;
			} else {
				width = x - finder_left;
			}
		}

		if (orgY >= finder_top) {
			if (y < finder_top) {
				height = orgY - finder_top;
				top = finder_top;
			}
		}

		if (orgX >= finder_left) {
			if (x < finder_left) {
				width = orgX - finder_left;
				left = finder_left;
			}
		}


		if (orgX < finder_right) {
			if (x > finder_right) {
				width = finder_right - orgX;
			}
		}

		if (orgX > finder_right) {
			if (x > finder_right) {
				width = 0;
				left = finder_right;
			}
		}

		$("#drive-selector").css({
			display: "",
			left: left+"px",
			top: top+"px",
			width: width+"px",
			height: height+"px"
		});

		/* SELECT FILES
		=================== */

		drive.elements_positions.forEach(block_id => {
			let el = $("[block='"+block_id+"'")[0];
			let rect = el.getBoundingClientRect();

			if (
				(y >= rect.y && orgY < rect.y && x > rect.left && x <= rect.right) ||
				(rect.y <= orgY && orgX > rect.left && orgY < rect.bottom) ||
				(orgY > rect.bottom && y < rect.bottom && orgX > rect.left && orgX <= rect.right) ||
				(orgX < rect.left && x >= rect.left && x < rect.right && (orgY >= rect.y && y < rect.bottom)) ||
				(orgY < rect.top && x <= rect.right && y >= rect.top && y < rect.bottom) ||
				(orgX > rect.right && orgY <= finder_top && x < rect.right && y >= rect.top) ||
				(orgX > rect.right && orgY > finder_top &&  x <= rect.right && y <= rect.bottom)
			) {
				$(el).addClass("selected");
				drive.selected_info();
			} else if (isDriveDragging) {
				$(el).removeClass("selected");
				drive.selected_info();
			}
		});
	} else {
		isDriveDragging = false;
	}
});

/* DEVICE EVENTS
==================== */
$("#drive .hero .path .device").on("click", function(){
	if (Object.values(drive.devices).length <= 1) return false;

	if ($("#drive .hero .path .device-select").hasClass("hidden")) {
		if (!$("svg", this).hasClass("hidden")) {
			$("#drive .hero .path .device-select").css("display", "");
	
			setTimeout(() => {
				$("#drive .hero .path .device-select").removeClass("hidden");
			}, 50);
		}
	} else {
		$("#drive .hero .path .device-select").addClass("hidden");

		setTimeout(() => {
			$("#drive .hero .path .device-select").css("display", "none");
		}, 150);
	}
});

$(window).on("click", function() {
	if ($("#drive .hero .path .device").is(":hover")) return false;

	$("#drive .hero .path .device-select").addClass("hidden");

	setTimeout(() => {
		$("#drive .hero .path .device-select").css("display", "none");
	}, 150);
});


/* DRIVE SIDE
================= */
let iconLeaveTimeout = null;

$("#drive-side .icons svg").on("enter", function() {
	clearTimeout(iconLeaveTimeout);
	$("#drive-side .icons .bg").removeClass("hidden");

	let box = this[0].getBoundingClientRect(),
		height = box.height,
		width = box.width,
		right = window.innerWidth - box.left - box.width;

	$("#drive-side .icons .bg").css({
		right: right+"px",
		height: height+"px",
		width: width+"px"
	});
});

$("#drive-side .icons svg").on("leave", function() {
	clearTimeout(iconLeaveTimeout);

	iconLeaveTimeout = setTimeout(() => {
		if (!$("#drive-side .icons svg").is(":hover")) {
			$("#drive-side .icons .bg").addClass("hidden");
		}
	}, 100);
});