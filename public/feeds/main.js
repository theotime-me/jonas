socket = io("/feeds");

let feeds = [];
socket.on("feed", feed => {
    feeds.push(feed);
    displayFeeds();
});

connect.socket.on("feed", feed => {
    feeds.push(feed);
    displayFeeds();
});

$(window).on("resize", function() {
    $("#wrapper .feeds .list > div").each(el => {
        if ($(el).prop("offsetTop") > 180) {
            $(el).hide();
        } else {
            $(el).show();
        }
    });
});

function displayFeeds() {
    $("#wrapper .feeds .list, #wrapper .episodes .list").html("");
    sortFeeds().forEach(feed => {
        $("#wrapper .feeds .list").append(`<div>
            <div class="img" style="background-image: url('${feed.image}');"></div>

            <h4>${feed.title.length > 30 ? feed.title.substring(0, 27)+"..." : feed.title}</h4>
            <p>${fancyDate(feed.items[0].date)}</p>
        </div>`);
    });

    sortEpisodes().forEach(episode => {
        let img, feedLink, feedTitle, icon = icons.link,
            contentType = episode.contentType && episode.contentType.split("/")[0];

        switch (contentType) {
            case "audio": icon = icons.play; break;
        }

        feeds.forEach(feed => {
            if (feed.url == episode.url) {
                img = feed.image;
                feedLink = feed.link;
                feedTitle = feed.title;
            }
        });

        if (contentType == "image") {
            img = episode.content;
        }

        $("#wrapper .episodes .list").append(`<div onclick="if (event.target.nodeName != 'A') { ${ ["video", "audio"].includes(contentType) ? "player.play('"+episode.content+"', '"+contentType+"')" : "window.open('"+(episode.link || episode.url)+"', '_blank');"} }">
        <div class="img" style="background-image: url('${img}');"></div>
        <svg viewBox="0 0 24 24"><path d="${icon}"/></svg>
        <h4 title='${episode.title.replace(/'/g, "&#39;")}'>${episode.title.length > 80 ? episode.title.substring(0, 77)+"..." : episode.title}</h4>
        <a href="${feedLink}" target="blank">${feedTitle}</a>
    </div>`);
    });
}

function sortFeeds() {
    let _feeds = feeds;

    _feeds.sort((a, b) => {
        let aDate = new Date(a.items[0].date).getTime(),
            bDate = new Date(b.items[0].date).getTime();

        return bDate - aDate;
    });

    return _feeds;
}

function sortEpisodes() {
    let episodes = [];

    feeds.forEach(feed => {
        episodes = episodes.concat(feed.items);
    });

    episodes.sort((a, b) => {
        let aDate = new Date(a.date).getTime(),
        bDate = new Date(b.date).getTime();

        return bDate - aDate;
    });

    return episodes;
}

const player = {
    plyrPlayer: null,
    play(url, type) {
        if (!["video", "audio"].includes(type)) {
            return false;
        }

        $("#player, #player .plyr__controls").css("display", "");

        setTimeout(() => {
            $("#player").removeClass("hidden");
        }, 50);

        if (type == "audio") {
            $("#player audio").attr("src", url);
            this.plyrPlayer = new Plyr("#player audio");
            this.plyrPlayer.play();
        }
    },

    hide() {
        this.plyrPlayer.stop();
        $("#player").addClass("hidden");

        setTimeout(() => {
            $("#player, #player .plyr__controls").css("display", "none");
        }, 200);
    }
};

connect.callbacks.push(() => {
    socket.emit("login", connect.user.id, connect.id); 
});
 
connect.login();