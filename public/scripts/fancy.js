function upCase(str) {
    return str.substring(0, 1).toUpperCase()+str.substring(1).toLowerCase();
}

function fancySize(bytes) {
    if (bytes < 1024) {
        return bytes+" Bytes";
    } else if (bytes < 1024*1024) {
        return Math.floor(bytes/1024*10)/10+" KB";
    } else if (bytes < 1024*1024*1024) {
        return Math.floor(bytes/1024/1024*10)/10+" MB";
    } else if (bytes < 1024*1024*1024*1024) {
        return Math.floor(bytes/1024/1024/1024*10)/10+" GB";
    }
}

function fancyTime(seconds) {
    if (seconds < 60) {
        return Math.floor(seconds)+" secondes";
    } else if (seconds < 3600) { // < 1 minute
        return Math.floor(seconds / 60)+" minutes "+Math.floor(seconds%60)+" secondes";
    } else if (seconds < 86400) { // < 1 heure
        return Math.floor(seconds / 3600)+" heures "+Math.floor(seconds%3600 / 60)+" minutes";
    } else { // > 1 heure
        return Math.floor(seconds / 60)+" heures";
    }
}

function fancyDate(date, notExact) {
    if (!date) {
        return false;
    }

        date = new Date(date);
    let d = date.getTime(),
        diff = new Date().getTime() - d,
        day = date.getDay(),
        dateInMonth = date.getDate(),
        month = date.getMonth(),
        year = date.getFullYear(),
        out = "";

    day = [
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
        "Dimanche"
    ][day];

    month = [
        "Jan.",
        "Fév.",
        "Mars",
        "Avr.",
        "Mai",
        "Juin",
        "Juil.",
        "Août",
        "Sept.",
        "Oct.",
        "Nov.",
        "Déc."
    ][month];

    if (diff < 86400000) {
        if (diff < 3600000) {
            if (diff < 60000) {
                out = "Il y a quelques secondes";
            } else {
                out = "Il y a "+Math.floor(diff/60000)+" minute"+(Math.floor(diff/60000) > 1 ? "s" : "");
            }
        } else {
            out = "Il y a "+Math.floor(diff/3600000)+" heure"+(Math.floor(diff/3600000) > 1 ? "s" : "");
        }
    } else if (diff < 172800000) {
        out = "Hier"+(!notExact ? (", "+(date.getHours() < 10 ? "0"+date.getHours() : date.getHours())+":"+(date.getMinutes() < 10 ? "0"+date.getMinutes() : date.getMinutes())) : "");
    } else if (diff < 604800000) {
        out = upCase(day)+", "+(date.getHours() < 10 ? "0"+date.getHours() : date.getHours())+":"+(date.getMinutes() < 10 ? "0"+date.getMinutes() : date.getMinutes());
    } else {
        out = dateInMonth+" "+(month.length > 4 ? month.substring(0, 4)+"." : month)+" "+year;
    }

    return out;
}