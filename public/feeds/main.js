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
    $("#wrapper .feeds .list").html("");
    sortFeeds().forEach(feed => {
        $("#wrapper .feeds .list").append(`<div>
            <div class="img" style="background-image: url('${feed.image}');"></div>
            <h4>${feed.title.length > 40 ? feed.title.substring(0, 37)+"..." : feed.title}</h4>
            <p>${fancyDate(feed.items[0].date)}</p>
        </div>`);
    });

    sortEpisodes().forEach(episode => {
        console.log(episode.title);
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