function caps(str) {
	return str.charAt(0).toUpperCase() + str.slice(1); 
}

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
		$("#side .downloads svg path").attr("d", "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h"+state.percent*14+"v-2H5z");
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

			if ($("#modal > div."+className+" input").first()) {
				$("#modal > div."+className+" input").first().focus();
			}
		}, 200);
	},

	hide() {
		if (!$("#modal > .drive").hasClass("hidden")) {
			$("#side > .drive").removeClass("selected");
			$("#side > .home").addClass("selected");
		}

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
	if (!$("#modal div, #menu, #side, #ctx, #weather .graph, #notif").is(":hover")) {
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
		<a title="${feed.title}" target="blank" href="${feed.link}">${feed.title.length > 35 ? feed.title.substring(0, 32)+"..." : feed.title}</a>	
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
			<a title="${item.title}" ${item.content ? "onclick=\"player.play('"+item.content+"', $(this).attr(\'title\'), event)\" " : " "} title="${item.title.replace(/\'/g, "\\\'")}" target="blank" href="${item.link}" class="title">${item.title.length > 65 ? item.title.substring(0, 62)+"..." : item.title}</a>
			<p>${fancyDate(item.date)} ·${item.contentLength ? " "+fancySize(item.contentLength)+" ·" : ""} <a target="blank" title="${feed.title}" class="feed" href="${feed.link}">${feed.title.length > 40 ? feed.title.substring(0, 37)+"..." : feed.title}</a></p>
		</div>`);
	});
});

// Adapted from @ref http://www.techtricky.com/javascript-code-to-scrolling-page-title/
let titleInterval = null;

function titleScroll(msg) {
	let speed = 150,
		endChar = " // ",
		pos = 0;

		clearInterval(titleInterval);

	titleInterval = setInterval(function() {
		var ml = msg.length;
			
		title = msg.substr(pos,ml) + endChar + msg.substr(0,pos);
	  	document.title = title;
		
		pos++;

		if (pos > ml) pos = 0;
	}, speed);
}

const player = {
	play(url, title, ev) {
		ev.preventDefault();

		$("#player").css("display", "block");
		$("#player audio").attr("src", url);
		$("#player audio").first().play();

		setTimeout(function() {
			$("#player").removeClass("hidden");
		}, 50);

		titleScroll('Lecture de "'+title+'" - Nitro');

		$(ev.target.parentNode).addClass("playing");
	},

	stop() {
		$("#player audio").first().pause();
		$("#feeds div div").removeClass("playing");
		$("#player").addClass("hidden");

		setTimeout(function() {
			$("#player").css("display", "none");
		}, 200);

		clearInterval(titleInterval);
		document.title = "Nitro assistant";
	}
};

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
		} else if (data.player) {
			icon = "M8 5v14l11-7z";
			className = "drive";
			text = 'Lire "'+(data.title.length > 30 ? data.title.replace(/\\/g, "").substring(0, 27)+"..." : data.title.replace(/\\/g, ""))+'"';
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

$(window).on("scroll", quickhover.hide);

$(window).on("mousemove", function(ev) {
	let nodes = $("a[href]:not([noQuickhover])");

	if (nodes.is(":hover")) {
		let node = $(nodes.filter(":hover"));

		if ($("#side a").is(":hover")) {
			return false;
		}

		quickhover.show({
			x: ev.clientX,
			y: ev.clientY,
			url: node.prop("href"),
			player: node.attr("onclick") && node.attr("onclick").startsWith("player.play"),
			title: node.attr("title")
		});
	} else {
		quickhover.hide();
	}
});

(function() {
	var ctx = document.getElementById('weather-analytics').getContext('2d');
	var chart = new Chart(ctx, {
		// The type of chart we want to create
		type: 'line',
	
		// The data for our dataset
		data: {
			labels: [],
			datasets: [{
				label: 'Température',
				borderColor: '#4a94ff',
				backgroundColor: "#bfd9ff",
				data: []
			}]
		},

		// Configuration options go here
		options: {
			hover: {
            	animationDuration: 150 // duration of animations when hovering an item
        	},
		}
	});

	socket.on("weather.analytics", lastWeek => {
		lastWeek.forEach(day => {
			addData(fancyDate(day.time), day.value);
		});
	});

	function addData(label, data) {
		chart.data.labels.push(label);
		chart.data.datasets.forEach((dataset) => {
			dataset.data.push(data);
		});
		chart.update();
	}
})();

function restart() {
	for (let i = 0; i<$("#side > a").selector.length; i++) {
		setTimeout(function() {
			$($("#side > a").selector[i]).addClass("hidden");
		}, i*50+25);
	}

	$("#panel, #feeds, #weather").addClass("hidden");

	menu.hide();

	$("#reboot").css("display", "flex");

	setTimeout(function() {
		$("#reboot > div").removeClass("hidden");
	}, 100);
}

socket.on("system.restarted", function() {
	for (let i = 0; i<$("#side > a").selector.length; i++) {
		setTimeout(() => {
			$($("#side > a").selector[i]).removeClass("hidden");
		}, i*50+25);
	}

	$("#panel, #feeds, #weather").removeClass("hidden");

	menu.hide();

	$("#reboot > div").addClass("hidden");

	setTimeout(function() {
		$("#reboot").css("display", "none");
	}, 400);
});

socket.on("system.restart", function() {
	restart();
	$("#reboot .progress-bar div").css("width", "33%");
});

function blobToFile(theBlob, fileName){
    //A Blob() is almost a File() - it's just missing the two properties below which we will add
    theBlob.lastModifiedDate = new Date();
    theBlob.name = fileName;
    return theBlob;
}

(function() {
	let theCoolWord = "Hey",
		hours = new Date().getHours();

	if (hours > 4 && hours <= 9) {
		theCoolWord = "Bon réveil";
	} if (hours > 9 && hours <= 11) {
		theCoolWord = "Bonjour";
	} else if (hours > 11  && hours <= 13) {
		theCoolWord = "Bon appétit";
	} else if (hours > 13 && hours <= 19) {
		theCoolWord = "Bon après-midi";
	} else if (hours > 19 && hours <= 22) {
		theCoolWord = "Bonsoir";
	} else if (hours > 22 || hours <= 4) {
		theCoolWord = "Bonne nuit";
	}

	$("#hi h1 b").html(theCoolWord);
})();

connect.callbacks.push(function(user) {
	if (user) {
		$("#hi h1 span").html(user.name.split(" ")[0]+" ").addClass("filled");

		if (user.avatar.toLowerCase().endsWith("jpg") || user.avatar.toLowerCase().endsWith("jpeg")) {
			pathToBlob(user.avatar, blob => {
				orientation(blobToFile(blob), function(url, value){
					console.log(ORIENT_TRANSFORMS[value]);
				});
			});
		}
	}
});

function _arrayBufferToBase64( buffer ) {
	var binary = '';
	var bytes = new Uint8Array( buffer );
	var len = bytes.byteLength;
	for (var i = 0; i < len; i++) {
	  binary += String.fromCharCode( bytes[ i ] );
	}
	return window.btoa( binary );
  }
  var orientation = function(file, callback) {
	var fileReader = new FileReader();
	fileReader.onloadend = function() {
	  var base64img = "data:"+file.type+";base64," + _arrayBufferToBase64(fileReader.result);
	  var scanner = new DataView(fileReader.result);
	  var idx = 0;
	  var value = 1; // Non-rotated is the default
	  if(fileReader.result.length < 2 || scanner.getUint16(idx) != 0xFFD8) {
		// Not a JPEG
		if(callback) {
		  callback(base64img, value);
		}
		return;
	  }
	  idx += 2;
	  var maxBytes = scanner.byteLength;
	  while(idx < maxBytes - 2) {
		var uint16 = scanner.getUint16(idx);
		idx += 2;
		switch(uint16) {
		  case 0xFFE1: // Start of EXIF
			var exifLength = scanner.getUint16(idx);
			maxBytes = exifLength - idx;
			idx += 2;
			break;
		  case 0x0112: // Orientation tag
			// Read the value, its 6 bytes further out
			// See page 102 at the following URL
			// http://www.kodak.com/global/plugins/acrobat/en/service/digCam/exifStandard2.pdf
			value = scanner.getUint16(idx + 6, false);
			maxBytes = 0; // Stop scanning
			break;
		}
	  }
	  if(callback) {
		callback(base64img, value);
	  }
	};
	fileReader.readAsArrayBuffer(file);
  };

const ORIENT_TRANSFORMS = {
    1: '',
    2: 'rotateY(180deg)',
    3: 'rotate(180deg)',
    4: 'rotate(180deg) rotateY(180deg)',
    5: 'rotate(270deg) rotateY(180deg)',
    6: 'rotate(90deg)',
    7: 'rotate(90deg) rotateY(180deg)',
    8: 'rotate(270deg)'
};

function pathToBlob(path, cb) {
	fetch(path)
	.then(function(response) {
	  return response.blob();
	})
	.then(function(myBlob) {
		cb(myBlob);
	});
}

/*
 * http://stackoverflow.com/a/32490603
 */
function getOrientation( file ) {
    return new Promise( ( resolve, reject ) => {
        const reader = new FileReader();

        reader.onerror = reject;
        
        reader.onload = ( { target } ) => {
            try {
                const view = new DataView( target.result ),
                      length = view.byteLength;
                let offset = 2;

                if( view.getUint16(0, false) != 0xFFD8 ) {
                    return reject( new Error( 'File is not a .jpeg'));
                }

                while( offset < length ) {
                    const marker = view.getUint16( offset, false );
                    offset += 2;

                    if (marker == 0xFFE1) {
                        if( view.getUint32( offset += 2, false ) != 0x45786966 ) {
                            return resolve();
                        }

                        const little = view.getUint16(offset += 6, false) == 0x4949;
                        offset += view.getUint32(offset + 4, little);

                        const tags = view.getUint16(offset, little);
                        offset += 2;

                        for( var i = 0; i < tags; i++ ) {
                            if( view.getUint16( offset + ( i * 12 ), little ) == 0x0112 ) {
                                return resolve( view.getUint16( offset + ( i * 12 ) + 8, little ) );
                            }
                        }

                    } else if( ( marker & 0xFF00 ) != 0xFF00 ) {
                        break;
                    } else {
                        offset += view.getUint16( offset, false );
                    }
                }

                return resolve();
            } catch( err ) {
                return reject( err );
            }
        };
        
        reader.readAsArrayBuffer( file.slice( 0, 64 * 1024 ) );
    });
}

connect.login();