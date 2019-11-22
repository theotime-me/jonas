let testLogin = {
		name: "",
		password: ""
	}, loginSocket = io("/login");

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

		testLogin.name = this.value;
		loginSocket.emit("username.check", this.value);
		$(".input.username").removeClass("incorrect");
		$(".box a span").html('en tant que "<b>'+this.value.split(" ")[0]+'</b>"');
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