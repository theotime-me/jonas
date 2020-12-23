let atmosphere = {
    icons: {
        done: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM9.29 16.29L5.7 12.7c-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0L10 14.17l6.88-6.88c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41l-7.59 7.59c-.38.39-1.02.39-1.41 0z',
        dry: 'M12 5.1v4.05l7.4 7.4c1.15-2.88.59-6.28-1.75-8.61l-4.94-4.95c-.39-.39-1.02-.39-1.41 0L8.56 5.71l1.41 1.41L12 5.1zm-8.31-.02c-.39.39-.39 1.02 0 1.41l2.08 2.08c-2.54 3.14-2.35 7.75.57 10.68C7.9 20.8 9.95 21.58 12 21.58c1.78 0 3.56-.59 5.02-1.77l2 2c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L5.11 5.08c-.39-.39-1.03-.39-1.42 0zM12 19.59c-1.6 0-3.11-.62-4.24-1.76C6.62 16.69 6 15.19 6 13.59c0-1.32.43-2.56 1.21-3.59L12 14.79v4.8z',
        ventilate: 'M12 12c0-3 2.5-5.5 5.5-5.5S23 9 23 12H12zm0 0c0 3-2.5 5.5-5.5 5.5S1 15 1 12h11zm0 0c-3 0-5.5-2.5-5.5-5.5S9 1 12 1v11zm0 0c3 0 5.5 2.5 5.5 5.5S15 23 12 23V12z',
        wet: 'M6.34 7.93c-3.12 3.12-3.12 8.19 0 11.31C7.9 20.8 9.95 21.58 12 21.58s4.1-.78 5.66-2.34c3.12-3.12 3.12-8.19 0-11.31l-4.95-4.95c-.39-.39-1.02-.39-1.41 0L6.34 7.93zM12 19.59c-1.6 0-3.11-.62-4.24-1.76C6.62 16.69 6 15.19 6 13.59s.62-3.11 1.76-4.24L12 5.1v14.49z',
        cold: 'M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z',
        hot: 'M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z',
    },

    text(code) {
        switch(code) {
            case "good_temp": return "Bonne température";
            case "good_humidity": return "Bonne humidité";
            case "too_dry": return "Légèrement sec";
            case "very_dry": return "Trop sec !";
            case "too_wet": return "Air humide";
            case "very_wet": return "Trop humide !";
            case "too_cold": return "Un peu froid";
            case "very_cold": return "Temp. froide !";
            case "too_hot": return "Un peu chaud";
            case "very_hot": return "Temp. élevée !";
            default: return "Parfait";
        }
    },

    status(current) {
        let atmo = current.atmosphere,
            score = atmo.score,
            advice = atmo.advice;

        $("#status .atmosphere .value")[0].style.strokeDashoffset = 63 - score.total / 100 * 63;
        $("#status .atmosphere-tooltip .value")[0].style.strokeDashoffset = 126 - score.total / 100 * 126;
        
        $("#status .atmosphere").attr("title", score.total+"%");
        $("#status .atmosphere-tooltip .circle text.percent").html(score.total == 0 ? "00" : (score.total < 10 ? "0"+score.total : score.total));

        $("#status .atmosphere-tooltip .text .stats .temp .progress .bar").css("width", score.temp+"%");
        $("#status .atmosphere-tooltip .text .stats .humidity .progress .bar").css("width", score.humidity+"%");
        $("#status .atmosphere path").attr("d", this.icons.done);


        if (advice != "perfect") {
            let icon = '';

            switch (advice) {
                case "too_dry": case "very_dry": icon = this.icons["dry"]; break;
                case "too_wet": case "very_wet": icon = this.icons["wet"]; break;
                case "too_cold": case "very_cold": icon = this.icons["cold"]; break;
                case "too_hot": case "very_hot": icon = this.icons["hot"]; break;
            }

            $("#status .atmosphere path").attr("d", icon);

            $("#status .atmosphere-tooltip .text .stats .humidity b").html(this.text(atmo.advices.humidity));
            $("#status .atmosphere-tooltip .text .stats .temp b").html(this.text(atmo.advices.temp));
        }

        if (score.total < 45) {
            $("#status .atmosphere").addClass("warning");
            $("#status .atmosphere-tooltip").addClass("warning");
        } else {
            $("#status .atmosphere").removeClass("warning");
            $("#status .atmosphere-tooltip").removeClass("warning");
        }

        if (score.total == 100) {
            $("#status .atmosphere-tooltip .circle .percent").attr("x", 11);
        } else {
            $("#status .atmosphere-tooltip .circle .percent").attr("x", 14.5);
        }
    }
};