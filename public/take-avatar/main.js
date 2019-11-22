let socket = io("/take-avatar"),
    id = $.get("id");

socket.on('connect', function() {
    var delivery = new Delivery(socket);
 
        $("input").on("change", function(evt){
            let file = $(this).first().files[0] || false;

            if (!file) {
                return false;
            }

                // FileReader support
            if (FileReader && file) {
                var fr = new FileReader();

                fr.onload = function() {
                    $(".send img").attr("src", fr.result).removeClass("hidden");
                    $(".send svg").addClass("hidden");
                };
            
                fr.readAsDataURL(file);
            }
        
            $(".send p").html(file.name);

            delivery.send(file, {id: id});
            evt.preventDefault();
        });
 
        delivery.on('send.success',function(fileUID){
            $(".send p").html("Votre avatar vient d'être modifié");
        });
});