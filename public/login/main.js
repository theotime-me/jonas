let testLogin = {
		name: "",
		password: ""
	}, loginSocket = io("/login");


	let sideTooltipTimeout = null;

	$("#side a").on("enter", function(ev) {
		let className = this.className.split(" ")[0];
	
		if ($(this).hasClass("selected") || className == "settings") {
			$("#tooltip").addClass("hidden");
			$(".bg").addClass("hidden");
	
			setTimeout(function() {
				$("#tooltip").css("display", "none");
			}, 1000);
			return false;
		}
	
		$(".bg").css("top", this.offsetTop+"px").removeClass(["hidden", "soon"]);
	
		if ($(this).hasClass("soon")) {
			$(".bg").addClass("soon");
		}
	
		let title = $(this).data("title");
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
		$(".bg").addClass("hidden");
	});

$("#side a").on("click", function() {
	$("#side a").removeClass("selected");
	$(this).addClass("selected");
});

$(".box .input").on("click", function() {
	$("input", this).first().focus();
});

$(".box .username input").on("keydown", function(ev) {
	setTimeout(() => {
		if (ev.keyCode == 13) {
			if ($(".box .autocomplete:not(.input) .user").first()) {
				let username = $(".box .autocomplete:not(.input) .user h4").html();

				testLogin.name = username;
				$(".box .input.username input").val(username);
				loginSocket.emit("username.check", username);
				$(".box a span").html('en tant que "<b>'+username.split(" ")[0]+'</b>"');
			}

			$(".box .autocomplete:not(.input)").addClass("hidden");
			$(".box .input.username").removeClass("autocomplete");
			$(".box .input.password input").first().focus();
			return false;
		}

		testLogin.name = this.val();
		loginSocket.emit("username.check", this.val());
		$(".input.username").removeClass("incorrect");
		$(".box a span").html('en tant que "<b>'+this.val().split(" ")[0]+'</b>"');
	}, 50);
});

$(function() {
	let usernameValue = $(".box .username input").val();
	if (usernameValue != "") {
		loginSocket.emit("username.check", usernameValue);
	}
});

loginSocket.on("username.check", list => {
	if (list.length > 0) {
		$(".box .autocomplete:not(.input)").removeClass("hidden");
		$(".box .input.username").addClass("autocomplete");
	} else {
		$(".box .autocomplete:not(.input)").addClass("hidden");
		$(".box .input.username").removeClass("autocomplete");
	}

	$(".box .autocomplete:not(.input)").html("");

	list.forEach(user => {

	$(".box .input.username img").addClass("hidden");
	$(".box .input.username svg").removeClass("hidden");

	if (user.name == $(".box .username input").val()) {
		$(".box .autocomplete:not(.input)").addClass("hidden");
		$(".box .input.username").removeClass("autocomplete");
		$(".box .input.username img").removeClass("hidden").attr("src", user.avatar);
		$(".box .input.username svg").addClass("hidden");
		return false;
	}

	$(".box .input.username img").addClass("hidden");
	$(".box .input.username svg").removeClass("hidden");

$(".box .autocomplete:not(.input)").append(`<div class="user" onclick="fillUsername('${user.name}', '${user.avatar}')">
	<img src="${user.avatar}">
	<h4>${user.name}</h4>
	<p>Connecté ${fancyDate(user.lastConnection)}</p>
</div>`);
	});
});

function fillUsername(username, avatar) {
	$('.box .username input').val(username);
	testLogin.name = username;
	$(".box .input.username img").removeClass("hidden").attr("src", avatar);
	$('.box .autocomplete:not(.input)').addClass('hidden');
	$('.box .username').removeClass('autocomplete');
	loginSocket.emit("username.check", username);
	$(".box a span").html('en tant que "<b>'+username.split(" ")[0]+'</b>"');
}

$(".input.password input").on("keydown", function(ev) {
	setTimeout(() => {
		if (ev.keyCode == 13) {
			sendLogin();
		} else {
			testLogin.password = $(".input.password input").val();
			$(".input.password").removeClass("incorrect");
		}
	}, 50);
});

$(".input.password input").on("focus", function() {
	$(this).attr("type", "password");
});

function sendLogin() {
	if (connect.id) {
		loginSocket.emit("login", testLogin.name, testLogin.password, connect.id);
	}
}

loginSocket.on("login", code => {
	if (code == 200) {
		location.href = "/";
	} else if (code == 403) {
		$(".input.password").addClass("incorrect");
	} else if (code == 404) {
		$(".input.username").addClass("incorrect");
	}
});

connect.login();