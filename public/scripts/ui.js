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
	font: 'M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z',
	script: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
	pdf: 'M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z',
},

filesColors = {
	red: '#fc2f20',
	yellow: '#f9d82f',
	orange: '#fc792d',
	pink: '#fc2df5',
	purple: '#8f27dd',
	green: '#03c13c',
	"light-blue": '#62a0f7',
	blue: '#196ee5',
	default: '#3a3a3a'
},

extToIcon = {
    svg: "texture",
    html: "code",
    css: "code",
    js: "code",
    php: "code",
    json: "code",
    png: "picture",
    jpg: "picture",
    jpeg: "picture",
    tiff: "picture",
    gif: "gif",
    zip: "archive",
    rar: "archive",
    deb: "archive",
    gz: "archive",
    dvd: "video",
    avi: "video",
    mp4: "video",
    mov: "video",
    mkv: "video",
    ogg: "video",
    mp3: "music",
    wav: "music",
    ttf: "font",
    woff: "font",
	woff2: "font",
	sh: 'script',
	pdf: 'pdf',
	md: 'text',
	txt: 'text',
	docx: 'text',
	odt: 'text',
},

extToColour = {
    svg: "blue",
    html: "orange",
    css: "light-blue",
    js: "yellow",
    php: "purple",
    json: "yellow",
    png: "red",
    jpg: "red",
    jpeg: "red",
    tiff: "red",
    gif: "pink",
    dvd: "red",
    avi: "red",
    mp4: "red",
    mov: "red",
    mkv: "red",
    ogg: "red",
    mp3: "blue",
    wav: "blue",
	pdf: 'red',
	md: 'blue',
	odt: 'blue',
	docx: 'blue'
};

function getIconFromExt(ext) {
    if (ext.startsWith(".")) {
        ext = ext.replace(".", "");
    }

    ext = ext.trim().toLowerCase();

    if (Object.keys(extToIcon).includes(ext)) {
        return filesIcons[extToIcon[ext]];
    } else {
        return filesIcons.default;
    }
}

function getColorFromExt(ext) {
    if (ext.startsWith(".")) {
        ext = ext.replace(".", "");
    }

    ext = ext.trim().toLowerCase();

    if (Object.keys(extToColour).includes(ext)) {
        return filesColors[extToColour[ext]];
    } else {
        return filesColors.default;
    }
}

const fileNames = {
	mp4: "vidéo",
	mp3: "audio",
	wav: "audio",
	ogg: "audio",
	mkv: "vidéo",	
	avi: "vidéo",	
	mov: "vidéo",	
	ogv: "vidéo",	
	odt: "document",
	docx: "document",
	pptx: "présentation",
	odp: "présentation",
	xls: "sheet",
	ods: "sheet",
	default: "fichier"
};

function getNameFromExt(ext) {
    if (ext.startsWith(".")) {
        ext = ext.replace(".", "");
    }

    ext = ext.trim().toLowerCase();

    if (Object.keys(fileNames).includes(ext)) {
        return fileNames[ext];
    } else {
        return fileNames.default;
    }
}

const extNames = {
	md: "markdown",
	js: "javascript",
	sh: "bash",
	jpg: "jpeg"
};

function getExtName(ext) {
	if (ext.startsWith(".")) {
        ext = ext.replace(".", "");
    }

    ext = ext.trim().toLowerCase();

    if (Object.keys(extNames).includes(ext)) {
        return extNames[ext];
    } else {
        return ext;
    }
}

const search = {
	files: [],
	data: [
		{
			id: "rss",
			name: "Ajoutez le flux rss",
			desc: "à votre bibliothèque NITRO",
			icon: 'M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z',
			hidden: true,

			fn(url) {
				socket.emit("feeds.add", url);
			}
		},

		{
			id: "drive",
			name: "Ouvrir votre drive",
			desc: "Accédez à tous vos fichiers",
			icon: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z',
			keywords: [
				["files", "en"],
				["fichiers", "fr"],
				["folders", "en"],
				["dossiers", "fr"],
				["documents", "en"],
				["documents", "fr"],
				["storage", "en"],
				["stockage", "fr"],
				["drive", "en"],
				["drive", "fr"],
			],
			fn() {
				if (document.location.pathname != "/drive/") {
					document.location.href = "/drive/";
				}
			}
		},

		{
			id: "weather",
			name: "Aujourd'hui",
			desc: "erreur",
			keywords: [
				["weather", "en"],
				["météo", "fr"],
				["temps", "fr"]
			]
		},

		{
			id: "home",
			name: "Aller à l'accueil",
			desc: "de Nitro",
			icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
			keywords: [
				["home", "en"],
				["accueil", "fr"]
			],
			fn() {
				if (document.location.pathname != "/") {
					document.location.href = "/";
				}
			}
		},

		{
			id: "messages",
			name: "Voir mes messages",
			desc: "aucun nouveau message",
			icon: 'M15 4v7H5.17L4 12.17V4h11m1-2H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm5 4h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1z',
			keywords: [
				["messagerie", "fr"],
				["envoyer", "fr"],
				["send", "en"],
			],

			fn() {
				messages.show();
			}
		},

		{
			id: "fitness",
			name: "Fitness",
			desc: "Démarrez votre exercice quotidien",
			icon: 'M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z',
			keywords: [
				["exercise", "en"],
				["fit", "en"],
				["daily", "en"],
				["exercice", "fr"],
				["quotidien", "fr"],
				["fit", "fr"]
			],

			fn() {
				document.location.href = "/fitness";
			}
		},

		{
			id: "download",
			name: "Télécharger ce fichier",
			desc: "en utilisant votre appareil Nitro",
			icon: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
			hidden: true,

			fn(url) {
				socket.emit("download.add", url);
			}
		},

		{
			id: "account",
			name: "Compte Nitro",
			desc: "paramètres du compte",
			icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.51.88 4.93 1.78C15.57 19.36 13.86 20 12 20s-3.57-.64-4.93-1.72zm11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6zm0 5c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11z',

			keywords: [
				["compte", "fr"],
				["paramètres", "fr"],
				["settings", "en"],
				["account", "en"],
			],

			fn(url) {
				socket.emit("download.add", url);
			}
		},

		{
			id: "logout",
			name: "Me déconnecter",
			desc: "de cet appareil",
			icon: 'M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
			keywords: [
				["logout", "en"],
				["disconnect", "en"],
				["déconnexion", "fr"]
			],

			fn() {
				connect.logout();
			}
		}
	],

	getAllKeywords() {
		let keywords = [];

		this.data.forEach(option => {
			if (option.keywords) {
				option.keywords.forEach(keyword => {
					if (keyword[1] == system.lang) {
						keywords.push(keyword[0]);
					}
				});
			}
		});

		return keywords;
	},

	placeholder(erase) {
		let keywords = this.getAllKeywords(system.lang),
			searchWord = upCase(translation.try);

		$("#nav .search input").attr("placeholder", searchWord+' "'+keywords[Math.floor(Math.random() * keywords.length)]+'"');

		if (erase) $("#nav .search input").val("");
	},

	launch(id, query, isUrl) { // option's id
		this.hide();

		if (isUrl) {
			let relative = "/drive/file/"+connect.user.id+"/"+encodeURIComponent((id+"/"+query).replace("//", "/"));

			if (location.pathname.startsWith("/drive")) {
				viewer.view(relative);
			} else {
				var link = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
    			link.href = relative;
    			link.target = '_blank';
    			var event = new MouseEvent('click', {
    			    'view': window,
    			    'bubbles': false,
    			    'cancelable': true
				});

				link.dispatchEvent(event);
			}

			return false;
		}

		this.data.forEach(option => {
			if (option.id == id) {
				if (option.fn) {
					this.placeholder(true);

					setTimeout(() => option.fn(query), 300);
				}
			}
		});
	},

	clean(str) {
		if (Array.isArray(str)) str = str[0];

		return str.toLowerCase().trim().replace(/é|è|ê|ë/g, "e").replace(/à|â/g, "a").replace(/î|ï/g, "i").replace(/ô|ö/g, "o");
	},

	find(str) {
		if (!str) str = $("#nav .search input").val();

		str = this.clean(str);
		let output = [],
			forceURL = false;

		if (str == "") {
			output = ["drive", "messages", "fitness"];
		} else if (isValidURL(str)) {
			output = ["rss", "download"];
			forceURL = true;
		} else if (translation.me.startsWith(str) || this.clean(connect.user.name.split(" ")[0]).startsWith(str) || this.clean(connect.user.name.split(" ")[1]).startsWith(str)) {
			output = ["account"];
			forceURL = true;
		} else if (/([-+]?[0-9]*\.?[0-9]+[\/\+\-\*x×])+([-+]?[0-9]*\.?[0-9]+)/.test(str)) {
			if (/[^0-9]/.test(str.charAt(0))) {
				str = str.replace(/[^0-9]/, "");
			}

			if (/[^0-9]/.test(str.charAt(str.length -1))) {
				str = str.substring(0, str.length - 1);
			}

			str = str.replace(/x|×/g, "*");

			output = [{
				type: "maths",
				operation: str,
				result: eval(str)
			}];
			forceURL = true;
		}  else if (/(#([0-9a-f]{3}){1,2}|(rgba|hsla)\(\d{1,3}%?(,\s?\d{1,3}%?){2},\s?(1|0|0?\.\d+)\)|(rgb|hsl)\(\d{1,3}%?(,\s?\d{1,3}%?){2}\))/i.test(str)) {
			let type = "";

			if (str.startsWith("#")) type = "hexadecimal";
			if (str.startsWith("rgb")) type = "rgb";
			if (str.startsWith("hsl")) type = "hsl";
			
			output = [{
				type: "color",
				color: str,
				colorType: type
			}];

			forceURL = true;
		} else if (["red", "blue", "yellow", "green", "purple", "orange", "pink", "grey", "black", "white"].includes(str)) {
			output = [{
				type: "color",
				color: str,
				colorType: "named"
			}];

			forceURL = true;
		} else {
			this.files.forEach(file => {
				if ((file.name+"."+file.ext).startsWith(str)) {
					file.type = "file";
					output.push(file);
				}
			});

			this.data.forEach(option => {
				if (option.keywords) {

					option.keywords.forEach(keyword => {
						if (this.clean(keyword) == str) {
							output.unshift(option.id);
							return false;
						}
					});

					option.keywords.forEach(keyword => {
						if (keyword[1] != system.lang) {
							return false;
						}

						if (this.clean(keyword[0]).startsWith(str)) {
							output.push(option.id);
						}
					});
				}

				if (this.clean(option.name).startsWith(str)) {
					output.push(option.id);
				} else if (this.clean(option.name) == str) {
					output.unshift(option.id);
				} else if (option.desc.includes(str)) {
					output.push(option.id);
				}
			});
		}

		output = output.filter(function(elem, index, self) {
			return index === self.indexOf(elem) && (!forceURL ? !["rss"].includes(elem) : true);
		});

		for (let i = 0; i<output.length; i++) {
			if (typeof output[i] === "string") {
				this.data.forEach(option => {
					if (option.id == output[i]) {
						output[i] = option;
					}
				});
			}
		}

		if (output.length > 4) {
			output.length = 5;
		}

		let toRemoveIndex = [];

		output.forEach((result, i) => {
			if (result.hidden && !forceURL) {
				toRemoveIndex.push(i);
			}
		});

		toRemoveIndex.forEach(index => {
			output.splice(index, 1);
		});

		this.display(output, str);
	},

	display(results, query) {
		if (results.length == 0) {
			$("#search").html(`<div class="nothing"><svg viewBox="0 0 24 24"><path d="M20 19.59V8l-6-6H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c.45 0 .85-.15 1.19-.4l-4.43-4.43c-.8.52-1.74.83-2.76.83-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5c0 1.02-.31 1.96-.83 2.75L20 19.59zM9 13c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3z"/></svg><h4>Aucune suggestion trouvée</h4><span>Essayez avec d'autres termes</span></div>`);
			
			return false;
		}

		$("#search").html("");

		results.forEach(result => {
			let img,
				iconColor,
				textColor;

			switch (result.id) {
				case "account": img = connect.user.avatar; break;
				case "weather": img = connect.weather.img; result.name = connect.weather.temp+"C à "+connect.weather.city; result.desc = connect.weather.desc; break;
			}

			if (result.type == "maths") {
				result.icon = "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z";
				result.name = result.result;
				result.desc = result.operation;
				iconColor = textColor = "#0074D9";
			} else if (result.type == "color") {
				result.icon = "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z";
				result.name = result.color;
				result.desc = result.colorType+" color";
				iconColor = result.color;
			} else if (result.type == "file") {
				result.icon = getIconFromExt(result.ext);
				result.desc = getNameFromExt(result.ext)+" "+result.ext+" · "+result.path;
				iconColor = getColorFromExt(result.ext);
			}

			$("#search").append(`<div${(!result.fn && !result.path) ? " class='noHover'" : ""} onmousedown="return false;" onclick='search.launch("${result.path || result.id}", "${result.path ? result.name+"."+result.ext : query}"${result.path ? ', true' : ""})' data-id='${result.id}'>
			${img ? "<img src='"+img+"'>" : "<svg"+(iconColor ? " style='fill: "+iconColor+"'" : "")+" viewBox='0 0 24 24'><path d='"+result.icon+"'/></svg>"}
			<h4${textColor ? " style='color: "+textColor+"'" : ""}>${result.name}</h4>
			<span>${result.desc}</span></div>`);
		});
	},

	hide() {
		if ($("#search > .noHover").is(":hover")) return false;

		$("#nav .search").removeClass("focus");
		$("#nav .search input").first().blur();
		$("#search").addClass("hidden");
	
		setTimeout(() => {
			$("#search").css("display", "none").html("");
		}, 200);
	},

	show() {
		$("#nav .search input").first().focus();
		$("#nav .search").addClass("focus");
		$("#search").css("display", "");
	
		setTimeout(() => {
			$("#search").removeClass("hidden");
			search.find();
		}, 50);
	}
};

$(window).on("keydown", ev => {
	if (ev.ctrlKey && ev.keyCode == 70) {
		search.show();
		ev.preventDefault();
	}

	if (ev.keyCode == 13 && $("#search > div:not(.nothing)").first() && !$($("#search > div:not(.nothing)").first()).hasClass("launched")) {
		$($("#search > div:not(.nothing)").first()).addClass("launched");
		let toExec = $($("#search > div:not(.nothing)").first()).attr("onclick");

		setTimeout(() => {
			eval(toExec);
		}, 150);
	}
});

$(window).on("keyup", ev => {
	if (ev.keyCode == 13 && $("#search > div:not(.nothing)").first()) {
		search.launch($("#search > div:not(.nothing)").data("id"), false);
	}
});

$(window).on("resize", () => {
	$("#search").css("width", $("#nav .search").prop("offsetWidth")+"px").css("left", $("#nav .search").prop("offsetLeft")+"px");
});

$("#nav .search").on("click", function() {
	$("input", this).first().focus();
});

$("#nav .search input").on("focus", function() {
	search.show();
});

$("#nav .search input").on("keydown", function(ev){
	if ([13, 27, 17, 18, 225].includes(ev.keyCode)) return false;

	setTimeout(() => {
		search.show();
		search.find(this.value);
	}, 50);
});

$(window).on("scroll", search.hide);

connect.socket.on("drive.files", files => search.files = files);

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

	connect.socket.emit("drive.files");	
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

	if (!$("#search, #nav .search").is(":hover")) {
		search.hide();
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

let system = {},
	translation = {};

socket.on("system.config", data => {
	system = data;

	$(".insert-device").html(data.device);

	if (!system.isSetup) {
		location.href = "/setup";
	}
});

socket.on("system.translation", data => {
	translation = data;
	search.placeholder(true);
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
		// not finished
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