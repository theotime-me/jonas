(function() {
    let path = location.pathname;

    path = path.replace(/\/{2,}/g, "/");
    if (!path.endsWith("/")) path = path+="/";
    if (!path.startsWith("/")) path = path = "/"+path;

    let navigation = {
        load(path) {
            path = path || "/";

            $("#drive-side").addClass("hidden");

            if (path.startsWith("/drive/")) {
                $("#drive").css("display", "");
                $("#content").css("display", "none");

                if (path.split("/").length > 1) {
                    let device = decodeURIComponent(path.split("/")[2]),
                        _path = decodeURIComponent(path.split("/")[3]) || "/";

                    socket.emit("drive.device.content", device, _path);
                }
            } else if (path == "/") {
                $("#drive").css("display", "none");
                $("#content").css("display", "");
            } else {
                // 404 error
            }
        }
    };

    navigation.load(path);
})();