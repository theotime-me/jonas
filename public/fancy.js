function fancy_uppercase(str) {
    return str.substring(0, 1).toUpperCase()+str.substring(1);
}

function fancy_duration(duration) { // in seconds
    return Math.floor(duration / 60)+" minutes";
}

function fancy_uptime(time) {
    let diff = $.date().time() - $.date(time).time(),
        minutes = Math.floor(diff / 60000);

        if (minutes > 0) {
            return minutes+" minute"+(minutes > 1 ? "s" : "");
        } else {
            return "Maintenant";
        }
}

function fancy_size(bytes, tags, int) {
    var sizes = ['octets', 'Ko', 'Mo', 'Go', 'To'];
    if (bytes == 0) return '0 octet';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)));
    return Math.round(bytes / Math.pow(1000, i)*(int ? 1 : 10), 2)/(int ? 1 : 10)+(tags ? ('<span> '+sizes[i]+'</span>') : " "+sizes[i]);
}

function fancy_multiplicatives(factor) {
    switch (factor) {
        case 2: return "double"; break;
        case 3: return "triple"; break;
        case 4: return "quadruple"; break;
        case 5: return "quintuple"; break;
        case 6: return "sextuple"; break;
        case 7: return "septuple"; break;
        case 8: return "octuple"; break;
        case 9: return "nonuple"; break;
        case 10:return "décuple"; break;
    }
}

/* JOURS FERIES FRANCE
========================== */
$.getJSON("https://etalab.github.io/jours-feries-france-data/json/metropole.json", json => {
    let date = $.date("date"),
        month = new Date().getMonth() +1;

    if (date.length == 1) date = "0"+date;
    if (month.length == 1) month = "0"+month;


    let day_code = new Date().getFullYear()+"-"+month+"-"+date;

    if (Object.keys(json).includes(day_code)) {
        $("#content .hero p .holiday").html('<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>'+json[day_code]);
    }
});