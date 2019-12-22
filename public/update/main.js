let socket = io("/update");

socket.on("checking", state => {
    let el = "#"+(state.updated ? "done" : "update");
    if (state.updated) {
        $("p span", el).html(state.version.current);
    } else {
        $(".current p", el).html(state.version.current);
        $(".last p", el).html(state.version.last);
    }

    // show el
    $(el).css("display", "");
    setTimeout(() => {
        $(el).removeClass("hidden");
    }, 300);

    // hide #progress
    $("#progress").addClass("hidden");
    setTimeout(() => {
        $("#progress").css("display", "none");
    }, 300);

    // show nav icon+logo
    $("#nav, #wrapper").css("display", "");
    setTimeout(() => {
        $("#nav, #wrapper").removeClass("loading");
    }, 50);
});

$("#update a").on("click", () => socket.emit("install"));

socket.on("progress", state => {
    let percent = state.download*75/100;

    if (state.dpkg) percent += 12.5;
    if (state.installed) percent += 12.5;

    $("#progress .bar div").css("width", percent+"%");

    if (percent == 100) {
        $("#progress .bar div").removeAttr("style");
        $("#progress").addClass("loading");

        return false;
    }

    $("#update").addClass("hidden");
    setTimeout(() => {
        $("#update").css("display", "none");
        $("#progress").css("display", "");
        setTimeout(() => {
            $("#progress").removeClass("hidden");
        }, 50);
    }, 300);
});