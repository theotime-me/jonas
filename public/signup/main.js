let newAccount = {
		name: "",
		password: ""
	}, signupSocket = io("/signup");

$("#side a").on("click", function() {
	$("#side a").removeClass("selected");
	$(this).addClass("selected");
});

$(".box .input").on("click", function() {
	$("input", this).first().focus();
});

$(".input.password input, .input.confirm-password input").on("focus", function() {
	$(this).attr("type", "password");
});

signupSocket.on("login", code => {
	if (code == 200) {
		location.href = "/";
	} else if (code == 403) {
		alert("already exists !");
	}
});

connect.login();

$(".box .input.first input").on("keydown", function(ev) {
	setTimeout(() => {
		let first = $(this).val(),
			last = $(".input.last input").val();

		if (last != "" && first != "") {
			newAccount.name = first.toLowerCase()+" "+last.toLowerCase();
			$(".box[data-id='name'] > a").removeClass("will-disable").removeClass("disabled");
			$(".box[data-id='name'] > a > p").html("Continuer l'inscription");
		} else {
			$(".box[data-id='name'] > a").addClass("will-disable");
		}
	}, 50);

	if (ev.keyCode == 32) {
		$(".box .input.last input").first().focus();
		ev.preventDefault();
	}

	if (ev.keyCode == 13) {
		setPassword();
	}
});

$(".box .input.last input").on("keydown", function(ev) {
	if (ev.keyCode == 13) {
		setPassword();
	}

	setTimeout(() => {
		let first = $(".input.first input").val(),
			last = $(this).val();

			if (last != "" && first != "") {
				newAccount.name = first.toLowerCase()+" "+last.toLowerCase();
				$(".box[data-id='name'] > a").removeClass("will-disable").removeClass("disabled");
				$(".box[data-id='name'] > a > p").html("Continuer l'inscription");
			} else {
				$(".box[data-id='name'] > a").addClass("will-disable");
			}

		if (ev.keyCode == 8 && $(this).val() == "") {
			$(".box .input.first input").first().focus();
			ev.preventDefault();
		}
	}, 50);
});

$(".box[data-id='name'] > a").on("click", function() {
	setPassword();
});

function setPassword() {
	if ($(".box[data-id='name'] > a").hasClass("will-disable")) {
		$(".box[data-id='name'] > a").addClass("disabled");
		$(".box[data-id='name'] > a > p").html("Prénom et nom requis");
		return false;
	}

	$(".box[data-id='name']").addClass("left");

	setTimeout(() => {
		$(".box[data-id='name']").css("display", "none");
		$(".box[data-id='password']").css("display", "");

		setTimeout(() => {
			$(".box[data-id='password']").removeClass("hidden");
			$(".box[data-id='password'] .input.password input").first().focus();
		}, 50);
	}, 200);
}

$(".box[data-id='password'] .input.password input").on("keydown", function(ev) {
	setTimeout(() => {
		let val = this.value,
			factors = 0,
			out = "null";

		if (val.length > 10) factors++;
		if (/\d/.test(val)) factors++;
		if (/[A-Z]/.test(val)) factors++;
		if (/[a-z]/.test(val)) factors++;
		if (/[@&é#è{()}\\/ '"]/.test(val)) factors++;

		newAccount.password = val;

		switch (factors) {
			case 1: out = "bad"; break;
			case 2: out = "medium"; break;
			case 3: out = "good"; break;
			case 4: out = "very-good"; break;
			case 5: out = "excellent"; break;
		}

		$(".box[data-id='password'] .strength").data("level", out);

		if (out == "null") {
			$(".box[data-id='password'] .input.confirm-password").addClass("disabled");
			$(".box[data-id='password'] .input.confirm-password input").attr("disabled", "on");

			$(".box[data-id='password'] > a > p").html("Entrez un mot de passe");
			$(".box[data-id='password'] > a").addClass("disabled");
		} else {
			$(".box[data-id='password'] .input.confirm-password input").removeAttr("disabled");
			$(".box[data-id='password'] .input.confirm-password").removeClass("disabled");

			$(".box[data-id='password'] > a > p").html("C'est presque fini !");
			$(".box[data-id='password'] > a").removeClass("disabled");
		}

		if ($(".box[data-id='password'] .input.confirm-password input").val() == newAccount.password) {
			$(".box[data-id='password'] .input.confirm-password svg path").attr("d", "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z");
		} else {
			$(".box[data-id='password'] .input.confirm-password svg path").attr("d", "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z");
		}

		if (ev.keyCode == 13) {
			$(".box[data-id='password'] .input.confirm-password input").first().focus();
		}
	}, 50);
});

$(".box[data-id='password'] .input.confirm-password input").on("keydown", function(ev) {
	setTimeout(() => {
		if (this.value == newAccount.password) {
			$(".box[data-id='password'] .input.confirm-password svg path").attr("d", "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z");
		} else {
			$(".box[data-id='password'] .input.confirm-password svg path").attr("d", "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z");
		}

		if (ev.keyCode == 13) {
			setAccount();
		}
	}, 50);
});

function setAccount() {
	if (newAccount.password.trim() == "") {
		$(".box[data-id='password'] .input.confirm-password").addClass("disabled");
		$(".box[data-id='password'] .input.confirm-password input").attr("disabled", "on");

		$(".box[data-id='password'] > a > p").html("Entrez un mot de passe");
		$(".box[data-id='password'] > a").addClass("disabled");

		return false;
	} else if (newAccount.password != $(".box[data-id='password'] .input.confirm-password input").val()) {
		$(".box[data-id='password'] .input.confirm-password").removeClass("disabled");
		$(".box[data-id='password'] .input.confirm-password input").removeAttr("disabled");

		$(".box[data-id='password'] > a > p").html("Mauvaise confirmation");
		$(".box[data-id='password'] > a").addClass("disabled");
		return false;
	}

	$(".box[data-id='password']").addClass("left");

	setTimeout(() => {
		$(".box[data-id='password']").css("display", "none");
		$(".box[data-id='loading']").css("display", "");

		setTimeout(() => {
			$(".box[data-id='loading']").removeClass("hidden");
		}, 50);
	}, 200);

	signupSocket.emit("signup", newAccount, connect.id);
}