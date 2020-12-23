const translate = {
    day(day, lang) {
        if (lang == "fr") {
            switch (day) {
                case "monday": return "lundi";
                case "tuesday": return "mardi";
                case "wednesday": return "mercredi";
                case "thursday": return "jeudi";
                case "friday": return "vendredi";
                case "saturday": return "samedi";
                case "sunday": return "dimanche";
            }
        } else if (lang == "en") return day;
    },

    month(month, lang) {
        if (lang == "fr") {
            switch (month) {
                case "january": return "janvier";
                case "february": return "février";
                case "march": return "mars";
                case "april": return "avril";
                case "may": return "mai";
                case "june": return "juin";
                case "july": return "juillet";
                case "august": return "août";
                case "september": return "septembre";
                case "october": return "octobre";
                case "november": return "novembre";
                case "december": return "décembre";
            }
        } else if (lang == "en") return month;
    },

    room(room, lang) {
        if (lang == "fr") {
            switch (room) {
                case "entrance": return "entrée";
                case "bedroom": return "chambre";
                case "bedroom_baby": return "chambre de bébé";
                case "office": return "bureau";
                case "open_space": return "open space";
                case "living": return "salon";
                case "kitchen": return "cuisine";
                case "bathroom": return "salle de bains";
            }
        } else if (lang == "en") {
            switch (room) {
                case "bedroom_baby": return "baby room";
                case "open_space": return "open space";
                default: return room;
            }
        }
    },

    building(_building, lang) {
        if (lang == "fr") {
            switch (_building) {
                case "flat": return "appartement "+(owner.length == 1 ? "de "+(owner.gender == "male" ? "M. " : "Mme. ") : "des ")+owner.name;
                case "house": 
                    if (building.area >= 500) {
                        return "Domaine "+owner.name;
                    } else if (building.area >= 200) {
                        return "Résidence "+owner.name;
                    } else {
                        return "Maison "+(owner.length == 1 ? "de "+(owner.gender == "male" ? "M. " : "Mme. ") : "des ")+owner.name;
                    }
            }
        } else if (_building == "en") {
            switch (_building) {
                default: return room;
            }
        }
    }
}