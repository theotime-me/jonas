let socket = io("/setup"),
    lang;

const box = {
    show(id){
        if ([1, 4].includes(id)) {
            $("#boxs").addClass("dark");
        } else {
            $("#boxs").removeClass("dark");
        }

        if (id == 4) {
            $("#boxs .nyan video").first().play();
        } else {
            $("#boxs .nyan video").removeAttr("autoplay").first().pause();
        }

        this.hide(id);
        setTimeout(function() {
            $("[data-box='"+id+"']").css("display", "block");
        
            setTimeout(function() {
                $("[data-box='"+id+"']").removeClass("hidden");
            }, 50);
		}, 200);
		
		if (![0, 4].includes(id)) {
			window.history.pushState({}, "", "/setup/?step="+id);
		} else {
			window.history.pushState({}, "", "/setup/");
		}
    },

    hide(not) {
        $("#boxs > div:not(.hidden):not([data-box='"+not+"'])").addClass("hidden-left");

        $("#boxs > div").addClass("hidden");

        setTimeout(function() {
            $("#boxs > div:not([data-box='"+not+"'])").css("display", "none");
        }, 200);
    }
};

$("[data-box='1'] select").on("change", function() {
    if (!["fr", "en"].includes(this.value)) {
        return false;
    }

    $("img", this.parentNode).attr("src", "../medias/flags/"+this.value+".png");
    lang = this.value;
    socket.emit("language", this.value);

    translate(this.value);
});

function translate(lang) {
    if (lang == "fr") {
        $("[data-box='0'] .left h1").html("Bienvenue");
        $("[data-box='0'] .left h4").html("sur Nitro !");
        $("[data-box='0'] .step p").html("Vous devez effectuer quelques étapes pour terminer l'installation.");
        $("[data-box='0'] .step a span").html("démarrer");
        $("[data-box='0'] .right a span").html("image tirée de");

        $("[data-box='1'] .left h1").html("Au fait,");
        $("[data-box='1'] .left h4").html("Qu'en est-il de vous ?");
        $("[data-box='1'] .step p").html("Quelle langue parlez-vous ?");
        $("[data-box='1'] .step a span").html("continuer");
        $("[data-box='1'] .right a span, [data-box='3'] .right a span").html("gif tiré de");

        $("[data-box='2'] h1").html("Maintenant, <b>choisissez un réseau</b>");
        $("[data-box='2'] .step p").html("Déjà, choisissez un réseau.");
        $("[data-box='2'] .step a.btn span").html("terminer");
        $("[data-box='2'] .step a.link span").html("utiliser ethernet");
        $("[data-box='2'] .left .current span").html("connexion actuelle");
        $("[data-box='2'] .left .current h4").html("<span>Réseau</span> Ethernet");

        $("[data-box='3'] .left h1").html("Merci !");
        $("[data-box='3'] .left h4").html("C'est tout pour l'installation");
        $("[data-box='3'] .step p").html("Vous êtes maintenant prêt à découvrir le pouvoir de Nitro");
        $("[data-box='3'] .step a.btn span").html("Lancer");
        $("[data-box='3'] .step a.link span").html("ne pas cliquer");

        $("[data-box='4'] .right a span").html("Vidéo tirée de");
    } else if (lang == "en") {
        $("[data-box='0'] .left h1").html("Welcome");
        $("[data-box='0'] .left h4").html("on board !");
        $("[data-box='0'] .step p").html("You need to complete few steps to finish the installation.");
        $("[data-box='0'] .step a span").html("start now");
        $("[data-box='0'] .right a span").html("image from");

        $("[data-box='1'] .left h1").html("Just,");
        $("[data-box='1'] .left h4").html("What about you ?");
        $("[data-box='1'] .step p").html("What language do you speak ?");
        $("[data-box='1'] .step a span").html("continue");
        $("[data-box='1'] .right a span, [data-box='3'] .right a span").html("gif from");

        $("[data-box='2'] h1").html("Now, <b>choose a network</b>");
        $("[data-box='2'] .step p").html("First, select a network !");
        $("[data-box='2'] .step a.btn span").html("finish");
        $("[data-box='2'] .step a.link span").html("use ethernet");
        $("[data-box='2'] .left .current span").html("current connection");
        $("[data-box='2'] .left .current h4").html("Ethernet <span>network</span>");

        $("[data-box='3'] .left h1").html("Thank you !");
        $("[data-box='3'] .left h4").html("That's all for the installation");
        $("[data-box='3'] .step p").html("You are now ready to discover the power of Nitro");
        $("[data-box='3'] .step a.btn span").html("Launch");
        $("[data-box='3'] .step a.link span").html("do not click");

        $("[data-box='4'] .right a span").html("Vidéo from");
    }

    $("[data-box='1'] select").val(lang);
    $("[data-box='1'] .step img").attr("src", "../medias/flags/"+lang+".png");
}

let firstLanguage = true;

socket.on("language", language => {
    if (!language) {
        return false;
    }

    lang = language;
    translate(lang);

    if (firstLanguage == true) {
        if ($.get("step") && parseInt($.get("step")) <= 4 && parseInt($.get("step")) >= 0) {
            box.show(parseInt($.get("step")));
        } else {
            box.show(0);
        }
    }

    firstLanguage = false;
});

socket.emit("network.list");

socket.on("network.list", aps => {
    $("#boxs .network .list").html("");

    aps.forEach(el => {
        $("#boxs .network .list").append(`<div onmousedown="return false;" onclick="connectWifi('${el.ssid}')"><svg style="opacity: ${el.signal_level/100};" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
        <h4>${el.ssid == "" ? "Unnamed" : el.ssid}</h4>
        <span>${el.quality}%</span>
        <svg class="use" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg></div>`);
    });
});

let currentSSID = "";

function connectWifi(ssid) {
    currentSSID = ssid;
    $("#boxs .network .step .input").removeClass("disabled");
    $("#boxs .network .step input").removeAttr("disabled");

    let text = "Enter the required password for \""+ssid+"\"";

    switch (lang) {
        case "fr": text = "Veuillez entrer le mot de passe pour \""+ssid+"\""; break;
    }

    $("#boxs .network .step p").html(text);
    $("#boxs .network .step input").val("");
}

$("#boxs .network .step a").on("click", function() {
    if ($(this).hasClass("disabled")) {
        return false;
    }

    $(this).addClass("disabled");

    socket.emit("network.connect", currentSSID, $("#boxs .network .step input").val());
});

$("#boxs .network .step input").on("keydown", function(e) {
    setTimeout(() => {
        if (e.keyCode == 13) {
            if ($("#boxs .network .step a").hasClass("disabled")) {
                return false;
            }
        
            $("#boxs .network .step a").addClass("disabled");

            socket.emit("network.connect", currentSSID, this.value);
        }
    }, 50);
});

socket.on("network.connect", data => {
    $("#boxs .network .step a").removeClass("disabled");
    $("#boxs .network .step input").val("");

    let text = "",
        placeholder = "";

    if (data.success) {
        text = "Nitro is connected to the network \""+data.ssid+'".';
        placeholder = "Wi-Fi key saved";

        switch (lang) {
            case "fr": placeholder = "Clé Wi-Fi sauvegardée"; text = "Nitro est connecté au réseau \""+data.ssid+'".';
        }

        $("#boxs .network .step p").html(text);

        setTimeout(function() {
            box.show(3);
        }, 1000);
    } else {
        text = "Wrong password for "+data.ssid;
        placeholder = "Try another key ?";

        switch (lang) {
            case "fr": placeholder = "Essayez une autre clé..."; text = "Mauvais mot de passe pour "+data.ssid;
        }

        $("#boxs .network .step p").html(text);
    }

    $("#boxs .network .step input").attr("placeholder", placeholder);
});

$("[data-box='2'] .step a.link").on("click", function() {
    socket.emit("network.ignore");
});

socket.on("network.ignore", () => {
    box.show(3);
});

socket.on("isSetup", isSetup => {
    if (isSetup) {
		location.href = "/";
    }
});

let trollAlreadyPressed = false;

$("#boxs .finish .step .btn").on("click", function() {
	$(this).addClass("disabled");

	location.href = "/";
});

$("#boxs .finish .step .link").on("click", function() {
    if (trollAlreadyPressed) {
        box.show(4);
    } else {
        trollAlreadyPressed = true;

        let sureText = "are you sure ?";

        switch (lang) {
            case "fr": sureText = "êtes-vous sûr ?"; break;
        }

        $("#boxs").addClass("dark");
        $(this).css("color", "#fff");
        $("#boxs .finish div").css("color", "rgba(255, 255, 255, .4)");
        $("#boxs .finish .logo path").css("fill", "rgba(255, 255, 255, .4)");
        $("#boxs .finish .logo line").css("stroke", "rgba(255, 255, 255, .4)");
        $("#boxs .finish a.btn").addClass("disabled").css("background-color", "rgba(255, 255, 255, .4)").css("color", "#222");
        $("#boxs .finish .right img").attr("src", "../medias/omg.webp");
        $("#boxs .finish .right a").attr("href", "https://giphy.com/gifs/producthunt-mind-blown-blow-your-26ufdipQqU2lhNA4g");
        $("span", this).html(sureText);
    }
});