const loaders = [
    `<svg viewBox="0 0 128 128">
    <path data-id="1" d="M0 24.5V0H22L128 106V128H103.5L0 24.5Z" fill="white"/>
    <path data-id="2" d="M128 63.5L64.5 0H128V41V63.5Z" fill="white"/>
    <path data-id="3" d="M0 128V55.5L66.5 128H0Z" fill="white"/>
    </svg>`,

    `<svg viewBox="0 0 128 128">
    <rect data-id="1" width="128" height="33" fill="white"/>
    <rect data-id="2" y="95" width="128" height="33" fill="white"/>
    <rect data-id="3" y="48" width="128" height="33" fill="white"/>
    </svg>`
];

const exercises = {
    plank: {
        name: {
            fr: "planche",
            en: "plank"
        },

        type: "alternated",
        levels: {
            easy: [15, 8, 3],
            normal: [30, 10, 3],
            hard: [37, 10, 4],
            impossible: [45, 5, 5]
        },

        image: "plank.jpg",
        imageCopy: "Photo by Li Sun from Pexels.com",

        imageSleep: "plank-sleep.jpeg",
        imageSleepCopy: 'from www.yogajournal.com.au'
    }
};

const editing = {
    alternated(id) {
        this.show("alternated");
        $("#editing .alternated select option[value='"+id+"']").attr("selected", "selected")
    },

    show(id) {
        $("#editing ."+id+", #editing").css("display", "");

        setTimeout(() => {
            $("#editing ."+id+", #editing").removeClass("hidden");
        }, 50);
    },

    hide() {
        $("#editing > div, #editing").addClass("hidden");

        setTimeout(() => {
            $("#editing > div, #editing").css("display", "none");
        }, 200);
    }
};

const daily = {
    current: ["plank", "easy"],
    show(id, level) {
        id = id || this.current[0];
    let time = 0,
        ex = exercises[id];
        level = level || this.current[1];

        if (ex.type === "alternated") {
            let data = ex.levels[level];
            time = data[0] * data[2] + data[1] * (data[2]-1);
        }

        $("#wrapper .daily h4").html(upCase(ex.name[system.lang]));
        $("#wrapper .daily .time span").html(fancyTime(time));
        $("#wrapper .daily .btn").attr("onclick", "editing."+ex.type+"('"+id+"');");

        $("#wrapper .daily").css("display", "");

        setTimeout(() => {
            $("#wrapper .daily").removeClass("hidden");
        }, 50);
    },

    hide() {
        $("#wrapper .daily").addClass("hidden");

        setTimeout(() => {
            $("#wrapper .daily").css("display", "none");
        }, 200);
    }
};

$("#editing .alternated .input svg").on("click", function() {
    let firstEl = $("svg", this.parentNode).first(),
        isFirst = firstEl.isEqualNode(this),
        oldVal = parseInt($("span", this.parentNode).html());

        if ((oldVal <= 1 && isFirst) || (oldVal > 120 && !isFirst)) {
            return false;
        }

        $("span", this.parentNode).html(oldVal + (isFirst ? -1 : 1));

        displayAlternatedProgressBar();
});

function displayAlternatedProgressBar() {
    let actionTime = parseInt($("#editing .alternated .action .input span").html()),
    sleepTime = parseInt($("#editing .alternated .sleep .input span").html()),
    effortLoop = parseInt($("#editing .alternated .loop .input span").html()),
    totalTime = actionTime * effortLoop + sleepTime * (effortLoop-1),

    actionPercent = actionTime / totalTime * 100,
    sleepPercent = sleepTime / totalTime * 100;

    console.log(totalTime);

$("#editing .alternated .progress").html("");

for (let i = 0; i<effortLoop; i++) {
    if (i != 0) {
        $("#editing .alternated .progress").append(`<div class="sleep" style="width: ${sleepPercent}%"></div>`);
    }

    $("#editing .alternated .progress").append(`<div class="action" style="width: ${actionPercent}%"></div>`);
}
}

displayAlternatedProgressBar();

$("#editing").on("click", () => {
    if (!$("#editing > div").is(":hover")) {
        editing.hide();
    }
});

$("#editing .alternate .start").on("click", () => {
    // wait 3 seconds

    // launch exercise
});

$("#editing div .input svg").on("mousedown", ev => {
    ev.preventDefault();
});

connect.callbacks.push(() => {
    socket.emit("login", connect.user.id, connect.id); 
    daily.show();
});
 
 connect.login();