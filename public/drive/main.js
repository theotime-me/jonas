let filesIcons = {
    texture: 'M19.51 3.08L3.08 19.51c.09.34.27.65.51.9.25.24.56.42.9.51L20.93 4.49c-.19-.69-.73-1.23-1.42-1.41zM11.88 3L3 11.88v2.83L14.71 3h-2.83zM5 3c-1.1 0-2 .9-2 2v2l4-4H5zm14 18c.55 0 1.05-.22 1.41-.59.37-.36.59-.86.59-1.41v-2l-4 4h2zm-9.71 0h2.83L21 12.12V9.29L9.29 21z',
    code: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
    default: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z',
    text: 'M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z',
    picture: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    music: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    video: 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z',
    archive: 'M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z',
    gif: 'M11.5 9H13v6h-1.5zM9 9H6c-.6 0-1 .5-1 1v4c0 .5.4 1 1 1h3c.6 0 1-.5 1-1v-2H8.5v1.5h-2v-3H10V10c0-.5-.4-1-1-1zm10 1.5V9h-4.5v6H16v-2h2v-1.5h-2v-1z',
},

extToIcon = {
    svg: "texture",
    html: "code",
    css: "code",
    js: "code",
    png: "picture",
    jpg: "picture",
    jpeg: "picture",
    tiff: "picture",
    gif: "gif",
    zip: "archive",
    rar: "archive",
    gz: "archive",
    mp4: "video",
    mkv: "video",
    ogg: "video",
    mp3: "music",
    wav: "music",
};

function getIconFromExt(ext) {
    if (ext.startsWith(".")) {
        ext = ext.replace(".", "");
    }

    ext = ext.trim();

    if (Object.keys(extToIcon).includes(ext)) {
        return filesIcons[extToIcon[ext]];
    } else {
        return filesIcons.default;
    }
}

socket = io("/drive");


// Drive
let currentDrivePanel = {
	folders: [],
	files: [],
	path: "/"
},
currentDrivesortType = "";

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

function displayDriveFiles(files, factor, reverse, auto) {
	if (!["name", "mtime", "size"].includes(factor)) {
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

		let path = (currentDrivePanel.path+"/"+fileName+extension).replace(/\/{2,}/g, "/");
		
        $("#wrapper .files .list").append(`<a target="blank" href="/drive/file/${connect.user.id}/${encodeURIComponent(path)}" data-path="${path}">
        <svg viewbox="0 0 24 24"><path d="${getIconFromExt(extension)}"></svg>
		<h4 class="name">${(fileName+extension).length >= 40 ? (fileName).substring(0, 32)+"... <span>"+(extension.length > 10 ? extension.substring(0, 7)+"..." : extension)+"</span>" : fileName+"<span>"+extension+"</span>"}</h4><p class="mtime">${fancyDate(el.mtime)}</p><p class="size">${fancySize(el.size)}</p></a>`);
	});

	$("#wrapper .files .list a").on("contextmenu", function(ev) {
		ev.preventDefault();

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

		let path = decodeURIComponent(this.href);
			path = path.split(connect.user.id);
			path.shift();
			path = path.join(connect.user.id);

			while (path.startsWith("/")) {
				path = path.replace("/", "");
			}
	
			path = "/"+path;

		ctx.currentFilePath = path;

		$("#ctx .open, #ctx .download").attr("href", this.href);
		$("#ctx .delete").attr("onclick", `ctx.hide(); fileToDelete = "${path}"; socket.emit("drive.delete", "${path}");`);

		$("#ctx .rename").off();

		$("#ctx .rename").on("click", function() {
			$('#modal .rename p').html(fileName);
			ctx.hide();
			rename.show(fil);

			setTimeout(function() {
				let fn = fileName.split(".");
					fn.pop();

				$('#modal .rename input').val(fn.join("."));
			}, 500);
		});

		ctx.show({
			x: ev.clientX,
			y: ev.clientY
		}, fileName);
	});

	if (files.length == 0) {
		$("#wrapper .files .list").html("<h2>Aucun fichier dans <span>"+(ltrim(currentDrivePanel.path.replace(/\/{2,}/g, "")).replace(/\//g, '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>') || " /")+"</span></h2>");
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

		if (!recursive) {
			setTimeout(function() {
				ctx.show(pos, subTitle, true);
			}, 300);
		}
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

socket.on("drive.disk", (disks, totalSize, used) => {
    $("#wrapper .intro .progress").html('');

    let allDriveSize = 0;

    disks.forEach(disk => {
        let percent = disk.size / totalSize * 100;

        if (percent < 2) {
            percent = 2;
        }

        $("#wrapper .intro .progress").append('<div class="'+(disk.uid == connect.user.id ? "me" : "other")+'" style="width: '+percent+'%;"></div>');

        if (disk.uid == connect.user.id) {
            $("#wrapper .intro p").html(fancySize(disk.size)+" utilisés par moi <span>sur "+fancySize(totalSize)+"</span>");
        }
        
        allDriveSize += disk.size;
    });

    $("#wrapper .intro .progress").prepend('<div class="blocked" style="width: '+((used-allDriveSize)/totalSize*100)+'%;"></div>');
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

$(window).on("click", function() {
    if (!$("#ctx").is(":hover")) {
		ctx.hide();
	}
});

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
		$("#wrapper .dropzone h4").html(name.length >= 20 ? name.substring(0, 17)+"..." : name.length);
	}

	initializeProgress(files.length);

	for (let i = 0; i<files.length; i++) {
		uploadFile(files[i], i);
	}
}

function initializeProgress(numFiles) {
	filesDone = 0;
	filesToDo = 0;
	$(progressBar).html("").removeClass("hidden");
	$("#wrapper .dropzone p").addClass("hidden");

	uploadProgress = [];
  
	for(let i = numFiles; i > 0; i--) {
		uploadProgress.push(0);
		$(progressBar).append('<div style="width: 0%" class="hidden" data-number="'+i+'"></div>');
	}
}

function progressDone(fileNumber) {
	filesDone++;
	$("div[data-number='"+(fileNumber+1)+"']", progressBar).addClass("done");

	if (filesDone == uploadProgress.length) {
		filesDone = 0;
		filesToDo = 0;
		$(progressBar).html("").addClass("hidden");
		$("#wrapper .dropzone p").removeClass("hidden");
		$("#wrapper .dropzone h4").html("n");
	
		uploadProgress = [];
	}
}

function updateProgress(fileNumber, percent) {
	uploadProgress[fileNumber] = percent;
	let total = percent / uploadProgress.length;
	$("div[data-number='"+(fileNumber+1)+"']", progressBar).removeClass("hidden").css("width", total+"%");

	if (percent == 100) {
		progressDone(fileNumber);
	}
}

function uploadFile(file, i) {
	let xhr = new XMLHttpRequest(), // new XHR object
		formData = new FormData(); // new virtual form

	xhr.open('POST', '/drive/upload/'+connect.user.id, true); // open new request

	// on progress
	xhr.upload.addEventListener("progress", function(e) {
		updateProgress(i, (e.loaded * 100.0 / e.total) || 100); // display the progress
	});

	// on finished
	xhr.onloadend = function(e) {
		console.log(xhr);
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