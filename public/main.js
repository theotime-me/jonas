let socket = io();

/* GATHERING DATA
===================== */
let room_uptime_interval = null,
    room_current = {
        temp: 0,
        humidity: 0
    },

    device_current = {
        cpu: 0
    };

function side_progress_bar(selector, value, color, background) {
    if (!selector || !selector[0]) return false;

    background = background || "#cecece"

    $(selector).css("background", "conic-gradient("+color+" "+value+"%, "+background+" "+((value +2) > 100 ? 100 : value+2)+"%)");
}

function adjust_number_value(selector, val, suffix) {
    if (!selector || !selector[0]) return false;

    suffix = suffix || "";

    let old = parseInt($(selector).html());

    if (!isNaN(old)) {
        let diff = val - old;

        if (diff > 0) {
            for (let i = 0; i<=diff; i++) {
                let a = old+i;
                setTimeout(() => {
                    $(selector).html(a+suffix);
                }, (300/diff)*i);
            }
        } else {
            for (let i = 0; i<=Math.abs(diff); i++) {
                let a = old-i;
                setTimeout(() => {
                    $(selector).html(a+suffix);
                }, (300/Math.abs(diff))*i);
            }
        }
    }
}

function adjust_side_value(type, val, old, color) {
    let diff = val - old,
        selector = "#side ."+type,
        symbol = "",
        bg = "#cecece",
        text = true;

        switch (type) {
            case "temp": symbol = "°C"; break;
            case "humidity": symbol = "%"; bg = "#0074D9"; break;
            case "processor": text = false; break;
        }
        
    if (diff > 0) {
        for (let i = 0; i<=diff; i++) {
            let a = old+i;
            setTimeout(() => {
                if (text)
                $(selector + " h4").html(a+'<span class="top">'+symbol+'</span>');
                side_progress_bar($(selector + " .progress"), a, color, bg);
            }, 25*i);
        }
    } else {
        for (let i = 0; i<=Math.abs(diff); i++) {
            let a = old-i;
            setTimeout(() => {
                if (text)
                $(selector + " h4").html(a+'<span class="top">'+symbol+'</span>');
                side_progress_bar($(selector + " .progress"), a, color, bg);
            }, 25*i);
        }
    }
}

socket.on("room.current", current => {
    adjust_side_value("humidity", current.humidity, room_current.humidity, "#7FDBFF");
    adjust_side_value("temp", current.temp, room_current.temp, "#0074D9");

    $("#content .room .dial.humidity").html(current.humidity);
    $("#content .room .dial.temp").html(current.temp);
    $("#content .room .title p").html(fancy_uptime(current.gathering_time));

    atmosphere.status(current);

    clearInterval(room_uptime_interval);

    room_uptime_interval = setInterval(() => {
        $("#content .room .title p").html(fancy_uptime(current.gathering_time));
    }, 1000);

    room_current = current;
});

socket.on("device.current", current => {    
    adjust_side_value("processor", current.cpu, device_current.cpu, "red");

    let cpu_comment = "Util. normale",
        cpu = current.cpu;

    if (cpu > 0 && cpu <= 20) {
        cpu_comment = "Inactif";
    } else if (cpu > 20 && cpu <= 40) {
        cpu_comment = "Légèrement occupé";
    } else if (cpu > 40 && cpu <= 60) {
        cpu_comment = "Sollicité";
    } else if (cpu > 60 && cpu <= 80) {
        cpu_comment = "Fortement sollicité";
    } else if (cpu > 80 && cpu <= 100) {
        cpu_comment = "Surchauffe !";
    }

    $("#side .device .processor p").removeClass("load").html(current.cpu_temp+"°C - "+cpu_comment);

    device_current = current;
});


socket.on("global.info", global => {
    Object.keys(global).forEach(key => {
        window[key] = global[key];
    });

    translate.building();

    $("#content .room .title .name").html(fancy_uppercase(translate.room(room.device_room, "fr")));
    $("#content .room .title .building").html(fancy_uppercase(translate.building(building.type, "fr")));
});

socket.on("greetings", sentence => {
    $("#content .hero h1").html(sentence);
});


/* STATUS
============= */
socket.on("disconnect", () => {
    $("#status .power").removeClass("on").addClass("off");
    $("#status .power-alert").css("display", "");
    $("#status").css("width", "450px");

    setTimeout(() => {
        $("#status .power-alert").addClass("visible");
    }, 50);
});

socket.on("reconnect", () => {
    $("#status .power").removeClass("off").addClass("on");

    $("#status .power-alert").removeClass("visible");

    setTimeout(() => {
        $("#status .power-alert").css("display", "none");
        $("#status").css("width", "250px");
    }, 350);
});

socket.on("connect", () => {
    $("#status .power").removeClass("off").addClass("on");

    $("#status .power-alert").removeClass("visible");

    setTimeout(() => {
        $("#status .power-alert").css("display", "none");
        $("#status").css("width", "250px");
    }, 350);
});

setInterval(() => {
    load_status();
}, 10000);

function load_status() {
    let date = $.date("date")+"",
        hours = $.date("hours")+"",
        minutes = $.date("minutes")+"",
        day = translate.day($.date("day"), "fr").substring(0, 3),
        month = fancy_uppercase(translate.month($.date("month"), "fr"));

    if (date.length == 1) date = "0"+date;
    if (hours.length == 1) hours = "0"+hours;
    if (minutes.length == 1) minutes = "0"+minutes;

    $("#status .time").html(hours+":"+minutes);
    $("#content .hero p .date").html('<b>'+day+'. <span>'+date+'</span></b> '+month);
}

load_status();