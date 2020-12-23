let dispNoneTimeout = null;

$("#status .atmosphere").on("enter", function() {
    $("#status .atmosphere-tooltip").css("display", "");

    clearTimeout(dispNoneTimeout);

    dispNoneTimeout = setTimeout(() => {
        $("#status .atmosphere-tooltip").removeClass("hidden");
    }, 50);
});

$("#status .atmosphere").on("leave", function() {
    clearTimeout(dispNoneTimeout);

    $("#status .atmosphere-tooltip").addClass("hidden");

    dispNoneTimeout = setTimeout(() => {
        $("#status .atmosphere-tooltip").css("display", "none");  
    }, 200);
});