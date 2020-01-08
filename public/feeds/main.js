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

function displayFeeds() {
    $("#wrapper .feeds .list, #wrapper .episodes .list").html("");
    sortFeeds().forEach(feed => {
        $("#wrapper .feeds .list").append(`<div>
            <div class="img" style="background-image: url('${feed.image}');"></div>

            <h4>${feed.title.length > 40 ? feed.title.substring(0, 37)+"..." : feed.title}</h4>
            <p>${fancyDate(feed.items[0].date)}</p>
        </div>`);
    });

    sortEpisodes().forEach(episode => {
        let img, feedLink, feedTitle, icon,
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

        $("#wrapper .episodes .list").append(`<div onclick="if (ev.target.nodeName == "A") return false; location.href = '${contentType ? episode.content : episode.url}'">
        <div class="img" style="background-image: url('${img}');"></div>
        <svg viewBox="0 0 24 24"><path d="${icon}"/></svg>
        <h4 title='${episode.title.replace(/'/g, "&#39;")}'>${episode.title.length > 80 ? episode.title.substring(0, 77)+"..." : episode.title}</h4>
        <a href="${feedLink}">${feedTitle}</a>
    </div>`);

    console.log(episode);
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

connect.callbacks.push(() => {
    socket.emit("login", connect.user.id, connect.id); 
});
 
connect.login();