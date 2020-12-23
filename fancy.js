module.exports = (async function(app, io){
    let owner = require("./data/owner.json"),
        current_greeting = "WAIT";

function getPeriod(hour) {
    if (hour > 4 && hour <= 10) {
        return "morning";
    } else if (hour > 10 && hour <= 13) {
        return "noon";
    } else if (hour > 13 && hour <= 18) {
        return "afternoon";
    } else if (hour > 18 || hour <= 4) {
        return "evening";
    }
}

function greetings() {
    let hours = new Date().getHours(),
        type = owner.type,
        period = getPeriod(hours),
        sentences = ["Bonjour !"];

    if (type == "private") {
        switch (period) {
            case "morning": sentences = ["Bonne matinée !", "Bienvenue chez "+(owner.length == 1 ? "vous" : "les"+owner.name)+" !"]; break;
            case "noon": sentences = ["Bon appétit !", "On mange quooooiii ?"]; break;
            case "afternoon": sentences = ["Bon après-midi !"]; break;
            case "evening": sentences = ["Bonne soirée !", "Bonsoir "+(owner.length == 1 ? (owner.gender == "male" ? "M." : "Mme.") : "les")+" "+owner.name+" !"]; break;
        }
    }


    let sentence = sentences[Math.floor(Math.random() * sentences.length)];

    current_greeting = sentence;
    
    io.emit("greetings", current_greeting);

    return sentence;
}

setInterval(() => {
    greetings();
}, 86400000);

greetings();

io.on("connection", socket => {
    socket.emit("greetings", current_greeting);
});

});