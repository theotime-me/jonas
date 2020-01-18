socket = io("/drive");

// Drive
let currentDrivePanel = {
	folders: [],
	files: [],
	path: "/"
},
currentDrivesortType = "";

const viewer = {
	accepted: ["json", "mp4", "ogg", "mp3", "webm", "gif", "jpeg", "jpg", "png", "pdf", "html"],

	view(path) {
		let ext = path.split(".");
			ext = ext[ext.length -1].toLowerCase();

		let	name = path.split("/");
			name = name[name.length -1].split(".");
			name.pop();
			name = decodeURIComponent(name.join(".")).replace("/", "");

		if (!this.accepted.includes(ext)) {
			var link = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
    			link.href = path;
    			link.target = '_blank';
    			var event = new MouseEvent('click', {
    			    'view': window,
    			    'bubbles': false,
    			    'cancelable': true
				});

				link.dispatchEvent(event);

			return false;
		}

		this.launch(path, ext, name);

		$("#viewer").css("display", "");

		setTimeout(() => {
			$("#viewer").removeClass("hidden");
		}, 50);
	},

	launch(path, ext, name) {
		$("#viewer .header h4").html(name);
		$("#viewer .header .icon path").attr("d", getIconFromExt(ext));
		$("#viewer .header .icon").css("fill", getColorFromExt(ext));

		$("#viewer .view, #viewer .plyr--video, #viewer .plyr--audio").addClass("hidden");

		if (["mp4", "webm"].includes(ext)) {
			$("#viewer video").attr("src", path);
			$("#viewer .plyr--video").removeClass("hidden");
		} else if (["png", "gif", "jpg", "jpeg"].includes(ext)) {
			$("#viewer img").attr("src", path).removeClass("hidden");
		} else if (["ogg", "mp3"].includes(ext)) {
			$("#viewer audio").attr("src", path);
			$("#viewer .plyr--audio").removeClass("hidden");
		} else if (["pdf", "html", "json"].includes(ext)) {
			$("#viewer iframe").attr("src", path).removeClass("hidden");
		}
	},

	hide() {
		$("#viewer audio, #viewer video").each(media => {
			media.pause();
		});

		$("#viewer iframe, #viewer video, #viewer audio, #viewer img").removeAttr("src");

		$("#viewer").addClass("hidden");

		setTimeout(() => {
			$("#viewer").css("display", "none");
		}, 200);
	}
};

new Plyr('#viewer audio');
new Plyr('#viewer video');

function displayDrivePath(path) {
	if (path.startsWith("/")) {
		path = path.replace("/", "");
	}

	path = path.split("/");

	
	$("#wrapper .path div").html("");

	let i = 0;

	path.forEach(el => {
		i++;

		let localPath = path.slice(0, i).join("/");

		if (el != "") {
			$("#wrapper .path div").append(`<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg><a onclick="socket.emit('drive.content', '${localPath}')">${el}</a>`);
		}
	});
}

socket.on("drive.content", data => {
	displayDriveContent(data);
});

function displayDriveContent(data) {
	currentDrivePanel.folders = data.content.folders;
	currentDrivePanel.files = data.content.files;
	currentDrivePanel.path = data.path;

	ctx.hide();

	displayDrivePath(data.path);
	connect.socket.emit("drive.files");

	if (data.content.folders.length > 0) {
		$("#wrapper .files .folders").html("").removeClass("empty");
	} else {
		$("#wrapper .files .folders").html("").addClass("empty");
	}

	data.content.folders.forEach(el => {
		$("#wrapper .files .folders").append(`<div onmousedown="return false" ondblclick="socket.emit('drive.content', '${currentDrivePanel.path+"/"+el.name}')">
		<svg class="icon" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
		<h4 onclick="socket.emit('drive.content', '${currentDrivePanel.path+"/"+el.name}')">${el.name}</h4>
		<p>${el.length == 0 ? "Aucun " : el.length} fichier${el.length > 1 ? "s" : ""}</p>
		<svg onclick="socket.emit('drive.content', '${currentDrivePanel.path+"/"+el.name}')" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg>
		<h5>${fancyDate(el.mtime)}</h5></div>`);
	});

	displayDriveFiles(data.content.files, "name", false, true);
}

let currentRenamedFile;

function displayDriveFiles(files, factor, reverse, auto) {
	if (!["name", "mtime", "size", "ext"].includes(factor)) {
		return false;
	}

	if (currentDrivesortType == factor && !auto) {
		reverse = !reverse;
	}
	
	$("#wrapper .files .title p").removeClass(["selected", "reversed"]);
	$("#wrapper .files .title p."+factor).addClass("selected");
	$("#wrapper .files .title ."+factor+" svg").attr("onclick", "displayDriveFiles(currentDrivePanel.files, '"+factor+"', "+reverse+")");

	if (reverse) {
		$("#wrapper .files .title p."+factor).addClass("reversed");
	} else {
		$("#wrapper .files .title p."+factor).removeClass("reversed");
	}

	currentDrivesortType = factor;
	$("#wrapper .files .list").html("");

	let convertingFileNames = [];

	sortDrive(files, factor, reverse).forEach(el => {
		let fileName, extension = "", extName = "";

			fileName = el.name;
			extension = el.ext;
			extName = getExtName(extension);

		if (convertingFileNames.includes(fileName)) {
			return false;
		}

		let path = (currentDrivePanel.path+"/"+el.fileName).replace(/\/{2,}/g, "/"),
			icon = `<svg viewbox="0 0 24 24" fill="${getColorFromExt(extension)}"><path d="${getIconFromExt(extension)}"></svg>`,
			fileNameToDisplay = fileName.length >= 35 ? fileName.substring(0, 32)+"..." : fileName,
			extensionToDisplay = extName.length > 10 ? extName.substring(0, 7)+"..." : extName,
			converting = ["mov", "avi", "mkv", "flv", "dvd", "mpeg"].includes(extension.replace(".", "")) ? "converting" : "";

		if (["jpg", "jpeg", "png"].includes(extension.replace(".", '').trim().toLowerCase())) {
			icon = `<div class="img" style="background-image: url(/drive/file/${connect.user.id}/${encodeURIComponent(path).replace("'", "\\'").replace('"', '\\"')});"></div>`;
		}

		$("#wrapper .files .list").append(`
		<a class="${converting}" data-ext="extension" data-href="/drive/file/${connect.user.id}/${encodeURIComponent(path)}" data-path="${path}">
		${icon}
		${converting ? '<svg class="ring" viewbox="0 0 24 24"><circle r="10" cx="12" cy="12"/></svg>' : ""}
		<input onmousedown="return false;" class="name" value="${fileNameToDisplay}">
		<p class="size" data-size="${el.size}">${fancySize(el.size)}</p>
		<p class="mtime">${fancyDate(el.mtime)}</p>
		<p class="ext">${converting ? translation.converting : (getNameFromExt(extension)+" "+extensionToDisplay.toLowerCase().trim().replace(".", ""))}</p></a>`);

		if (converting) {
			convertingFileNames.push(fileName);
			
			let circle = $("#wrapper .files .list a .ring circle").last(),
				radius = circle.r.baseVal.value,
				circumference = radius * 2 * Math.PI;

			circle.style.strokeDasharray = circumference+" "+circumference;
			circle.style.strokeDashoffset = circumference.toString();
		}
	});

	$("#wrapper .files .list a").on("click", function() {
		if ($(this).hasClass("converting")) {
			return false;
		}

		let hasClass = $(this).hasClass("selected");
		$("#wrapper .files .list a").removeClass("selected");

		if (hasClass) {
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

		viewer.view($(this).data("href"));
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
			
		if (extension == "xml") {
			$("#ctx .feed").removeClass("hidden");

			let url = $(this).data("href");

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
		$("#ctx .delete").attr("onclick", `ctx.hide(); fileToDelete = "${path}"; socket.emit("drive.delete", "${path}");`);

		$("#ctx .rename").off();

		$("#ctx .rename").on("click", () => {
			let input = $("input", this).first();

			ctx.hide();
			input.focus();
			input.setSelectionRange(0, input.value.length);

			$("#wrapper .files .list a").addClass("hidden");
			$(this).addClass("shadow").removeClass("hidden");
			$("#wrapper .files a.shadow input").removeAttr("onmousedown").attr("ondblclick", "return false;");

			setTimeout(() => {
				currentRenamedFile = decodeURIComponent($(this).data("href").split("/")[$(this).data("href").split("/").length -1]);
			}, 50);
		});

		ctx.show({
			x: ev.clientX,
			y: ev.clientY
		}, fileName);
	});

	if (files.length == 0) {
		$("#wrapper .files .list").html("<h2>Aucun fichier dans <span>"+(ltrim(currentDrivePanel.path.replace(/\/{2,}/g, "")).replace(/\//g, '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>') || " Mon Drive")+"</span></h2>");
	}
}

let fileToDelete = false;

socket.on("drive.delete", success => {
	if (success) {
		if (fileToDelete) {
			$("#wrapper .files .list > a").each(el => {
				if ($(el).data("path") == fileToDelete) {
					$(el).addClass("hide");

					setTimeout(() => {
						$(el).remove();
						socket.emit("drive.content", '/');
					}, 200);
				}
			});
		}
	}
});

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

	show(pos, subTitle, recursive) {
		let ctxHeight = $("#ctx").first().clientHeight,
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

$(window).on("scroll", ctx.hide);
$(window).on("resize", ctx.hide);

let leaveTimeout = null;

$("html").on("leave", () => {
	leaveTimeout = setTimeout(ctx.hide, 300);
});

$("html").on("enter", () => {
	clearTimeout(leaveTimeout);
});

$(window).on("click", () => {
	if (!$("#ctx").is(":hover")) {
		ctx.hide();
	}

	if (!$("#wrapper .files").is(":hover")) {
		$("#wrapper .files a").removeClass("selected");
	}

	if (currentRenamedFile && !$("#wrapper .files .list a.shadow").is(":hover")) {
		socket.emit("drive.rename", currentRenamedFile, $("#wrapper .files .list a.shadow input").val());
	}
});

$(window).on("keydown", ev => {
	if ([13, 27].includes(ev.keyCode) && currentRenamedFile) {
		socket.emit("drive.rename", currentRenamedFile, $("#wrapper .files .list a.shadow input").val());
	}

	if (ev.keyCode == 27) {
		viewer.hide();
	}
});

socket.on("drive.rename", path => {
	currentRenamedFile = null;

	$("#wrapper .files a.shadow").data("href", path);
	$("#wrapper .files a.shadow input").removeAttr("ondblclick").attr("onmousedown", "return false;").first().blur();

	$("#wrapper .files a").removeClass(["hidden", "shadow"]);
	setTimeout(() => {
		socket.emit("drive.content", currentDrivePanel.path);
	}, 300);
});

$("#viewer").on("click", ev => {
	if (!$(".plyr").is(":hover")) {
		viewer.hide();
	}
});

socket.on("drive.disk", (disks, totalSize, used) => {
    $("#wrapper .intro .progress").html('');

    let allDriveSize = 0;

    disks.forEach(disk => {
        let percent = disk.size / totalSize * 100;

        if (percent < 2) {
            percent = 2;
        }

        $("#wrapper .intro .progress").append('<div class="'+(disk.uid == connect.user.id ? "me" : "other")+'" flow="down" tooltip="'+(disk.uid == connect.user.id ? "Moi" : "Autre utilisateur")+'" style="width: '+percent+'%;"></div>');

        if (disk.uid == connect.user.id) {
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
				console.log("bitext");
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

let filesDone = 0,
	filesToDo = 0,
	progressBar = $("#wrapper .dropzone .progress").first(),
	dropArea = $('#wrapper .dropzone').first();

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
	handleFiles(this.files);
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
	if (files.length == 0) {
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

	console.log(files);
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

	if (filesDone == uploadProgress.length) {
		let message = "Vo"+(uploadProgress.length == 1 ? "tre " : "s "+uploadProgress.length)+" fichier"+(uploadProgress.length == 1 ? "" : "s")+" "+(uploadProgress.length == 1 ? "a" : "ont")+" été importé"+(uploadProgress.length == 1 ? "" : "s")+".";
		
		$("#wrapper .dropzone h4").html("Terminé !");
		socket.emit("drive.content", "/");
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
		formData = new FormData(); // new virtual form

	xhr.open('POST', '/drive/upload/'+connect.user.id+"/"+encodeURIComponent(currentDrivePanel.path), true); // open new request

	// on progress
	xhr.upload.addEventListener("progress", function(e) {
		updateProgress(i, (e.loaded * 100 / e.total) || 100, e.loaded, e.total); // display the progress
	});

	// on finished
	xhr.onloadend = function(e) {
		if (xhr.readyState == 4 && xhr.status == 200) {
			let a = document.createElement("a");
				//a.className = "hidden";
				a.setAttribute("target", "blank");
				a.setAttribute("href", "/drive/file/"+connect.user.id+"/"+encodeURIComponent(path)+")");
				a.setAttribute("data-path", encodeURIComponent(path));
				a.innerHTML = `<svg viewbox="0 0 24 24"><path d="${getIconFromExt(extension)}"></svg><h4 class="name">${(fileName+extension).length >= 40 ? (fileName).substring(0, 32)+"... <span>"+(extension.length > 10 ? extension.substring(0, 7)+"..." : extension)+"</span>" : fileName+"<span>"+extension+"</span>"}</h4><p class="mtime">${fancyDate(el.mtime)}</p><p class="size">${fancySize(el.size)}</p>`;
			let list = $("#wrapper .files .list").first();

				list.insertBefore(a, list.firstChild);

				setTimeout(() => {
					$($("#wrapper .files .list div").first()).removeClass("hidden");
				}, 50);
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